import React, { useEffect, useRef, useState, useCallback } from "react";
import "./LandingPage.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LandingPageProps {
  onEnter: () => void;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; opacity: number;
  color: string;
  shape: "circle" | "star" | "heart";
  life: number; maxLife: number;
  rotation: number; rotSpeed: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MANGA_COLORS = [
  "#ff2d78", "#ff6eb4", "#ffe135", "#00bcd4",
  "#b39ddb", "#ff80ab", "#ea80fc", "#ffffff",
] as const;

// Hero cards affichées dans la section Void Summoning — aperçu du roster infini
const ROSTER_PREVIEW = [
  { name: "Void Revenant",    rarity: 5, role: "DPS · Ombre",      color: "#ff2d78", tag: "5★", img: "/hero_card_5star.png",  desc: "Maîtresse des lames corrompues. Son passé est scellé dans le Vide." },
  { name: "Spectre Errant",   rarity: 4, role: "Support · Spectral", color: "#b39ddb", tag: "4★", img: null,                   desc: "Entité ancienne. Protège ses alliés avec des boucliers de mémoire." },
  { name: "Forgeron Maudit",  rarity: 5, role: "Tank · Forge",       color: "#ff6b35", tag: "5★", img: null,                   desc: "Chaque arme qu'il forge porte une malédiction... et une promesse." },
  { name: "Archiviste Spectrale", rarity: 4, role: "Mage · Archives", color: "#00bcd4", tag: "4★", img: null,                desc: "Cartographie l'Umbra depuis des siècles. Ses sorts réécrivent la réalité." },
  { name: "Marchand du Vide", rarity: 5, role: "Utilitaire · Commerce", color: "#ffe135", tag: "5★", img: null,              desc: "Ses prix sont négociables. Ses intentions, moins." },
  { name: "???  ???",          rarity: 0, role: "Inconnu · Prochain Banner", color: "#ea80fc", tag: "???", img: null,         desc: "L'AI Director prépare quelque chose de nouveau..." },
] as const;

const MASCOT_LINES = [
  "Hehe~ Tu oses entrer dans mes donjons ? ♡",
  "La torture commence... par le fun ! ✦",
  "Mes ennemis sont ADORABLEMENT dangereux~ ♛",
  "L'IA génère ta souffrance en temps réel ! ☆",
  "Chaque mort est une leçon... ou pas. ♡",
  "Tu reviendras. Ils reviennent toujours~ ✦",
  "Mes runes de Corruption vont t'obseder~ ✦",
  "La Void Arena t'attend, Chasseur~ ♛",
] as const;

const FEATURES = [
  { icon: "⚔️", title: "Corruption Runes",  desc: "7 Corruption Sets, 6 slots, raretés Tainted→Abyssal. Chaque rune façonne ton build. Upgrade +15 avec Shadow Dust.", color: "#ff2d78", tag: "RUNES"   },
  { icon: "🌀", title: "Void Summoning",    desc: "Rituel en 4 étapes. Rift coloré par rareté. Convergence pity garanti (soft 70, hard 90). Scène d'arrivée IA unique.", color: "#b39ddb", tag: "GACHA"   },
  { icon: "🌙", title: "Shadow Vigil",      desc: "3 compagnons patrouillent en ton absence. Cap 12h. Rapport narratif IA personnalisé au retour.",                        color: "#00bcd4", tag: "IDLE"    },
  { icon: "⚡", title: "Void Arena",        desc: "PvP asynchrone. Défie les équipes IA des autres. 5 tiers : Shadow Initiate → Void Sovereign. Saisons hebdomadaires.",  color: "#ffe135", tag: "PVP"     },
  { icon: "🔨", title: "Void Forge",        desc: "Rune Reforging, Equipment Awakening, Corruption Infusion. Kaelan t'attend à la forge dès Affinité 10.",                 color: "#ff6b35", tag: "CRAFT"   },
  { icon: "💜", title: "Resonance Bond",    desc: "15 niveaux par héros invoqué. Echo Fragments équippables. True Name au niveau 10. Void Form au niveau 15. Chaque héros a sa propre histoire.",                 color: "#ea80fc", tag: "ROMANCE" },
] as const;

