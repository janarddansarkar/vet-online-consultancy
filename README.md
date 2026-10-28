# Vet Online Consultancy

Requires Node, Python 3.11+ and PostgreSQL installed.

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Runs at http://localhost:8000

## Frontend

In a second terminal, from the project root:

```bash
npm install
npm run dev
```

Runs at http://localhost:5173 (admin dashboard at http://localhost:5173/admin)

The admin dashboard asks for a password. On first run the backend generates one, saves it as `ADMIN_PASSWORD` in `backend/.env` and prints it once in the backend console. Set `ADMIN_PASSWORD` yourself in production.

Once Dr. Sarkar uses **Change password** in the dashboard (at least 12 characters), the new password is stored hashed in the database and `ADMIN_PASSWORD` in `.env` is ignored from then on. Changing it signs out other admin sessions. The site keeps at most `MAX_APPOINTMENTS` (default 100) consultation entries so a small VPS doesn't fill up. At the limit new bookings pause and the dashboard shows a **Download Excel & reset** button, which saves everything to Excel and then deletes all entries and pets (owner accounts are kept).

The admin login also has **Forgot password?**, which emails a 30-minute, single-use reset link to `ADMIN_EMAIL` (needs the `SMTP_*` settings). If that email isn't available either, clear it and the `.env` value works again: `psql <database> -c "DELETE FROM admin_credentials;"`.


Password reset emails need SMTP settings in `backend/.env` (see `backend/.env.example`). Without them, the reset link is printed in the backend console instead of emailed.

## Deploying with Docker (recommended)

Images are built on your laptop, pushed to Docker Hub, and pulled on the VPS. Four containers run there: PostgreSQL, the backend, the web server (Nginx + built site) and Caddy, which gets and renews the HTTPS certificate by itself. The database and all its tables are created automatically the first time it starts. Files are in `deploy/docker/`.

**On your laptop (once, then after every change)**

```bash
docker login
cp deploy/docker/.env.example deploy/docker/.env   # fill in DOCKERHUB_USER, DOMAIN, VITE_DOCTOR_WHATSAPP, VITE_GOOGLE_CLIENT_ID
deploy/docker/build-and-push.sh                      # builds for linux/amd64 and pushes :latest
```

Use `PLATFORM=linux/arm64` if the VPS is an ARM machine (`uname -m` on the VPS says `aarch64`). `VITE_*` values are baked into the web image, so changing them means rebuilding.

**On the VPS (Ubuntu)**

```bash
curl -fsSL https://get.docker.com | sh                  # installs Docker + compose
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
mkdir -p /opt/vet && cd /opt/vet
# copy docker-compose.yml, Caddyfile, .env.example and backup-db.sh from deploy/docker/ into /opt/vet, e.g.:
#   scp deploy/docker/{docker-compose.yml,Caddyfile,.env.example,backup-db.sh} root@SERVER_IP:/opt/vet/
cp .env.example .env && chmod 600 .env && nano .env     # secrets: see the comments in the file
docker compose up -d                                    # pulls the images and starts everything
docker compose ps                                       # all services should be Up / healthy
```

Point the domain's DNS A records (`DOMAIN` and `www`) at the server first, or the HTTPS certificate can't be issued. Don't publish PostgreSQL's port: only 80/443 are open.

**Updating after a code change**: run `build-and-push.sh` on your laptop (optionally with `TAG=v2`), then on the VPS `cd /opt/vet && docker compose pull && docker compose up -d` (set `TAG=v2` in `.env` if you used a tag). Migrations run on start. Data lives in the `db_data` Docker volume, so it survives updates and restarts.

**Useful commands**: `docker compose logs -f backend`, `docker compose restart backend`. Backups: `chmod +x backup-db.sh`, test `./backup-db.sh`, then add `30 2 * * * cd /opt/vet && ./backup-db.sh` to `crontab -e` (restore steps are in the script). Forgot the admin password and can't get the email: `docker compose exec db psql -U vet_app vet_online_consultancy -c "DELETE FROM admin_credentials;"` and the `ADMIN_PASSWORD` in `.env` works again.

## Deploying to a VPS without Docker (Ubuntu, with PostgreSQL on the same server)

Everything runs on one server: Nginx serves the built site and proxies `/api` to the backend, which talks to a local PostgreSQL. Config templates are in `deploy/`. Point the domain's DNS A record at the server's IP first.

**1. Packages and firewall**

```bash
sudo apt update && sudo apt install -y postgresql nginx python3-venv git certbot python3-certbot-nginx
# Node 20+ is needed to build the frontend (install via nodesource or nvm)
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable   # keeps PostgreSQL (5432) closed to the internet
sudo adduser --system --group --home /srv/vet vet
```

**2. Database**: use a dedicated user and a strong password (hex has no characters that need URL-escaping).

```bash
openssl rand -hex 24      # copy this as the database password
sudo -u postgres psql -c "CREATE USER vet_app WITH PASSWORD 'PASTE_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE vet_online_consultancy OWNER vet_app;"
```

**3. Code and backend**

```bash
sudo git clone <your-repo-url> /srv/vet && sudo chown -R vet:vet /srv/vet
sudo -u vet bash -c 'cd /srv/vet/backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt'
```

Create `/srv/vet/backend/.env` (owned by `vet`, `chmod 600`):

```env
DATABASE_URL=postgresql+psycopg://vet_app:PASTE_PASSWORD@localhost:5432/vet_online_consultancy
JWT_SECRET=<output of: openssl rand -hex 32>
ADMIN_PASSWORD=<a strong password for /admin>
CORS_ORIGINS=https://drnituporna.com
APP_BASE_URL=https://drnituporna.com
GOOGLE_CLIENT_ID=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=
```

Use port **5432** (not 5433), so the development-only Postgres auto-start stays off. On the first start the backend creates all tables itself; a one-time log line "Could not check/create database" is harmless.

```bash
sudo cp /srv/vet/deploy/vet-backend.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now vet-backend
curl http://127.0.0.1:8000/api/health        # {"status":"ok"}
```

**4. Frontend**: build with the public settings in `.env.local` (these are baked into the files):

```bash
cd /srv/vet
printf 'VITE_SITE_URL=https://drnituporna.com\nVITE_DOCTOR_WHATSAPP=91XXXXXXXXXX\nVITE_GOOGLE_CLIENT_ID=\n' | sudo -u vet tee .env.local
sudo -u vet bash -c 'npm ci && npm run build'    # writes /srv/vet/dist
```

**5. Nginx and HTTPS**

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/vet      
sudo ln -s /etc/nginx/sites-available/vet /etc/nginx/sites-enabled/vet
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d drnituporna.com -d www.drnituporna.com
```

**6. Backups**: the database holds owners' contact details and pet medical records.

```bash
sudo install -m 755 deploy/backup-db.sh /usr/local/bin/vet-backup-db
sudo crontab -e        # add:  30 2 * * * /usr/local/bin/vet-backup-db
sudo vet-backup-db     # run once now to test; dumps land in /var/backups/vet
```

Also copy `/var/backups/vet` off the server now and then, and enable the VPS provider's snapshots.

**Updating later**

```bash
cd /srv/vet && sudo -u vet git pull
sudo -u vet bash -c 'cd backend && .venv/bin/pip install -r requirements.txt && cd .. && npm ci && npm run build'
sudo systemctl restart vet-backend
```

Keep the backend to a single uvicorn process (the service file does): migrations run at startup and the login rate limits live in memory.
