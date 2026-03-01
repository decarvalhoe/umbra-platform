import json
import random
import logging
from pathlib import Path

from app.models.schemas import (
    GachaPool,
    GachaItem,
    GachaDrawRequest,
    GachaDrawResponse,
)

logger = logging.getLogger(__name__)


class GachaSystem:
    """Weighted random gacha draw system with pity mechanic."""

    def __init__(self, pools_path: str) -> None:
        self._pools: dict[str, GachaPool] = {}
        self._load_pools(pools_path)

    def _load_pools(self, pools_path: str) -> None:
        """Load gacha pool definitions from a JSON file."""
        path = Path(pools_path)
        if not path.exists():
            logger.warning("Gacha pools file not found at %s", pools_path)
            return

        with open(path, "r", encoding="utf-8") as f:
            raw_pools = json.load(f)

        for raw in raw_pools:
            pool = GachaPool(**raw)
            self._pools[pool.id] = pool

        logger.info("Loaded %d gacha pools", len(self._pools))

    def get_pools(self) -> list[GachaPool]:
        """Return all available gacha pools."""
        return list(self._pools.values())

    def _weighted_draw(self, items: list[GachaItem]) -> GachaItem:
        """Perform a single weighted random draw from the item list."""
        weights = [item.weight for item in items]
        chosen = random.choices(items, weights=weights, k=1)
        return chosen[0]

    def _force_legendary(self, items: list[GachaItem]) -> GachaItem:
        """Force a legendary draw for pity system."""
        legendary_items = [i for i in items if i.rarity == "legendary"]
        if not legendary_items:
            # Fallback: highest rarity available
            return self._weighted_draw(items)
        return random.choice(legendary_items)

    def draw(self, request: GachaDrawRequest) -> GachaDrawResponse:
        """Execute one or more gacha draws with pity system."""
        pool = self._pools.get(request.pool_id)
        if pool is None:
            raise ValueError(f"Unknown gacha pool: {request.pool_id}")

        drawn_items: list[GachaItem] = []
        pity = request.pity_counter
        guaranteed = False

        for _ in range(request.num_draws):
            pity += 1

            if pity >= pool.pity_threshold:
                # Pity triggered: guarantee a legendary
                item = self._force_legendary(pool.items)
                pity = 0
                guaranteed = True
            else:
                item = self._weighted_draw(pool.items)
                # Reset pity counter if player naturally pulls legendary
                if item.rarity == "legendary":
                    pity = 0

            drawn_items.append(item)

        return GachaDrawResponse(
            items=drawn_items,
            new_pity_counter=pity,
            guaranteed_legendary=guaranteed,
        )