const CLASSES = [
  { name: "Shadow Warrior",  role: "DPS · Corps-à-corps", desc: "Maîtrise les lames de l'ombre. Dual-wield, combos dévastateurs, dash offensif. Premier personnage jouable.",          color: "#ff2d78", emoji: "⚔️",  available: true  },
  { name: "Void Summoner",   role: "Support · Invocateur",  desc: "Invoque des entités du Vide. Contrôle de zone, boucliers spectraux, armée de familiers corrompus.",                  color: "#b39ddb", emoji: "👁️", available: false },
  { name: "Cursed Archivist",role: "Mage · Distance",       desc: "Maudit les ennemis avec des sorts anciens. DoT, debuffs, explosions de Corruption.",                                  color: "#00bcd4", emoji: "📖",  available: false },
] as const;

const AI_FEATURES = [
  { icon: "🗺️", text: "Génération de donjons procédurale" },
  { icon: "📝", text: "Narration adaptative par LLM" },
  { icon: "👾", text: "Ennemis data-driven et adaptatifs" },
  { icon: "⚡", text: "Événements contextuels en temps réel" },
  { icon: "🎰", text: "Contrats de clan hebdomadaires" },
] as const;

const TERMINAL_LINES = [
  { text: "> Génération Void Summoning... Convergence pull 73/90",         color: "#ff2d78", delay: 0   },
  { text: "  ✓ Rituel 4 étapes — Rift prismatique (5★ incoming)",          color: "#b39ddb", delay: 0.5 },
  { text: "> Shadow Vigil — Rapport de Kaelan...",                          color: "#ffe135", delay: 1   },
  { text: `  "J'ai trouvé 3 runes Corrupted et quelque chose d'autre."`,   color: "#ff6b35", delay: 1.5 },
  { text: "> Void Hierarchy : spawn Tier III Sentinels (floor 8)",         color: "#ff2d78", delay: 2   },
  { text: "  ✓ Void Stalker ×2 · Crystal Golem ×1 ♡",                     color: "#00bcd4", delay: 2.5 },
  { text: `> Personal Quest : Nyx (Affinité 65 → milestone 75)...`,        color: "#ffe135", delay: 3   },
  { text: `  "Nyx te demande de récupérer un Fragment perdu."`,             color: "#ea80fc", delay: 3.5 },
  { text: "> Resonance Bond : Seraphina niveau 6 — Scène débloquée",       color: "#ff2d78", delay: 4   },
  { text: "> Run prêt. Corruption : 67% · Rang Arena : Void Walker ♛",     color: "#ffffff", delay: 4.5 },
] as const;

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Respects prefers-reduced-motion system preference. */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/** Triggers once when element enters the viewport. */
function useIntersection(
  ref: React.RefObject<Element>,
  threshold = 0.15,
): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold, visible]);
  return visible;
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  r: number, rot: number,
) {
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

// ── ParticleCanvas ────────────────────────────────────────────────────────────

type SpawnFn = (x: number, y: number, burst?: boolean) => void;

interface ParticleCanvasProps {
  reducedMotion: boolean;
  spawnRef: React.MutableRefObject<SpawnFn | null>;
}

function ParticleCanvas({ reducedMotion, spawnRef }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  const spawnParticle = useCallback<SpawnFn>((x, y, burst = false) => {
    if (reducedMotion) return;
    const count = burst ? 16 : 1;
    const shapes = ["circle", "star", "heart"] as const;
    for (let i = 0; i < count; i++) {
      const angle = burst
        ? (Math.PI * 2 * i) / count + Math.random() * 0.5
        : Math.random() * Math.PI * 2;
      const speed = burst ? Math.random() * 4 + 1.5 : Math.random() * 1 + 0.3;
      particlesRef.current.push({
        x, y,
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
  }, [reducedMotion]);

  // Expose spawn function to parent
  useEffect(() => { spawnRef.current = spawnParticle; }, [spawnRef, spawnParticle]);

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize only on actual resize — not inside rAF
    const setSize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(document.documentElement);

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Ambient spawn from bottom
      if (Math.random() < 0.4) {
        spawnParticle(Math.random() * canvas.width, canvas.height + 10);
      }

      // Cull + cap
      particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);
      if (particlesRef.current.length > 300) {
        particlesRef.current.splice(0, particlesRef.current.length - 300);
      }

      for (const p of particlesRef.current) {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.025;
        p.rotation += p.rotSpeed;
        p.opacity = 1 - p.life / p.maxLife;

        ctx.save();
        ctx.globalAlpha = p.opacity * 0.9;
        ctx.shadowBlur  = 12;
        ctx.shadowColor = p.color;
        ctx.fillStyle   = p.color;

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
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    const onMove = (e: MouseEvent) => {
      if (Math.random() < 0.05) spawnParticle(e.clientX, e.clientY);
    };
    const onClick = (e: MouseEvent) => spawnParticle(e.clientX, e.clientY, true);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
    };
  }, [reducedMotion, spawnParticle]);

  if (reducedMotion) return null;
  return <canvas ref={canvasRef} className="lp-canvas" aria-hidden="true" />;
}

// ── Mascot ────────────────────────────────────────────────────────────────────

interface MascotProps {
  reducedMotion: boolean;
}

function Mascot({ reducedMotion }: MascotProps) {
  const [bounce, setBounce] = useState(false);
  const [speech, setSpeech] = useState("");
  const [showSpeech, setShowSpeech] = useState(false);
  const bounceTimer = useRef<ReturnType<typeof setTimeout>>();
  const speechTimer = useRef<ReturnType<typeof setTimeout>>();

  const trigger = useCallback(() => {
    setSpeech(MASCOT_LINES[Math.floor(Math.random() * MASCOT_LINES.length)]);
    setShowSpeech(true);
    if (!reducedMotion) {
      setBounce(true);
      clearTimeout(bounceTimer.current);
      bounceTimer.current = setTimeout(() => setBounce(false), 600);
    }
    clearTimeout(speechTimer.current);
    speechTimer.current = setTimeout(() => setShowSpeech(false), 3500);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => { if (Math.random() < 0.4) trigger(); }, 8000);
    return () => clearInterval(id);
  }, [reducedMotion, trigger]);

  useEffect(() => () => {
    clearTimeout(bounceTimer.current);
    clearTimeout(speechTimer.current);
  }, []);

  return (
    <div
      className={`lp-mascot${bounce ? " lp-mascot--bounce" : ""}`}
      role="button"
      tabIndex={0}
      aria-label="Mascotte Umbra — cliquer pour un message"
      onClick={trigger}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trigger(); } }}
    >
      <img src="/assets/mascot_demon.png" alt="Mascotte Umbra" className="lp-mascot-img" loading="lazy" />
      {showSpeech && (
        <div className="lp-speech-bubble" role="status" aria-live="polite">
          <span>{speech}</span>
        </div>
      )}
    </div>
  );
}

