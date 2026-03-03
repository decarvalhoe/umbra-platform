#!/bin/sh
/nakama/nakama --config /nakama/local.yml migrate up
exec /nakama/nakama --config /nakama/local.yml
