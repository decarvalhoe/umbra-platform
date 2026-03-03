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
import { restoreSession, logout } from "./nakama/auth";
import { getPlayerProfile, getPlayerIdentity } from "./nakama/storage";
import type { PlayerProfile, InventoryItem } from "./types/game";
import type { Wallet } from "./types/economy";
import "./App.css";

type AppState = "landing" | "login" | "identity-setup" | "game";

function App() {
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
        <button onClick={() => setShowInventory(true)}>Inventaire</button>
        <button onClick={() => setShowGacha(true)}>Invocation</button>
        <button onClick={() => setShowRomance(true)}>♡ Relations</button>
        <button onClick={() => setShowForge(true)}>🔥 Forge</button>
        <button onClick={() => setShowEvents(true)}>⬡ Événements</button>
        <button onClick={handleLogout}>Déconnexion</button>
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
    </div>
  );
}

export default App;
