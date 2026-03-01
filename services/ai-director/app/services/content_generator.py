import json
import uuid
import logging

from app.services.llm_client import LLMClient
from app.models.schemas import (
    QuestGenerateRequest,
    QuestGenerateResponse,
    DungeonGenerateRequest,
    DungeonGenerateResponse,
    NarrativeEventRequest,
    NarrativeEventResponse,
    NarrativeEventChoice,
    DirectorEvaluateRequest,
    DirectorEvaluateResponse,
    ContentRecommendRequest,
    ContentRecommendResponse,
    ContentRecommendation,
)

logger = logging.getLogger(__name__)

UMBRA_SYSTEM_PROMPT = (
    "You are the AI Director for Umbra, a dark fantasy roguelike game with "
    "rune magic and a corruption mechanic. The world is shrouded in perpetual "
    "twilight where ancient rune magic is the only force holding back the Void "
    "corruption. Players descend into procedurally generated dungeons, collect "
    "rune cards to augment their abilities, and face increasingly corrupted "
    "enemies. Four elemental forces govern combat: Fire, Shadow, Blood, and Void. "
    "Corruption warps both the environment and enemies, creating unique challenges. "
    "Your role is to generate engaging, contextually appropriate content that "
    "adapts to player skill and progression. Always respond with valid JSON."
)


