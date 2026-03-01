import type { InventoryItem } from "../types/game";

interface InventoryPanelProps {
  items: InventoryItem[];
  isOpen: boolean;
  onClose: () => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: "#9ca3af",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

export function InventoryPanel({ items, isOpen, onClose }: InventoryPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="inventory-overlay">
      <div className="inventory-panel">
        <div className="inventory-header">
          <h2>Inventaire</h2>
          <button onClick={onClose} className="inventory-close">&times;</button>
        </div>
        <div className="inventory-grid">
          {items.length === 0 ? (
            <p className="inventory-empty">Aucun objet</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="inventory-item"
                style={{ borderColor: RARITY_COLORS[item.rarity] || "#9ca3af" }}
              >
                <span className="item-name">{item.name}</span>
                <span className="item-rarity" style={{ color: RARITY_COLORS[item.rarity] }}>
                  {item.rarity}
                </span>
                {item.quantity > 1 && (
                  <span className="item-quantity">x{item.quantity}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
