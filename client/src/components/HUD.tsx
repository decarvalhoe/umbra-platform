import type { PlayerProfile } from "../types/game";
import type { Wallet } from "../types/economy";

interface HUDProps {
  profile: PlayerProfile | null;
  wallet: Wallet | null;
  health: number;
  maxHealth: number;
  dodgeCharges: number;
  maxDodgeCharges: number;
}

export function HUD({ profile, wallet, health, maxHealth, dodgeCharges, maxDodgeCharges }: HUDProps) {
  if (!profile) return null;

  const xpForNextLevel = profile.level * profile.level * 100;
  const xpPercent = Math.min((profile.xp / xpForNextLevel) * 100, 100);
  const healthPercent = Math.min((health / maxHealth) * 100, 100);

  return (
    <div className="hud-overlay">
      <div className="hud-top-left">
        <div className="hud-player-info">
          <span className="hud-username">{profile.username}</span>
          <span className="hud-level">Nv. {profile.level}</span>
        </div>
        <div className="hud-bar health-bar">
          <div className="hud-bar-fill health-fill" style={{ width: `${healthPercent}%` }} />
          <span className="hud-bar-text">{health} / {maxHealth}</span>
        </div>
        <div className="hud-bar xp-bar">
          <div className="hud-bar-fill xp-fill" style={{ width: `${xpPercent}%` }} />
          <span className="hud-bar-text">{profile.xp} / {xpForNextLevel} XP</span>
        </div>
        <div className="hud-dodge-charges">
          {Array.from({ length: maxDodgeCharges }, (_, i) => (
            <span
              key={i}
              className={`dodge-charge ${i < dodgeCharges ? 'dodge-charge--active' : 'dodge-charge--empty'}`}
            />
          ))}
        </div>
      </div>
      {wallet && (
        <div className="hud-top-right">
          <div className="hud-currency">
            <span className="currency-icon fire">🔥</span>
            <span>{wallet.cendres}</span>
          </div>
          <div className="hud-currency">
            <span className="currency-icon shadow">🌑</span>
            <span>{wallet.eclats_ombre}</span>
          </div>
          <div className="hud-currency">
            <span className="currency-icon ancient">💎</span>
            <span>{wallet.essence_antique}</span>
          </div>
        </div>
      )}
    </div>
  );
}
