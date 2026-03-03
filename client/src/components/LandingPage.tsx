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
  shape: "circle" | "star" | "heart";
  life: number;
  maxLife: number;
  rotation: number;
  rotSpeed: number;
}

const MANGA_COLORS = [
  "#ff2d78", "#ff6eb4", "#ffe135", "#00bcd4",
  "#b39ddb", "#ff80ab", "#ea80fc", "#ffffff",
];

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.lineWidth = r * 0.4;
  ctx.strokeStyle = ctx.fillStyle as string;
  ctx.stroke();
  ctx.restore();
}

const ROMANCE_CHARACTERS = [
  { name: "Kaelan", role: "Forgeron Maudit", orientation: "Hétérosexuel", color: "#ff6b35", img: "/li_kaelan.png", pronouns: "il/lui", desc: "Bourru protecteur. Forger une arme avec lui, c'est lui confier une partie de ton âme." },
  { name: "Lyra", role: "Archiviste Spectrale", orientation: "Bisexuelle", color: "#b39ddb", img: "/li_lyra.png", pronouns: "elle/la", desc: "Spectrale et curieuse. Elle cartographie l'Umbra depuis des siècles — et vient de te remarquer." },
  { name: "Nyx", role: "Marchand du Vide", orientation: "Pansexuel·le", color: "#ffe135", img: "/li_nyx.png", pronouns: "iel/ellui", desc: "Entité pansexuelle du commerce interdit. Leurs prix sont... négociables. Avec intérêt." },
  { name: "Seraphina", role: "Paladine Déchue", orientation: "Lesbienne", color: "#ff2d78", img: "/li_seraphina.png", pronouns: "elle/la", desc: "Paladine déchue cherchant la rédemption. Sa lumière vacille — mais ne s'éteint jamais." },
  { name: "Ronan", role: "Barde Itínérant", orientation: "Gay", color: "#00bcd4", img: "/li_ronan.png", pronouns: "il/lui", desc: "Barde itínérant. Son sourire cache une mélancolie profonde. La musique est son armure." },
];

const MASCOT_LINES = [
  "Hehe~ Tu oses entrer dans mes donjons ? ♡",
  "La torture commence... par le fun ! ✦",
  "Mes ennemis sont ADORABLEMENT dangereux~ ♛",
  "L'IA génère ta souffrance en temps réel ! ☆",
  "Chaque mort est une leçon... ou pas. ♡",
  "Tu reviendras. Ils reviennent toujours~ ✦",
  "Mes runes de Corruption vont t'obseder~ ✦",
  "La Void Arena t'attend, Chasseur~ ♛",
];

