# Deploy the vet consultation site to the VPS (instructions for Claude Code)

You are deploying this app to a fresh VPS at **https://drnituporna.com** using Docker images that are already on Docker Hub. Follow the steps in order, run the verification after each stage, and stop and ask the user whenever this file says to. Do not skip checks.

## What is being deployed

| Item | Value |
|---|---|
| Domain | `drnituporna.com` (and `www.drnituporna.com`, redirected to the bare domain) |
| Images | `janarddan/vet-backend:prod` and `janarddan/vet-web:prod` on Docker Hub (built for linux/amd64 and linux/arm64) |
| Stack | 4 containers from `deploy/docker/docker-compose.yml`: `db` (PostgreSQL 16), `backend` (FastAPI), `web` (Nginx + built site), `caddy` (HTTPS, Let's Encrypt certificates issued automatically) |
| Database | Created automatically on first start (Postgres creates the empty DB, the backend runs migrations). Data lives in the Docker volume `vet_db_data`. **No manual SQL or schema setup is needed.** |
| Files needed on the server | `deploy/docker/docker-compose.yml`, `Caddyfile`, `.env.example`, `backup-db.sh` (in this repo, branch `prod`) |
| Server folder | `/opt/vet` |

Do **not** use `deploy/prod/`, `deploy/nginx.conf`, `deploy/vet-backend.service` or the "without Docker" section of `README.md`. Those are an older, non-Docker setup.

## Rules

- **Never print, log or commit secrets** (database password, `JWT_SECRET`, `ADMIN_PASSWORD`, SMTP password). Generate them on the server and write them straight into `.env`. The only secret you may show the user is the generated admin password, once, at the end.
- **Never run** `docker compose down -v`, `docker volume rm`, `docker system prune --volumes`, or anything else that deletes the `vet_db_data` volume, unless the user explicitly asks for a full wipe.
- **Never kill a process or remove another site's config** that you find on ports 80/443. Show the user what is there and ask.
- Do not change SSH settings or disable password login unless the user asks. Always allow SSH in the firewall *before* enabling it.
- Report real results. If a check fails, say so with the output; do not claim success.

## Step 0. Collect what you need from the user

Ask for all of this in one message before touching anything:

1. **VPS IP address** and how you reach it: SSH user (usually `root`) and key/password. Confirm whether you are running **on the VPS itself** or **on the user's laptop** and must use `ssh`. All commands below run on the VPS (prefix them with `ssh user@IP` when working from the laptop).
2. **Confirmation that the old deployment on this VPS has been deleted** (old Nginx, Traefik/`vet-proxy` container, `vet-backend` systemd service, `/root/vet-online-consultancy`). If it has not, ask the user to delete it or tell you to.
3. **SMTP password** for sending emails: the Gmail app password (16 letters, no spaces) for `nitupornasarkar2000@gmail.com`. Create it at myaccount.google.com/apppasswords if the user does not have it. Without it, "Forgot password" emails will not be sent.
4. **Google sign-in client ID** (optional). It is in the user's local `.env.local` as `VITE_GOOGLE_CLIENT_ID`; the backend needs the same value as `GOOGLE_CLIENT_ID`. If the user does not provide it, leave it empty (Google sign-in will then not work).
5. Confirm that the **DNS A records for `drnituporna.com` and `www.drnituporna.com` point to the VPS IP**. Verify in Step 2 anyway.

## Step 1. Preflight on the server

```bash
cat /etc/os-release | head -3        # expect Ubuntu 22.04/24.04 or Debian 12
uname -m                             # x86_64 (amd64) or aarch64 (arm64); both are supported by the images
free -m; df -h /                     # need roughly 1 GB RAM free and a few GB of disk
ss -ltnp | grep -E ':(80|443)\b' || echo "ports 80/443 are free"
docker --version 2>/dev/null || echo "docker not installed"
```

- If **ports 80 or 443 are in use**, stop and show the user the output of `ss -ltnp` (and `docker ps` if Docker exists). Ask what to do. Typical culprits are the old Nginx, Apache or a Traefik container.
- If RAM is under ~512 MB total, warn the user that PostgreSQL may struggle, and ask whether to continue.

## Step 2. Check DNS

```bash
SERVER_IP=$(curl -4 -s https://ifconfig.me)
echo "server: $SERVER_IP"
dig +short drnituporna.com A
dig +short www.drnituporna.com A
```

Both names must resolve to `$SERVER_IP`. If they do not (or DNS has not propagated), **stop** and tell the user which record is wrong. Caddy cannot get a certificate until DNS is right, and repeated failed attempts can trigger Let's Encrypt rate limits.

## Step 3. Install Docker

If Docker and the compose plugin are not installed:

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker compose version               # must print a version
```

## Step 4. Firewall

```bash
ufw allow OpenSSH                    # FIRST, so you do not lock yourself out
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

If `ufw` is not installed, `apt-get install -y ufw` first. Do not open port 5432: the database is only reachable inside the Docker network.

## Step 5. Put the deployment files on the server

Create `/opt/vet` and get the four files into it.

- **Working from the laptop** (repo checked out on branch `prod`): 
  ```bash
  ssh user@IP 'mkdir -p /opt/vet'
  scp deploy/docker/docker-compose.yml deploy/docker/Caddyfile deploy/docker/.env.example deploy/docker/backup-db.sh user@IP:/opt/vet/
  ```
- **Working on the VPS**: clone the repo's `prod` branch to a temporary folder and copy the files (the repo is `https://github.com/janarddansarkar/vet-online-consultancy`; if it is private, ask the user for access, e.g. a GitHub token or deploy key):
  ```bash
  git clone --depth 1 --branch prod https://github.com/janarddansarkar/vet-online-consultancy /tmp/vet-src
  mkdir -p /opt/vet && cp /tmp/vet-src/deploy/docker/{docker-compose.yml,Caddyfile,.env.example,backup-db.sh} /opt/vet/ && rm -rf /tmp/vet-src
  ```

Then `chmod +x /opt/vet/backup-db.sh`.

## Step 6. Create `/opt/vet/.env`

Generate the secrets on the server and write the file without echoing secrets. Substitute the SMTP password and Google client ID the user gave you (leave `GOOGLE_CLIENT_ID=` empty if none):

```bash
cd /opt/vet
ADMIN_PW=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 20)
umask 077
cat > .env <<EOF
DOCKERHUB_USER=janarddan
TAG=prod
DOMAIN=drnituporna.com
POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_PASSWORD=$ADMIN_PW
ADMIN_EMAIL=nitupornasarkar2000@gmail.com
MAX_APPOINTMENTS=100
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=nitupornasarkar2000@gmail.com
SMTP_PASSWORD=<SMTP app password, no spaces>
SMTP_FROM=Dr. Nituparna Sarkar <nitupornasarkar2000@gmail.com>
GOOGLE_CLIENT_ID=<client id or empty>
EOF
chmod 600 .env
```

Read the admin password back from `.env` (`grep '^ADMIN_PASSWORD=' /opt/vet/.env | cut -d= -f2-`) when you need to give it to the user at the end. Check the file has no empty required values with `grep -c '=$' .env` (only `GOOGLE_CLIENT_ID` may be empty) **without printing the file**.

## Step 7. Start everything

```bash
cd /opt/vet
docker compose pull                  # pulls janarddan/vet-backend:prod and vet-web:prod, plus postgres and caddy
docker compose up -d
sleep 30
docker compose ps
```

Expected: `db` and `backend` show `healthy`, `web` and `caddy` show `Up`.

- If `pull` says **"pull access denied"** or "repository does not exist", the Docker Hub repositories may be private. Ask the user to either make `janarddan/vet-backend` and `janarddan/vet-web` public on hub.docker.com, or run `docker login` on the server with their credentials.
- If a container shows **"exec format error"**, the image architecture does not match the server. Tell the user (the images should cover both amd64 and arm64).
- On any failure: `docker compose logs --tail 50 <service>` and show the relevant lines.

## Step 8. Verify

Run all of these and report each result.

```bash
cd /opt/vet
# 1. Database was created automatically with all tables and the latest migration
docker compose exec -T db psql -U vet_app vet_online_consultancy -Atc "\dt"
docker compose exec -T db psql -U vet_app vet_online_consultancy -Atc "select version_num from alembic_version"
# expect tables: admin_credentials, alembic_version, appointments, pets, users

# 2. Backend health from inside
docker compose exec -T backend python -c "import urllib.request as u; print(u.urlopen('http://127.0.0.1:8000/api/health').read())"

# 3. Public HTTPS (the certificate can take up to ~1 minute on the first start)
curl -sI https://drnituporna.com | head -5                     # expect HTTP/2 200 and a valid certificate (no -k)
for p in / /book /admin /privacy /admin/reset-password /api/health; do printf "%s -> " $p; curl -s -o /dev/null -w "%{http_code}\n" https://drnituporna.com$p; done   # all 200
curl -s -o /dev/null -w "http->https: %{http_code} %{redirect_url}\n" http://drnituporna.com/   # expect 308 to https
curl -s -o /dev/null -w "www: %{http_code} %{redirect_url}\n" https://www.drnituporna.com/     # expect 301 to https://drnituporna.com/
curl -sI https://drnituporna.com | grep -iE 'strict-transport|x-content-type|x-frame'          # headers present

# 4. API docs must be hidden (returns the site's HTML, not JSON)
curl -s https://drnituporna.com/openapi.json | head -c 30

# 5. Admin login works with the generated password (do not print the password or token)
#    (shell state may not persist between commands, so read the password from .env again)
ADMIN_PW=$(grep '^ADMIN_PASSWORD=' .env | cut -d= -f2-)
curl -s -o /dev/null -w "admin login: %{http_code}\n" -X POST https://drnituporna.com/api/admin/login \
  -H 'Content-Type: application/json' -d "{\"password\":\"$ADMIN_PW\"}"                      # expect 200
```

If the certificate is not issued: `docker compose logs caddy --tail 40`. The usual causes are DNS not pointing at the server yet, port 80 blocked by a firewall or the provider's firewall (some providers have a separate panel firewall), or another service on 80/443.

Then check email works by triggering the admin reset mail and checking the backend log for errors:

```bash
curl -s -X POST https://drnituporna.com/api/admin/forgot-password; echo
sleep 5; docker compose logs backend --tail 20 | grep -iE "could not send|error|traceback" || echo "no email errors logged"
```

Ask the user to confirm the email arrived at `nitupornasarkar2000@gmail.com` (check spam). If the log shows `Could not send email` or `535`, the SMTP app password is wrong, or outbound port 587 is blocked by the provider (`nc -zv smtp.gmail.com 587` to test).

Do **not** register test users or create bookings on the live site. If you need to test a booking flow, ask first and tell the user to clear it afterwards (the admin "Download Excel & reset" button deletes all entries).

## Step 9. After it works

1. **Nightly backup**:
   ```bash
   cd /opt/vet && ./backup-db.sh && ls -lh backups/
   (crontab -l 2>/dev/null; echo '30 2 * * * cd /opt/vet && ./backup-db.sh') | crontab -
   ```
   Tell the user to copy `/opt/vet/backups` off the server now and then, and to enable the provider's VPS snapshots.
2. **Restart on boot**: containers restart automatically (`restart: unless-stopped`). Check Docker restarts on boot: `systemctl is-enabled docker`. Ask before rebooting the server; after a reboot `docker compose ps` should show everything back up without any action.
3. **Security updates**: offer `apt-get install -y unattended-upgrades` and ask before enabling. Do not change SSH settings unless the user asks.

## Step 10. Final report to the user

Give the user, in this order:

1. The site URL and the result of each check in Step 8 (pass/fail).
2. The **admin password** (`$ADMIN_PW`), once, and tell them to log in at https://drnituporna.com/admin and change it with the **Change password** button (at least 12 characters). Once they change it in the dashboard, the new password is stored hashed in the database and the value in `/opt/vet/.env` is no longer used.
3. Things only the user can do:
   - Add `https://drnituporna.com` to **Authorized JavaScript origins** for the Google sign-in client in Google Cloud Console (only if Google sign-in is used).
   - Check the reset email arrived.
   - Review the privacy policy text at https://drnituporna.com/privacy.
4. How to update later (below).

## Updating the site later

On the laptop: build and push new images, then on the VPS pull and restart. Data and the database are preserved.

```bash
# laptop (repo on branch prod, deploy/docker/.env filled in, `docker login` done)
TAG=prod PLATFORM="linux/amd64,linux/arm64" deploy/docker/build-and-push.sh
# VPS
cd /opt/vet && docker compose pull && docker compose up -d
docker compose ps && docker image prune -f
```

Database migrations run automatically when the backend starts. If new settings were added to `deploy/docker/.env.example`, add them to `/opt/vet/.env` first.

## Useful commands

```bash
cd /opt/vet
docker compose ps
docker compose logs -f backend            # also: web, caddy, db
docker compose restart backend
# Forgot the admin password and cannot get the reset email: remove the stored one so ADMIN_PASSWORD in .env works again
docker compose exec -T db psql -U vet_app vet_online_consultancy -c "DELETE FROM admin_credentials;"
# Restore a backup (stops nothing; overwrites existing rows, so ask the user first)
gunzip -c backups/FILE.sql.gz | docker compose exec -T db psql -U vet_app vet_online_consultancy
```
