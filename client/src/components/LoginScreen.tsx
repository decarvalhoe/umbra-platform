import { useState, useEffect, useRef, useCallback } from "react";
import { authenticateEmail } from "../nakama/auth";
import "./LoginScreen.css";

interface LoginScreenProps {
  onLogin: () => void;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; opacity: number;
  color: string; life: number; maxLife: number;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [mode, setMode]         = useState<"login" | "register">("login");
  const [visible, setVisible]   = useState(false);
  const [runeRot, setRuneRot]   = useState(0);
  const [showPwd, setShowPwd]   = useState(false);

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const animRef      = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const COLORS = ["#9b59b6", "#8e44ad", "#6c3483", "#b07fd4", "#d7bde2", "#c0392b"];

  // ── Particles ──────────────────────────────────────────────────────────────
  const spawnParticle = useCallback((x: number, y: number, burst = false) => {
    const count = burst ? 16 : 1;
    for (let i = 0; i < count; i++) {
      const angle = burst ? (Math.PI * 2 * i) / count : Math.random() * Math.PI * 2;
      const speed = burst ? Math.random() * 3 + 1 : Math.random() * 0.5 + 0.1;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (burst ? 0 : 0.3),
        size: Math.random() * (burst ? 3 : 1.5) + 0.5,
        opacity: 1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 0,
        maxLife: burst ? 60 + Math.random() * 40 : 45 + Math.random() * 45,
      });
    }
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (Math.random() < 0.15) spawnParticle(Math.random() * canvas.width, canvas.height + 5);
    particlesRef.current = particlesRef.current.filter(p => p.life < p.maxLife);
    for (const p of particlesRef.current) {
      p.life++; p.x += p.vx; p.y += p.vy; p.vy -= 0.012;
      p.opacity = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = p.opacity * 0.7;
      ctx.shadowBlur = 8; ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    animRef.current = requestAnimationFrame(drawCanvas);
  }, [spawnParticle]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(drawCanvas);
    const t = setTimeout(() => setVisible(true), 100);
    const id = setInterval(() => setRuneRot(r => (r + 0.12) % 360), 16);
    const onMove = (e: MouseEvent) => spawnParticle(e.clientX, e.clientY);
    const onClick = (e: MouseEvent) => spawnParticle(e.clientX, e.clientY, true);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(animRef.current);
      clearTimeout(t); clearInterval(id);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
    };
  }, [drawCanvas, spawnParticle]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authenticateEmail(email, password, mode === "register");
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentification échouée");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ls-root">
      {/* Canvas particules */}
      <canvas ref={canvasRef} className="ls-canvas" />

      {/* Fond hero */}
      <div className="ls-bg" />
      <div className="ls-overlay" />

      {/* Rune de fond */}
      <div
        className="ls-rune-bg"
        style={{ transform: `translate(-50%, -50%) rotate(${runeRot}deg)` }}
      />
      <div
        className="ls-rune-bg ls-rune-bg--inner"
        style={{ transform: `translate(-50%, -50%) rotate(${-runeRot * 1.4}deg)` }}
      />

      {/* Panneau central */}
      <div className={`ls-panel ${visible ? "ls-panel--visible" : ""}`}>
        {/* Logo */}
        <div className="ls-logo-wrap">
          <div className="ls-logo-rune" style={{ transform: `rotate(${runeRot * 0.3}deg)` }}>
            <img src="/assets/rune_circle.png" alt="" className="ls-logo-rune-img" />
          </div>
          <h1 className="ls-logo">UMBRA</h1>
        </div>

        <p className="ls-tagline">
          {mode === "login" ? "Bienvenue, Chasseur de l'Ombre." : "Rejoignez les ténèbres."}
        </p>

        {/* Tabs login / register */}
        <div className="ls-tabs">
          <button
            className={`ls-tab ${mode === "login" ? "ls-tab--active" : ""}`}
            onClick={() => { setMode("login"); setError(null); }}
          >
            Connexion
          </button>
          <button
            className={`ls-tab ${mode === "register" ? "ls-tab--active" : ""}`}
            onClick={() => { setMode("register"); setError(null); }}
          >
            Créer un compte
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="ls-form">
          {/* Email */}
          <div className="ls-field">
            <label className="ls-label">Email</label>
            <div className="ls-input-wrap">
              <span className="ls-input-icon">✉</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="chasseur@umbra.gg"
                required
                className="ls-input"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div className="ls-field">
            <label className="ls-label">Mot de passe</label>
            <div className="ls-input-wrap">
              <span className="ls-input-icon">⚿</span>
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="ls-input"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              <button
                type="button"
                className="ls-pwd-toggle"
                onClick={() => setShowPwd(v => !v)}
                tabIndex={-1}
              >
                {showPwd ? "◉" : "◎"}
              </button>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className="ls-error">
              <span className="ls-error-icon">⚠</span>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`ls-submit ${loading ? "ls-submit--loading" : ""}`}
          >
            {loading ? (
              <span className="ls-spinner" />
            ) : (
              <>
                <span className="ls-submit-glow" />
                {mode === "login" ? "ENTRER DANS LES TÉNÈBRES" : "REJOINDRE L'UMBRA"}
                <span className="ls-submit-arrow">→</span>
              </>
            )}
          </button>
        </form>

        {/* Séparateur */}
        <div className="ls-divider">
          <span className="ls-divider-line" />
          <span className="ls-divider-text">ou</span>
          <span className="ls-divider-line" />
        </div>

        {/* Guest */}
        <button
          className="ls-guest"
          onClick={async () => {
            setLoading(true);
            try {
              await authenticateEmail(`guest_${Date.now()}@umbra.gg`, "guest_pass_umbra_2026", true);
              onLogin();
            } catch {
              setError("Connexion invité indisponible");
            } finally {
              setLoading(false);
            }
          }}
        >
          Continuer en tant qu'invité
        </button>

        {/* Footer */}
        <p className="ls-footer-note">
          En continuant, vous acceptez les{" "}
          <span className="ls-link">Conditions d'utilisation</span> et la{" "}
          <span className="ls-link">Politique de confidentialité</span>.
        </p>
      </div>

      {/* Brume bas */}
      <div className="ls-fog" />
    </div>
  );
}
