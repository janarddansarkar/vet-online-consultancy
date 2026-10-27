#!/bin/sh
# Routes https://drnituporna.com (and www, redirected to the bare domain) through the server's existing Traefik
# (ports 80/443, Let's Encrypt) to the Nginx listener on the Docker bridge (172.17.0.1:8081, see nginx-vps.conf).
# The old 213-210-37-157.nip.io address keeps working. Safe to re-run: it replaces the existing container.
# The domain's DNS A records (drnituporna.com and www) must point at this server first, or the certificate fails.
D=drnituporna.com
OLD=213-210-37-157.nip.io
docker rm -f vet-proxy >/dev/null 2>&1
docker run -d --name vet-proxy --restart unless-stopped \
 -l traefik.enable=true \
 -l "traefik.http.routers.vet.rule=Host(\`$D\`) || Host(\`$OLD\`)" \
 -l traefik.http.routers.vet.entrypoints=websecure \
 -l traefik.http.routers.vet.tls=true \
 -l traefik.http.routers.vet.tls.certresolver=letsencrypt \
 -l "traefik.http.routers.vet-www.rule=Host(\`www.$D\`)" \
 -l traefik.http.routers.vet-www.entrypoints=websecure \
 -l traefik.http.routers.vet-www.tls=true \
 -l traefik.http.routers.vet-www.tls.certresolver=letsencrypt \
 -l traefik.http.routers.vet-www.middlewares=vet-www-redirect \
 -l "traefik.http.middlewares.vet-www-redirect.redirectregex.regex=^https://www\\.$D/(.*)" \
 -l "traefik.http.middlewares.vet-www-redirect.redirectregex.replacement=https://$D/\${1}" \
 -l traefik.http.middlewares.vet-www-redirect.redirectregex.permanent=true \
 -l traefik.http.services.vet.loadbalancer.server.port=8081 \
 alpine/socat TCP-LISTEN:8081,fork,reuseaddr TCP:172.17.0.1:8081
