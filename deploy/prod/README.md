# Prod branch: how the VPS (213.210.37.157) is currently set up

- Site: https://213-210-37-157.nip.io (trusted Let's Encrypt cert issued by the server's Traefik, which owns ports 80/443; `traefik-vet-proxy.sh` creates the `vet-proxy` container that forwards to Nginx on 172.17.0.1:8081)
- Nginx config: `nginx-vps.conf` -> /etc/nginx/sites-available/vet
- Backend: systemd service `vet-backend` (see below), reads `backend/.env` (see `.env.prod.example`)
- Frontend: `VITE_SITE_URL=https://213-210-37-157.nip.io npm run build`, served from `dist/`
- Needs Node 20+, PostgreSQL 16, Nginx.

The `dev` branch is for local development (`uvicorn` + `npm run dev`, see the root README).

## Backend service (systemd)

`vet-backend.service` -> /etc/systemd/system/vet-backend.service (runs as root because the code lives under /root).
```
systemctl daemon-reload && systemctl enable --now vet-backend
journalctl -u vet-backend -f        # logs
systemctl restart vet-backend       # after a code change
```
