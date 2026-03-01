from app.models.schemas import (
    XPCalcRequest,
    XPCalcResponse,
    LevelUpRequest,
    LevelUpResponse,
    TalentAllocationRequest,
    TalentAllocationResponse,
)


class ProgressionService:
    """Handles XP calculation, level-up logic, and talent tree allocation."""

    # Base XP per enemy
    BASE_XP_PER_ENEMY = 25

    # Stats gained per level
    STATS_PER_LEVEL = {
        "strength": 2,
        "agility": 2,
        "intellect": 2,
        "vitality": 2,
        "luck": 2,
    }

    @staticmethod
    def xp_for_level(level: int) -> int:
        """Calculate the total XP required to reach the given level.

        Formula: level * level * 100
        """
        return level * level * 100

    def calculate_xp(self, request: XPCalcRequest) -> XPCalcResponse:
        """Calculate XP earned from a dungeon run.

        Formula: base * floor_mult * (1 + combo_bonus) * (1 + time_bonus) * (1 + corruption_bonus)
        """
        base = request.enemies_defeated * self.BASE_XP_PER_ENEMY
        floor_mult = 1.0 + (request.floor_level * 0.1)
        combo_bonus = request.combo_count * 0.02  # 2% per combo
        time_mult = 1.0 + request.time_bonus
        corruption_mult = 1.0 + request.corruption_bonus

        total = int(base * floor_mult * (1.0 + combo_bonus) * time_mult * corruption_mult)

        breakdown = {
            "base_xp": base,
            "floor_multiplier": floor_mult,
            "combo_bonus": combo_bonus,
            "time_multiplier": time_mult,
            "corruption_multiplier": corruption_mult,
            "enemies_defeated": request.enemies_defeated,
        }

        return XPCalcResponse(xp_earned=total, breakdown=breakdown)

    def level_up(self, request: LevelUpRequest) -> LevelUpResponse:
        """Process XP addition and level-up(s).

        Grants +2 to all stats per level gained.
        """
        current_level = request.current_level
        current_xp = request.current_xp + request.xp_to_add
        levels_gained = 0

        while current_xp >= self.xp_for_level(current_level + 1):
            current_xp -= self.xp_for_level(current_level + 1)
            current_level += 1
            levels_gained += 1

        stat_increases = {
            stat: gain * levels_gained
            for stat, gain in self.STATS_PER_LEVEL.items()
        }

        return LevelUpResponse(
            new_level=current_level,
            new_xp=current_xp,
            levels_gained=levels_gained,
            stat_increases=stat_increases,
        )

    def allocate_talent(
        self, request: TalentAllocationRequest
    ) -> TalentAllocationResponse:
        """Allocate a talent point to a specific talent in a tree."""
        if request.available_points < 1:
            return TalentAllocationResponse(
                success=False,
                remaining_points=request.available_points,
                new_allocations=request.current_allocations,
            )

        new_allocations = dict(request.current_allocations)
        talent_key = f"{request.tree}.{request.talent_id}"
        current_points = new_allocations.get(talent_key, 0)
        new_allocations[talent_key] = current_points + 1

        return TalentAllocationResponse(
            success=True,
            remaining_points=request.available_points - 1,
            new_allocations=new_allocations,
        )
