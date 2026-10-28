FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
COPY backend/clusterops-ai/package*.json ./
RUN npm ci --legacy-peer-deps

FROM deps AS build
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
COPY backend/clusterops-ai ./
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4111
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/.mastra ./.mastra
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/skills-lock.json ./skills-lock.json
RUN chown -R node:node /app
USER node
EXPOSE 4111
CMD ["npm", "run", "start"]
