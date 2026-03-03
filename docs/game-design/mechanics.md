# Mécaniques de Jeu — Project Umbra (v3.0)

> Référence technique de toutes les mécaniques de gameplay.

---

## 1. Combat

### Système de Base
Project Umbra utilise un combat **hack’n’slash** en temps réel avec les mécaniques suivantes :

- **Armes duales** : Le joueur équipe deux armes simultanément, permettant des combos spécifiques selon la combinaison
- **Combos** : Chaînes de 3-5 attaques avec finisher variable selon le timing
- **Compétences élémentaires** : 4 éléments modulables (Feu, Ombre, Sang, Néant)
- **Stigmates** : Modificateurs temporaires acquis pendant un run, altérant les capacités

### Esquive à i-frames
| Paramètre | Valeur |
|-----------|--------|
| **Durée i-frames** | 200 ms (12 frames à 60 fps) |
| **Charges d’esquive** | 2 (récupèrent en 3s chacune) |
| **Distance de dash** | 120 px |
| **Cooldown entre esquives** | 300 ms |
| **Direction** | 8 directions (stick ou clavier) |

### Système Élémentaire

| Élément | Fort contre | Faible contre | Effet de statut |
|---------|-------------|---------------|-----------------|
| **Feu** | Néant | Ombre | Brûlure (DoT 3s) |
| **Ombre** | Feu | Sang | Affaiblissement (-20% DEF, 4s) |
| **Sang** | Ombre | Néant | Saignement (DoT + heal joueur) |
| **Néant** | Sang | Feu | Corrosion (-15% ATK/DEF, 5s) |

Les réactions élémentaires se déclenchent quand 2 éléments différents sont appliqués sur la même cible :
- **Feu + Ombre** = Explosion (AoE burst damage)
- **Ombre + Sang** = Drain Vital (heal massif)
- **Sang + Néant** = Corruption Sanguine (DoT amplifié)
- **Néant + Feu** = Flamme du Void (ignore DEF)

---

## 2. Corruption Runes (Issue #68)

### Vue d’ensemble
Les Runes de Corruption sont le système d’équipement principal, offrant des bonus de stats et des effets de set.

### Sets de Runes (7 sets)

| Set | Bonus 2 pièces | Bonus 4 pièces |
|-----|----------------|----------------|
| **Flamme Éternelle** | ATK +15% | Les attaques Feu infligent 25% de dégâts supplémentaires |
| **Voile d’Ombre** | Évasion +20% | Après une esquive, +40% dmg pendant 3s |
| **Pacte de Sang** | HP +20% | Les dégâts subis sont réduits de 10%, convertis en DoT |
| **Écho du Néant** | Vitesse de compétence +15% | Les compétences Néant ont 20% de chance de reset cooldown |
| **Garde Corrompue** | DEF +25% | Bouclier de corruption (15% HP max) toutes les 20s |
| **Lame Spectrale** | Crit Rate +12% | Les crits infligent Corrosion pendant 3s |
| **Résonance** | Affinité compagnon XP +10% | Le compagnon actif gagne une compétence passive bonus |

### Slots de Runes (6 slots)

| Slot | Stat principale fixe |
|------|---------------------|
| 1 — Tête | HP ou HP% |
| 2 — Corps | DEF ou DEF% |
| 3 — Bras | ATK ou ATK% |
| 4 — Jambes | Vitesse ou Crit Rate |
| 5 — Anneau | Crit Damage ou Élément DMG% |
| 6 — Amulette | Libre (toute stat principale) |

### Rarités (5 niveaux)

| Rarité | Couleur | Substats initiales | Substats max | Drop floor |
|---------|---------|-------------------|-------------|------------|
| Commun | Blanc | 0 | 2 | 1+ |
| Peu commun | Vert | 1 | 3 | 2+ |
| Rare | Bleu | 2 | 4 | 4+ |
| Épique | Violet | 3 | 4 | 6+ |
| Légendaire | Or | 4 | 4 | 8+ |

### Upgrade (+1 à +15)
- Chaque upgrade coûte du **Shadow Dust** (coût croissant)
- Tous les 3 niveaux (+3, +6, +9, +12, +15), une nouvelle substat est ajoutée ou une existante est améliorée
- Au-dessus de +10, le taux de succès diminue (voir economy.md)
- À +15, la rune est considérée « maxée » et peut recevoir un **Corruption Seal**

