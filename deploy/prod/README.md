# Prod branch: how the VPS (213.210.37.157) is currently set up

- Site: https://drnituporna.com (www redirects to it; the old https://213-210-37-157.nip.io still works). Trusted Let's Encrypt certs are issued by the server's Traefik, which owns ports 80/443; `traefik-vet-proxy.sh` (re-runnable) creates the `vet-proxy` container that forwards to Nginx on 172.17.0.1:8081. DNS A records for `drnituporna.com` and `www` must point at 213.210.37.157 first.
- Nginx config: `nginx-vps.conf` -> /etc/nginx/sites-available/vet
- Backend: systemd service `vet-backend` (see below), reads `backend/.env` (see `.env.prod.example`)
- Frontend: `VITE_SITE_URL=https://drnituporna.com npm run build`, served from `dist/`
- Needs Node 20+, PostgreSQL 16, Nginx.

The `dev` branch is for local development (`uvicorn` + `npm run dev`, see the root README).

## Backend service (systemd)

`vet-backend.service` -> /etc/systemd/system/vet-backend.service (runs as root because the code lives under /root).
```
systemctl daemon-reload && systemctl enable --now vet-backend
journalctl -u vet-backend -f        # logs
systemctl restart vet-backend       # after a code change
```

## Switching to drnituporna.com (one time)
```
cd /root/vet-online-consultancy && git pull
# backend/.env: set APP_BASE_URL and CORS_ORIGINS=https://drnituporna.com (see .env.prod.example)
VITE_SITE_URL=https://drnituporna.com npm run build
cp deploy/prod/nginx-vps.conf /etc/nginx/sites-available/vet && nginx -t && systemctl reload nginx
sh deploy/prod/traefik-vet-proxy.sh
systemctl restart vet-backend
```
Then add `https://drnituporna.com` to the Google sign-in client's authorized JavaScript origins.
