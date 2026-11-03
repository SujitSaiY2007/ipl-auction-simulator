import {
  RawPlayer,
  AuctionPlayer,
  Franchise,
  AuctionTeam,
  AuctionSession,
  FranchiseHistoryRecord,
  PitchType,
  LiveHighlights,
} from '../types';
import { DEFAULT_FRANCHISES, DEFAULT_PLAYERS } from '../data/defaultPlayers';
import { calculateAiPlayerMetrics } from '../utils/aiMetrics';

const STORAGE_KEYS = {
  USER_TOKEN: 'ipl_user_token',
  ROOM_CODE: 'active_room_code',
  IS_HOST: 'is_host',
  FRANCHISES: 'ipl_franchises',
  AUCTIONS: 'ipl_auctions',
  AUCTION_TEAMS: 'ipl_auction_teams',
  AUCTION_PLAYERS: 'ipl_auction_players',
  HISTORY: 'ipl_franchise_history',
  ACTIVE_AUCTION_ID: 'ipl_active_auction_id',
};

// Generate or retrieve persistent user token
export function getUserToken(): string {
  let token = localStorage.getItem(STORAGE_KEYS.USER_TOKEN);
  if (!token) {
    token = 'usr_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem(STORAGE_KEYS.USER_TOKEN, token);
  }
  return token;
}

// Prefill franchises if not present
export function getStoredFranchises(roomCode?: string | null): Franchise[] {
  const key = roomCode ? `ipl_room_${roomCode}_franchises` : STORAGE_KEYS.FRANCHISES;
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(DEFAULT_FRANCHISES));
    return DEFAULT_FRANCHISES;
  }
  try {
    const parsed: Franchise[] = JSON.parse(raw);
    return parsed.map((f) => {
      const match = DEFAULT_FRANCHISES.find((df) => df.id === f.id || df.name === f.name);
      return {
        ...f,
        short_name: f.short_name || match?.short_name || f.name.substring(0, 3).toUpperCase(),
        primary_color: f.primary_color || match?.primary_color || '#3b82f6',
        secondary_color: f.secondary_color || match?.secondary_color || '#1e293b',
      };
    });
  } catch {
    return DEFAULT_FRANCHISES;
  }
}

export function saveStoredFranchises(franchises: Franchise[], roomCode?: string | null): void {
  const key = roomCode ? `ipl_room_${roomCode}_franchises` : STORAGE_KEYS.FRANCHISES;
  localStorage.setItem(key, JSON.stringify(franchises));
}

// Stored Auctions
export function getStoredAuctions(roomCode?: string | null): AuctionSession[] {
  const key = roomCode ? `ipl_room_${roomCode}_auctions` : STORAGE_KEYS.AUCTIONS;
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredAuctions(auctions: AuctionSession[], roomCode?: string | null): void {
  const key = roomCode ? `ipl_room_${roomCode}_auctions` : STORAGE_KEYS.AUCTIONS;
  localStorage.setItem(key, JSON.stringify(auctions));
}

// Stored Teams per auction
export function getStoredTeams(auctionId: number, roomCode?: string | null): AuctionTeam[] {
  const key = roomCode
    ? `ipl_room_${roomCode}_teams_${auctionId}`
    : `${STORAGE_KEYS.AUCTION_TEAMS}_${auctionId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredTeams(
  auctionId: number,
  teams: AuctionTeam[],
  roomCode?: string | null
): void {
  const key = roomCode
    ? `ipl_room_${roomCode}_teams_${auctionId}`
    : `${STORAGE_KEYS.AUCTION_TEAMS}_${auctionId}`;
  localStorage.setItem(key, JSON.stringify(teams));
}

// Stored Players per auction
export function getStoredAuctionPlayers(
  auctionId: number,
  roomCode?: string | null
): AuctionPlayer[] {
  const key = roomCode
    ? `ipl_room_${roomCode}_players_${auctionId}`
    : `${STORAGE_KEYS.AUCTION_PLAYERS}_${auctionId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredAuctionPlayers(
  auctionId: number,
  players: AuctionPlayer[],
  roomCode?: string | null
): void {
  const key = roomCode
    ? `ipl_room_${roomCode}_players_${auctionId}`
    : `${STORAGE_KEYS.AUCTION_PLAYERS}_${auctionId}`;
  localStorage.setItem(key, JSON.stringify(players));
}

// Franchise History
export function getStoredHistory(roomCode?: string | null): FranchiseHistoryRecord[] {
  const key = roomCode ? `ipl_room_${roomCode}_history` : STORAGE_KEYS.HISTORY;
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredHistory(
  records: FranchiseHistoryRecord[],
  roomCode?: string | null
): void {
  const key = roomCode ? `ipl_room_${roomCode}_history` : STORAGE_KEYS.HISTORY;
  localStorage.setItem(key, JSON.stringify(records));
}

// Active Auction ID
export function getActiveAuctionId(roomCode?: string | null): number | null {
  const key = roomCode ? `ipl_room_${roomCode}_active_id` : STORAGE_KEYS.ACTIVE_AUCTION_ID;
  const raw = localStorage.getItem(key);
  return raw ? parseInt(raw, 10) : null;
}

export function setActiveAuctionId(auctionId: number | null, roomCode?: string | null): void {
  const key = roomCode ? `ipl_room_${roomCode}_active_id` : STORAGE_KEYS.ACTIVE_AUCTION_ID;
  if (auctionId === null) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, String(auctionId));
  }
}

// Room metadata
export function checkRoomExists(code: string): boolean {
  return localStorage.getItem(`ipl_room_${code}_exists`) === 'true';
}

export function createRoomStorage(code: string): void {
  localStorage.setItem(`ipl_room_${code}_exists`, 'true');
  localStorage.setItem(`ipl_room_${code}_franchises`, JSON.stringify(DEFAULT_FRANCHISES));
}
