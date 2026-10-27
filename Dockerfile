# ─────────────────────────────────────────────────────────────────────────────
# İzdera SearXNG — Ana Dizin Dockerfile (Render / Koyeb / Fly.io / Railway)
# ─────────────────────────────────────────────────────────────────────────────
FROM searxng/searxng:latest

COPY searxng/settings.yml /etc/searxng/settings.yml

ENV BIND_ADDRESS=0.0.0.0:8080
ENV SEARXNG_SETTINGS_PATH=/etc/searxng/settings.yml

EXPOSE 8080
