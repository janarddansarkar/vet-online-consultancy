# Prod branch: how the VPS (213.210.37.157) is currently set up

- Site: https://213.210.37.157:8443 (self-signed cert in /etc/nginx/ssl/; port 80 belongs to Traefik, 8080 redirects to 8443)
- Nginx config: `nginx-vps-selfsigned.conf` -> /etc/nginx/sites-available/vet
- Backend: `cd backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000` with `backend/.env` (see `.env.prod.example`)
- Frontend: `VITE_SITE_URL=https://213.210.37.157:8443 npm run build`, served from `dist/`
- Needs Node 20+, PostgreSQL 16, Nginx.

The `dev` branch is for local development (`uvicorn` + `npm run dev`, see the root README).
