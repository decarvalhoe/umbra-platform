#!/bin/sh
/nakama/nakama migrate up --config /nakama/local.yml
exec /nakama/nakama --config /nakama/local.yml