// ── HeroSection ───────────────────────────────────────────────────────────────

interface HeroSectionProps {
  onEnter: () => void;
  spawnRef: React.MutableRefObject<SpawnFn | null>;
  reducedMotion: boolean;
}

function HeroSection({ onEnter, spawnRef, reducedMotion }: HeroSectionProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(id);
  }, []);

  const handleEnter = (e: React.MouseEvent) => {
    spawnRef.current?.(e.clientX, e.clientY, true);
    onEnter();
  };

  return (
    <section className="lp-section lp-hero" aria-label="Accueil">
      <img
        src="/assets/hero_bg_manga.jpg"
        alt=""
        aria-hidden="true"
        className="lp-hero-bg"
        // @ts-expect-error fetchpriority is valid HTML but not yet in TS lib
        fetchpriority="high"
      />
      <div className="lp-hero-overlay" aria-hidden="true" />
      {!reducedMotion && <div className="lp-speed-lines" aria-hidden="true" />}
      <div className="lp-hero-character" aria-hidden="true" />
      <div className="lp-halftone" aria-hidden="true" />

      <div className="lp-hero-content">
        <div className={`lp-eyebrow${visible ? " lp-visible" : ""}`}>
          <span className="lp-eyebrow-tag">⚔️ HACK'N'SLASH</span>
          <span className="lp-eyebrow-sep" aria-hidden="true">✦</span>
          <span className="lp-eyebrow-tag">🎲 ROGUELITE</span>
          <span className="lp-eyebrow-sep" aria-hidden="true">✦</span>
          <span className="lp-eyebrow-tag">💜 OTOME LGBTQ+</span>
          <span className="lp-eyebrow-sep" aria-hidden="true">✦</span>
          <span className="lp-eyebrow-tag">🤖 FULL AI</span>
        </div>

        <div className={`lp-logo-wrap${visible ? " lp-visible" : ""}`}>
          <img
            src="/assets/title_logo.png"
            alt="UMBRA"
            className="lp-logo-img"
            width={360}
            height={120}
          />
        </div>

        <p className={`lp-subtitle${visible ? " lp-visible" : ""}`}>
          Combats. Survie. Tombe amoureux·se.{" "}
          <em className="lp-subtitle-accent">L'IA écrit ton histoire~ ♡</em>
        </p>

        <div className={`lp-cta-group${visible ? " lp-visible" : ""}`}>
          <button
            className="lp-btn lp-btn--primary"
            onClick={handleEnter}
            aria-label="Jouer maintenant — accéder au jeu"
          >
            <span aria-hidden="true" className="lp-btn-sparkle">✦</span>
            JOUER MAINTENANT
            <span aria-hidden="true" className="lp-btn-sparkle">✦</span>
          </button>
          <button
            className="lp-btn lp-btn--secondary"
            onClick={() =>
              document.getElementById("lp-features")?.scrollIntoView({
                behavior: reducedMotion ? "instant" : "smooth",
              })
            }
            aria-label="Découvrir les mécaniques de jeu"
          >
            EN SAVOIR PLUS ↓
          </button>
        </div>

        <p className={`lp-scroll-hint${visible ? " lp-visible" : ""}`} aria-hidden="true">
          <span className="lp-scroll-bounce">↓</span>
          <span className="lp-scroll-text">Défile pour découvrir</span>
        </p>
      </div>
    </section>
  );
}

