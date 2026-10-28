FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
COPY frontend-copilotkit/package*.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
ENV NEXT_TELEMETRY_DISABLED=1
COPY frontend-copilotkit ./
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "server.js"]