### Corruption Seals
Un Seal spécial applicable uniquement aux runes +15 :
- Ajoute un effet unique lié au set
- Consomme 1 **Abyssal Dust**
- Irréversible une fois appliqué

---

## 3. Void Summoning (Issue #71)

### Rituel en 4 Étapes

| Étape | Action | Effet |
|--------|--------|-------|
| 1. **Offrande** | Le joueur dépose des Void Shards sur l’autel | Activation de l’autel, animation de charge |
| 2. **Incantation** | Le joueur choisit le type de bannière | Focus compagnon, focus équipement, ou mixte |
| 3. **Convergence** | L’invocation se déroule | Animation cinématique, révélation progressive |
| 4. **Manifestation** | Le résultat apparaît | Compagnon ou équipement matérialisé |

### Coûts

| Type | Void Shards | Notes |
|------|-------------|-------|
| Invocation simple | 160 | 1 résultat |
| Invocation x10 | 1600 | 10 résultats, 1 Rare+ garanti |

### Taux de Drop

| Rarité | Taux de base | Notes |
|---------|-------------|-------|
| 3★ (Commun) | 85% | Fodder / matériaux |
| 4★ (Rare) | 12% | Compagnons et équipements utilisables |
| 5★ (Légendaire) | 3% | Compagnons et équipements top-tier |

### Système de Pity — Convergence

| Type | Seuil | Effet |
|------|-------|-------|
| **Soft Pity** | 70 pulls sans 5★ | Le taux 5★ augmente de +5% par pull supplémentaire |
| **Hard Pity** | 90 pulls sans 5★ | Le prochain pull est garanti 5★ |
| **Banner Pity** | 180 pulls (2x hard pity) | Garanti le compagnon/équipement en vedette |

### Bannières

| Type | Durée | Spécificité |
|------|--------|------------|
| **Permanente** | Toujours | Pool complet, pas de rate-up |
| **Vedette** | 2-3 semaines | 1 unité 5★ en rate-up (50% chance si 5★) |
| **Saisonnière** | Durée de l’événement | Unités exclusives à la saison |

### Convergence Tokens
Chaque duplicate de 5★ donne **50 Convergence Tokens**. À 300 tokens, le joueur peut échanger contre le compagnon 5★ de son choix.

---

## 4. Void Arena (Issue #80)

### Principe
PvP **asynchrone** : le joueur attaque les équipes de défense d’autres joueurs contrôlées par l’AI. Pas de PvP en temps réel.

### Defense Teams
- Le joueur configure une équipe de défense (1 héros + 3 compagnons + runes)
- L’AI contrôle cette équipe quand d’autres joueurs l’attaquent
- L’équipe de défense est séparée de l’équipe d’attaque

### Classement (5 tiers)

| Tier | Points requis | Récompenses hebdomadaires |
|------|--------------|---------------------------|
| **Bronze** | 0-999 | 50 Cendres + 5 Void Shards |
| **Argent** | 1000-1999 | 100 Cendres + 10 Void Shards |
| **Or** | 2000-2999 | 200 Cendres + 20 Void Shards + 1 Arena Ticket |
| **Diamant** | 3000-4999 | 400 Cendres + 40 Void Shards + 3 Arena Tickets |
| **Légendaire** | 5000+ | 800 Cendres + 80 Void Shards + 5 Arena Tickets + cosmetic exclusif |

### Arena Tickets
- 5 attaques gratuites par jour
- Chaque **Arena Ticket** donne 1 attaque supplémentaire
- Obtenus via événements, boutique, classement

### Matchmaking
- Basé sur le score Arena (pas le niveau joueur)
- Pool de 10 adversaires proposés, refresh toutes les 6h
- Protection anti-farming : ne peut pas attaquer le même joueur 2x en 24h

---

## 5. Shadow Vigil (Issue #78)

### Principe
Système **idle** permettant d’envoyer des compagnons en veille pour récolter des ressources et de l’XP hors-ligne.

### Configuration

| Paramètre | Valeur |
|-----------|--------|
| **Compagnons déployés** | 3 maximum simultanément |
| **Durée max** | 12 heures (cap de récolte) |
| **Durée min** | 1 heure (en dessous, pas de récompense) |
| **Cooldown** | 30 min après récupération avant re-déploiement |

### Récompenses (par heure par compagnon)

| Ressource | Quantité/heure | Notes |
|-----------|----------------|-------|
| Cendres | 5-15 | Selon affinité du compagnon |
| Shadow Dust | 2-8 | Selon étage max atteint |
| XP Compagnon | 10-30 | Bonus si affinité > 50 |
| Loot aléatoire | 5% chance/heure | Peut dropper runes, mats |

