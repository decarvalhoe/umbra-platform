import { useState, useMemo } from "react";
import type {
  GameEvent,
  EventProgress,
  EventStatus,
  FestivalGift,
} from "../types/game";
import { COMPANIONS } from "./RomancePanel";
import "./EventHub.css";

interface EventHubProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Stub data ───────────────────────────────────────────────────

const NOW = new Date("2026-03-03T12:00:00Z");

const STUB_EVENTS: GameEvent[] = [
  {
    eventId: "shadow_festival_2026",
    type: "seasonal_story",
    title: "Le Festival des Ombres",
    description: "Une faille s'ouvre dans le Vide. Kaelan, Lyra et Nyx découvrent un secret enfoui sous la Forge. Vos choix détermineront le destin du Festival.",
    startDate: "2026-02-25T00:00:00Z",
    endDate: "2026-03-10T23:59:59Z",
    bannerColor: "#b39ddb",
    bannerIcon: "✦",
    rewards: [
      { id: "sr1", label: "Lyra d'Été (4★)", description: "Compagnonne gratuite", icon: "✦", claimed: false, requiresCompletion: true },
      { id: "sr2", label: "500 Éclats d'Ombre", description: "Premium currency", icon: "◇", claimed: true },
      { id: "sr3", label: "Cadre de profil", description: "Cosmétique exclusif", icon: "🖼", claimed: false },
    ],
    routes: ["kaelan", "lyra", "nyx"],
  },
  {
    eventId: "void_festival_annual",
    type: "void_festival",
    title: "Void Festival — Nuit Éternelle",
    description: "Chaque compagnon vous envoie un message unique généré par l'IA. Ouvrez vos cadeaux avant la fin du Festival.",
    startDate: "2026-03-01T00:00:00Z",
    endDate: "2026-03-07T23:59:59Z",
    bannerColor: "#ff2d78",
    bannerIcon: "♡",
    rewards: [
      { id: "vf1", label: "Aura Nuit Éternelle", description: "Effet visuel limité", icon: "🌙", claimed: false },
      { id: "vf2", label: "Titre: Élu·e du Vide", description: "Titre de profil", icon: "⬡", claimed: false },
    ],
  },
  {
    eventId: "nyx_birthday_2026",
    type: "companion_birthday",
    title: "Anniversaire de Nyx",
    description: "Nyx fête son anniversaire dans l'ombre. Une quête spéciale vous attend dans le Hub.",
    startDate: "2026-03-15T00:00:00Z",
    endDate: "2026-03-15T23:59:59Z",
    bannerColor: "#ffe135",
    bannerIcon: "🌙",
    rewards: [
      { id: "nb1", label: "Skin Nyx Doré", description: "Skin anniversaire", icon: "🌙", claimed: false },
    ],
    companionId: "nyx",
  },
  {
    eventId: "double_drop_march",
    type: "double_drop",
    title: "Week-end Double Drop",
    description: "Tous les donjons lâchent le double de runes et matériaux ce week-end.",
    startDate: "2026-03-07T00:00:00Z",
    endDate: "2026-03-09T00:00:00Z",
    bannerColor: "#00bcd4",
    bannerIcon: "×2",
    rewards: [],
  },
  {
    eventId: "arena_reset_w10",
    type: "arena_reset",
    title: "Reset Arena — Semaine 10",
    description: "Les classements de la Void Arena sont réinitialisés. Récompenses distribuées selon votre rang.",
    startDate: "2026-03-03T00:00:00Z",
    endDate: "2026-03-03T23:59:59Z",
    bannerColor: "#4caf50",
    bannerIcon: "⚔",
    rewards: [
      { id: "ar1", label: "200 Void Shards", description: "Selon rang Gold", icon: "◇", claimed: false },
    ],
  },
];

const STUB_PROGRESS: Record<string, EventProgress> = {
  shadow_festival_2026: {
    eventId: "shadow_festival_2026",
    questsCompleted: 5,
    questsTotal: 12,
    chosenRoute: "lyra",
    rewardsClaimed: ["sr2"],
  },
  void_festival_annual: {
    eventId: "void_festival_annual",
    questsCompleted: 3,
    questsTotal: 5,
    rewardsClaimed: [],
  },
};

const STUB_GIFTS: FestivalGift[] = [
  { companionId: "kaelan", companionName: "Kaelan", message: "Je ne suis pas doué avec les mots. Mais cette lame... elle dit ce que je ne peux pas.", giftName: "Dague Embrasée", giftIcon: "🔥", revealed: true },
  { companionId: "lyra", companionName: "Lyra", message: "J'ai trouvé cette page dans un grimoire interdit. Elle parle d'une étoile qui brille plus fort quand elle est observée. Comme toi.", giftName: "Page Étoilée", giftIcon: "✦", revealed: true },
  { companionId: "nyx", companionName: "Nyx", message: "", giftName: "???", giftIcon: "🎁", revealed: false },
  { companionId: "seraphina", companionName: "Seraphina", message: "", giftName: "???", giftIcon: "🎁", revealed: false },
  { companionId: "ronan", companionName: "Ronan", message: "", giftName: "???", giftIcon: "🎁", revealed: false },
];

