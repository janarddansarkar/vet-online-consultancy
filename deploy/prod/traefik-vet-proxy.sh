#!/bin/sh
# Routes https://213-210-37-157.nip.io through the server's existing Traefik (ports 80/443, Let's Encrypt)
# to the Nginx listener on the Docker bridge (172.17.0.1:8081, see nginx-vps.conf).
D=213-210-37-157.nip.io
docker run -d --name vet-proxy --restart unless-stopped \
 -l traefik.enable=true \
 -l "traefik.http.routers.vet.rule=Host(\`$D\`)" \
 -l traefik.http.routers.vet.entrypoints=websecure \
 -l traefik.http.routers.vet.tls=true \
 -l traefik.http.routers.vet.tls.certresolver=letsencrypt \
 -l traefik.http.services.vet.loadbalancer.server.port=8081 \
 alpine/socat TCP-LISTEN:8081,fork,reuseaddr TCP:172.17.0.1:8081
