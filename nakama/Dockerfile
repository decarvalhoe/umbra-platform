FROM node:18-alpine AS builder
WORKDIR /build
COPY data/package.json data/package-lock.json* ./
RUN npm ci
COPY data/ ./
RUN npx tsc

FROM registry.heroiclabs.com/heroiclabs/nakama:3.21.1
COPY --from=builder /build/dist/ /nakama/data/modules/
COPY local.yml /nakama/data/local.yml
CMD ["/nakama/nakama", "--config", "/nakama/data/local.yml", "--database.address", "nakama:vROm2ee0HDmJErx@umbra-postgres.flycast:5432/nakama"]
