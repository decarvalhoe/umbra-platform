// Umbra Platform — Nakama Runtime Entry Point

// ============================================================
// Types
// ============================================================

interface PlayerProfile {
  userId: string;
  username: string;
  level: number;
  xp: number;
  stats: {
    strength: number;
    agility: number;
    intelligence: number;
    endurance: number;
    willpower: number;
  };
  talents: {
    offense: Record<string, number>;
    defense: Record<string, number>;
    control: Record<string, number>;
  };
  createdAt: string;
  updatedAt: string;
}

interface GameState {
  currentZone: string;
  currentFloor: number;
  corruption: number;
  inventory: InventoryItem[];
  questLog: string[];
  completedQuests: string[];
  sessionStats: SessionStats;
}

interface InventoryItem {
  id: string;
  name: string;
  type: string;
  rarity: string;
  level: number;
  quantity: number;
}

interface SessionStats {
  actionsPerMinute: number;
  killDeathRatio: number;
  accuracy: number;
  headshots: number;
  totalDamage: number;
  sessionDuration: number;
  resourcesGained: number;
}

interface AnomalyResult {
  isSuspicious: boolean;
  score: number;
  checks: AnomalyCheck[];
}

interface AnomalyCheck {
  name: string;
  passed: boolean;
  weight: number;
  value: number;
  threshold: number;
}

// ============================================================
// Constants
// ============================================================

const COLLECTION_PROFILES = "player_profiles";
const COLLECTION_GAME_STATES = "game_states";
const KEY_PROFILE = "profile";
const KEY_STATE = "state";

const DEFAULT_WALLET: Record<string, number> = {
  cendres: 500,
  eclats_ombre: 50,
  essence_antique: 0,
};

const DEFAULT_STATS = {
  strength: 10,
  agility: 10,
  intelligence: 10,
  endurance: 10,
  willpower: 10,
};

// ============================================================
// RPC: Player Profile
// ============================================================

const rpcGetPlayerProfile: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  const userId = ctx.userId!;
  const objects = nk.storageRead([
    { collection: COLLECTION_PROFILES, key: KEY_PROFILE, userId },
  ]);
  if (objects.length === 0) {
    throw Error("Profile not found. Authenticate first.");
  }
  return JSON.stringify(objects[0].value);
};

const rpcSavePlayerProfile: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  const userId = ctx.userId!;
  const updates = JSON.parse(payload) as Partial<PlayerProfile>;

  // Read current profile
  const objects = nk.storageRead([
    { collection: COLLECTION_PROFILES, key: KEY_PROFILE, userId },
  ]);
  if (objects.length === 0) {
    throw Error("Profile not found.");
  }

  const profile = objects[0].value as PlayerProfile;
  const updated = Object.assign({}, profile, updates, {
    userId: userId, // Prevent userId override
    updatedAt: new Date().toISOString(),
  }) as PlayerProfile;

  nk.storageWrite([
    {
      collection: COLLECTION_PROFILES,
      key: KEY_PROFILE,
      userId,
      value: updated,
      permissionRead: 1,
      permissionWrite: 1,
    },
  ]);

  logger.info("Profile updated for user %s", userId);
  return JSON.stringify(updated);
};

// ============================================================
// RPC: Game State
// ============================================================

const rpcGetGameState: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  const userId = ctx.userId!;
  const objects = nk.storageRead([
    { collection: COLLECTION_GAME_STATES, key: KEY_STATE, userId },
  ]);
  if (objects.length === 0) {
    // Return default state
    const defaultState: GameState = {
      currentZone: "hub",
      currentFloor: 0,
      corruption: 0,
      inventory: [],
      questLog: [],
      completedQuests: [],
      sessionStats: {
        actionsPerMinute: 0,
        killDeathRatio: 0,
        accuracy: 0,
        headshots: 0,
        totalDamage: 0,
        sessionDuration: 0,
        resourcesGained: 0,
      },
    };
    return JSON.stringify(defaultState);
  }
  return JSON.stringify(objects[0].value);
};

const rpcSaveGameState: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  const userId = ctx.userId!;
  const state = JSON.parse(payload) as GameState;

  nk.storageWrite([
    {
      collection: COLLECTION_GAME_STATES,
      key: KEY_STATE,
      userId,
      value: state,
      permissionRead: 1,
      permissionWrite: 1,
    },
  ]);

  logger.info("Game state saved for user %s", userId);
  return JSON.stringify({ success: true });
};

// ============================================================
// RPC: Anomaly Detection
// ============================================================