class ContentGenerator:
    """Generates game content using an LLM backend."""

    def __init__(self, llm: LLMClient) -> None:
        self.llm = llm

    def _parse_json(self, text: str) -> dict:
        """Extract and parse JSON from LLM response text."""
        text = text.strip()
        # Handle markdown code blocks
        if "```json" in text:
            text = text.split("```json", 1)[1]
            text = text.split("```", 1)[0]
        elif "```" in text:
            text = text.split("```", 1)[1]
            text = text.split("```", 1)[0]
        return json.loads(text.strip())

    async def generate_quest(
        self, request: QuestGenerateRequest
    ) -> QuestGenerateResponse:
        """Generate a quest tailored to the player's context."""
        prompt = (
            f"Generate a quest for a level {request.player_level} "
            f"{request.player_class} in the {request.current_zone} zone. "
            f"Difficulty: {request.difficulty}.\n"
        )
        if request.context:
            prompt += f"Additional context: {json.dumps(request.context)}\n"
        prompt += (
            "Respond with JSON containing: title (string), description (string), "
            "objectives (list of strings, 2-4 items), rewards (object with xp, "
            "gold, and optional item keys), difficulty (string)."
        )

        raw = await self.llm.generate(prompt, system=UMBRA_SYSTEM_PROMPT)
        try:
            data = self._parse_json(raw)
        except (json.JSONDecodeError, IndexError):
            logger.error("Failed to parse quest JSON from LLM response: %s", raw)
            data = {
                "title": "The Corrupted Path",
                "description": (
                    "A mysterious corruption spreads through the nearby ruins. "
                    "Investigate its source and put an end to it."
                ),
                "objectives": [
                    "Explore the corrupted ruins",
                    "Defeat the corruption source",
                    "Return to the quest giver",
                ],
                "rewards": {"xp": request.player_level * 100, "gold": request.player_level * 50},
                "difficulty": request.difficulty,
            }

        return QuestGenerateResponse(
            quest_id=str(uuid.uuid4()),
            title=data.get("title", "Unknown Quest"),
            description=data.get("description", ""),
            objectives=data.get("objectives", []),
            rewards=data.get("rewards", {}),
            difficulty=data.get("difficulty", request.difficulty),
        )

    async def generate_dungeon(
        self, request: DungeonGenerateRequest
    ) -> DungeonGenerateResponse:
        """Generate a dungeon layout for the given floor."""
        prompt = (
            f"Generate a dungeon layout for floor {request.floor_level} with "
            f"corruption level {request.corruption:.2f} for a level "
            f"{request.player_level} player.\n"
        )
        if request.rune_cards:
            prompt += f"Player's rune cards: {', '.join(request.rune_cards)}\n"
        prompt += (
            "Respond with JSON containing: rooms (list of objects with id, type, "
            "connections, and description), enemies (list of objects with id, name, "
            "level, element, and hp), rune_placements (list of objects with room_id "
            "and rune_type), corruption_effects (list of strings describing "
            "environmental effects)."
        )

        raw = await self.llm.generate(prompt, system=UMBRA_SYSTEM_PROMPT)
        try:
            data = self._parse_json(raw)
        except (json.JSONDecodeError, IndexError):
            logger.error("Failed to parse dungeon JSON from LLM response: %s", raw)
            room_count = min(3 + request.floor_level, 10)
            data = {
                "rooms": [
                    {
                        "id": f"room_{i}",
                        "type": "combat" if i % 2 == 0 else "treasure",
                        "connections": [f"room_{i + 1}"] if i < room_count - 1 else [],
                        "description": f"A dark chamber on floor {request.floor_level}.",
                    }
                    for i in range(room_count)
                ],
                "enemies": [
                    {
                        "id": f"enemy_{i}",
                        "name": "Corrupted Shade",
                        "level": request.player_level,
                        "element": "shadow",
                        "hp": 100 + request.floor_level * 20,
                    }
                    for i in range(room_count // 2)
                ],
                "rune_placements": [],
                "corruption_effects": [
                    "Shadows writhe along the walls",
                    "The air tastes of ash and iron",
                ],
            }

        return DungeonGenerateResponse(
            layout_id=str(uuid.uuid4()),
            rooms=data.get("rooms", []),
            enemies=data.get("enemies", []),
            rune_placements=data.get("rune_placements", []),
            corruption_effects=data.get("corruption_effects", []),
        )

    async def generate_narrative_event(
        self, request: NarrativeEventRequest
    ) -> NarrativeEventResponse:
        """Generate a narrative event with player choices."""
        prompt = (
            f"Generate a {request.event_type} narrative event in the "
            f"{request.current_zone} zone.\n"
            f"Player context: {json.dumps(request.player_context)}\n"
            "Respond with JSON containing: narrative (string, 2-3 paragraphs of "
            "atmospheric text), choices (list of 2-4 objects each with label, "
            "consequence, and risk_level where risk_level is low/medium/high)."
        )

        raw = await self.llm.generate(prompt, system=UMBRA_SYSTEM_PROMPT)
        try:
            data = self._parse_json(raw)
        except (json.JSONDecodeError, IndexError):
            logger.error("Failed to parse narrative JSON from LLM response: %s", raw)
            data = {
                "narrative": (
                    "A figure emerges from the shadows ahead, cloaked in tattered "
                    "robes that shimmer with residual rune energy. They raise a hand "
                    "in greeting, though their eyes betray a desperate urgency."
                ),
                "choices": [
                    {
                        "label": "Approach cautiously",
                        "consequence": "The figure reveals a hidden passage",
                        "risk_level": "low",
                    },
                    {
                        "label": "Demand answers",
                        "consequence": "A tense confrontation that may turn hostile",
                        "risk_level": "medium",
                    },
                    {
                        "label": "Attack preemptively",
                        "consequence": "Immediate combat with a powerful foe",
                        "risk_level": "high",
                    },
                ],
            }

        choices = [
            NarrativeEventChoice(**c) for c in data.get("choices", [])
        ]

        return NarrativeEventResponse(
            event_id=str(uuid.uuid4()),
            narrative=data.get("narrative", ""),
            choices=choices,
        )

    async def evaluate_session(
        self, request: DirectorEvaluateRequest
    ) -> DirectorEvaluateResponse:
        """Evaluate a player session and recommend difficulty adjustments."""
        prompt = (
            "Evaluate the following game session and provide difficulty "
            "adjustment recommendations.\n"
            f"Session stats: {json.dumps(request.session_stats)}\n"
            f"Player profile: {json.dumps(request.player_profile)}\n"
            f"Recent actions: {json.dumps(request.recent_actions)}\n"
            "Respond with JSON containing: difficulty_adjustment (float between "
            "-1.0 and 1.0, negative means easier, positive means harder), "
            "recommendations (list of strings with specific suggestions), "
            "engagement_score (float between 0.0 and 1.0)."
        )

        raw = await self.llm.generate(prompt, system=UMBRA_SYSTEM_PROMPT)
        try:
            data = self._parse_json(raw)
        except (json.JSONDecodeError, IndexError):
            logger.error("Failed to parse evaluation JSON from LLM response: %s", raw)
            data = {
                "difficulty_adjustment": 0.0,
                "recommendations": ["Maintain current difficulty settings"],
                "engagement_score": 0.5,
            }

        adjustment = max(-1.0, min(1.0, float(data.get("difficulty_adjustment", 0.0))))

        return DirectorEvaluateResponse(
            difficulty_adjustment=adjustment,
            recommendations=data.get("recommendations", []),
            engagement_score=max(
                0.0, min(1.0, float(data.get("engagement_score", 0.5)))
            ),
        )

    async def recommend_content(
        self, request: ContentRecommendRequest
    ) -> ContentRecommendResponse:
        """Recommend content based on the player profile and play style."""
        prompt = (
            f"Recommend game content for player {request.player_id} "
            f"(level {request.player_level}, play style: {request.play_style}).\n"
            f"Recently completed content: {json.dumps(request.recent_content)}\n"
            "Respond with JSON containing: recommendations (list of objects each "
            "with content_type, content_id, reason, and priority where priority "
            "is an integer 1-10)."
        )

        raw = await self.llm.generate(prompt, system=UMBRA_SYSTEM_PROMPT)
        try:
            data = self._parse_json(raw)
        except (json.JSONDecodeError, IndexError):
            logger.error("Failed to parse recommendation JSON from LLM response: %s", raw)
            data = {
                "recommendations": [
                    {
                        "content_type": "dungeon",
                        "content_id": "dungeon_standard",
                        "reason": "Suitable for current player level",
                        "priority": 5,
                    }
                ]
            }

        recs = [
            ContentRecommendation(**r) for r in data.get("recommendations", [])
        ]

        return ContentRecommendResponse(recommendations=recs)
