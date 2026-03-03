#!/bin/sh
/nakama/nakama migrate up -database.address "nakama:vROm2ee0HDmJErx@umbra-postgres.flycast:5432/nakama"
exec /nakama/nakama --config /nakama/local.yml
