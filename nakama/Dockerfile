FROM node:18-alpine AS builder
WORKDIR /build
COPY data/package.json data/package-lock.json* ./
RUN npm ci
COPY data/ ./
RUN npx tsc

FROM registry.heroiclabs.com/heroiclabs/nakama:3.21.1
COPY --from=builder /build/dist/ /nakama/modules/
COPY local.yml /nakama/local.yml
ENTRYPOINT []
CMD ["/nakama/nakama", "--config", "/nakama/local.yml"]
