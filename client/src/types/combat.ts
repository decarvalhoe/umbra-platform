import type { Element } from "./game";

/** The type of hit in the combo chain. */
export type ComboHitType = "light" | "heavy" | "finisher";

/** Which hand is performing the current attack. */
export type Hand = "left" | "right";

/**
 * Describes a single hit within a combo chain.
 * Emitted as part of attack events so combat/VFX systems
 * can react to the hit's properties.
 */
export interface ComboHit {
  /** 1-based step in the combo chain (1..4). */
  step: number;
  /** Damage multiplier for this step. */
  multiplier: number;
  /** The type of hit (light, heavy, or finisher). */
  hitType: ComboHitType;
  /** Which hand performs this attack. */
  hand: Hand;
  /** Element of the attacking hand's weapon (if any). */
  element?: Element;
  /** For the finisher: secondary element from the off-hand (if different). */
  secondaryElement?: Element;
}

/**
 * A weapon equipped in one hand of the dual-wield setup.
 */
export interface WeaponSlot {
  /** Which hand this weapon is in. */
  hand: Hand;
  /** Elemental affinity of this weapon (if any). */
  element?: Element;
  /** Base damage of this weapon before combo multipliers. */
  baseDamage: number;
}

/**
 * Configuration for the dual-wield system.
 * Stored on the Player entity, read by AttackState.
 */
export interface DualWieldConfig {
  /** Weapon in the left hand (primary). */
  leftWeapon: WeaponSlot;
  /** Weapon in the right hand (off-hand). */
  rightWeapon: WeaponSlot;
}
