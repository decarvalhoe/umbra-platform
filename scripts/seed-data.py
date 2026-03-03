#!/usr/bin/env python3
"""Seed test data into the Umbra platform services.

Idempotent — safe to run multiple times. Creates test users, populates
gacha pools, and generates sample AI content.

Usage:
    python scripts/seed-data.py
    python scripts/seed-data.py --nakama-url http://localhost:7350
"""

import argparse
import json
import sys
import time

try:
    import httpx
except ImportError:
    print("httpx is required: pip install httpx")
    sys.exit(1)


DEFAULT_NAKAMA_URL = "http://localhost:7350"
DEFAULT_AI_DIRECTOR_URL = "http://localhost:8001"
DEFAULT_GAME_LOGIC_URL = "http://localhost:8002"

NAKAMA_SERVER_KEY = "defaultkey"

TEST_USERS = [
    {"username": "test_warrior", "email": "warrior@test.com", "password": "test12345"},
    {"username": "test_mage", "email": "mage@test.com", "password": "test12345"},
    {"username": "test_sentinel", "email": "sentinel@test.com", "password": "test12345"},
]

CONTENT_TYPES = ["quests_easy", "quests_medium", "dungeons_5room", "narratives_combat"]


def seed_users(nakama_url: str) -> list[str]:
    """Create test user accounts via Nakama API. Returns session tokens."""
    tokens = []
    for user in TEST_USERS:
        try:
            resp = httpx.post(
                f"{nakama_url}/v2/account/authenticate/email",
                params={"create": "true", "username": user["username"]},
                json={"email": user["email"], "password": user["password"]},
                auth=(NAKAMA_SERVER_KEY, ""),
                timeout=10,
            )
            if resp.status_code == 200:
                token = resp.json().get("token", "")
                tokens.append(token)
                print(f"  [OK] User '{user['username']}' ready")
            else:
                print(f"  [WARN] User '{user['username']}': {resp.status_code} {resp.text[:100]}")
        except httpx.ConnectError:
            print(f"  [FAIL] Cannot connect to Nakama at {nakama_url}")
            break
    return tokens


def seed_ai_content(ai_director_url: str) -> None:
    """Trigger content pre-generation in the AI Director pools."""
    for content_type in CONTENT_TYPES:
        try:
            resp = httpx.post(
                f"{ai_director_url}/api/v1/content/pool/{content_type}/replenish",
                params={"count": 3},
                timeout=30,
            )
            if resp.status_code in (200, 202):
                print(f"  [OK] Replenished pool '{content_type}'")
            elif resp.status_code == 404:
                print(f"  [SKIP] Content type '{content_type}' not available")
            else:
                print(f"  [WARN] Pool '{content_type}': {resp.status_code}")
        except httpx.ConnectError:
            print(f"  [FAIL] Cannot connect to AI Director at {ai_director_url}")
            break


def check_health(url: str, name: str) -> bool:
    """Check if a service is healthy."""
    try:
        resp = httpx.get(f"{url}/health", timeout=5)
        if resp.status_code == 200:
            print(f"  [OK] {name} is healthy")
            return True
        print(f"  [WARN] {name} returned {resp.status_code}")
        return False
    except httpx.ConnectError:
        print(f"  [DOWN] {name} at {url}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Seed Umbra platform with test data")
    parser.add_argument("--nakama-url", default=DEFAULT_NAKAMA_URL, help="Nakama server URL")
    parser.add_argument("--ai-director-url", default=DEFAULT_AI_DIRECTOR_URL, help="AI Director URL")
    parser.add_argument("--game-logic-url", default=DEFAULT_GAME_LOGIC_URL, help="Game Logic URL")
    args = parser.parse_args()

    print("=== Checking service health ===")
    check_health(args.game_logic_url, "Game Logic")
    check_health(args.ai_director_url, "AI Director")

    print("\n=== Seeding test users ===")
    tokens = seed_users(args.nakama_url)
    print(f"  Created/verified {len(tokens)} users")

    print("\n=== Seeding AI content pools ===")
    seed_ai_content(args.ai_director_url)

    print("\n=== Seed complete ===")


if __name__ == "__main__":
    main()
