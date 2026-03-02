def apply_talents(base_stats: dict, talents: list[str]) -> dict:
    stats = base_stats.copy()
    talent_bonuses = {
        "shadow_mastery": {"shadow_dmg_multiplier": 1.15},
        "critical_edge": {"crit_rate": base_stats.get("crit_rate", 0) + 0.05},
        "iron_will": {"max_hp": base_stats.get("max_hp", 0) + 50},
    }
    for talent in talents:
        if talent in talent_bonuses:
            for stat, value in talent_bonuses[talent].items():
                stats[stat] = value
    return stats