export function LandingPage({ onEnter }: LandingPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cursorHover, setCursorHover] = useState(false);
  const [mascotBounce, setMascotBounce] = useState(false);
  const [mascotSpeech, setMascotSpeech] = useState("");
  const [showSpeech, setShowSpeech] = useState(false);

  const spawnParticle = useCallback((x: number, y: number, burst = false) => {
    const count = burst ? 16 : 1;
    for (let i = 0; i < count; i++) {
      const angle = burst ? (Math.PI * 2 * i) / count + Math.random() * 0.5 : Math.random() * Math.PI * 2;
      const speed = burst ? Math.random() * 4 + 1.5 : Math.random() * 1 + 0.3;
      const shapes: Particle["shape"][] = ["circle", "star", "heart"];
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (burst ? 2 : 0.5),
        size: Math.random() * (burst ? 6 : 3) + 2,
        opacity: 1,
        color: MANGA_COLORS[Math.floor(Math.random() * MANGA_COLORS.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        life: 0,
        maxLife: burst ? 70 + Math.random() * 50 : 80 + Math.random() * 60,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
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

    if (Math.random() < 0.4) {
      spawnParticle(Math.random() * canvas.width, canvas.height + 10);
    }

    particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);
    if (particlesRef.current.length > 300) particlesRef.current.splice(0, particlesRef.current.length - 300);
    for (const p of particlesRef.current) {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.025;
      p.rotation += p.rotSpeed;
      p.opacity = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = p.opacity * 0.9;
      ctx.shadowBlur = 12;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === "star") {
        drawStar(ctx, p.x, p.y, p.size * 1.5, p.rotation);
      } else {
        ctx.font = `${p.size * 3}px serif`;
        ctx.textAlign = "center";
        ctx.fillText("♡", p.x, p.y);
      }
      ctx.restore();
    }
    animFrameRef.current = requestAnimationFrame(drawCanvas);
  }, [spawnParticle]);

  // Mascot interaction
  const triggerMascot = useCallback(() => {
    const line = MASCOT_LINES[Math.floor(Math.random() * MASCOT_LINES.length)];
    setMascotSpeech(line);
    setMascotBounce(true);
    setShowSpeech(true);
    setTimeout(() => setMascotBounce(false), 600);
    setTimeout(() => setShowSpeech(false), 3500);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoaded(true);
      setTimeout(() => setTitleVisible(true), 300);
      setTimeout(() => setSubtitleVisible(true), 700);
      setTimeout(() => setCtaVisible(true), 1100);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(drawCanvas);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [drawCanvas]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      setCursorPos({ x: e.clientX, y: e.clientY });
      if (Math.random() < 0.05) spawnParticle(e.clientX, e.clientY);
    };
    const onClick = (e: MouseEvent) => spawnParticle(e.clientX, e.clientY, true);
    const onScroll = () => {
      setScrollY(window.scrollY);
      const sections = document.querySelectorAll(".lp-section");
      sections.forEach((s, i) => {
        const rect = s.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.65) setActiveSection(Math.max(i, 0));
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll);
    };
  }, [spawnParticle]);

  // Periodic mascot auto-speech
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.4) triggerMascot();
    }, 8000);
    return () => clearInterval(interval);
  }, [triggerMascot]);

  const features = [
    { icon: "⚔️", title: "Corruption Runes", desc: "7 Corruption Sets, 6 slots, raretés Tainted→Abyssal. Chaque rune façonne ton build. Upgrade +15 avec Shadow Dust.", color: "#ff2d78", tag: "RUNES" },
    { icon: "🌀", title: "Void Summoning", desc: "Rituel en 4 étapes. Rift coloré par rareté. Convergence pity garanti (soft 70, hard 90). Scène d'arrivée IA unique.", color: "#b39ddb", tag: "GACHA" },
    { icon: "🌙", title: "Shadow Vigil", desc: "3 compagnons patrouillent en ton absence. Cap 12h. Rapport narratif IA personnalisé au retour.", color: "#00bcd4", tag: "IDLE" },
    { icon: "⚡", title: "Void Arena", desc: "PvP asynchrone. Défie les équipes IA des autres. 5 tiers : Shadow Initiate → Void Sovereign. Saisons hebdomadaires.", color: "#ffe135", tag: "PVP" },
    { icon: "🔨", title: "Void Forge", desc: "Rune Reforging, Equipment Awakening, Corruption Infusion. Kaelan t'attend à la forge dès Affinité 10.", color: "#ff6b35", tag: "CRAFT" },
    { icon: "💜", title: "Resonance Bond", desc: "15 niveaux par compagnon. Echo Fragments équippables. True Name au niveau 10. Void Form au niveau 15.", color: "#ea80fc", tag: "ROMANCE" },
  ];

  const classes = [
    { name: "Shadow Warrior", role: "DPS · Corps-à-corps", desc: "Maîtrise les lames de l'ombre. Dual-wield, combos dévastateurs, dash offensif. Premier personnage jouable.", color: "#ff2d78", emoji: "⚔️", available: true },
    { name: "Void Summoner", role: "Support · Invocateur", desc: "Invoque des entités du Vide. Contrôle de zone, boucliers spectraux, armée de familiers corrompus.", color: "#b39ddb", emoji: "👁️", available: false },
    { name: "Cursed Archivist", role: "Mage · Distance", desc: "Maudit les ennemis avec des sorts anciens. DoT, debuffs, explosions de Corruption.", color: "#00bcd4", emoji: "📖", available: false },
  ];

  return (
    <div className={`lp-root ${loaded ? "lp-loaded" : ""}`}>
      {/* Custom cursor */}
      <div
        className={`lp-cursor ${cursorHover ? "lp-cursor--hover" : ""}`}
        style={{ left: cursorPos.x, top: cursorPos.y }}
      />
      <div
        className="lp-cursor-trail"
        style={{ left: cursorPos.x, top: cursorPos.y }}
      />

      {/* Canvas particles */}
      <canvas ref={canvasRef} className="lp-canvas" />

      {/* Mascot */}
      <div
        className={`lp-mascot ${mascotBounce ? "lp-mascot--bounce" : ""}`}
        onClick={triggerMascot}
        onMouseEnter={() => setCursorHover(true)}
        onMouseLeave={() => setCursorHover(false)}
        title="Clique sur moi !"
      >
        <img src="/assets/mascot_demon.png" alt="Mascotte Umbra" className="lp-mascot-img" />
        {showSpeech && (
          <div className="lp-speech-bubble">
            <span>{mascotSpeech}</span>
          </div>
        )}
      </div>

      {/* ── HERO SECTION ── */}
      <section className="lp-section lp-hero">
        <img
          src="/assets/hero_bg_manga.jpg"
          alt=""
          className="lp-hero-bg"
          style={{ transform: `scale(1.05) translateY(${scrollY * 0.25}px)` }}
        />
        <div className="lp-hero-overlay" />

        {/* Manga speed lines */}
        <div className="lp-speed-lines" style={{ opacity: Math.max(0, 1 - scrollY * 0.004) }} />

        {/* Hero character */}
        <div
          className="lp-hero-character"
          style={{ opacity: Math.max(0, 1 - scrollY * 0.004) }}
        />

        {/* Halftone dots overlay */}
        <div className="lp-halftone" />

        {/* Title block */}
        <div className="lp-hero-content">
          <div className={`lp-eyebrow ${titleVisible ? "lp-visible" : ""}`}>
            <span className="lp-eyebrow-tag">⚔️ HACK'N'SLASH</span>
            <span className="lp-eyebrow-sep">✦</span>
            <span className="lp-eyebrow-tag">🎲 ROGUELITE</span>
            <span className="lp-eyebrow-sep">✦</span>
            <span className="lp-eyebrow-tag">💜 OTOME LGBTQ+</span>
            <span className="lp-eyebrow-sep">✦</span>
            <span className="lp-eyebrow-tag">🤖 FULL AI</span>
          </div>

          <div className={`lp-logo-wrap ${titleVisible ? "lp-visible" : ""}`}>
            <img src="/assets/title_logo.png" alt="UMBRA" className="lp-logo-img" />
          </div>

          <p className={`lp-subtitle ${subtitleVisible ? "lp-visible" : ""}`}>
            Combats. Survie. Tombe amoureux·se.{" "}
            <span className="lp-subtitle-accent">L'IA écrit ton histoire~ ♡</span>
          </p>

          <div className={`lp-cta-group ${ctaVisible ? "lp-visible" : ""}`}>
            <button
              className="lp-btn lp-btn--primary"
              onClick={() => { spawnParticle(cursorPos.x, cursorPos.y, true); onEnter(); }}
              onMouseEnter={() => { setCursorHover(true); }}
              onMouseLeave={() => setCursorHover(false)}
            >
              <span className="lp-btn-sparkle">✦</span>
              JOUER MAINTENANT
              <span className="lp-btn-sparkle">✦</span>
            </button>
            <button
              className="lp-btn lp-btn--secondary"
              onMouseEnter={() => setCursorHover(true)}
              onMouseLeave={() => setCursorHover(false)}
              onClick={() => document.getElementById("lp-features")?.scrollIntoView({ behavior: "smooth" })}
            >
              EN SAVOIR PLUS ↓
            </button>
          </div>

          <div className={`lp-scroll-hint ${ctaVisible ? "lp-visible" : ""}`}>
            <span className="lp-scroll-bounce">↓</span>
            <span className="lp-scroll-text">Défile pour découvrir</span>
          </div>
        </div>
      </section>

      {/* ── LORE SECTION ── */}
      <section className="lp-section lp-lore" id="lp-lore">
        <div className="lp-manga-panel-border" />
        <div className="lp-section-inner">
          <div className={`lp-lore-text ${activeSection >= 1 ? "lp-slide-in" : ""}`}>
            <div className="lp-manga-tag">📖 LORE</div>
            <h2 className="lp-section-title">
              L'Umbra <span className="lp-title-accent">Consume</span> Tout
            </h2>
            <p className="lp-body-text">
              Une corruption ancienne s'est éveillée dans les profondeurs de Sanctuaire.
              L'<strong>Umbra</strong> — une énergie du vide primordiale — ronge la réalité elle-même,
              transformant les vivants en ombres et les donjons en labyrinthes impossibles.
            </p>
            <p className="lp-body-text">
              Tu es un <strong>Chasseur de l'Ombre</strong>, l'un des rares capables de canaliser
              cette corruption. Chaque run te plonge plus profondément. Chaque mort te rapproche
              de la vérité. <span className="lp-wink">...ou pas~ ♡</span>
            </p>
            <div className="lp-stat-row">
              <div className="lp-stat">
                <span className="lp-stat-num">∞</span>
                <span className="lp-stat-label">Runs uniques</span>
              </div>
              <div className="lp-stat">
                <span className="lp-stat-num">5</span>
                <span className="lp-stat-label">Compagnons</span>
              </div>
              <div className="lp-stat">
                <span className="lp-stat-num">11</span>
                <span className="lp-stat-label">Types d'ennemis</span>
              </div>
              <div className="lp-stat">
                <span className="lp-stat-num">AI</span>
                <span className="lp-stat-label">Narration live</span>
              </div>
            </div>
          </div>
          <div className={`lp-lore-visual ${activeSection >= 1 ? "lp-slide-in-right" : ""}`}>
            <div className="lp-mascot-large-wrap">
              <img src="/assets/mascot_demon.png" alt="Mascotte" className="lp-mascot-large" />
              <div className="lp-mascot-bubble-static">
                "Bienvenue dans mon donjon~ ♛"
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section className="lp-section lp-features" id="lp-features">
        <div className="lp-section-inner lp-features-inner">
          <div className="lp-manga-tag">⚔️ MÉCANIQUES</div>
          <h2 className="lp-section-title lp-center">
            Ce qui t'<span className="lp-title-accent">attend</span> dans l'Umbra
          </h2>
          <div className="lp-features-grid">
            {features.map((f, i) => (
              <div
                key={i}
                className={`lp-feature-card ${activeSection >= 2 ? "lp-card-in" : ""}`}
                style={{ animationDelay: `${i * 0.1}s`, "--card-color": f.color } as React.CSSProperties}
                onMouseEnter={(e) => {
                  setCursorHover(true);
                  spawnParticle(e.clientX, e.clientY, true);
                }}
                onMouseLeave={() => setCursorHover(false)}
              >
                <div className="lp-feature-tag">{f.tag}</div>
                <div className="lp-feature-icon">{f.icon}</div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
                <div className="lp-feature-sparkles">✦ ✦ ✦</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLASSES SECTION ── */}
      <section className="lp-section lp-classes">
        <div className="lp-section-inner">
          <div className="lp-manga-tag">👑 CLASSES</div>
          <h2 className="lp-section-title lp-center">
            Choisis ton <span className="lp-title-accent">Destin</span>
          </h2>
          <div className="lp-classes-row">
            {classes.map((c, i) => (
              <div
                key={i}
                className={`lp-class-card ${activeSection >= 3 ? "lp-card-in" : ""}`}
                style={{ animationDelay: `${i * 0.15}s`, "--class-color": c.color } as React.CSSProperties}
                onMouseEnter={() => setCursorHover(true)}
                onMouseLeave={() => setCursorHover(false)}
              >
                <div className="lp-class-emoji">{c.emoji}</div>
                <div className="lp-class-role">{c.role}</div>
                <h3 className="lp-class-name">{c.name}</h3>
                <p className="lp-class-desc">{c.desc}</p>
                <div className="lp-class-badge">{c.available ? "JOUABLE ✦" : "BIENTÔT ✦"}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROMANCE SECTION ── */}
      <section className="lp-section lp-romance" id="lp-romance">
        <div className="lp-section-inner">
          <div className="lp-manga-tag">💜 RENCONTRES</div>
          <h2 className="lp-section-title lp-center">
            Des liens forgés <span className="lp-title-accent">entre les runs</span>
          </h2>
          <p className="lp-body-text lp-center" style={{ maxWidth: 640, margin: "0 auto 2.5rem" }}>
            Umbra est un jeu pour <strong>tout le monde</strong>. Choisis tes pronoms, ton genre, ton orientation.
            Configure ta <strong>Relationship Preference</strong> par compagnon : Romance, Amitié Profonde, ou Neutre.
            L'IA génère des dialogues uniques basés sur ton affinité (0→100) et ton niveau de Résonance (1→15).
            <span className="lp-wink"> Polyamour accepté~ ♡</span>
          </p>
          <div className="lp-romance-grid">
            {ROMANCE_CHARACTERS.map((li, i) => (
              <div
                key={i}
                className={`lp-romance-card ${activeSection >= 3 ? "lp-card-in" : ""}`}
                style={{ animationDelay: `${i * 0.12}s`, "--card-color": li.color } as React.CSSProperties}
                onMouseEnter={(e) => { setCursorHover(true); spawnParticle(e.clientX, e.clientY, true); }}
                onMouseLeave={() => setCursorHover(false)}
              >
                <div className="lp-romance-portrait-wrap">
                  <img src={li.img} alt={li.name} className="lp-romance-portrait" />
                  <div className="lp-romance-orientation-badge">{li.orientation}</div>
                </div>
                <div className="lp-romance-info">
                  <div className="lp-romance-pronouns">{li.pronouns}</div>
                  <h3 className="lp-romance-name" style={{ color: li.color }}>{li.name}</h3>
                  <div className="lp-romance-role">{li.role}</div>
                  <p className="lp-romance-desc">{li.desc}</p>
                  <div className="lp-romance-hearts">♡ ♡ ♡ ♡ ♡</div>
                </div>
              </div>
            ))}
          </div>
          <div className="lp-romance-note">
            <span className="lp-wink">✦ Pronoms libres · Polyamour · Orientations respectées · Dialogues IA personnalisés ✦</span>
          </div>
        </div>
      </section>

      {/* ── AI SECTION ── */}
      <section className="lp-section lp-ai-section">
        <div className="lp-section-inner lp-ai-inner">
          <div className={`lp-ai-content ${activeSection >= 4 ? "lp-slide-in" : ""}`}>
            <div className="lp-manga-tag lp-tag--ai">🤖 TECHNOLOGIE</div>
            <h2 className="lp-section-title">
              Propulsé par l'<span className="lp-title-accent">Intelligence Artificielle</span>
            </h2>
            <p className="lp-body-text">
              L'<strong>AI Director</strong> analyse ton style de jeu, tes choix, tes échecs —
              et génère des donjons, des quêtes et des dialogues personnalisés à chaque session.
              Même la mascotte est alimentée par l'IA~ ♡
            </p>
            <div className="lp-ai-features">
              {[
                { icon: "🗺️", text: "Génération de donjons procédurale" },
                { icon: "📝", text: "Narration adaptative par LLM" },
                { icon: "👾", text: "Ennemis data-driven et adaptatifs" },
                { icon: "⚡", text: "Événements contextuels en temps réel" },
                { icon: "🎰", text: "Contrats de clan hebdomadaires" },
              ].map((item, i) => (
                <div key={i} className="lp-ai-item">
                  <span className="lp-ai-icon">{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={`lp-ai-visual ${activeSection >= 4 ? "lp-slide-in-right" : ""}`}>
            <div className="lp-terminal">
              <div className="lp-terminal-bar">
                <span className="lp-terminal-dot" style={{ background: "#ff2d78" }} />
                <span className="lp-terminal-dot" style={{ background: "#ffe135" }} />
                <span className="lp-terminal-dot" style={{ background: "#00bcd4" }} />
                <span className="lp-terminal-title">✦ AI Director — Live Feed ✦</span>
              </div>
              <div className="lp-terminal-body">
                <TerminalLines />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="lp-section lp-final-cta">
        <div className="lp-final-bg" />
        <div className="lp-section-inner lp-final-inner">
          <img src="/assets/mascot_demon.png" alt="" className="lp-final-mascot" />
          <h2 className="lp-final-title">
            L'Umbra <span className="lp-title-accent">t'appelle</span>.
          </h2>
          <p className="lp-final-sub">
            Rejoins les premiers Chasseurs de l'Ombre.{" "}
            <span className="lp-wink">La torture commence maintenant~ ♡</span>
          </p>
          <button
            className="lp-btn lp-btn--primary lp-btn--large"
            onClick={() => { spawnParticle(cursorPos.x, cursorPos.y, true); onEnter(); }}
            onMouseEnter={() => setCursorHover(true)}
            onMouseLeave={() => setCursorHover(false)}
          >
            <span className="lp-btn-sparkle">♛</span>
            ENTRER DANS LES TÉNÈBRES
            <span className="lp-btn-sparkle">♛</span>
          </button>
          <p className="lp-final-note">✦ Aucune installation · Cross-platform · Free to Play ✦</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <img src="/assets/title_logo.png" alt="UMBRA" className="lp-footer-logo-img" />
        <div className="lp-footer-links">
          <a href="#lp-lore">Lore</a>
          <a href="#lp-features">Mécaniques</a>
          <span>Discord</span>
          <span>Twitter/X</span>
        </div>
        <div className="lp-footer-copy">© 2026 Umbra Platform · Tous droits réservés ♡</div>
      </footer>
    </div>
  );
}

function TerminalLines() {
  const lines = [
    { text: "> Génération Void Summoning... Convergence pull 73/90", color: "#ff2d78", delay: 0 },
    { text: "  ✓ Rituel 4 étapes — Rift prismatique (5★ incoming)", color: "#b39ddb", delay: 0.5 },
    { text: "> Shadow Vigil — Rapport de Kaelan...", color: "#ffe135", delay: 1 },
    { text: '  "J'ai trouvé 3 runes Corrupted et quelque chose d'autre."', color: "#ff6b35", delay: 1.5 },
    { text: "> Void Hierarchy : spawn Tier III Sentinels (floor 8)", color: "#ff2d78", delay: 2 },
    { text: "  ✓ Void Stalker ×2 · Crystal Golem ×1 ♡", color: "#00bcd4", delay: 2.5 },
    { text: "> Personal Quest : Nyx (Affinité 65 → milestone 75)...", color: "#ffe135", delay: 3 },
    { text: '  "Nyx te demande de récupérer un Fragment perdu."', color: "#ea80fc", delay: 3.5 },
    { text: "> Resonance Bond : Seraphina niveau 6 — Scène débloquée", color: "#ff2d78", delay: 4 },
    { text: "> Run prêt. Corruption : 67% · Rang Arena : Void Walker ♛", color: "#ffffff", delay: 4.5 },
  ];

  return (
    <div className="lp-terminal-lines">
      {lines.map((line, i) => (
        <div
          key={i}
          className="lp-terminal-line"
          style={{ animationDelay: `${line.delay}s`, color: line.color }}
        >
          {line.text}
        </div>
      ))}
      <div className="lp-terminal-cursor">█</div>
    </div>
  );
}