/**
 * Nakama Runtime type declarations.
 * These types are normally provided by the Nakama server container.
 * This file enables TypeScript compilation in CI without the server.
 */

declare namespace nkruntime {
  interface Context {
    userId: string;
    username: string;
    vars: { [key: string]: string };
    env: { [key: string]: string };
    executionMode: string;
    sessionExpireAt: number;
    lang: string;
    clientIp: string;
    clientPort: string;
  }

  interface Logger {
    info(format: string, ...args: any[]): void;
    warn(format: string, ...args: any[]): void;
    error(format: string, ...args: any[]): void;
    debug(format: string, ...args: any[]): void;
  }

  interface Session {
    userId: string;
    username: string;
    token: string;
    created: boolean;
  }

  interface AuthenticateEmailRequest {
    account: { email: string; password: string };
    create: boolean;
    username: string;
  }

  interface AuthenticateDeviceRequest {
    account: { id: string };
    create: boolean;
    username: string;
  }

  interface StorageObject {
    collection: string;
    key: string;
    userId: string;
    value: { [key: string]: any };
    version: string;
    permissionRead: number;
    permissionWrite: number;
    createTime: number;
    updateTime: number;
  }

  interface StorageReadRequest {
    collection: string;
    key: string;
    userId: string;
  }

  interface StorageWriteRequest {
    collection: string;
    key: string;
    userId: string;
    value: { [key: string]: any };
    permissionRead?: number;
    permissionWrite?: number;
  }

  interface WalletUpdateResult {
    updated: Array<{ userId: string; updated: { [key: string]: number }; previous: { [key: string]: number } }>;
  }

  interface LeaderboardRecord {
    leaderboardId: string;
    ownerId: string;
    username: string;
    score: number;
    subscore: number;
    metadata: { [key: string]: any };
    createTime: number;
    updateTime: number;
    expiryTime: number;
    rank: number;
    maxNumScore: number;
    numScore: number;
  }

  interface LeaderboardRecordList {
    records: LeaderboardRecord[];
    ownerRecords: LeaderboardRecord[];
    nextCursor: string;
    prevCursor: string;
  }

  interface Nakama {
    storageRead(reads: StorageReadRequest[]): StorageObject[];
    storageWrite(writes: StorageWriteRequest[]): void;
    walletUpdate(userId: string, changeset: { [key: string]: number }, metadata?: { [key: string]: any }, updateLedger?: boolean): WalletUpdateResult;
    leaderboardCreate(id: string, authoritative: boolean, sortOrder?: number, operator?: number, resetSchedule?: string, metadata?: { [key: string]: any }): void;
    leaderboardRecordWrite(id: string, ownerId: string, username?: string, score?: number, subscore?: number, metadata?: { [key: string]: any }): LeaderboardRecord;
    leaderboardRecordsList(id: string, ownerIds?: string[], limit?: number, cursor?: string, overrideExpiry?: number): LeaderboardRecordList;
    accountGetId(userId: string): any;
  }

  type RpcFunction = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    payload: string
  ) => string | void;

  type AfterHookFunction<TData = any, TRequest = any> = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    data: TData,
    request: TRequest
  ) => void;

  interface Initializer {
    registerRpc(id: string, fn: RpcFunction): void;
    registerAfterAuthenticateEmail(fn: AfterHookFunction<Session, AuthenticateEmailRequest>): void;
    registerAfterAuthenticateDevice(fn: AfterHookFunction<Session, AuthenticateDeviceRequest>): void;
  }

  type InitModule = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    initializer: Initializer
  ) => void;

  const enum SortOrder {
    ASCENDING = 0,
    DESCENDING = 1,
  }

  const enum Operator {
    BEST = 0,
    SET = 1,
    INCREMENT = 2,
    DECREMENT = 3,
  }
}
