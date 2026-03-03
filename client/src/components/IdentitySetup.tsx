import { useState, useCallback } from "react";
import type { PronounOption } from "../types/game";
import { setPlayerIdentity } from "../nakama/storage";
import "./IdentitySetup.css";

interface IdentitySetupProps {
  onComplete: () => void;
}

type Step = 1 | 2 | 3;

const PRONOUN_OPTIONS: { value: PronounOption; label: string; hint?: string }[] = [
  { value: "iel/ellui", label: "Iel / Ellui", hint: "neutre" },
  { value: "il/lui", label: "Il / Lui" },
  { value: "elle/la", label: "Elle / La" },
  { value: "custom", label: "Personnalisé" },
];

const NAME_MIN = 2;
const NAME_MAX = 20;
const NAME_REGEX = /^[a-zA-ZÀ-ÿ0-9 ]+$/;

export function IdentitySetup({ onComplete }: IdentitySetupProps) {
  const [step, setStep] = useState<Step>(1);
  const [displayName, setDisplayName] = useState("");
  const [pronouns, setPronouns] = useState<PronounOption>("iel/ellui");
  const [customPronouns, setCustomPronouns] = useState("");
  const [orientation, setOrientation] = useState("");
  const [showOrientation, setShowOrientation] = useState(false);
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);

  const validateName = useCallback((name: string): string => {
    const trimmed = name.trim();
    if (trimmed.length < NAME_MIN) return `Minimum ${NAME_MIN} caractères`;
    if (trimmed.length > NAME_MAX) return `Maximum ${NAME_MAX} caractères`;
    if (!NAME_REGEX.test(trimmed)) return "Lettres, chiffres et espaces uniquement";
    return "";
  }, []);

  const handleNameChange = (value: string) => {
    if (value.length <= NAME_MAX + 5) {
      setDisplayName(value);
      if (nameError) setNameError(validateName(value));
    }
  };

  const handleNext = () => {
    if (step === 1) {
      const error = validateName(displayName);
      if (error) {
        setNameError(error);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (pronouns === "custom" && !customPronouns.trim()) return;
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await setPlayerIdentity({
        displayName: displayName.trim(),
        pronouns,
        customPronouns: pronouns === "custom" ? customPronouns.trim() : "",
        orientation: orientation.trim(),
        showOrientation,
      });
    } catch {
      // Silently continue — identity is saved locally, server sync will retry
    }
    setSaving(false);
    onComplete();
  };

  const handleSkipOrientation = () => {
    setOrientation("");
    setShowOrientation(false);
    handleFinish();
  };

  const nameLen = displayName.trim().length;

  return (
    <div className="id-root">
      {/* Background effects */}
      <div className="id-bg" />
      <div className="id-rune id-rune--outer" />
      <div className="id-rune id-rune--inner" />

      {/* Main panel */}
      <div className="id-panel">
        {/* Header */}
        <div className="id-header">
          <div className="id-rune-icon">✦</div>
          <h1 className="id-welcome">Bienvenue dans l'Umbra</h1>
          <p className="id-welcome-sub">Qui es-tu, aventurier·e ?</p>
        </div>

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="id-step" key="step-1">
            <h2 className="id-step-title">Ton nom</h2>
            <p className="id-step-desc">
              Comment les compagnons de l'Umbra t'appelleront-ils ?
            </p>

            <div className="id-input-wrap">
              <input
                className={`id-input ${nameError ? "id-input--error" : ""}`}
                type="text"
                placeholder="Entrer ton nom..."
                value={displayName}
                onChange={(e) => handleNameChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNext()}
                autoFocus
                maxLength={NAME_MAX + 5}
              />
              <span
                className={`id-char-count ${
                  nameLen > NAME_MAX
                    ? "id-char-count--error"
                    : nameLen > NAME_MAX - 3
                      ? "id-char-count--warn"
                      : ""
                }`}
              >
                {nameLen}/{NAME_MAX}
              </span>
              <div className="id-validation">{nameError}</div>
            </div>

            <div className="id-actions">
              <button
                className="id-btn id-btn--primary"
                onClick={handleNext}
                disabled={nameLen < NAME_MIN}
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Pronouns */}
        {step === 2 && (
          <div className="id-step" key="step-2">
            <h2 className="id-step-title">Tes pronoms</h2>
            <p className="id-step-desc">
              L'IA adaptera toutes les conversations à tes pronoms.
            </p>

            <div className="id-radio-group">
              {PRONOUN_OPTIONS.map((opt) => (
                <div key={opt.value}>
                  <button
                    type="button"
                    className={`id-radio ${pronouns === opt.value ? "id-radio--selected" : ""}`}
                    onClick={() => setPronouns(opt.value)}
                  >
                    <span className="id-radio-dot">
                      <span className="id-radio-dot-inner" />
                    </span>
                    <span className="id-radio-label">{opt.label}</span>
                    {opt.hint && <span className="id-radio-hint">{opt.hint}</span>}
                  </button>

                  {/* Custom input appears below the custom radio */}
                  {opt.value === "custom" && pronouns === "custom" && (
                    <div className="id-custom-input">
                      <input
                        className="id-input"
                        type="text"
                        placeholder="Ex: fae/faer, xe/xem..."
                        value={customPronouns}
                        onChange={(e) => setCustomPronouns(e.target.value)}
                        autoFocus
                        maxLength={30}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="id-actions">
              <button className="id-btn id-btn--back" onClick={handleBack}>
                ←
              </button>
              <button
                className="id-btn id-btn--primary"
                onClick={handleNext}
                disabled={pronouns === "custom" && !customPronouns.trim()}
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Orientation (optional) */}
        {step === 3 && (
          <div className="id-step" key="step-3">
            <h2 className="id-step-title">
              Ton orientation
              <span className="id-optional">optionnel</span>
            </h2>
            <p className="id-step-desc">
              Visible uniquement sur ton profil si tu le souhaites.
              Tu peux modifier tout ça à tout moment dans les paramètres.
            </p>

            <div className="id-input-wrap">
              <input
                className="id-input"
                type="text"
                placeholder="Ex: pansexuel·le, asexuel·le, queer..."
                value={orientation}
                onChange={(e) => setOrientation(e.target.value)}
                maxLength={40}
              />
            </div>

            <div className="id-toggle-wrap">
              <span className="id-toggle-label">Afficher sur mon profil</span>
              <button
                type="button"
                className={`id-toggle ${showOrientation ? "id-toggle--on" : ""}`}
                onClick={() => setShowOrientation((v) => !v)}
              >
                <span className="id-toggle-knob" />
              </button>
            </div>

            <div className="id-actions">
              <button className="id-btn id-btn--back" onClick={handleBack}>
                ←
              </button>
              <button
                className="id-btn id-btn--primary"
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? "..." : (
                  <>
                    <span className="id-btn-sparkle">✦</span>
                    Entrer dans l'Umbra
                    <span className="id-btn-sparkle">✦</span>
                  </>
                )}
              </button>
            </div>

            <button className="id-skip" onClick={handleSkipOrientation}>
              Passer cette étape →
            </button>
          </div>
        )}

        {/* Progress dots */}
        <div className="id-progress">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`id-dot ${
                s === step ? "id-dot--active" : s < step ? "id-dot--done" : ""
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
