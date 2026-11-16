
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production PORT=3000

# Create the application user first
RUN addgroup -S crm && adduser -S crm -G crm

# Install production dependencies
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy application files with ownership already assigned
COPY --chown=crm:crm server.mjs ./server.mjs
COPY --chown=crm:crm src/utils/serverData.mjs ./src/utils/serverData.mjs
COPY --from=build --chown=crm:crm /app/dist ./dist

USER crm

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
