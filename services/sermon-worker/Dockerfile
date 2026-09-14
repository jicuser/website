FROM node:24-bookworm-slim
RUN apt-get update && apt-get install --no-install-recommends -y ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /worker
COPY pipeline.mjs run.mjs ./
USER node
CMD ["node", "run.mjs"]