### AI Rapports
À la récupération, chaque compagnon génère un **rapport narratif** via l’AI Director :
- Décrit ce que le compagnon a fait pendant la veille
- Peut révéler des indices sur le lore
- Le contenu dépend de l’affinité (plus d’intimité = plus de détails personnels)
- Possibilité de déclencher des micro-quêtes narratives

---

## 6. Void Forge (Issue #105)

### Trois Piliers

#### Pilier 1 : Rune Reforging
- **Fonction** : Ré-roll les substats d’une rune sans changer le set ni la stat principale
- **Coût** : 300 Shadow Dust + 50 Cendres
- **Limite** : 3 reforges par rune (compteur visible)
- **Mécanique** : Le joueur choisit 1 substat à re-roll parmi les substats existantes

#### Pilier 2 : Equipment Awakening
- **Fonction** : Améliore un équipement au-delà de son niveau max, ajoutant des effets visuels et des stats
- **Coût** : Void Crystals (voir economy.md pour les tiers)
- **Prérequis** : Équipement doit être au niveau max
- **Tiers** : 3 niveaux d’éveil (chacun ajoute un effet visuel sur le personnage)

#### Pilier 3 : Corruption Infusion
- **Fonction** : Injecte des substats corrompues dans un équipement, ajoutant des bonus puissants avec un malus
- **Coût** : Abyssal Dust (voir economy.md pour les tiers)
- **Risque** : Chaque infusion ajoute un bonus ET un malus aléatoire
- **Exemples de bonus** : +20% Crit DMG, +15% ATK élémentaire, +10% Vitesse
- **Exemples de malus** : -5% HP max, -3% DEF, +10% dégâts Void reçus

---

## 7. Talent Tree

### Structure
3 branches de 5 nodes chacune (15 talents au total). Le joueur peut investir dans toutes les branches mais doit progresser séquentiellement dans chaque branche.

### Branche Offense

| Node | Nom | Effet |
|------|-----|-------|
| 1 | **Frappe Affûtée** | ATK +5% |
| 2 | **Lame Critique** | Crit Rate +8% |
| 3 | **Combo Maître** | Le 4e hit d’un combo inflige +25% dmg |
| 4 | **Flamme Intérieure** | Les attaques élémentaires ignorent 10% de la DEF |
| 5 | **Exécution du Void** | Les ennemis sous 20% HP reçoivent +50% dmg |

### Branche Défense

| Node | Nom | Effet |
|------|-----|-------|
| 1 | **Peau de Pierre** | DEF +5% |
| 2 | **Récupération Passive** | Régénère 0.5% HP/s hors combat |
| 3 | **Esquive Fantomatique** | +1 charge d’esquive |
| 4 | **Bouclier de Corruption** | Absorbe 10% des dégâts en tant que corruption (purge après 10s) |
| 5 | **Immortalité Temporaire** | Survit à un coup fatal avec 1 HP (cooldown 120s) |

### Branche Utilité

| Node | Nom | Effet |
|------|-----|-------|
| 1 | **Pas Rapide** | Vitesse de déplacement +8% |
| 2 | **Œil du Pillard** | +15% drop rate pour les rarités Uncommon+ |
| 3 | **Lien Renforcé** | XP d’affinité compagnon +20% |
| 4 | **Extraction Maîtrisée** | +25% loot en cas de mort (au lieu de 50% de base) |
| 5 | **Écho Perpétuel** | Les Echo Fragments ont +15% d’efficacité |

---

## 8. Roguelite

### Génération Procédurale
- Chaque run génère un donjon de 7-12 étages
- Chaque étage contient 3-5 salles (combat, événement, repos, trésor, boss)
- La corruption augmente de +10% par étage, modifiant les ennemis et les récompenses

### Bénédictions et Malédictions
Après chaque boss, le joueur choisit parmi :
- **1 Bénédiction** : Bonus permanent pour le reste du run
- **1 Malédiction** : Malus avec récompenses augmentées
- **Skip** : Ni l’un ni l’autre (sûr mais pas de bonus)

### Extraction
- À tout moment entre les salles, le joueur peut extraire
- Extraction = 100% du loot collecté
- Mort = 50% du loot (75% avec le talent « Extraction Maîtrisée »)
- Les runes et équipements trouvés ne sont conservés qu’à l’extraction
