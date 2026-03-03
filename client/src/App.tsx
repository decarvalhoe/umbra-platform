import { useEffect, useRef, useState } from "react";
import { Game } from "phaser";
import { gameConfig } from "./game/config";
import { LandingPage } from "./components/LandingPage";
import { LoginScreen } from "./components/LoginScreen";
import { IdentitySetup } from "./components/IdentitySetup";
import { HUD } from "./components/HUD";
import { InventoryPanel } from "./components/InventoryPanel";
import { GachaModal } from "./components/GachaModal";
import { RomancePanel } from "./components/RomancePanel";
import { VoidForgePanel } from "./components/VoidForgePanel";
import { EventHub } from "./components/EventHub";
import { HeroRoster } from "./components/HeroRoster";
import { Bestiary } from "./components/Bestiary";
import { BattlePass } from "./components/BattlePass";
import { VoidArena } from "./components/VoidArena";
import { ClanPanel } from "./components/ClanPanel";
import { RuneManagement } from "./components/RuneManagement";
import { LanguageSelector } from "./components/LanguageSelector";
import { useI18n } from "./i18n";
import { restoreSession, logout } from "./nakama/auth";
import { getPlayerProfile, getPlayerIdentity } from "./nakama/storage";
import type { PlayerProfile, InventoryItem } from "./types/game";
import type { Wallet } from "./types/economy";
import "./App.css";

type AppState = "landing" | "login" | "identity-setup" | "game";

function App() {
  const { t } = useI18n();
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Game | null>(null);
  const [appState, setAppState] = useState<AppState>("landing");
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [wallet] = useState<Wallet | null>({ cendres: 500, eclats_ombre: 50, essence_antique: 0 });
  const [inventory] = useState<InventoryItem[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [showGacha, setShowGacha] = useState(false);
  const [showRomance, setShowRomance] = useState(false);
  const [showForge, setShowForge] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [showBestiary, setShowBestiary] = useState(false);
  const [showBattlePass, setShowBattlePass] = useState(false);
  const [showArena, setShowArena] = useState(false);
  const [showClan, setShowClan] = useState(false);
  const [showRunes, setShowRunes] = useState(false);
  const [pityCounter, setPityCounter] = useState(0);

  useEffect(() => {
    const session = restoreSession();
    if (session) {
      checkIdentityAndEnter();
    }
  }, []);

  // Lock body scroll when game is active, unlock for landing/login
  useEffect(() => {
    if (appState === "game") {
      document.body.classList.add("game-active");
    } else {
      document.body.classList.remove("game-active");
    }
  }, [appState]);

  useEffect(() => {
    if (appState === "game" && gameRef.current && !phaserGameRef.current) {
      phaserGameRef.current = new Game({
        ...gameConfig,
        parent: gameRef.current,
      });
    }
    return () => {
      if (appState !== "game" && phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, [appState]);

  const loadProfile = async () => {
    try {
      const p = await getPlayerProfile();
      setProfile(p);
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  };

  const checkIdentityAndEnter = async () => {
    try {
      const identity = await getPlayerIdentity();
      if (identity) {
        setAppState("game");
        loadProfile();
      } else {
        setAppState("identity-setup");
      }
    } catch {
      // If identity check fails (e.g., server not available), go straight to game
      setAppState("game");
      loadProfile();
    }
  };

  const handleEnterFromLanding = () => {
    setAppState("login");
  };

  const handleLogin = () => {
    checkIdentityAndEnter();
  };

  const handleIdentityComplete = () => {
    setAppState("game");
    loadProfile();
  };

  const handleLogout = () => {
    logout();
    setAppState("landing");
    setProfile(null);
    if (phaserGameRef.current) {
      phaserGameRef.current.destroy(true);
      phaserGameRef.current = null;
    }
  };

  if (appState === "landing") {
    return <LandingPage onEnter={handleEnterFromLanding} />;
  }

  if (appState === "login") {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (appState === "identity-setup") {
    return <IdentitySetup onComplete={handleIdentityComplete} />;
  }

  return (
    <div className="App">
      <HUD
        profile={profile}
        wallet={wallet}
        health={100}
        maxHealth={100}
        dodgeCharges={2}
        maxDodgeCharges={2}
      />
      <div id="game-container" ref={gameRef} />
      <div className="game-controls">
        <button onClick={() => setShowInventory(true)}>{t("controls.inventory")}</button>
        <button onClick={() => setShowGacha(true)}>{t("controls.gacha")}</button>
        <button onClick={() => setShowRomance(true)}>♡ {t("controls.romance")}</button>
        <button onClick={() => setShowForge(true)}>{t("controls.forge")}</button>
        <button onClick={() => setShowEvents(true)}>{t("controls.events")}</button>
        <button onClick={() => setShowRoster(true)}>{t("controls.heroes")}</button>
        <button onClick={() => setShowBestiary(true)}>{t("controls.bestiary")}</button>
        <button onClick={() => setShowBattlePass(true)}>{t("controls.battlePass")}</button>
        <button onClick={() => setShowArena(true)}>{t("controls.arena")}</button>
        <button onClick={() => setShowClan(true)}>Clan</button>
        <button onClick={() => setShowRunes(true)}>Runes</button>
        <button onClick={handleLogout}>{t("auth.logout")}</button>
        <LanguageSelector />
      </div>
      <InventoryPanel
        items={inventory}
        isOpen={showInventory}
        onClose={() => setShowInventory(false)}
      />
      <GachaModal
        isOpen={showGacha}
        onClose={() => setShowGacha(false)}
        pityCounter={pityCounter}
        onPityUpdate={setPityCounter}
      />
      <RomancePanel
        isOpen={showRomance}
        onClose={() => setShowRomance(false)}
      />
      <VoidForgePanel
        isOpen={showForge}
        onClose={() => setShowForge(false)}
      />
      <EventHub
        isOpen={showEvents}
        onClose={() => setShowEvents(false)}
      />
      <HeroRoster
        isOpen={showRoster}
        onClose={() => setShowRoster(false)}
      />
      <Bestiary
        isOpen={showBestiary}
        onClose={() => setShowBestiary(false)}
      />
      <BattlePass
        isOpen={showBattlePass}
        onClose={() => setShowBattlePass(false)}
      />
      <VoidArena
        isOpen={showArena}
        onClose={() => setShowArena(false)}
      />
      <ClanPanel
        isOpen={showClan}
        onClose={() => setShowClan(false)}
      />
      <RuneManagement
        isOpen={showRunes}
        onClose={() => setShowRunes(false)}
      />
    </div>
  );
}

export default App;
