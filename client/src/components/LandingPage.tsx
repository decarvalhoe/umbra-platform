import { useEffect, useRef, useState, useCallback } from "react";
import "./LandingPage.css";

interface LandingPageProps {
  onEnter: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
}

export function LandingPage({ onEnter }: LandingPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorTrailRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const [loaded, setLoaded] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [glitching, setGlitching] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [runeRotation, setRuneRotation] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cursorHover, setCursorHover] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);

  const COLORS = ["#9b59b6", "#8e44ad", "#6c3483", "#a569bd", "#d7bde2", "#c0392b", "#e74c3c"];

  // ── Particle system ─────────────────────────────────────────────────────────
  const spawnParticle = useCallback((x: number, y: number, burst = false) => {
    const count = burst ? 14 : 1;
    for (let i = 0; i < count; i++) {
      const angle = burst ? (Math.PI * 2 * i) / count : Math.random() * Math.PI * 2;
      const speed = burst ? Math.random() * 3 + 1 : Math.random() * 0.6 + 0.1;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (burst ? 0 : 0.4),
        size: Math.random() * (burst ? 3.5 : 1.5) + 0.5,
        opacity: 1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 0,
        maxLife: burst ? 70 + Math.random() * 50 : 50 + Math.random() * 50,
      });
    }
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (Math.random() < 0.2) {
      spawnParticle(Math.random() * canvas.width, canvas.height + 5);
    }
    particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);
    for (const p of particlesRef.current) {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.015;
      p.opacity = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = p.opacity * 0.75;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    animFrameRef.current = requestAnimationFrame(drawCanvas);
  }, [spawnParticle]);

  // ── Glitch ──────────────────────────────────────────────────────────────────
  const triggerGlitch = useCallback(() => {
    setGlitching(true);
    setTimeout(() => setGlitching(false), 250);
  }, []);

  // ── Audio ───────────────────────────────────────────────────────────────────
  const startAmbientAudio = useCallback(() => {
    if (audioStarted) return;
    try {
      const actx = new AudioContext();
      const createDrone = (freq: number, gain: number) => {
        const osc = actx.createOscillator();
        const g = actx.createGain();
        const f = actx.createBiquadFilter();
        osc.type = "sine";
        osc.frequency.value = freq;
        f.type = "lowpass";
        f.frequency.value = 350;
        g.gain.value = 0;
        g.gain.linearRampToValueAtTime(gain, actx.currentTime + 3);
        osc.connect(f); f.connect(g); g.connect(actx.destination);
        osc.start();
      };
      createDrone(55, 0.04);
      createDrone(82.5, 0.025);
      createDrone(110, 0.015);
      setAudioStarted(true);
    } catch (_) {}
  }, [audioStarted]);

  // ── Mouse ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      spawnParticle(e.clientX, e.clientY);
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`;
        cursorRef.current.style.top = `${e.clientY}px`;
      }
      if (cursorTrailRef.current) {
        cursorTrailRef.current.style.left = `${e.clientX}px`;
        cursorTrailRef.current.style.top = `${e.clientY}px`;
      }
    };
    const onClick = (e: MouseEvent) => {
      spawnParticle(e.clientX, e.clientY, true);
      triggerGlitch();
      startAmbientAudio();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("click", onClick); };
  }, [spawnParticle, triggerGlitch, startAmbientAudio]);

  // ── Scroll ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      setScrollY(window.scrollY);
      const sections = document.querySelectorAll(".lp-section");
      sections.forEach((s, i) => {
        if (s.getBoundingClientRect().top < window.innerHeight * 0.65) setActiveSection(i);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Rune rotation ───────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setRuneRotation((r) => (r + 0.15) % 360), 16);
    return () => clearInterval(id);
  }, []);

  // ── Entrance ────────────────────────────────────────────────────────────────
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(drawCanvas);
    const t1 = setTimeout(() => setLoaded(true), 200);
    const t2 = setTimeout(() => setTitleVisible(true), 700);
    const t3 = setTimeout(() => setSubtitleVisible(true), 1300);
    const t4 = setTimeout(() => setCtaVisible(true), 1900);
    const gi = setInterval(triggerGlitch, 9000 + Math.random() * 5000);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      clearInterval(gi);
    };
  }, [drawCanvas, triggerGlitch]);

  const features = [
    { icon: "⚔️", title: "Combat Viscéral", desc: "Dual-wield, combos élémentaires, dodge avec i-frames. Chaque affrontement est une danse mortelle.", color: "#c0392b" },
    { icon: "🎲", title: "Roguelite Infini", desc: "Donjons générés procéduralement par l'IA. Aucun run ne se ressemble. L'Umbra s'adapte à vous.", color: "#8e44ad" },
    { icon: "🤖", title: "Full AI Director", desc: "Un système d'IA narratif génère quêtes, dialogues et événements en temps réel selon votre style.", color: "#2980b9" },
    { icon: "🏰", title: "Progression Idle", desc: "Forge automatique, expéditions de familiers. Votre empire grandit même quand vous dormez.", color: "#27ae60" },
    { icon: "⚗️", title: "Système de Runes", desc: "Cartes de runes combinables pour des synergies explosives. Construisez votre build unique.", color: "#f39c12" },
    { icon: "🛡️", title: "Clans & Saisons", desc: "Battle Pass saisonnier, contrats de clan, classements mondiaux. La compétition ne dort jamais.", color: "#e74c3c" },
  ];

  const classes = [
    { name: "Guerrier de l'Ombre", role: "DPS / Mobilité", color: "#9b59b6", desc: "Dual-wield, dash, combo de 4 coups" },
    { name: "Invocateur du Vide", role: "Support / Contrôle", color: "#4a235a", desc: "Familiers, zones de contrôle, debuffs" },
    { name: "Archiviste Maudit", role: "Mage / Burst", color: "#c0392b", desc: "Sorts élémentaires, explosions de zone" },
  ];

  return (
    <div className={`lp-root ${loaded ? "lp-loaded" : ""} ${glitching ? "lp-glitch" : ""}`}>
      {/* Custom cursor */}
      <div ref={cursorRef} className={`lp-cursor ${cursorHover ? "lp-cursor--hover" : ""}`} />
      <div ref={cursorTrailRef} className="lp-cursor-trail" />

      {/* Particle canvas */}
      <canvas ref={canvasRef} className="lp-canvas" />

      {/* ── HERO ── */}
      <section className="lp-hero lp-section">
        <div className="lp-hero-bg" style={{ backgroundPositionY: `${scrollY * 0.35}px` }} />
        <div className="lp-hero-overlay" />
        <div className="lp-fog" style={{ transform: `translateX(${-scrollY * 0.08}px)` }} />

        {/* Rune derrière le contenu, centré et bien dimensionné */}
        <div
          className="lp-rune-bg"
          style={{
            transform: `translate(-50%, -50%) rotate(${runeRotation}deg)`,
            opacity: Math.max(0, 0.12 - scrollY * 0.0002),
          }}
        />
        <div
          className="lp-rune-bg lp-rune-bg--inner"
          style={{
            transform: `translate(-50%, -50%) rotate(${-runeRotation * 1.4}deg)`,
            opacity: Math.max(0, 0.07 - scrollY * 0.0002),
          }}
        />

        {/* Personnage à droite */}
        <div
          className="lp-hero-character"
          style={{ opacity: Math.max(0, 1 - scrollY * 0.003) }}
        />

        {/* Contenu hero — à gauche, z-index élevé */}
        <div className="lp-hero-content">
          <div className={`lp-eyebrow ${titleVisible ? "lp-visible" : ""}`}>
            HACK'N'SLASH · ROGUELITE · DARK FANTASY
          </div>

          {/* Titre UMBRA unifié — une seule balise, pas de split U/MBRA */}
          <h1 className={`lp-title ${titleVisible ? "lp-visible" : ""}`}>
            UMBRA
          </h1>

          <p className={`lp-subtitle ${subtitleVisible ? "lp-visible" : ""}`}>
            Entrez dans les ténèbres.<br />
            <span className="lp-subtitle-accent">L'Umbra vous attend.</span>
          </p>

          <div className={`lp-cta-group ${ctaVisible ? "lp-visible" : ""}`}>
            <button
              className="lp-btn lp-btn--primary"
              onClick={() => { spawnParticle(cursorPos.x, cursorPos.y, true); onEnter(); }}
              onMouseEnter={() => setCursorHover(true)}
              onMouseLeave={() => setCursorHover(false)}
            >
              <span className="lp-btn-glow" />
              JOUER MAINTENANT
              <span className="lp-btn-arrow">→</span>
            </button>
            <button
              className="lp-btn lp-btn--secondary"
              onMouseEnter={() => setCursorHover(true)}
              onMouseLeave={() => setCursorHover(false)}
              onClick={() => document.getElementById("lp-features")?.scrollIntoView({ behavior: "smooth" })}
            >
              EN SAVOIR PLUS
            </button>
          </div>

          <div className={`lp-scroll-hint ${ctaVisible ? "lp-visible" : ""}`}>
            <span className="lp-scroll-line" />
            <span>DÉFILER</span>
            <span className="lp-scroll-line" />
          </div>
        </div>
      </section>

      {/* ── LORE ── */}
      <section className="lp-section lp-lore" id="lp-lore">
        <div className="lp-section-inner">
          <div className={`lp-lore-text ${activeSection >= 1 ? "lp-anim-left" : ""}`}>
            <span className="lp-tag">LORE</span>
            <h2 className="lp-section-title">L'Umbra Consume Tout</h2>
            <p className="lp-body-text">
              Une corruption ancienne s'est éveillée dans les profondeurs de Sanctuaire. L'<strong>Umbra</strong> —
              une énergie du vide primordiale — ronge la réalité elle-même, transformant les vivants en ombres
              et les donjons en labyrinthes impossibles.
            </p>
            <p className="lp-body-text">
              Vous êtes un <strong>Chasseur de l'Ombre</strong>, l'un des rares capables de canaliser cette
              corruption plutôt que d'en être consumé. Chaque run vous plonge plus profondément dans l'abîsse.
              Chaque mort vous rapproche de la vérité.
            </p>
            <div className="lp-stat-row">
              <div className="lp-stat"><span className="lp-stat-num">∞</span><span>Runs uniques</span></div>
              <div className="lp-stat"><span className="lp-stat-num">3</span><span>Classes jouables</span></div>
              <div className="lp-stat"><span className="lp-stat-num">10+</span><span>Types de salles</span></div>
              <div className="lp-stat"><span className="lp-stat-num">AI</span><span>Narration dynamique</span></div>
            </div>
          </div>
          <div className={`lp-lore-visual ${activeSection >= 1 ? "lp-anim-right" : ""}`}>
            <div className="lp-rune-display">
              <img
                src="/assets/rune_circle.png"
                alt="Cercle de runes Umbra"
                className="lp-rune-img"
                style={{ transform: `rotate(${runeRotation * 0.4}deg)` }}
              />
              <div className="lp-rune-glow" />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-section lp-features" id="lp-features">
        <div className="lp-section-inner lp-features-inner">
          <span className="lp-tag">MÉCANIQUES</span>
          <h2 className="lp-section-title lp-center">Ce qui vous attend dans l'Umbra</h2>
          <div className="lp-features-grid">
            {features.map((f, i) => (
              <div
                key={i}
                className={`lp-feature-card ${activeSection >= 2 ? "lp-card-in" : ""}`}
                style={{ animationDelay: `${i * 0.08}s`, "--card-color": f.color } as React.CSSProperties}
                onMouseEnter={(e) => { setCursorHover(true); spawnParticle(e.clientX, e.clientY, true); }}
                onMouseLeave={() => setCursorHover(false)}
              >
                <div className="lp-feature-icon">{f.icon}</div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
                <div className="lp-feature-line" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLASSES ── */}
      <section className="lp-section lp-classes">
        <div className="lp-section-inner lp-classes-inner">
          <span className="lp-tag">CLASSES</span>
          <h2 className="lp-section-title lp-center">Choisissez votre Destin</h2>
          <div className="lp-classes-row">
            {classes.map((c, i) => (
              <div
                key={i}
                className={`lp-class-card ${activeSection >= 3 ? "lp-card-in" : ""}`}
                style={{ animationDelay: `${i * 0.12}s`, "--class-color": c.color } as React.CSSProperties}
                onMouseEnter={() => setCursorHover(true)}
                onMouseLeave={() => setCursorHover(false)}
              >
                <div className="lp-class-orb" style={{ background: `radial-gradient(circle at 40% 40%, ${c.color}cc, ${c.color}22 60%, transparent)` }} />
                <div className="lp-class-role">{c.role}</div>
                <h3 className="lp-class-name">{c.name}</h3>
                <p className="lp-class-desc">{c.desc}</p>
                <div className="lp-class-badge">BIENTÔT</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI DIRECTOR ── */}
      <section className="lp-section lp-ai-section">
        <div className="lp-section-inner lp-ai-inner">
          <div className={`lp-ai-content ${activeSection >= 4 ? "lp-anim-left" : ""}`}>
            <span className="lp-tag lp-tag--ai">TECHNOLOGIE</span>
            <h2 className="lp-section-title">Propulsé par l'Intelligence Artificielle</h2>
            <p className="lp-body-text">
              L'<strong>AI Director</strong> d'Umbra analyse votre style de jeu, vos choix, vos échecs —
              et génère des donjons, des quêtes et des dialogues personnalisés à chaque session.
            </p>
            <div className="lp-ai-features">
              {["Génération de donjons procédurale", "Narration adaptative par LLM", "Ennemis data-driven", "Événements contextuels", "Contrats de clan hebdomadaires"].map((item, i) => (
                <div key={i} className="lp-ai-item">
                  <span className="lp-ai-dot" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className={`lp-ai-visual ${activeSection >= 4 ? "lp-anim-right" : ""}`}>
            <div className="lp-terminal">
              <div className="lp-terminal-bar">
                <span className="lp-terminal-dot" style={{ background: "#e74c3c" }} />
                <span className="lp-terminal-dot" style={{ background: "#f39c12" }} />
                <span className="lp-terminal-dot" style={{ background: "#27ae60" }} />
                <span className="lp-terminal-title">AI Director — Live Feed</span>
              </div>
              <div className="lp-terminal-body">
                <TerminalLines />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="lp-section lp-final-cta">
        <div className="lp-final-bg" />
        <div className="lp-section-inner lp-final-inner">
          <h2 className="lp-final-title">L'Umbra vous appelle.</h2>
          <p className="lp-final-sub">Rejoignez les premiers Chasseurs de l'Ombre. Accès Early Access gratuit.</p>
          <button
            className="lp-btn lp-btn--primary lp-btn--large"
            onClick={() => { spawnParticle(cursorPos.x, cursorPos.y, true); onEnter(); }}
            onMouseEnter={() => setCursorHover(true)}
            onMouseLeave={() => setCursorHover(false)}
          >
            <span className="lp-btn-glow" />
            ENTRER DANS LES TÉNÈBRES
            <span className="lp-btn-arrow">→</span>
          </button>
          <p className="lp-final-note">Aucune installation requise · Cross-platform · Free to Play</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-logo">UMBRA</div>
        <div className="lp-footer-links">
          <a href="#lp-lore">Lore</a>
          <a href="#lp-features">Mécaniques</a>
          <span>Discord</span>
          <span>Twitter/X</span>
        </div>
        <div className="lp-footer-copy">© 2026 Umbra Platform. Tous droits réservés.</div>
      </footer>
    </div>
  );
}

// ── Terminal animation ───────────────────────────────────────────────────────
function TerminalLines() {
  const lines = [
    { text: "> Génération du donjon en cours...", color: "#9b59b6", delay: 0 },
    { text: "  ✓ 8 salles générées (seed: 0x4F2A)", color: "#27ae60", delay: 0.6 },
    { text: "> Analyse du profil joueur...", color: "#9b59b6", delay: 1.2 },
    { text: "  Style: Agressif · Préférence: Burst", color: "#3498db", delay: 1.8 },
    { text: "> Génération narrative...", color: "#9b59b6", delay: 2.4 },
    { text: '  "Le Gardien Corrompu vous attend"', color: "#e67e22", delay: 3.0 },
    { text: "> Spawn ennemis adaptatifs...", color: "#9b59b6", delay: 3.6 },
    { text: "  ✓ 3x Shadow Wraith · 1x Void Sentinel", color: "#27ae60", delay: 4.2 },
    { text: "> Corruption: 45% · Difficulté: ★★★☆", color: "#e74c3c", delay: 4.8 },
    { text: "> Run prêt. Bonne chance, Chasseur.", color: "#d7bde2", delay: 5.4 },
  ];
  return (
    <div className="lp-terminal-lines">
      {lines.map((line, i) => (
        <div key={i} className="lp-terminal-line" style={{ animationDelay: `${line.delay}s`, color: line.color }}>
          {line.text}
        </div>
      ))}
      <div className="lp-terminal-cursor">█</div>
    </div>
  );
}
