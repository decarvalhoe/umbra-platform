# Event System — Project Umbra

> Void Calendar, Seasonal Story Events, Void Festival, Companion Birthdays

---

## Event Types

| Type | Duration | Frequency | Description |
|------|----------|-----------|-------------|
| Seasonal Story Event | 14 days | Every 6 weeks | Branching narrative with route choices. Free 4-star companion on completion. |
| Void Festival | 7 days | Annual | AI-generated companion gift messages. Exclusive cosmetics. |
| Companion Birthday | 24 hours | Per companion (annual) | Special Hub dialogue + time-limited quest. |
| Arena Season Reset | Weekly | Every Monday | Rank reset + tier-based reward distribution. |
| Double Drop Weekend | 48 hours | Monthly | Specific dungeons drop double runes/materials. |

---

## Event Architecture

Events are JSON-configured on the backend — no client update required.

```json
{
  "event_id": "shadow_festival_2026",
  "type": "seasonal_story",
  "title": "The Shadow Festival",
  "start_date": "2026-06-01T00:00:00Z",
  "end_date": "2026-06-14T23:59:59Z",
  "banner_id": "summer_kaelan_banner",
  "free_reward_companion_id": "lyra_summer",
  "routes": ["kaelan", "lyra", "nyx"],
  "ai_director_template": "seasonal_festival_narrative"
}
```

### Status Flow

`upcoming` (before start_date) → `active` (between dates) → `ended` (after end_date)

---

## Seasonal Story Events

- Player chooses a **companion route** (Kaelan, Lyra, Nyx, etc.)
- 12 quests per event, narrative branches based on route
- AI Director generates dialogue from template + player context
- Completion grants a free 4-star companion

---

## Void Festival

- Annual event, 7 days
- Each owned companion sends a unique AI-generated gift message
- Message quality scales with Resonance Level
- Gifts are animated reveal boxes in the EventHub UI
- Rewards: exclusive cosmetics (aura, profile title)

---

## Companion Birthdays

| Companion | Date |
|-----------|------|
| Kaelan | July 17 |
| Lyra | November 3 |
| Nyx | March 15 |
| Seraphina | May 28 |
| Ronan | September 9 |

- 24-hour event with special Hub dialogue
- Unique time-limited quest
- Exclusive birthday skin reward

---

## Progress Tracking

Per-player event progress includes:
- Quests completed / total
- Chosen route (for story events)
- Rewards claimed (by reward ID)

---

## Client UI (EventHub)

- Accessible from Hub via "Événements" button
- List view: sorted by status (active > upcoming > ended)
- Event cards show: banner icon, title, status badge, timer, progress bar
- Detail view: description, progress, route selection, rewards, festival gifts
- Void Festival gifts: animated gift box → companion message reveal
