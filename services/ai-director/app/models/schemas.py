from pydantic import BaseModel, Field


class QuestGenerateRequest(BaseModel):
    player_level: int
    player_class: str
    current_zone: str
    difficulty: str = "normal"
    context: dict | None = None


class QuestGenerateResponse(BaseModel):
    quest_id: str
    title: str
    description: str
    objectives: list[str]
    rewards: dict
    difficulty: str


class DungeonGenerateRequest(BaseModel):
    floor_level: int
    corruption: float
    player_level: int
    rune_cards: list[str] | None = None


class DungeonGenerateResponse(BaseModel):
    layout_id: str
    rooms: list[dict]
    enemies: list[dict]
    rune_placements: list[dict]
    corruption_effects: list[str]


class NarrativeEventRequest(BaseModel):
    event_type: str
    player_context: dict
    current_zone: str


class NarrativeEventChoice(BaseModel):
    label: str
    consequence: str
    risk_level: str


class NarrativeEventResponse(BaseModel):
    event_id: str
    narrative: str
    choices: list[NarrativeEventChoice]


class DirectorEvaluateRequest(BaseModel):
    session_stats: dict
    player_profile: dict
    recent_actions: list[str]


class DirectorEvaluateResponse(BaseModel):
    difficulty_adjustment: float = Field(ge=-1.0, le=1.0)
    recommendations: list[str]
    engagement_score: float


class ContentRecommendRequest(BaseModel):
    player_id: str
    player_level: int
    play_style: str
    recent_content: list[str]


class ContentRecommendation(BaseModel):
    content_type: str
    content_id: str
    reason: str
    priority: int


class ContentRecommendResponse(BaseModel):
    recommendations: list[ContentRecommendation]
