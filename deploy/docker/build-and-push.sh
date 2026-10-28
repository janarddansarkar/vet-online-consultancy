#!/usr/bin/env bash
# Builds the backend and web images and pushes them to Docker Hub. Run from anywhere on your laptop:
#   docker login
#   cp deploy/docker/.env.example deploy/docker/.env    # fill in DOCKERHUB_USER, DOMAIN, VITE_* (local file, never commit)
#   deploy/docker/build-and-push.sh                      # pushes :latest
#   TAG=v2 deploy/docker/build-and-push.sh               # or a specific version tag
# PLATFORM must match the VPS CPU: linux/amd64 for most VPSes, linux/arm64 for ARM ones (check: uname -m on the VPS).
set -euo pipefail

cd "$(dirname "$0")/../.."
set -a; source deploy/docker/.env; set +a
: "${DOCKERHUB_USER:?set DOCKERHUB_USER in deploy/docker/.env}"
: "${DOMAIN:?set DOMAIN in deploy/docker/.env}"
TAG="${TAG:-latest}"
PLATFORM="${PLATFORM:-linux/amd64}"

docker buildx build --platform "$PLATFORM" --push \
  -f deploy/docker/Dockerfile.backend -t "$DOCKERHUB_USER/vet-backend:$TAG" .

docker buildx build --platform "$PLATFORM" --push \
  -f deploy/docker/Dockerfile.web -t "$DOCKERHUB_USER/vet-web:$TAG" \
  --build-arg "VITE_SITE_URL=https://$DOMAIN" \
  --build-arg "VITE_DOCTOR_WHATSAPP=${VITE_DOCTOR_WHATSAPP:-}" \
  --build-arg "VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID:-}" .

echo "Pushed $DOCKERHUB_USER/vet-backend:$TAG and $DOCKERHUB_USER/vet-web:$TAG"
