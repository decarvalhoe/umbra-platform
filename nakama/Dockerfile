FROM node:18-alpine AS builder
WORKDIR /build
COPY data/package.json data/package-lock.json* ./
RUN npm ci
COPY data/ ./
RUN npx tsc

FROM registry.heroiclabs.com/heroiclabs/nakama:3.21.1
COPY --from=builder /build/dist/ /nakama/data/modules/
COPY local.yml /nakama/local.yml
COPY start.sh /nakama/start.sh
RUN chmod +x /nakama/start.sh
ENTRYPOINT []
CMD ["/nakama/start.sh"]
