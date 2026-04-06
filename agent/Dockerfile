FROM node:22-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --omit=dev

# Copy agent source
COPY index.js ./

# Download VAD model files at build time (avoids cold-start delay)
RUN node index.js download-files || true

ENV NODE_ENV=production

# LiveKit agent worker — persistent process
CMD ["node", "index.js", "start"]
