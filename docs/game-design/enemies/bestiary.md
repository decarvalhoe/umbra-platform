# Enemy Bestiary — Project Umbra (GDD v3.0)

> Référence pour tous les ennemis implémentés dans Umbra.
> Chaque entrée fournit le tier, les stats, les comportements AI, les patterns d’attaque et les drops.

---

## Table des Matières

1. [Hiérarchie du Void](#hiérarchie-du-void)
2. [Conventions](#conventions)
3. [Ennemis par Zone](#ennemis-par-zone)
   - [Zone 1 — Cendres Désolées (F1-3)](#zone-1--cendres-désolées-f1-3)
   - [Zone 2 — Cryptes d’Ombre (F4-6)](#zone-2--cryptes-dombre-f4-6)
   - [Zone 3 — Profondeurs Carmines (F4-6)](#zone-3--profondeurs-carmines-f4-6)
   - [Zone 4 — Faille du Néant (F7+)](#zone-4--faille-du-néant-f7)
   - [Multi-zone](#multi-zone)
4. [Boss](#boss)
5. [Echo Enemies (Tier V — Futur)](#echo-enemies-tier-v--futur)
6. [Stat Scaling Table](#stat-scaling-table)
7. [Elemental Resistance Matrix](#elemental-resistance-matrix)

---

## Hiérarchie du Void

La taxonomie des ennemis suit une hiérarchie à 5 tiers représentant leur connexion au Void :

| Tier | Nom | Description | Exemples |
|------|-----|-------------|----------|
| **I — Fragmentés** | Créatures faiblement touchées par le Void | Formes instables, comportement basique, facilement vaincues. Servent de fodder. | Spectre de Cendre, Chien de Braise, Rat d’Umbra |
| **II — Corrompus** | Êtres mortels transformés par la corruption | Gardent une forme reconnaissable mais altérée. Patterns plus complexes. | Sentinelle Calcinée, Chevalier Déchu, Araignée Nocturne |
| **III — Éveillés** | Entités conscientes du Void | Intelligence tactique, attaques élémentaires, capacités spéciales. | Prêtre de Sang, Sangsue Géante, Spectre d’Ombre |
| **IV — Seigneurs** | Maîtres du Void | Boss et élites puissants, multi-phases, mécaniques uniques. | Gardien Corrompu, Tyran de Flamme, Harbinger du Void |
| **V — Échos** | Reflets des compagnons du joueur (Futur) | Versions corrompues des compagnons, apparaissant dans les donjons mythiques. | À venir |

---

## Conventions

### Définitions de Stats

| Stat | Description |
|------|-------------|
| **HP** | Points de vie. 0 = mort. |
| **ATK** | Dégâts de base (avant résistances). |
| **DEF** | Réduction de dégâts fixe. |
| **Speed** | Vitesse de déplacement (px/s). |
| **Detection** | Rayon de détection du joueur (px). |
| **Atk Range** | Distance d’attaque (px). |

### Types d’Ennemis

| Type | Description |
|------|-------------|
| **Basic** | Fodder commun. HP bas, patterns simples. Apparaît en groupe. |
| **Elite** | Plus résistant, AI complexe, mécaniques uniques. |
| **Mini-boss** | Menace mid-donjon. Peut bloquer la progression. |
| **Boss** | Rencontre de fin de zone. Multi-phase, arène scriptée. |
| **Special** | Comportement unique hors catégories. |

---

## Ennemis par Zone

---

### Zone 1 — Cendres Désolées (F1-3)

**Thème** : Feu, cendres, dévastation. Paysage calciné avec ruines fumantes et rivières de lave refroidissante.

---

#### 1. Spectre de Cendre (Ash Specter)

| Champ | Valeur |
|-------|--------|
| **Tier** | I — Fragmenté |
| **Type** | Basic |
| **Élément** | Feu |
| **Zone** | Cendres Désolées (F1-3) |

| HP | ATK | DEF | Speed | Detection | Atk Range |
|----|-----|-----|-------|-----------|-----------|
| 80 | 18 | 4 | 90 | 250 | 200 |

**Comportement AI** : Flotte au-dessus du sol en patrouille lente. Tire des boules de feu à distance. Recule si le joueur s’approche. Si coincé, passe en mode burst rapide puis tente une fuite à travers le joueur (i-frames temporaires).

| Attaque | Telegraph | Active | Recovery | CD | Dégâts | Portée | Notes |
|---------|-----------|--------|----------|----|---------|--------|-------|
| Fireball | 600 ms | 100 ms | 400 ms | 1500 ms | 18 | 200 px | Cible unique, ligne droite. Applique Burn. |
| Rapid Burst | 300 ms | 3x100 ms | 800 ms | 4000 ms | 12 chaque | 180 px | Quand coincé. Éventail 15°. |
| Phase Escape | 200 ms | 500 ms | 600 ms | 8000 ms | 0 | 120 px | Invincible pendant frames actives. |

**Loot** : Ash Dust (60%), Ember Shard (20%), Spectral Flame Essence (5%), 10-25 Cendres.

---

#### 2. Chien de Braise (Ember Hound)

| Champ | Valeur |
|-------|--------|
| **Tier** | I — Fragmenté |
| **Type** | Basic |
| **Élément** | Feu |
| **Zone** | Cendres Désolées (F1-3) |

| HP | ATK | DEF | Speed | Detection | Atk Range |
|----|-----|-----|-------|-----------|-----------|
| 60 | 22 | 3 | 160 | 300 | 40 |

**Comportement AI** : Mêlée rapide avec **comportement de meute** (groupes de 2-4). Un charge frontalement, les autres flanquent. Sous 25% HP, hurle (buff ATK +15% aux alliés pendant 5s) et devient frénétique.

| Attaque | Telegraph | Active | Recovery | CD | Dégâts | Portée | Notes |
|---------|-----------|--------|----------|----|---------|--------|-------|
| Bite | 300 ms | 150 ms | 350 ms | 1200 ms | 22 | 40 px | Mêlée rapide. |
| Lunge | 500 ms | 200 ms | 500 ms | 2500 ms | 28 | 120 px | Dash de fermeture. Esquivable latéralement. |
| Fire Snap | 400 ms | 100 ms | 300 ms | 3000 ms | 15 +Burn | 50 px | Après 2 Bites consécutives. |
| Pack Howl | 800 ms | 300 ms | 200 ms | 10000 ms | 0 | 200 px | Buff meute. À <25% HP. |

**Loot** : Charred Bone (55%), Ember Fang (18%), Hound Pelt (4%), 8-18 Cendres.

---

#### 3. Sentinelle Calcinée (Scorched Sentinel)

| Champ | Valeur |
|-------|--------|
| **Tier** | II — Corrompu |
| **Type** | Elite |
| **Élément** | Feu |
| **Zone** | Cendres Désolées (F2-3) |

| HP | ATK | DEF | Speed | Detection | Atk Range |
|----|-----|-----|-------|-----------|-----------|
| 250 | 30 | 15 | 60 | 200 | 80 |

**Comportement AI** : Gardien stationnaire qui protège une zone. Enrage si le joueur entre dans sa zone. Attaques AoE lentes mais puissantes. Phase de shield toutes les 30% HP perdus (absorbe 50 dmg avant de casser).

| Attaque | Telegraph | Active | Recovery | CD | Dégâts | Portée | Notes |
|---------|-----------|--------|----------|----|---------|--------|-------|
| Ground Slam | 800 ms | 300 ms | 600 ms | 2000 ms | 30 | 80 px AoE | Onde de choc circulaire. |
| Flame Sweep | 600 ms | 400 ms | 500 ms | 3000 ms | 25 +Burn | 120 px arc | Arc frontal 180°. |
| Shield Bash | 400 ms | 200 ms | 400 ms | 1500 ms | 20 | 60 px | Repousse le joueur. |
| Enrage Roar | 1000 ms | 200 ms | 300 ms | 15000 ms | 0 | 300 px | +30% ATK/Speed pour 10s. |

**Loot** : Sentinel Core (40%), Scorched Shield Fragment (15%), Flame Heart (3%), 20-40 Cendres, Shadow Dust x5-10.

---

### Zone 2 — Cryptes d’Ombre (F4-6)

**Thème** : Ombre, spectres, architecture gothique en ruines.

---

#### 4. Spectre d’Ombre (Shadow Wraith)

| Champ | Valeur |
|-------|--------|
| **Tier** | III — Éveillé |
| **Type** | Elite |
| **Élément** | Ombre |
| **Zone** | Cryptes d’Ombre (F4-6) |

| HP | ATK | DEF | Speed | Detection | Atk Range |
|----|-----|-----|-------|-----------|-----------|
| 180 | 35 | 8 | 130 | 350 | 250 |

**Comportement AI** : Se rend invisible pendant 3s toutes les 10s. Attaque à distance avec des projectiles d’ombre. Peut se téléporter derrière le joueur. Vulnérable pendant 2s après réapparition.

| Attaque | Telegraph | Active | Recovery | CD | Dégâts | Portée | Notes |
|---------|-----------|--------|----------|----|---------|--------|-------|
| Shadow Bolt | 500 ms | 100 ms | 300 ms | 1500 ms | 35 | 250 px | Projectile qui traverse les alliés. |
| Backstab | 300 ms | 150 ms | 500 ms | 5000 ms | 50 | 40 px | Après téléportation. Crit garanti. |
| Shadow Veil | 200 ms | instant | 0 ms | 10000 ms | 0 | — | Invisibilité 3s. |
| Soul Drain | 700 ms | 400 ms | 600 ms | 8000 ms | 20/s | 150 px | Canalisation. Heal le Wraith. |

**Loot** : Shadow Essence (45%), Wraith Cloak Fragment (12%), Soul Crystal (4%), 15-30 Cendres, Shadow Dust x8-15.

---

#### 5. Araignée Nocturne (Night Spider)

| Champ | Valeur |
|-------|--------|
| **Tier** | II — Corrompu |
| **Type** | Basic |
| **Élément** | Ombre |
| **Zone** | Cryptes d’Ombre (F4-6) |

| HP | ATK | DEF | Speed | Detection | Atk Range |
|----|-----|-----|-------|-----------|-----------|
| 100 | 25 | 6 | 140 | 250 | 60 |

**Comportement AI** : Se cache au plafond, tombe sur le joueur quand il passe en dessous. Tisse des toiles ralentissantes. En groupe de 3-6, tend des embuscades coordonnées.

| Attaque | Telegraph | Active | Recovery | CD | Dégâts | Portée | Notes |
|---------|-----------|--------|----------|----|---------|--------|-------|
| Ceiling Drop | 200 ms | 300 ms | 400 ms | 6000 ms | 25 | AoE impact | Surprise depuis le plafond. |
| Venomous Bite | 350 ms | 100 ms | 300 ms | 1500 ms | 20 +Poison | 40 px | DoT poison 4s. |
| Web Shot | 500 ms | 150 ms | 400 ms | 4000 ms | 5 | 200 px | Slow -40% pendant 3s. |

**Loot** : Spider Silk (50%), Venom Sac (15%), Night Fang (5%), 10-22 Cendres.

---

#### 6. Chevalier Déchu (Fallen Knight)

| Champ | Valeur |
|-------|--------|
| **Tier** | II — Corrompu |
| **Type** | Elite |
| **Élément** | Ombre |
| **Zone** | Cryptes d’Ombre (F4-6) |

| HP | ATK | DEF | Speed | Detection | Atk Range |
|----|-----|-----|-------|-----------|-----------|
| 300 | 38 | 20 | 70 | 200 | 100 |

**Comportement AI** : Guerrier méthodique avec bouclier. Alterne entre posture défensive (bouclier levé, DEF +50%) et offensive (bouclier baissé, ATK +25%). Change de posture toutes les 8s. Quand son bouclier est brisé (après 3 attaques lourdes du joueur), il enrage.

| Attaque | Telegraph | Active | Recovery | CD | Dégâts | Portée | Notes |
|---------|-----------|--------|----------|----|---------|--------|-------|
| Sword Slash | 500 ms | 200 ms | 400 ms | 1800 ms | 38 | 100 px | Combo de 2 coups possibles. |
| Shield Charge | 700 ms | 300 ms | 600 ms | 5000 ms | 30 +Stun | 150 px | Charge linéaire. Stun 1.5s. |
| Dark Cleave | 900 ms | 350 ms | 700 ms | 6000 ms | 55 | 120 px AoE | Seulement en posture offensive. |
| Enraged Frenzy | 1200 ms | 5x200 ms | 1000 ms | 20000 ms | 25 chaque | 100 px | Quand bouclier brisé. Chaîne de 5 coups. |

**Loot** : Dark Steel Shard (40%), Fallen Crest (10%), Knight’s Oath (3%), 25-45 Cendres, Shadow Dust x10-20.

---

### Zone 3 — Profondeurs Carmines (F4-6)

**Thème** : Sang, rituels, cavernes organiques pulsantes.

---

#### 7. Sangsue Géante (Giant Leech)

| Champ | Valeur |
|-------|--------|
| **Tier** | III — Éveillé |
| **Type** | Basic |
| **Élément** | Sang |
| **Zone** | Profondeurs Carmines (F4-6) |

| HP | ATK | DEF | Speed | Detection | Atk Range |
|----|-----|-----|-------|-----------|-----------|
| 150 | 20 | 5 | 100 | 200 | 50 |

**Comportement AI** : Se déplace en rampant. S’attache au joueur et draine la vie sur la durée. Quand attachée, le joueur doit mash pour se libérer. Apparaît en groupes de 2-4, souvent cachée dans les flaques de sang.

| Attaque | Telegraph | Active | Recovery | CD | Dégâts | Portée | Notes |
|---------|-----------|--------|----------|----|---------|--------|-------|
| Latch On | 400 ms | grab | — | 5000 ms | 8/s drain | 50 px | Grab. Mash pour se libérer. Heal la sangsue. |
| Blood Spit | 500 ms | 150 ms | 300 ms | 3000 ms | 15 | 180 px | Projectile. Applique Bleed. |
| Burrow | 300 ms | 800 ms | 200 ms | 8000 ms | 0 | — | Disparaît sous terre, réapparaît près du joueur. |

**Loot** : Blood Clot (55%), Leech Tooth (18%), Crimson Essence (4%), 12-25 Cendres.

---

#### 8. Prêtre de Sang (Blood Priest)

| Champ | Valeur |
|-------|--------|
| **Tier** | III — Éveillé |
| **Type** | Elite |
| **Élément** | Sang |
| **Zone** | Profondeurs Carmines (F5-6) |

| HP | ATK | DEF | Speed | Detection | Atk Range |
|----|-----|-----|-------|-----------|-----------|
| 220 | 32 | 10 | 80 | 300 | 250 |

**Comportement AI** : Caster qui reste en arrière-plan. Buff et heal les alliés. Invoque des Sangsues Géantes (max 2 actives). Priorité absolue du joueur car il soutient les autres ennemis.

| Attaque | Telegraph | Active | Recovery | CD | Dégâts | Portée | Notes |
|---------|-----------|--------|----------|----|---------|--------|-------|
| Blood Lance | 600 ms | 100 ms | 400 ms | 2000 ms | 32 | 250 px | Projectile perforant. |
| Crimson Shield | 800 ms | instant | 200 ms | 12000 ms | 0 | 200 px | Bouclier sur un allié (50 HP absorb). |
| Summon Leech | 1200 ms | 500 ms | 300 ms | 15000 ms | 0 | — | Invoque 1 Sangsue Géante. Max 2. |
| Blood Ritual | 1500 ms | 2000 ms | 1000 ms | 25000 ms | AoE 40 | 300 px | Canalisation. Heal all alliés 30% HP. Interruptible. |

**Loot** : Ritual Scroll (35%), Blood Chalice (10%), Priest’s Tome (3%), 30-50 Cendres, Shadow Dust x12-20.

---

### Zone 4 — Faille du Néant (F7+)

**Thème** : Néant, distorsion spatiale, réalité fragmentée.

---

#### 9. Anomalie du Néant (Void Anomaly)

| Champ | Valeur |
|-------|--------|
| **Tier** | III — Éveillé |
| **Type** | Elite |
| **Élément** | Néant |
| **Zone** | Faille du Néant (F7+) |

| HP | ATK | DEF | Speed | Detection | Atk Range |
|----|-----|-----|-------|-----------|-----------|
| 200 | 40 | 12 | 110 | 400 | 300 |

**Comportement AI** : Entité flottante qui déforme l’espace. Crée des zones de distorsion qui inversent les contrôles du joueur. Se téléporte aléatoirement toutes les 5s. Immunisée aux effets de statut.

| Attaque | Telegraph | Active | Recovery | CD | Dégâts | Portée | Notes |
|---------|-----------|--------|----------|----|---------|--------|-------|
| Void Pulse | 400 ms | 200 ms | 300 ms | 1500 ms | 40 | 300 px AoE | Onde expansive circulaire. |
| Reality Warp | 700 ms | instant | 500 ms | 8000 ms | 0 | 200 px zone | Zone qui inverse les contrôles (5s). |
| Dimensional Rift | 600 ms | 300 ms | 400 ms | 4000 ms | 35 | 150 px | Ouvre un portail, projectile sort d’un angle aléatoire. |
| Blink | 100 ms | instant | 200 ms | 5000 ms | 0 | — | Téléportation aléatoire. |

**Loot** : Void Fragment (40%), Anomaly Core (12%), Reality Shard (3%), 20-40 Cendres, Shadow Dust x15-25, Void Crystal x1-2.

---

#### 10. Tisseur de Néant (Void Weaver)

| Champ | Valeur |
|-------|--------|
| **Tier** | III — Éveillé |
| **Type** | Elite |
| **Élément** | Néant |
| **Zone** | Faille du Néant (F7+) |

| HP | ATK | DEF | Speed | Detection | Atk Range |
|----|-----|-----|-------|-----------|-----------|
| 280 | 35 | 15 | 70 | 350 | 200 |

**Comportement AI** : Crée des toiles de Void qui piègent le joueur et amplifient les dégâts Néant. Tisse un réseau de fils connectant les ennemis proches (buff partagé). Quand ses fils sont détruits, il enrage.

| Attaque | Telegraph | Active | Recovery | CD | Dégâts | Portée | Notes |
|---------|-----------|--------|----------|----|---------|--------|-------|
| Void Thread | 500 ms | 200 ms | 300 ms | 2000 ms | 25 +Slow | 200 px | Fil qui slow -30% pendant 4s. |
| Web Trap | 800 ms | 400 ms | 500 ms | 6000 ms | 10 | Zone 100 px | Zone au sol. Piégé = +50% Void dmg reçus. |
| Thread Link | 600 ms | instant | 200 ms | 10000 ms | 0 | 300 px | Connecte 2 ennemis. +20% ATK/DEF partagé. |
| Unravel | 1000 ms | 500 ms | 800 ms | 15000 ms | 60 | 250 px AoE | Quand fils détruits. Explosion massive. |

**Loot** : Void Silk (45%), Weaver Fang (10%), Void Loom Shard (3%), 25-45 Cendres, Shadow Dust x15-25, Void Crystal x1-3.

---

### Multi-zone

---

#### 11. Rat d’Umbra (Umbra Rat)

| Champ | Valeur |
|-------|--------|
| **Tier** | I — Fragmenté |
| **Type** | Basic / Special |
| **Élément** | Neutre |
| **Zone** | Toutes (F1+) |

| HP | ATK | DEF | Speed | Detection | Atk Range |
|----|-----|-----|-------|-----------|-----------|
| 30 | 8 | 1 | 180 | 150 | 30 |

**Comportement AI** : Créature de fodder ultra-rapide. Apparaît en essaims de 5-10. Fuit plutôt que de combattre. Vole les items au sol si le joueur ne les ramasse pas assez vite. Certains rats sont dorés et droppent des récompenses bonus.

| Attaque | Telegraph | Active | Recovery | CD | Dégâts | Portée | Notes |
|---------|-----------|--------|----------|----|---------|--------|-------|
| Nibble | 200 ms | 100 ms | 200 ms | 800 ms | 8 | 30 px | Mêlée faible. |
| Item Steal | 300 ms | instant | 500 ms | 5000 ms | 0 | 50 px | Vole 1 item au sol. Tuer le rat le récupère. |

**Loot** : Rat Tail (70%), Tiny Claw (20%), 3-8 Cendres. Les **Rats Dorés** (5% de spawn) droppent : 50-100 Cendres + Shadow Dust x5 + item rare garanti.

---

## Boss

---

### Boss 1 : Gardien Corrompu (Corrupted Guardian) — F1-3

| Champ | Valeur |
|-------|--------|
| **Tier** | IV — Seigneur |
| **Type** | Boss |
| **Élément** | Feu |
| **Zone** | Cendres Désolées (F3) |

| HP | ATK | DEF | Speed | Detection | Atk Range |
|----|-----|-----|-------|-----------|-----------|
| 2000 | 45 | 25 | 50 | 500 | 150 |

**Phases** :

| Phase | Seuil HP | Comportement |
|-------|----------|-------------|
| **Phase 1** | 100-60% | Attaques mélée lentes. Ground Slam + Flame Wave. Patterns prévisibles. |
| **Phase 2** | 60-30% | Invoque 2 Sentinelles Calcinées. Gagne Shield Charge. +20% Speed. |
| **Phase 3** | 30-0% | Enrage permanent. Flamme permanente au sol (ticking AoE). Nova de feu toutes les 15s. |

**Attaques spéciales** :

| Attaque | Dégâts | Notes |
|---------|---------|-------|
| Ground Slam | 45 AoE | Onde de choc. Safe zone : derrière le boss. |
| Flame Wave | 35 + Burn | Ligne droite. Traverse toute l’arène. |
| Shield Charge | 50 + Stun 2s | Phase 2+. Charge linéaire rapide. |
| Fire Nova | 60 AoE | Phase 3. Couvre toute l’arène sauf un safe spot tournant. |

**Loot garanti** : 100-200 Cendres, Shadow Dust x20-30, Void Shards x5-10, Abyssal Dust x1.

**Loot rare** : Guardian Core (15%), Corrupted Flame Rune (5%), Cosmetic « Cendre » (2%).

---

### Boss 2 : Tyran de Flamme (Flame Tyrant) — F4-6

| Champ | Valeur |
|-------|--------|
| **Tier** | IV — Seigneur |
| **Type** | Boss |
| **Élément** | Feu / Ombre |
| **Zone** | Cryptes d’Ombre / Profondeurs Carmines (F6) |

| HP | ATK | DEF | Speed | Detection | Atk Range |
|----|-----|-----|-------|-----------|-----------|
| 5000 | 65 | 35 | 65 | 600 | 200 |

**Phases** :

| Phase | Seuil HP | Comportement |
|-------|----------|-------------|
| **Phase 1** | 100-70% | Attaques élémentaires Feu. Colonnes de flammes. Terrain de lave progressive. |
| **Phase 2** | 70-40% | Passe en mode Ombre. Invisibilité partielle. Attaques furtives + Burn. |
| **Phase 3** | 40-0% | Fusion Feu+Ombre. Dual-element attacks. Arène réduite par la lave/ombre. |

**Attaques spéciales** :

| Attaque | Dégâts | Notes |
|---------|---------|-------|
| Flame Pillar | 55 + Burn | 3 colonnes de feu. Positions aléatoires. |
| Shadow Dash | 70 | Phase 2. Charge invisible, révélé 1s avant l’impact. |
| Dual Cataclysm | 80 AoE | Phase 3. Explosion Feu+Ombre. Seul safe spot : centre exact. |
| Lava Rise | 40/s | Phase 3. Le sol se couvre de lave progressivement. |

**Loot garanti** : 200-400 Cendres, Shadow Dust x40-60, Void Shards x10-20, Abyssal Dust x2-3.

**Loot rare** : Tyrant’s Crown (10%), Dual-Element Rune (4%), Cosmetic « Flamme Noire » (2%).

---

### Boss 3 : Harbinger du Void (Void Harbinger) — F7+

| Champ | Valeur |
|-------|--------|
| **Tier** | IV — Seigneur |
| **Type** | Boss |
| **Élément** | Néant |
| **Zone** | Faille du Néant (F9+) |

| HP | ATK | DEF | Speed | Detection | Atk Range |
|----|-----|-----|-------|-----------|-----------|
| 10000 | 90 | 50 | 80 | 800 | 350 |

**Phases** :

| Phase | Seuil HP | Comportement |
|-------|----------|-------------|
| **Phase 1** | 100-75% | Attaques Néant à distance. Crée des portails envoyant des projectiles. |
| **Phase 2** | 75-50% | Invoque des Anomalies du Néant (max 3). Déforme l’arène (zones de gravité inversée). |
| **Phase 3** | 50-25% | Se fragmente en 3 copies (1 réelle, 2 illusions). Les illusions ont 20% HP mais mêmes attaques. |
| **Phase 4** | 25-0% | Forme finale. Arène complètement déformée. Attaques continues. Timer : 120s ou wipe. |

**Attaques spéciales** :

| Attaque | Dégâts | Notes |
|---------|---------|-------|
| Void Barrage | 60 x5 | 5 projectiles en éventail depuis un portail. |
| Gravity Well | 30/s | Zone qui attire le joueur au centre. Pendant 4s. |
| Dimensional Shatter | 100 AoE | Phase 3. Brise l’arène. Platforming temporaire. |
| Annihilation | 999 | Phase 4. Attaque à 120s. Instantkill si le boss n’est pas vaincu. |

**Loot garanti** : 500-800 Cendres, Shadow Dust x80-120, Void Shards x20-40, Abyssal Dust x5-8, Void Crystal x3-5.

**Loot rare** : Harbinger’s Essence (8%), Void Rune Légendaire (3%), Cosmetic « Void Form » (1%), Convergence Token x10 (5%).

---

## Echo Enemies (Tier V — Futur)

### Concept
Les **Echo Enemies** sont des versions corrompues des compagnons du joueur, apparaissant dans les donjons mythiques (end-game). Ils représentent ce que les compagnons auraient pu devenir s’ils avaient cédé au Void.

### Caractéristiques prévues
- **Stats** : Équivalentes à un boss mid-tier, adaptées au compagnon qu’ils reflètent
- **Attaques** : Versions corrompues des compétences du compagnon
- **Mécanique unique** : Le compagnon original ne peut pas être utilisé pendant le combat contre son Echo
- **Loot** : Echo Fragment spécial (Tier 3?), cosmetic « Corrupted » pour le compagnon
- **Narratif** : Vaincre l’Echo débloque une scène de Résonance spéciale

### Statut : **En cours de conception** — Non implémenté

---

## Stat Scaling Table

Les stats des ennemis scalent avec l’étage du donjon :

| Étage | HP Multiplier | ATK Multiplier | DEF Multiplier |
|--------|---------------|----------------|----------------|
| F1 | x1.0 | x1.0 | x1.0 |
| F2 | x1.15 | x1.1 | x1.1 |
| F3 | x1.35 | x1.2 | x1.2 |
| F4 | x1.6 | x1.35 | x1.3 |
| F5 | x1.9 | x1.5 | x1.4 |
| F6 | x2.3 | x1.7 | x1.5 |
| F7 | x2.8 | x2.0 | x1.7 |
| F8 | x3.4 | x2.3 | x1.9 |
| F9 | x4.0 | x2.7 | x2.1 |
| F10 | x4.8 | x3.0 | x2.3 |
| F11 | x5.5 | x3.5 | x2.6 |
| F12 | x6.5 | x4.0 | x3.0 |

---

## Elemental Resistance Matrix

| Ennemi | Feu | Ombre | Sang | Néant | Physique |
|--------|-----|-------|------|--------|----------|
| Spectre de Cendre | Immune | x1.0 | x1.0 | x1.0 | x0.7 |
| Chien de Braise | x0.5 | x1.0 | x1.0 | x1.0 | x1.0 |
| Sentinelle Calcinée | x0.5 | x1.3 | x1.0 | x1.0 | x0.8 |
| Spectre d’Ombre | x1.5 | Immune | x1.0 | x0.8 | x0.5 |
| Araignée Nocturne | x1.3 | x0.7 | x1.0 | x1.0 | x1.0 |
| Chevalier Déchu | x1.0 | x0.8 | x1.3 | x1.0 | x0.7 |
| Sangsue Géante | x1.5 | x1.0 | x0.5 | x1.0 | x1.0 |
| Prêtre de Sang | x1.3 | x1.0 | Immune | x1.3 | x1.0 |
| Anomalie du Néant | x1.0 | x1.0 | x1.0 | Immune | x0.5 |
| Tisseur de Néant | x1.0 | x1.0 | x1.0 | x0.5 | x0.8 |
| Rat d’Umbra | x1.0 | x1.0 | x1.0 | x1.0 | x1.0 |
| Gardien Corrompu | x0.3 | x1.5 | x1.0 | x1.0 | x0.5 |
| Tyran de Flamme | x0.5 | x0.5 | x1.3 | x1.3 | x0.7 |
| Harbinger du Void | x1.0 | x1.0 | x1.0 | Immune | x0.3 |
