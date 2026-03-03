import { useState, useMemo } from "react";
import type { Hero, HeroElement, HeroRarity } from "../types/game";
import "./HeroRoster.css";

interface HeroRosterProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Stub heroes ─────────────────────────────────────────────────

const STUB_HEROES: Hero[] = [
  {
    id: "h1", name: "Aelara", title: "Tisseuse de Flammes", rarity: 5, level: 40,
    element: "fire",
    baseStats: { strength: 82, agility: 65, intelligence: 90, willpower: 78, charisma: 72 },
    derivedStats: { hp: 12400, mp: 4200, attack: 1850, defense: 920, critRate: 22 },
    affinities: { fire: 95, ice: -30, shadow: 20 },
    skills: [
      { id: "s1", name: "Nova Ardente", description: "Déchaîne une explosion de flammes qui consume tout dans un rayon de 8m.", type: "active", element: "fire", manaCost: 45, cooldown: 12 },
      { id: "s2", name: "Rideau de Braise", description: "Invoque un mur de braises qui bloque les projectiles pendant 5s.", type: "active", element: "fire", manaCost: 30, cooldown: 18 },
      { id: "s3", name: "Cœur Incandescent", description: "Les attaques de feu ont 15% de chance d'infliger Brûlure.", type: "passive", element: "fire" },
    ],
    personality: { archetype: "mentor", traits: ["Sage", "Impatiente", "Passionnée"], alignment: "Chaotique Bon" },
    lore: { origin: "Née dans les forges souterraines d'Ashenveil", motivation: "Cherche la flamme primordiale pour restaurer sa cité", fragments: ["Fragment I: Les forges ne s'éteignent jamais"] },
    portraitUrl: null, glyph: "🔥", color: "#ff6b35", owned: true,
  },
  {
    id: "h2", name: "Theron", title: "Lame du Silence", rarity: 5, level: 35,
    element: "shadow",
    baseStats: { strength: 70, agility: 95, intelligence: 60, willpower: 68, charisma: 55 },
    derivedStats: { hp: 9800, mp: 2800, attack: 2100, defense: 680, critRate: 35 },
    affinities: { shadow: 90, light: -40, nature: 10 },
    skills: [
      { id: "s4", name: "Pas du Néant", description: "Se téléporte derrière la cible la plus proche, infligeant 200% de dégâts.", type: "active", element: "shadow", manaCost: 35, cooldown: 8 },
      { id: "s5", name: "Mille Ombres", description: "Crée 3 clones d'ombre qui attaquent indépendamment pendant 6s.", type: "active", element: "shadow", manaCost: 55, cooldown: 22 },
      { id: "s6", name: "Danse Mortelle", description: "Chaque kill consécutif augmente la vitesse d'attaque de 8% (max 40%).", type: "passive" },
    ],
    personality: { archetype: "rival", traits: ["Froid", "Calculateur", "Loyal (en secret)"], alignment: "Neutre Vrai" },
    lore: { origin: "Ancien assassin de la Guilde des Murmures", motivation: "Expier les crimes de son passé en protégeant les innocents", fragments: ["Fragment I: Le silence est la plus efficace des armes"] },
    portraitUrl: null, glyph: "🌙", color: "#9c27b0", owned: true,
  },
  {
    id: "h3", name: "Isolde", title: "Aube Éternelle", rarity: 4, level: 28,
    element: "light",
    baseStats: { strength: 45, agility: 55, intelligence: 88, willpower: 92, charisma: 85 },
    derivedStats: { hp: 10200, mp: 5100, attack: 1200, defense: 1100, critRate: 12 },
    affinities: { light: 88, shadow: -35, nature: 30 },
    skills: [
      { id: "s7", name: "Bénédiction Radieuse", description: "Soigne tous les alliés dans un rayon de 10m pour 25% de leur PV max.", type: "active", element: "light", manaCost: 60, cooldown: 20 },
      { id: "s8", name: "Jugement Céleste", description: "Un rayon de lumière frappe la cible, infligeant des dégâts sacrés.", type: "active", element: "light", manaCost: 40, cooldown: 10 },
      { id: "s9", name: "Grâce Divine", description: "Les soins ont 20% de chance de purifier les altérations d'état.", type: "passive", element: "light" },
    ],
    personality: { archetype: "protector", traits: ["Bienveillante", "Obstinée", "Naïve"], alignment: "Loyal Bon" },
    lore: { origin: "Prêtresse du Temple de l'Aube Blanche", motivation: "Apporter la lumière dans les profondeurs du Vide", fragments: ["Fragment I: La lumière ne juge pas, elle révèle"] },
    portraitUrl: null, glyph: "☀", color: "#ffd700", owned: true,
  },
  {
    id: "h4", name: "Fenrir", title: "Croc de Givre", rarity: 4, level: 22,
    element: "ice",
    baseStats: { strength: 88, agility: 72, intelligence: 50, willpower: 75, charisma: 40 },
    derivedStats: { hp: 13500, mp: 2200, attack: 1950, defense: 1300, critRate: 18 },
    affinities: { ice: 85, fire: -25, lightning: 15 },
    skills: [
      { id: "s10", name: "Morsure Arctique", description: "Mord la cible, gelant et infligeant 180% de dégâts.", type: "active", element: "ice", manaCost: 25, cooldown: 6 },
      { id: "s11", name: "Tempête de Glace", description: "Invoque un blizzard ralentissant tous les ennemis de 40% pendant 8s.", type: "active", element: "ice", manaCost: 50, cooldown: 25 },
      { id: "s12", name: "Sang Gelé", description: "Sous 30% PV: +25% défense et immunité au gel.", type: "passive", element: "ice" },
    ],
    personality: { archetype: "protector", traits: ["Féroce", "Protecteur", "Solitaire"], alignment: "Chaotique Neutre" },
    lore: { origin: "Loup-garou survivant du Clan du Nord", motivation: "Retrouver les membres perdus de sa meute", fragments: ["Fragment I: Le froid conserve ce que la chaleur détruit"] },
    portraitUrl: null, glyph: "❄", color: "#00bcd4", owned: true,
  },
  {
    id: "h5", name: "Zephyra", title: "Murmure Verdoyant", rarity: 3, level: 15,
    element: "nature",
    baseStats: { strength: 40, agility: 78, intelligence: 72, willpower: 65, charisma: 80 },
    derivedStats: { hp: 7800, mp: 3400, attack: 980, defense: 750, critRate: 15 },
    affinities: { nature: 80, lightning: -20, fire: -15 },
    skills: [
      { id: "s13", name: "Lianes Étrangleuses", description: "Des lianes jaillissent du sol, immobilisant les ennemis pendant 3s.", type: "active", element: "nature", manaCost: 30, cooldown: 14 },
      { id: "s14", name: "Pluie de Pétales", description: "Régénère 5% PV par seconde pendant 6s pour tout le groupe.", type: "active", element: "nature", manaCost: 45, cooldown: 20 },
      { id: "s15", name: "Symbiose", description: "Les soins appliqués augmentent l'ATK de la cible de 10% pendant 8s.", type: "passive", element: "nature" },
    ],
    personality: { archetype: "trickster", traits: ["Espiègle", "Empathique", "Rêveuse"], alignment: "Neutre Bon" },
    lore: { origin: "Née d'une graine de l'Arbre-Monde", motivation: "Répandre la vie dans les terres corrompues par le Vide", fragments: ["Fragment I: Chaque racine cache un secret"] },
    portraitUrl: null, glyph: "🌿", color: "#4caf50", owned: true,
  },
  {
    id: "h6", name: "Voltaris", title: "Arc Foudroyant", rarity: 5, level: 1,
    element: "lightning",
    baseStats: { strength: 60, agility: 85, intelligence: 92, willpower: 70, charisma: 65 },
    derivedStats: { hp: 8200, mp: 4600, attack: 2200, defense: 600, critRate: 28 },
    affinities: { lightning: 92, nature: -30, ice: 15 },
    skills: [
      { id: "s16", name: "Frappe Orageuse", description: "Un éclair frappe en chaîne jusqu'à 4 ennemis.", type: "active", element: "lightning", manaCost: 40, cooldown: 10 },
      { id: "s17", name: "Champ Magnétique", description: "Crée un champ qui repousse les projectiles et électrise les ennemis proches.", type: "active", element: "lightning", manaCost: 55, cooldown: 18 },
      { id: "s18", name: "Surtension", description: "Les critiques infligent un effet Paralysie de 1.5s.", type: "passive", element: "lightning" },
    ],
    personality: { archetype: "enigma", traits: ["Mystérieux", "Impulsif", "Brillant"], alignment: "Chaotique Bon" },
    lore: { origin: "Dernier survivant de la Tour de l'Orage", motivation: "Reconstruire la Tour et maîtriser la foudre primordiale", fragments: [] },
    portraitUrl: null, glyph: "⚡", color: "#ffc107", owned: false,
  },
];

