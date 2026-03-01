import { useState } from "react";
import { drawGacha, getGachaPools } from "../services/game-logic";
import type { GachaPool, GachaDrawResult, GachaItem } from "../types/economy";

interface GachaModalProps {
  isOpen: boolean;
  onClose: () => void;
  pityCounter: number;
  onPityUpdate: (newPity: number) => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: "#9ca3af",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

export function GachaModal({ isOpen, onClose, pityCounter, onPityUpdate }: GachaModalProps) {
  const [pools, setPools] = useState<GachaPool[]>([]);
  const [selectedPool, setSelectedPool] = useState<string>("");
  const [results, setResults] = useState<GachaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadPools = async () => {
    if (loaded) return;
    try {
      const data = await getGachaPools();
      setPools(data);
      if (data.length > 0) setSelectedPool(data[0].id);
      setLoaded(true);
    } catch (err) {
      console.error("Failed to load gacha pools:", err);
    }
  };

  const handleDraw = async (numDraws: number) => {
    if (!selectedPool) return;
    setLoading(true);
    try {
      const result: GachaDrawResult = await drawGacha(selectedPool, numDraws, pityCounter);
      setResults(result.items);
      onPityUpdate(result.newPityCounter);
    } catch (err) {
      console.error("Gacha draw failed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (!loaded) {
    loadPools();
  }

  return (
    <div className="gacha-overlay">
      <div className="gacha-modal">
        <div className="gacha-header">
          <h2>Invocation</h2>
          <button onClick={onClose} className="gacha-close">&times;</button>
        </div>
        <div className="gacha-pool-select">
          {pools.map((pool) => (
            <button
              key={pool.id}
              className={`pool-tab ${selectedPool === pool.id ? "active" : ""}`}
              onClick={() => setSelectedPool(pool.id)}
            >
              {pool.name}
            </button>
          ))}
        </div>
        <p className="pity-counter">Compteur de pitié : {pityCounter} / 90</p>
        <div className="gacha-actions">
          <button onClick={() => handleDraw(1)} disabled={loading} className="draw-button single">
            {loading ? "..." : "Invoquer x1"}
          </button>
          <button onClick={() => handleDraw(10)} disabled={loading} className="draw-button multi">
            {loading ? "..." : "Invoquer x10"}
          </button>
        </div>
        {results.length > 0 && (
          <div className="gacha-results">
            {results.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="gacha-result-item"
                style={{ borderColor: RARITY_COLORS[item.rarity] }}
              >
                <span className="result-name">{item.name}</span>
                <span className="result-rarity" style={{ color: RARITY_COLORS[item.rarity] }}>
                  {item.rarity}
                </span>
                {item.element && <span className="result-element">{item.element}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