const rpcEvaluateAnomaly: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  const stats = JSON.parse(payload) as SessionStats;
  const checks: AnomalyCheck[] = [];

  // APM check (threshold: 280)
  checks.push({
    name: "actions_per_minute",
    passed: stats.actionsPerMinute <= 280,
    weight: 0.2,
    value: stats.actionsPerMinute,
    threshold: 280,
  });

  // Kill/Death ratio check (threshold: 6.0)
  checks.push({
    name: "kill_death_ratio",
    passed: stats.killDeathRatio <= 6.0,
    weight: 0.15,
    value: stats.killDeathRatio,
    threshold: 6.0,
  });

  // Accuracy check (threshold: 0.96)
  checks.push({
    name: "accuracy",
    passed: stats.accuracy <= 0.96,
    weight: 0.2,
    value: stats.accuracy,
    threshold: 0.96,
  });

  // Headshot ratio check (threshold: 0.85)
  checks.push({
    name: "headshot_ratio",
    passed: stats.headshots <= 0.85,
    weight: 0.15,
    value: stats.headshots,
    threshold: 0.85,
  });

  // Damage per second check (threshold: 10000)
  checks.push({
    name: "damage_per_second",
    passed: stats.totalDamage / Math.max(stats.sessionDuration, 1) <= 10000,
    weight: 0.1,
    value: stats.totalDamage / Math.max(stats.sessionDuration, 1),
    threshold: 10000,
  });

  // Session duration check (min 60 seconds)
  checks.push({
    name: "session_too_short",
    passed: stats.sessionDuration >= 60,
    weight: 0.1,
    value: stats.sessionDuration,
    threshold: 60,
  });

  // Resource gain rate check (threshold: 1000/min)
  const resourceRate = stats.resourcesGained / Math.max(stats.sessionDuration / 60, 1);
  checks.push({
    name: "resource_gain_rate",
    passed: resourceRate <= 1000,
    weight: 0.1,
    value: resourceRate,
    threshold: 1000,
  });

  // Calculate weighted score
  let score = 0;
  for (const check of checks) {
    if (!check.passed) {
      score += check.weight;
    }
  }

  const result: AnomalyResult = {
    isSuspicious: score >= 0.4,
    score,
    checks,
  };

  if (result.isSuspicious) {
    logger.warn(
      "Suspicious activity for user %s: score=%.2f",
      ctx.userId,
      score
    );
  }

  return JSON.stringify(result);
};

// ============================================================
// RPC: Leaderboard
// ============================================================

const rpcGetLeaderboard: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  const input = payload ? JSON.parse(payload) : {};
  var q = Math.ceil((new Date().getMonth() + 1) / 3);
  const seasonId = input.seasonId || ("season_" + new Date().getFullYear() + "_" + (q < 10 ? "0" + q : "" + q));
  const limit = input.limit || 20;

  const records = nk.leaderboardRecordsList(seasonId, undefined, limit, undefined, 0);
  return JSON.stringify({
    seasonId,
    records: records.records || [],
    ownerRecords: records.ownerRecords || [],
  });
};

// ============================================================
// Hooks: After Authenticate
// ============================================================

function initializeNewPlayer(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  userId: string,
  username: string
): void {
  // Check if profile already exists
  const existing = nk.storageRead([
    { collection: COLLECTION_PROFILES, key: KEY_PROFILE, userId },
  ]);
  if (existing.length > 0) {
    return; // Already initialized
  }

  const now = new Date().toISOString();
  const profile: PlayerProfile = {
    userId: userId,
    username: username || ("player_" + userId.substring(0, 8)),
    level: 1,
    xp: 0,
    stats: Object.assign({}, DEFAULT_STATS) as PlayerProfile["stats"],
    talents: {
      offense: {},
      defense: {},
      control: {},
    },
    createdAt: now,
    updatedAt: now,
  };

  // Create profile
  nk.storageWrite([
    {
      collection: COLLECTION_PROFILES,
      key: KEY_PROFILE,
      userId,
      value: profile,
      permissionRead: 1,
      permissionWrite: 1,
    },
  ]);

  // Initialize wallet with 3 currencies
  nk.walletUpdate(userId, DEFAULT_WALLET, {}, true);

  logger.info("New player initialized: %s (%s)", username, userId);
}

const afterAuthenticateEmail: nkruntime.AfterHookFunction<
  nkruntime.Session,
  nkruntime.AuthenticateEmailRequest
> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  data: nkruntime.Session,
  request: nkruntime.AuthenticateEmailRequest
): void {
  initializeNewPlayer(ctx, logger, nk, ctx.userId!, ctx.username!);
};

const afterAuthenticateDevice: nkruntime.AfterHookFunction<
  nkruntime.Session,
  nkruntime.AuthenticateDeviceRequest
> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  data: nkruntime.Session,
  request: nkruntime.AuthenticateDeviceRequest
): void {
  initializeNewPlayer(ctx, logger, nk, ctx.userId!, ctx.username!);
};

// ============================================================
// Module Initialization
// ============================================================

const InitModule: nkruntime.InitModule = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer
) {
  // RPCs
  initializer.registerRpc("get_player_profile", rpcGetPlayerProfile);
  initializer.registerRpc("save_player_profile", rpcSavePlayerProfile);
  initializer.registerRpc("get_game_state", rpcGetGameState);
  initializer.registerRpc("save_game_state", rpcSaveGameState);
  initializer.registerRpc("evaluate_anomaly", rpcEvaluateAnomaly);
  initializer.registerRpc("get_leaderboard", rpcGetLeaderboard);

  // Hooks
  initializer.registerAfterAuthenticateEmail(afterAuthenticateEmail);
  initializer.registerAfterAuthenticateDevice(afterAuthenticateDevice);

  // Seasonal leaderboard
  var q2 = Math.ceil((new Date().getMonth() + 1) / 3);
  var seasonId = "season_" + new Date().getFullYear() + "_" + (q2 < 10 ? "0" + q2 : "" + q2);
  nk.leaderboardCreate(seasonId, true, "desc" as any, "best" as any);

  logger.info("Umbra Platform initialized — Season: %s", seasonId);
};