// ── Constants ───────────────────────────────────────────────────

const ELEMENT_LABELS: Record<HeroElement, { name: string; icon: string }> = {
  fire: { name: "Feu", icon: "🔥" },
  ice: { name: "Glace", icon: "❄" },
  lightning: { name: "Foudre", icon: "⚡" },
  shadow: { name: "Ombre", icon: "🌙" },
  light: { name: "Lumière", icon: "☀" },
  nature: { name: "Nature", icon: "🌿" },
};

const RARITY_STARS: Record<HeroRarity, string> = {
  3: "★★★",
  4: "★★★★",
  5: "★★★★★",
};

const ARCHETYPE_LABELS: Record<string, string> = {
  protector: "Protecteur",
  rival: "Rival",
  mentor: "Mentor",
  trickster: "Filou",
  enigma: "Énigme",
};

// ── Component ───────────────────────────────────────────────────

type FilterElement = HeroElement | "all";

export function HeroRoster({ isOpen, onClose }: HeroRosterProps) {
  const [heroes] = useState<Hero[]>(STUB_HEROES);
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const [filterElement, setFilterElement] = useState<FilterElement>("all");
  const [filterOwned, setFilterOwned] = useState(false);

  const filteredHeroes = useMemo(() => {
    return heroes
      .filter((h) => filterElement === "all" || h.element === filterElement)
      .filter((h) => !filterOwned || h.owned)
      .sort((a, b) => b.rarity - a.rarity || b.level - a.level);
  }, [heroes, filterElement, filterOwned]);

  if (!isOpen) return null;

  const selectedHero = heroes.find((h) => h.id === selectedHeroId);

  return (
    <div className="hr-overlay" onClick={onClose}>
      <div className="hr-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="hr-header">
          <h2 className="hr-title">
            <span className="hr-title-icon">⚔</span>
            Registre des Héros
          </h2>
          <button className="hr-close" onClick={onClose}>×</button>
        </div>

        {/* Filters */}
        <div className="hr-filters">
          <div className="hr-element-filters">
            <button
              className={`hr-filter-btn ${filterElement === "all" ? "hr-filter-btn--active" : ""}`}
              onClick={() => setFilterElement("all")}
            >
              Tous
            </button>
            {(Object.keys(ELEMENT_LABELS) as HeroElement[]).map((el) => (
              <button
                key={el}
                className={`hr-filter-btn ${filterElement === el ? "hr-filter-btn--active" : ""}`}
                onClick={() => setFilterElement(el)}
                style={{ "--filter-color": STUB_HEROES.find((h) => h.element === el)?.color } as React.CSSProperties}
              >
                {ELEMENT_LABELS[el].icon}
              </button>
            ))}
          </div>
          <label className="hr-owned-filter">
            <input
              type="checkbox"
              checked={filterOwned}
              onChange={(e) => setFilterOwned(e.target.checked)}
            />
            Possédés uniquement
          </label>
        </div>

        <div className="hr-body">
          {/* Hero grid */}
          <div className="hr-grid">
            {filteredHeroes.map((hero) => (
              <button
                key={hero.id}
                className={`hr-card hr-card--${hero.element} ${selectedHeroId === hero.id ? "hr-card--selected" : ""} ${!hero.owned ? "hr-card--locked" : ""}`}
                style={{ "--hero-color": hero.color } as React.CSSProperties}
                onClick={() => setSelectedHeroId(hero.id)}
              >
                <div className="hr-card-portrait">
                  <span className="hr-card-glyph">{hero.glyph}</span>
                  {!hero.owned && <div className="hr-card-lock">🔒</div>}
                </div>
                <div className="hr-card-info">
                  <span className={`hr-card-rarity hr-card-rarity--${hero.rarity}`}>
                    {RARITY_STARS[hero.rarity]}
                  </span>
                  <h4 className="hr-card-name">{hero.name}</h4>
                  <span className="hr-card-element">{ELEMENT_LABELS[hero.element].icon} {ELEMENT_LABELS[hero.element].name}</span>
                  {hero.owned && <span className="hr-card-level">Nv.{hero.level}</span>}
                </div>
              </button>
            ))}
          </div>

          {/* Hero detail */}
          {selectedHero && (
            <div className="hr-detail" style={{ "--hero-color": selectedHero.color } as React.CSSProperties}>
              <div className="hr-detail-header">
                <div className="hr-detail-portrait">
                  <span className="hr-detail-glyph">{selectedHero.glyph}</span>
                </div>
                <div className="hr-detail-identity">
                  <span className={`hr-detail-rarity hr-detail-rarity--${selectedHero.rarity}`}>
                    {RARITY_STARS[selectedHero.rarity]}
                  </span>
                  <h2 className="hr-detail-name">{selectedHero.name}</h2>
                  <p className="hr-detail-title">{selectedHero.title}</p>
                  <div className="hr-detail-meta">
                    <span>{ELEMENT_LABELS[selectedHero.element].icon} {ELEMENT_LABELS[selectedHero.element].name}</span>
                    <span>·</span>
                    <span>{ARCHETYPE_LABELS[selectedHero.personality.archetype]}</span>
                    <span>·</span>
                    <span>Nv.{selectedHero.level}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="hr-detail-section">
                <h3 className="hr-section-title">Stats de Base</h3>
                <div className="hr-stats">
                  {Object.entries(selectedHero.baseStats).map(([stat, value]) => (
                    <div key={stat} className="hr-stat-row">
                      <span className="hr-stat-name">{stat.toUpperCase()}</span>
                      <div className="hr-stat-bar">
                        <div className="hr-stat-fill" style={{ width: `${value}%` }} />
                      </div>
                      <span className="hr-stat-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Derived stats */}
              <div className="hr-detail-section">
                <h3 className="hr-section-title">Stats Dérivées</h3>
                <div className="hr-derived">
                  <span className="hr-derived-stat">HP {selectedHero.derivedStats.hp.toLocaleString()}</span>
                  <span className="hr-derived-stat">MP {selectedHero.derivedStats.mp.toLocaleString()}</span>
                  <span className="hr-derived-stat">ATK {selectedHero.derivedStats.attack}</span>
                  <span className="hr-derived-stat">DEF {selectedHero.derivedStats.defense}</span>
                  <span className="hr-derived-stat">CRIT {selectedHero.derivedStats.critRate}%</span>
                </div>
              </div>

              {/* Skills */}
              <div className="hr-detail-section">
                <h3 className="hr-section-title">Compétences</h3>
                <div className="hr-skills">
                  {selectedHero.skills.map((skill) => (
                    <div key={skill.id} className={`hr-skill hr-skill--${skill.type}`}>
                      <div className="hr-skill-header">
                        <span className="hr-skill-type">{skill.type === "active" ? "Actif" : "Passif"}</span>
                        {skill.element && (
                          <span className="hr-skill-element">{ELEMENT_LABELS[skill.element].icon}</span>
                        )}
                      </div>
                      <h4 className="hr-skill-name">{skill.name}</h4>
                      <p className="hr-skill-desc">{skill.description}</p>
                      {skill.type === "active" && (
                        <div className="hr-skill-meta">
                          <span>MP: {skill.manaCost}</span>
                          <span>CD: {skill.cooldown}s</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Personality */}
              <div className="hr-detail-section">
                <h3 className="hr-section-title">Personnalité</h3>
                <div className="hr-personality">
                  <span className="hr-personality-archetype">
                    {ARCHETYPE_LABELS[selectedHero.personality.archetype]}
                  </span>
                  <div className="hr-personality-traits">
                    {selectedHero.personality.traits.map((t) => (
                      <span key={t} className="hr-trait">{t}</span>
                    ))}
                  </div>
                  <span className="hr-personality-alignment">{selectedHero.personality.alignment}</span>
                </div>
              </div>

              {/* Lore */}
              <div className="hr-detail-section">
                <h3 className="hr-section-title">Histoire</h3>
                <p className="hr-lore-origin">{selectedHero.lore.origin}</p>
                <p className="hr-lore-motivation">« {selectedHero.lore.motivation} »</p>
                {selectedHero.lore.fragments.length > 0 && (
                  <div className="hr-lore-fragments">
                    {selectedHero.lore.fragments.map((f, i) => (
                      <span key={i} className="hr-lore-fragment">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
