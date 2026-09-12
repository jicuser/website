FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --chown=node:node server.mjs destinations.mjs ./
USER node
EXPOSE 8787
CMD ["node", "server.mjs"]
