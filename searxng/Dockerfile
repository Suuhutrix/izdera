# ─────────────────────────────────────────────────────────────────────────────
# İzdera SearXNG — Ücretsiz Bulut Dağıtımı (Render / Koyeb / Fly.io / HF Spaces)
# ─────────────────────────────────────────────────────────────────────────────
FROM searxng/searxng:latest

# Özel İzdera ayarlarını (JSON formatı açık, limiter kapalı) imaja göm
COPY settings.yml /etc/searxng/settings.yml

ENV BIND_ADDRESS=0.0.0.0:8080
ENV SEARXNG_SETTINGS_PATH=/etc/searxng/settings.yml

EXPOSE 8080

