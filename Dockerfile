# Production image. For development, see the README.
#
#   docker build -t beanlog .
#   docker run -p 3000:3000 -e DATABASE_URL=... -e SESSION_SECRET=... beanlog

FROM docker.io/library/node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM docker.io/library/node:24-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM deps AS build
COPY . .
RUN npm run build

FROM docker.io/library/node:24-alpine
# tzdata: dates and "today" follow the TZ variable (e.g. TZ=America/Vancouver).
RUN apk add --no-cache tzdata
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY package.json server.js ./
COPY drizzle ./drizzle
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
USER node
EXPOSE 3000
# Health: GET /healthz returns 200 when the app can reach the database.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO /dev/null "http://127.0.0.1:${PORT}/healthz" || exit 1
CMD ["node", "server.js"]