// ── LoreSection ───────────────────────────────────────────────────────────────

function LoreSection() {
  const ref = useRef<HTMLElement>(null);
  const visible = useIntersection(ref);

  return (
    <section
      ref={ref}
      className="lp-section lp-lore"
      id="lp-lore"
      aria-labelledby="lore-title"
    >
      <div className="lp-manga-panel-border" aria-hidden="true" />
      <div className="lp-section-inner">
        <div className={`lp-lore-text${visible ? " lp-slide-in" : ""}`}>
          <div className="lp-manga-tag" aria-hidden="true">📖 LORE</div>
          <h2 className="lp-section-title" id="lore-title">
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
          {/* dl for key/value stats — semantic and screen-reader friendly */}
          <dl className="lp-stat-row">
            <div className="lp-stat">
              <dt className="lp-stat-label">Runs uniques</dt>
              <dd className="lp-stat-num">∞</dd>
            </div>
            <div className="lp-stat">
              <dt className="lp-stat-label">Héros</dt>
              <dd className="lp-stat-num">∞</dd>
            </div>
            <div className="lp-stat">
              <dt className="lp-stat-label">Types d'ennemis</dt>
              <dd className="lp-stat-num">11</dd>
            </div>
            <div className="lp-stat">
              <dt className="lp-stat-label">Narration live</dt>
              <dd className="lp-stat-num">AI</dd>
            </div>
          </dl>
        </div>
        <div
          className={`lp-lore-visual${visible ? " lp-slide-in-right" : ""}`}
          aria-hidden="true"
        >
          <div className="lp-mascot-large-wrap">
            <img
              src="/assets/mascot_demon.png"
              alt=""
              className="lp-mascot-large"
              loading="lazy"
            />
            <div className="lp-mascot-bubble-static">
              "Bienvenue dans mon donjon~ ♛"
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── FeaturesSection ───────────────────────────────────────────────────────────

function FeaturesSection() {
  const ref = useRef<HTMLElement>(null);
  const visible = useIntersection(ref);

  return (
    <section
      ref={ref}
      className="lp-section lp-features"
      id="lp-features"
      aria-labelledby="features-title"
    >
      <div className="lp-section-inner lp-features-inner">
        <div className="lp-manga-tag" aria-hidden="true">⚔️ MÉCANIQUES</div>
        <h2 className="lp-section-title lp-center" id="features-title">
          Ce qui t'<span className="lp-title-accent">attend</span> dans l'Umbra
        </h2>
        <ul className="lp-features-grid" role="list">
          {FEATURES.map((f, i) => (
            <li
              key={f.title}
              className={`lp-feature-card${visible ? " lp-card-in" : ""}`}
              style={{ animationDelay: `${i * 0.1}s`, "--card-color": f.color } as React.CSSProperties}
            >
              <div className="lp-feature-tag" aria-hidden="true">{f.tag}</div>
              <div className="lp-feature-icon" role="img" aria-label={f.title}>{f.icon}</div>
              <h3 className="lp-feature-title">{f.title}</h3>
              <p className="lp-feature-desc">{f.desc}</p>
              <div className="lp-feature-sparkles" aria-hidden="true">✦ ✦ ✦</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── ClassesSection ────────────────────────────────────────────────────────────

function ClassesSection() {
  const ref = useRef<HTMLElement>(null);
  const visible = useIntersection(ref);

  return (
    <section
      ref={ref}
      className="lp-section lp-classes"
      aria-labelledby="classes-title"
    >
      <div className="lp-section-inner">
        <div className="lp-manga-tag" aria-hidden="true">👑 CLASSES</div>
        <h2 className="lp-section-title lp-center" id="classes-title">
          Choisis ton <span className="lp-title-accent">Destin</span>
        </h2>
        <ul className="lp-classes-row" role="list">
          {CLASSES.map((c, i) => (
            <li
              key={c.name}
              className={`lp-class-card${visible ? " lp-card-in" : ""}`}
              style={{ animationDelay: `${i * 0.15}s`, "--class-color": c.color } as React.CSSProperties}
            >
              <div className="lp-class-emoji" role="img" aria-label={c.name}>{c.emoji}</div>
              <div className="lp-class-role">{c.role}</div>
              <h3 className="lp-class-name">{c.name}</h3>
              <p className="lp-class-desc">{c.desc}</p>
              <div className="lp-class-badge">
                {c.available ? "JOUABLE ✦" : "BIENTÔT ✦"}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── VoidSummoningSection ─────────────────────────────────────────────────────

interface VoidSummoningSectionProps {
  spawnRef: React.MutableRefObject<SpawnFn | null>;
}

function VoidSummoningSection({ spawnRef }: VoidSummoningSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const visible = useIntersection(ref);
  const [activeCard, setActiveCard] = React.useState<number | null>(null);
  const [pulseCount, setPulseCount] = React.useState(0);

  // Simulate gacha "pull" animation on banner click
  const handleBannerClick = React.useCallback((e: React.MouseEvent) => {
    spawnRef.current?.(e.clientX, e.clientY, true);
    setPulseCount((n) => n + 1);
  }, [spawnRef]);

  return (
    <section
      ref={ref}
      className="lp-section lp-void-summoning"
      id="lp-romance"
      aria-labelledby="summoning-title"
    >
      {/* Ambient background glow */}
      <div className="lp-void-bg" aria-hidden="true">
        <div className="lp-void-orb lp-void-orb--1" />
        <div className="lp-void-orb lp-void-orb--2" />
        <div className="lp-void-orb lp-void-orb--3" />
      </div>

      <div className="lp-section-inner">
        {/* Header */}
        <div className="lp-manga-tag lp-tag--gacha" aria-hidden="true">✦ VOID SUMMONING</div>
        <h2 className="lp-section-title lp-center" id="summoning-title">
          Un roster <span className="lp-title-accent">infini</span> t'attend
        </h2>
        <p className="lp-body-text lp-center" style={{ maxWidth: 680, margin: "0 auto 1rem" }}>
          L'<strong>AI Director</strong> génère chaque héros de toutes pièces — apparence, personnalité,
          histoire, skills, et potentiel de romance. Chaque invocation est unique. Chaque lien est réel.
        </p>
        <p className="lp-body-text lp-center" style={{ maxWidth: 680, margin: "0 auto 2.5rem", opacity: 0.8 }}>
          Umbra est un jeu pour <strong>tout le monde</strong> : pronoms libres, orientations respectées,
          polyamour accepté. Configure ta <strong>Relationship Preference</strong> par héros —
          Romance, Amitié Profonde, ou Neutre.
          <span className="lp-wink"> ♡</span>
        </p>

        {/* Pity / Banner info bar */}
        <div className="lp-pity-bar" role="complementary" aria-label="Informations sur le système de pity">
          <div className="lp-pity-item">
            <span className="lp-pity-icon" aria-hidden="true">🌀</span>
            <span><strong>Soft Pity</strong> dès 70 invocations</span>
          </div>
          <div className="lp-pity-sep" aria-hidden="true">·</div>
          <div className="lp-pity-item">
            <span className="lp-pity-icon" aria-hidden="true">💎</span>
            <span><strong>Hard Pity</strong> garanti à 90</span>
          </div>
          <div className="lp-pity-sep" aria-hidden="true">·</div>
          <div className="lp-pity-item">
            <span className="lp-pity-icon" aria-hidden="true">🤖</span>
            <span><strong>IA</strong> génère chaque héros</span>
          </div>
          <div className="lp-pity-sep" aria-hidden="true">·</div>
          <div className="lp-pity-item">
            <span className="lp-pity-icon" aria-hidden="true">♾️</span>
            <span><strong>Roster infini</strong> procédural</span>
          </div>
        </div>

        {/* Hero cards grid */}
        <ul className="lp-roster-grid" role="list">
          {ROSTER_PREVIEW.map((hero, i) => {
            const isUnknown = hero.rarity === 0;
            const is5Star = hero.rarity === 5;
            const isActive = activeCard === i;
            return (
              <li
                key={hero.name}
                className={[
                  "lp-hero-card",
                  is5Star ? "lp-hero-card--5star" : "",
                  isUnknown ? "lp-hero-card--unknown" : "",
                  visible ? "lp-card-in" : "",
                  isActive ? "lp-hero-card--active" : "",
                ].join(" ").trim()}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  "--card-color": hero.color,
                } as React.CSSProperties}
                onMouseEnter={(e) => {
                  setActiveCard(i);
                  if (is5Star) spawnRef.current?.(e.clientX, e.clientY, true);
                }}
                onMouseLeave={() => setActiveCard(null)}
                onFocus={() => setActiveCard(i)}
                onBlur={() => setActiveCard(null)}
                tabIndex={0}
                role="article"
                aria-label={`${hero.name} — ${hero.role}`}
              >
                {/* Rarity badge */}
                <div
                  className={`lp-hero-rarity ${
                    is5Star ? "lp-hero-rarity--5" :
                    isUnknown ? "lp-hero-rarity--unknown" :
                    "lp-hero-rarity--4"
                  }`}
                  aria-label={`Rareté ${hero.tag}`}
                >
                  {hero.tag}
                </div>

                {/* Portrait / silhouette */}
                <div className="lp-hero-portrait-wrap">
                  {hero.img ? (
                    <img
                      src={hero.img}
                      alt={`Illustration de ${hero.name}`}
                      className="lp-hero-portrait"
                      loading="lazy"
                      width={140}
                      height={200}
                    />
                  ) : isUnknown ? (
                    <div className="lp-hero-silhouette lp-hero-silhouette--mystery" aria-hidden="true">
                      <span className="lp-mystery-glyph">?</span>
                    </div>
                  ) : (
                    <div
                      className="lp-hero-silhouette"
                      style={{ background: `linear-gradient(180deg, ${hero.color}33 0%, ${hero.color}88 100%)` }}
                      aria-hidden="true"
                    >
                      <span className="lp-hero-silhouette-glyph" aria-hidden="true">✦</span>
                    </div>
                  )}
                  {/* Shimmer overlay on 5★ */}
                  {is5Star && <div className="lp-hero-shimmer" aria-hidden="true" />}
                </div>

                {/* Info */}
                <div className="lp-hero-info">
                  <h3
                    className="lp-hero-name"
                    style={{ color: isUnknown ? "#ea80fc" : hero.color }}
                  >
                    {hero.name}
                  </h3>
                  <div className="lp-hero-role">{hero.role}</div>
                  <p className="lp-hero-desc">{hero.desc}</p>
                  {/* Resonance level preview */}
                  {!isUnknown && (
                    <div className="lp-hero-resonance" aria-label="Niveaux de résonance disponibles">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <span
                          key={j}
                          className={`lp-res-dot${isActive && j < 3 ? " lp-res-dot--active" : ""}`}
                          aria-hidden="true"
                        />
                      ))}
                      <span className="lp-res-label">Résonance 1–15</span>
                    </div>
                  )}
                </div>

                {/* Glow border */}
                <div className="lp-hero-glow" aria-hidden="true" />
              </li>
            );
          })}
        </ul>

        {/* Summoning CTA */}
        <div className="lp-summoning-cta">
          <button
            className="lp-btn lp-btn--gacha"
            onClick={handleBannerClick}
            aria-label="Ouvrir le Void Summoning Ritual — invoquer un héros"
            key={pulseCount}
          >
            <span aria-hidden="true" className="lp-btn-sparkle">🌀</span>
            VOID SUMMONING RITUAL
            <span aria-hidden="true" className="lp-btn-sparkle">🌀</span>
          </button>
          <p className="lp-summoning-disclaimer">
            ✦ Probabilités affichées en jeu · Monétisation éthique · Free to Play ✦
          </p>
        </div>

        {/* LGBTQ+ note */}
        <p className="lp-romance-note">
          <span className="lp-wink">
            ✦ Pronoms libres · Polyamour · LGBTQ+ friendly · Dialogues IA personnalisés ✦
          </span>
        </p>
      </div>
    </section>
  );
}

// ── AISection ─────────────────────────────────────────────────────────────────

function AISection() {
  const ref = useRef<HTMLElement>(null);
  const visible = useIntersection(ref);

  return (
    <section
      ref={ref}
      className="lp-section lp-ai-section"
      aria-labelledby="ai-title"
    >
      <div className="lp-section-inner lp-ai-inner">
        <div className={`lp-ai-content${visible ? " lp-slide-in" : ""}`}>
          <div className="lp-manga-tag lp-tag--ai" aria-hidden="true">🤖 TECHNOLOGIE</div>
          <h2 className="lp-section-title" id="ai-title">
            Propulsé par l'<span className="lp-title-accent">Intelligence Artificielle</span>
          </h2>
          <p className="lp-body-text">
            L'<strong>AI Director</strong> analyse ton style de jeu, tes choix, tes échecs —
            et génère des donjons, des quêtes et des dialogues personnalisés à chaque session.
          </p>
          <ul className="lp-ai-features" role="list">
            {AI_FEATURES.map((item) => (
              <li key={item.text} className="lp-ai-item">
                <span className="lp-ai-icon" aria-hidden="true">{item.icon}</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          className={`lp-ai-visual${visible ? " lp-slide-in-right" : ""}`}
          role="img"
          aria-label="Exemple de logs de l'AI Director en temps réel"
        >
          <div className="lp-terminal">
            <div className="lp-terminal-bar" aria-hidden="true">
              <span className="lp-terminal-dot" style={{ background: "#ff2d78" }} />
              <span className="lp-terminal-dot" style={{ background: "#ffe135" }} />
              <span className="lp-terminal-dot" style={{ background: "#00bcd4" }} />
              <span className="lp-terminal-title">✦ AI Director — Live Feed ✦</span>
            </div>
            <div className="lp-terminal-body">
              <div className="lp-terminal-lines">
                {TERMINAL_LINES.map((line, i) => (
                  <div
                    key={i}
                    className="lp-terminal-line"
                    style={{ animationDelay: `${line.delay}s`, color: line.color }}
                  >
                    {line.text}
                  </div>
                ))}
                <div className="lp-terminal-cursor" aria-hidden="true">█</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── FinalCTA ──────────────────────────────────────────────────────────────────

interface FinalCTAProps {
  onEnter: () => void;
  spawnRef: React.MutableRefObject<SpawnFn | null>;
}

function FinalCTA({ onEnter, spawnRef }: FinalCTAProps) {
  const ref = useRef<HTMLElement>(null);
  const visible = useIntersection(ref, 0.3);

  return (
    <section
      ref={ref}
      className="lp-section lp-final-cta"
      aria-labelledby="final-cta-title"
    >
      <div className="lp-final-bg" aria-hidden="true" />
      <div className={`lp-section-inner lp-final-inner${visible ? " lp-slide-in" : ""}`}>
        <img
          src="/assets/mascot_demon.png"
          alt=""
          className="lp-final-mascot"
          loading="lazy"
          aria-hidden="true"
        />
        <h2 className="lp-final-title" id="final-cta-title">
          L'Umbra <span className="lp-title-accent">t'appelle</span>.
        </h2>
        <p className="lp-final-sub">
          Rejoins les premiers Chasseurs de l'Ombre.{" "}
          <span className="lp-wink">La torture commence maintenant~ ♡</span>
        </p>
        <button
          className="lp-btn lp-btn--primary lp-btn--large"
          onClick={(e) => { spawnRef.current?.(e.clientX, e.clientY, true); onEnter(); }}
          aria-label="Entrer dans l'Umbra — commencer à jouer"
        >
          <span aria-hidden="true" className="lp-btn-sparkle">♛</span>
          ENTRER DANS LES TÉNÈBRES
          <span aria-hidden="true" className="lp-btn-sparkle">♛</span>
        </button>
        <p className="lp-final-note">✦ Aucune installation · Cross-platform · Free to Play ✦</p>
      </div>
    </section>
  );
}

// ── SiteFooter ────────────────────────────────────────────────────────────────

function SiteFooter() {
  return (
    <footer className="lp-footer">
      <img
        src="/assets/title_logo.png"
        alt="UMBRA"
        className="lp-footer-logo-img"
        loading="lazy"
      />
      <nav className="lp-footer-links" aria-label="Navigation bas de page">
        <a href="#lp-lore">Lore</a>
        <a href="#lp-features">Mécaniques</a>
        <a href="#lp-romance">Compagnons</a>
        <span aria-disabled="true">Discord (bientôt)</span>
      </nav>
      <p className="lp-footer-copy">© 2026 Umbra Platform · Tous droits réservés ♡</p>
    </footer>
  );
}

// ── LandingPage (root) ────────────────────────────────────────────────────────

export function LandingPage({ onEnter }: LandingPageProps) {
  const reducedMotion = useReducedMotion();
  const spawnRef = useRef<SpawnFn | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: -200, y: -200 });
  const [cursorHover] = useState(false);
  const [hasFinePointer] = useState(
    () => window.matchMedia("(pointer: fine)").matches,
  );

  useEffect(() => {
    const id = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(id);
  }, []);

  // Custom cursor — only track on fine-pointer (mouse) devices
  useEffect(() => {
    if (!hasFinePointer) return;
    const onMove = (e: MouseEvent) => setCursorPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [hasFinePointer]);

  return (
    <div className={`lp-root${loaded ? " lp-loaded" : ""}`}>
      {/* Skip-to-content link — keyboard/AT users */}
      <a href="#lp-main" className="lp-skip-link">
        Aller au contenu principal
      </a>

      {/* Custom cursor — fine pointer only, hidden from AT */}
      {hasFinePointer && (
        <>
          <div
            className={`lp-cursor${cursorHover ? " lp-cursor--hover" : ""}`}
            style={{ left: cursorPos.x, top: cursorPos.y }}
            aria-hidden="true"
          />
          <div
            className="lp-cursor-trail"
            style={{ left: cursorPos.x, top: cursorPos.y }}
            aria-hidden="true"
          />
        </>
      )}

      {/* Decorative canvas — hidden from assistive tech */}
      <ParticleCanvas reducedMotion={reducedMotion} spawnRef={spawnRef} />

      {/* Floating mascot */}
      <Mascot reducedMotion={reducedMotion} />

      <main id="lp-main">
        <HeroSection onEnter={onEnter} spawnRef={spawnRef} reducedMotion={reducedMotion} />
        <LoreSection />
        <FeaturesSection />
        <ClassesSection />
        <VoidSummoningSection spawnRef={spawnRef} />
        <AISection />
        <FinalCTA onEnter={onEnter} spawnRef={spawnRef} />
      </main>

      <SiteFooter />
    </div>
  );
}
