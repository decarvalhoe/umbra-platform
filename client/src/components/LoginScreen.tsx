import { useState, useRef, useEffect, useCallback } from "react";
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

const MANGA_COLORS = ["#ff2d78","#ff6eb4","#ffe135","#00bcd4","#b39ddb","#ea80fc","#ffffff"];

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  const spawnParticle = useCallback((x: number, y: number, burst = false) => {
    const count = burst ? 12 : 1;
    for (let i = 0; i < count; i++) {
      const angle = burst
        ? (Math.PI * 2 * i) / count + Math.random() * 0.5
        : Math.random() * Math.PI * 2;
      const speed = burst ? Math.random() * 3 + 1 : Math.random() * 0.8 + 0.2;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (burst ? 1.5 : 0.3),
        size: Math.random() * (burst ? 5 : 2) + 1.5,
        opacity: 1,
        color: MANGA_COLORS[Math.floor(Math.random() * MANGA_COLORS.length)],
        life: 0,
        maxLife: burst ? 60 + Math.random() * 40 : 70 + Math.random() * 50,
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(p => p.life < p.maxLife);
      if (particlesRef.current.length > 200) particlesRef.current.splice(0, particlesRef.current.length - 200);
      for (const p of particlesRef.current) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.04;
        p.life++; p.opacity = 1 - p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();

    const onMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      if (Math.random() < 0.12) spawnParticle(e.clientX, e.clientY);
    };
    window.addEventListener("mousemove", onMove);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [spawnParticle]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tab === "register" && password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas~ ♡");
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      await authenticateEmail(email, password, tab === "register");
      spawnParticle(window.innerWidth / 2, window.innerHeight / 2, true);
      setTimeout(() => onLogin(), 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'authentification");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      await authenticateEmail(
        `guest_${Date.now()}@umbra.local`,
        "guest_pass_" + Math.random(),
        true
      );
      onLogin();
    } catch {
      setError("Connexion invité indisponible");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ls-root">
      {/* Custom cursor */}
      <div className="ls-cursor" style={{ left: cursorPos.x, top: cursorPos.y }} />

      {/* Canvas particles */}
      <canvas ref={canvasRef} className="ls-canvas" />

      {/* Background */}
      <img src="/assets/hero_bg_manga.jpg" alt="" className="ls-bg" />
      <div className="ls-bg-overlay" />

      {/* Rune circles */}
      <div className="ls-rune-outer" />
      <div className="ls-rune-inner" />

      {/* Fog */}
      <div className="ls-fog" />

      {/* Panel */}
      <div className={`ls-panel ${shake ? "ls-shake" : ""}`}>

        {/* Back to landing */}
        <button
          className="ls-back"
          onClick={() => window.history.back()}
          type="button"
        >
          ← Retour
        </button>

        {/* Logo */}
        <div className="ls-logo-wrap">
          <div className="ls-logo-rune" />
          <h1 className="ls-logo">UMBRA</h1>
          <p className="ls-logo-sub">L'IA écrit ton histoire~ ♡</p>
          <p className="ls-logo-tags">⚔️ Roguelite · 💜 Otome LGBTQ+ · 🤖 AI-Powered</p>
        </div>

        {/* Tabs */}
        <div className="ls-tabs">
          <button
            className={`ls-tab ${tab === "login" ? "ls-tab--active" : ""}`}
            onClick={() => { setTab("login"); setError(null); }}
          >
            Connexion
          </button>
          <button
            className={`ls-tab ${tab === "register" ? "ls-tab--active" : ""}`}
            onClick={() => { setTab("register"); setError(null); }}
          >
            Créer un compte
          </button>
          <div className={`ls-tab-indicator ${tab === "register" ? "ls-tab-indicator--right" : ""}`} />
        </div>

        {/* Form */}
        <form className="ls-form" onSubmit={handleSubmit}>

          {/* Email */}
          <div className="ls-field">
            <span className="ls-field-icon">✉</span>
            <input
              type="email"
              className="ls-input"
              placeholder="Adresse email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="ls-field">
            <span className="ls-field-icon">🔑</span>
            <input
              type={showPassword ? "text" : "password"}
              className="ls-input"
              placeholder="Mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={tab === "login" ? "current-password" : "new-password"}
            />
            <button
              type="button"
              className="ls-show-pass"
              onClick={() => setShowPassword(v => !v)}
              tabIndex={-1}
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>

          {/* Confirm password (register only) */}
          {tab === "register" && (
            <div className="ls-field ls-field--appear">
              <span className="ls-field-icon">🔒</span>
              <input
                type={showPassword ? "text" : "password"}
                className="ls-input"
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="ls-error">
              <span className="ls-error-icon">⚠</span>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="ls-btn ls-btn--primary"
            disabled={loading}
          >
            {loading ? (
              <span className="ls-spinner" />
            ) : (
              <>
                <span className="ls-btn-sparkle">✦</span>
                {tab === "login" ? "ENTRER DANS L'UMBRA" : "REJOINDRE L'UMBRA"}
                <span className="ls-btn-sparkle">✦</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="ls-divider">
          <span className="ls-divider-line" />
          <span className="ls-divider-text">ou</span>
          <span className="ls-divider-line" />
        </div>

        {/* Guest */}
        <button className="ls-btn ls-btn--ghost" onClick={handleGuest} disabled={loading}>
          Explorer en tant qu'Invité·e
        </button>

        {/* Footer note */}
        <p className="ls-note">✦ Free to Play · Cross-platform · LGBTQ+ Friendly · AI-Powered ✦</p>
      </div>
    </div>
  );
}
