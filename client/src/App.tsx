import { useEffect, useRef, useState } from "react";
import { Game } from "phaser";
import { gameConfig } from "./game/config";
import { LandingPage } from "./components/LandingPage";
import { LoginScreen } from "./components/LoginScreen";
import { HUD } from "./components/HUD";
import { InventoryPanel } from "./components/InventoryPanel";
import { GachaModal } from "./components/GachaModal";
import { restoreSession, logout } from "./nakama/auth";
import { getPlayerProfile } from "./nakama/storage";
import type { PlayerProfile, InventoryItem } from "./types/game";
import type { Wallet } from "./types/economy";
import "./App.css";

type AppState = "landing" | "login" | "game";

function App() {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Game | null>(null);
  const [appState, setAppState] = useState<AppState>("landing");
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [wallet] = useState<Wallet | null>({ cendres: 500, eclats_ombre: 50, essence_antique: 0 });
  const [inventory] = useState<InventoryItem[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [showGacha, setShowGacha] = useState(false);
  const [pityCounter, setPityCounter] = useState(0);

  useEffect(() => {
    const session = restoreSession();
    if (session) {
      setAppState("game");
      loadProfile();
    }
  }, []);

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

  const handleEnterFromLanding = () => {
    setAppState("login");
  };

  const handleLogin = () => {
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
    </div>
  );
}

export default App;