// ── Helpers ──────────────────────────────────────────────────────

function getEventStatus(event: GameEvent): EventStatus {
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  if (NOW < start) return "upcoming";
  if (NOW > end) return "ended";
  return "active";
}

function getTimeRemaining(event: GameEvent): string {
  const end = new Date(event.endDate);
  const diff = end.getTime() - NOW.getTime();
  if (diff <= 0) return "Terminé";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}j ${hours}h`;
  return `${hours}h`;
}

const TYPE_LABELS: Record<string, string> = {
  seasonal_story: "Événement Saisonnier",
  void_festival: "Void Festival",
  companion_birthday: "Anniversaire",
  arena_reset: "Reset Arena",
  double_drop: "Double Drop",
};

const STATUS_LABELS: Record<EventStatus, string> = {
  upcoming: "À venir",
  active: "En cours",
  ended: "Terminé",
};

// ── Component ───────────────────────────────────────────────────

export function EventHub({ isOpen, onClose }: EventHubProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [gifts, setGifts] = useState<FestivalGift[]>(STUB_GIFTS);
  const [showGiftReveal, setShowGiftReveal] = useState<string | null>(null);

  const sortedEvents = useMemo(() => {
    return [...STUB_EVENTS].sort((a, b) => {
      const statusOrder: Record<EventStatus, number> = { active: 0, upcoming: 1, ended: 2 };
      const sa = getEventStatus(a);
      const sb = getEventStatus(b);
      if (statusOrder[sa] !== statusOrder[sb]) return statusOrder[sa] - statusOrder[sb];
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
  }, []);

  const companionMap = useMemo(
    () => new Map(COMPANIONS.map((c) => [c.id, c])),
    []
  );

  const handleRevealGift = (companionId: string) => {
    // TODO: Call POST /ai/event/festival-gift to get AI-generated message
    setGifts((prev) =>
      prev.map((g) =>
        g.companionId === companionId
          ? {
              ...g,
              revealed: true,
              message: `[Message IA généré pour ${g.companionName} — En attente du backend #99]`,
              giftName: "Cadeau du Vide",
              giftIcon: "✧",
            }
          : g
      )
    );
    setShowGiftReveal(companionId);
    setTimeout(() => setShowGiftReveal(null), 3000);
  };

  if (!isOpen) return null;

  const selectedEvent = STUB_EVENTS.find((e) => e.eventId === selectedEventId);
  const selectedProgress = selectedEventId ? STUB_PROGRESS[selectedEventId] : undefined;

  return (
    <div className="eh-overlay" onClick={onClose}>
      <div className="eh-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="eh-header">
          <h2 className="eh-title">
            <span className="eh-title-icon">⬡</span>
            Calendrier du Vide
          </h2>
          <button className="eh-close" onClick={onClose}>×</button>
        </div>

        {/* Event list */}
        <div className="eh-content">
          {!selectedEvent ? (
            <div className="eh-event-list">
              {sortedEvents.map((event) => {
                const status = getEventStatus(event);
                const progress = STUB_PROGRESS[event.eventId];
                const companion = event.companionId ? companionMap.get(event.companionId) : null;

                return (
                  <button
                    key={event.eventId}
                    className={`eh-event-card eh-event-card--${status}`}
                    style={{ "--event-color": event.bannerColor } as React.CSSProperties}
                    onClick={() => setSelectedEventId(event.eventId)}
                  >
                    <div className="eh-event-banner">
                      <span className="eh-event-banner-icon">{event.bannerIcon}</span>
                    </div>
                    <div className="eh-event-info">
                      <div className="eh-event-meta">
                        <span className={`eh-event-status eh-event-status--${status}`}>
                          {STATUS_LABELS[status]}
                        </span>
                        <span className="eh-event-type">{TYPE_LABELS[event.type]}</span>
                      </div>
                      <h3 className="eh-event-title">{event.title}</h3>
                      {companion && (
                        <span className="eh-event-companion" style={{ color: companion.color }}>
                          {companion.glyph} {companion.name}
                        </span>
                      )}
                      <div className="eh-event-timer">
                        {status === "active" ? `⏱ ${getTimeRemaining(event)}` : status === "upcoming" ? `Début dans ${getTimeRemaining({ ...event, endDate: event.startDate })}` : "Terminé"}
                      </div>
                      {progress && (
                        <div className="eh-event-progress">
                          <div className="eh-progress-track">
                            <div
                              className="eh-progress-fill"
                              style={{ width: `${(progress.questsCompleted / progress.questsTotal) * 100}%` }}
                            />
                          </div>
                          <span className="eh-progress-label">
                            {progress.questsCompleted}/{progress.questsTotal}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Event detail view */
            <div className="eh-detail">
              <button className="eh-back" onClick={() => setSelectedEventId(null)}>
                ← Retour au calendrier
              </button>

              <div
                className="eh-detail-header"
                style={{ "--event-color": selectedEvent.bannerColor } as React.CSSProperties}
              >
                <span className="eh-detail-icon">{selectedEvent.bannerIcon}</span>
                <div>
                  <div className="eh-detail-meta">
                    <span className={`eh-event-status eh-event-status--${getEventStatus(selectedEvent)}`}>
                      {STATUS_LABELS[getEventStatus(selectedEvent)]}
                    </span>
                    <span className="eh-event-type">{TYPE_LABELS[selectedEvent.type]}</span>
                    <span className="eh-detail-timer">⏱ {getTimeRemaining(selectedEvent)}</span>
                  </div>
                  <h2 className="eh-detail-title">{selectedEvent.title}</h2>
                  <p className="eh-detail-desc">{selectedEvent.description}</p>
                </div>
              </div>

              {/* Progress */}
              {selectedProgress && (
                <div className="eh-detail-section">
                  <h3 className="eh-section-title">Progression</h3>
                  <div className="eh-detail-progress">
                    <div className="eh-progress-track eh-progress-track--lg">
                      <div
                        className="eh-progress-fill"
                        style={{ width: `${(selectedProgress.questsCompleted / selectedProgress.questsTotal) * 100}%` }}
                      />
                    </div>
                    <span className="eh-progress-label">
                      {selectedProgress.questsCompleted}/{selectedProgress.questsTotal} quêtes
                    </span>
                  </div>
                  {selectedProgress.chosenRoute && (
                    <div className="eh-route-choice">
                      Route choisie:{" "}
                      <span style={{ color: companionMap.get(selectedProgress.chosenRoute)?.color }}>
                        {companionMap.get(selectedProgress.chosenRoute)?.name}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Routes (for seasonal story) */}
              {selectedEvent.routes && !selectedProgress?.chosenRoute && (
                <div className="eh-detail-section">
                  <h3 className="eh-section-title">Choisissez votre route</h3>
                  <div className="eh-routes">
                    {selectedEvent.routes.map((routeId) => {
                      const c = companionMap.get(routeId);
                      if (!c) return null;
                      return (
                        <button key={routeId} className="eh-route" style={{ "--card-accent": c.color } as React.CSSProperties}>
                          <span className="eh-route-glyph">{c.glyph}</span>
                          <span className="eh-route-name">{c.name}</span>
                          <span className="eh-route-role">{c.role}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Void Festival gifts */}
              {selectedEvent.type === "void_festival" && (
                <div className="eh-detail-section">
                  <h3 className="eh-section-title">Cadeaux des Compagnons</h3>
                  <div className="eh-gifts">
                    {gifts.map((gift) => {
                      const c = companionMap.get(gift.companionId);
                      if (!c) return null;
                      const isRevealing = showGiftReveal === gift.companionId;

                      return (
                        <div
                          key={gift.companionId}
                          className={`eh-gift ${gift.revealed ? "eh-gift--revealed" : ""} ${isRevealing ? "eh-gift--revealing" : ""}`}
                          style={{ "--card-accent": c.color } as React.CSSProperties}
                        >
                          {!gift.revealed ? (
                            <button
                              className="eh-gift-box"
                              onClick={() => handleRevealGift(gift.companionId)}
                            >
                              <span className="eh-gift-box-icon">🎁</span>
                              <span className="eh-gift-from">{c.name}</span>
                              <span className="eh-gift-hint">Appuyez pour ouvrir</span>
                            </button>
                          ) : (
                            <div className="eh-gift-content">
                              <div className="eh-gift-header">
                                <span className="eh-gift-glyph">{c.glyph}</span>
                                <span className="eh-gift-name">{c.name}</span>
                              </div>
                              <p className="eh-gift-message">« {gift.message} »</p>
                              <div className="eh-gift-item">
                                <span className="eh-gift-item-icon">{gift.giftIcon}</span>
                                <span>{gift.giftName}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rewards */}
              {selectedEvent.rewards.length > 0 && (
                <div className="eh-detail-section">
                  <h3 className="eh-section-title">Récompenses</h3>
                  <div className="eh-rewards">
                    {selectedEvent.rewards.map((reward) => (
                      <div
                        key={reward.id}
                        className={`eh-reward ${reward.claimed ? "eh-reward--claimed" : ""}`}
                      >
                        <span className="eh-reward-icon">{reward.icon}</span>
                        <div className="eh-reward-info">
                          <span className="eh-reward-label">{reward.label}</span>
                          <span className="eh-reward-desc">{reward.description}</span>
                        </div>
                        {reward.claimed ? (
                          <span className="eh-reward-badge">✓ Réclamé</span>
                        ) : reward.requiresCompletion ? (
                          <span className="eh-reward-locked">Complétion requise</span>
                        ) : (
                          <button className="eh-reward-claim">Réclamer</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
