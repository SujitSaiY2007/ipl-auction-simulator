import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  AuctionSession,
  AuctionTeam,
  AuctionPlayer,
  Franchise,
  HallOfFameEntry,
  PitchType,
  LiveHighlights,
  ReportCard,
  BroadcastState,
  FranchiseHistoryRecord,
} from '../types';
import { DEFAULT_PLAYERS } from '../data/defaultPlayers';
import {
  getUserToken,
  getStoredFranchises,
  saveStoredFranchises,
  getStoredAuctions,
  saveStoredAuctions,
  getStoredTeams,
  saveStoredTeams,
  getStoredAuctionPlayers,
  saveStoredAuctionPlayers,
  getStoredHistory,
  saveStoredHistory,
  getActiveAuctionId,
  setActiveAuctionId,
  createRoomStorage,
  checkRoomExists,
} from '../services/storage';
import {
  calculateAiPlayerMetrics,
  calculateTournamentReportCards,
  formatCurrency,
} from '../utils/aiMetrics';

export interface ToastItem {
  id: string;
  msg: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface AuctionContextType {
  userToken: string;
  roomCode: string | null;
  isHost: boolean;
  screen: 'lobby' | 'auction';
  toasts: ToastItem[];
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;

  // Lobby actions
  createRoom: () => string;
  joinRoom: (code: string) => boolean;
  leaveRoom: () => void;
  claimFranchise: (franchiseId: number) => { success: boolean; message: string };

  franchises: Franchise[];
  auctions: AuctionSession[];
  addNewFranchise: (name: string) => boolean;
  deleteFranchise: (id: number) => void;
  createAuction: (params: {
    name: string;
    budgetCr: number;
    pitchType: PitchType;
    minSquadSize: number;
    timerSeconds: number;
    franchiseIds: number[];
  }) => void;
  loadAuction: (auctionId: number) => void;
  deleteAuction: (auctionId: number) => void;

  // Active Draft State
  currentAuction: AuctionSession | null;
  teams: AuctionTeam[];
  playerPool: AuctionPlayer[];
  currentPlayer: AuctionPlayer | null;
  currentBid: number;
  activeBiddingTeam: number | null;
  timeLeft: number;
  isBiddingLocked: boolean;
  lastTransaction: {
    player_id: number;
    was_sold: boolean;
    team_id?: number | null;
    final_price?: number;
  } | null;
  liveHighlights: LiveHighlights;
  suddenDeathActive: boolean;

  // Draft actions
  startInitialDraft: () => void;
  fetchNextPlayer: (poolOverride?: AuctionPlayer[], teamsOverride?: AuctionTeam[]) => void;
  increaseBid: (amt: number) => void;
  selectBiddingTeam: (teamId: number) => void;
  sellPlayer: () => void;
  unsoldPlayer: () => void;
  undoLast: () => void;
  exitToMenu: () => void;

  // Post Auction
  finishAndCrown: (xiData: Record<number, number[]>) => ReportCard[];

  // Modals & Details
  getHallOfFame: () => HallOfFameEntry[];
  getPastSquads: (franchiseId: number) => FranchiseHistoryRecord[];
  getTeamRoster: (teamId: number) => AuctionPlayer[];
  getSeasonDetails: (
    auctionId: number
  ) => { standings: FranchiseHistoryRecord[]; rosters: Array<AuctionPlayer & { team_name: string }> };
}

const AuctionContext = createContext<AuctionContextType | null>(null);

export const AuctionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userToken] = useState<string>(getUserToken());
  const [roomCode, setRoomCode] = useState<string | null>(() => {
    return sessionStorage.getItem('active_room_code') || null;
  });
  const [isHost, setIsHost] = useState<boolean>(() => {
    const stored = sessionStorage.getItem('is_host');
    return stored ? stored === 'true' : true;
  });

  const [screen, setScreen] = useState<'lobby' | 'auction'>('lobby');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Lobby state
  const [franchises, setFranchises] = useState<Franchise[]>(() => getStoredFranchises(roomCode));
  const [auctions, setAuctions] = useState<AuctionSession[]>(() => getStoredAuctions(roomCode));

  // Active auction state
  const [currentAuction, setCurrentAuction] = useState<AuctionSession | null>(null);
  const [teams, setTeams] = useState<AuctionTeam[]>([]);
  const [playerPool, setPlayerPool] = useState<AuctionPlayer[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<AuctionPlayer | null>(null);
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [activeBiddingTeam, setActiveBiddingTeam] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isBiddingLocked, setIsBiddingLocked] = useState<boolean>(false);
  const [lastTransaction, setLastTransaction] = useState<{
    player_id: number;
    was_sold: boolean;
    team_id?: number | null;
    final_price?: number;
  } | null>(null);
  const [suddenDeathActive, setSuddenDeathActive] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  const showToast = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  // Sync highlights
  const liveHighlights: LiveHighlights = React.useMemo(() => {
    const sold = playerPool.filter((p) => p.status === 'Sold' && typeof p.sold_price === 'number' && p.sold_price > 0);
    const unsold = playerPool.filter((p) => p.status === 'Unsold');
    
    // Total spent strictly reflects the actual acquired players in the draft
    const totalSpent = sold.reduce((acc, p) => acc + (p.sold_price || 0), 0);

    // Calculate top spender strictly from acquired players
    const teamSpendMap: Record<number, number> = {};
    for (const p of sold) {
      if (p.auction_team_id) {
        teamSpendMap[p.auction_team_id] = (teamSpendMap[p.auction_team_id] || 0) + (p.sold_price || 0);
      }
    }
    let topSpenderId: number | null = null;
    let maxSpend = 0;
    for (const [tIdStr, sp] of Object.entries(teamSpendMap)) {
      if (sp > maxSpend) {
        maxSpend = sp;
        topSpenderId = Number(tIdStr);
      }
    }
    const topSpenderObj = topSpenderId ? teams.find((t) => t.id === topSpenderId) : null;
    const topSpender = topSpenderObj && maxSpend > 0
      ? {
          name: topSpenderObj.name,
          spent: maxSpend,
          color: topSpenderObj.primary_color || '#3b82f6',
        }
      : null;

    // Processed players for recent feed
    const processed = playerPool
      .filter((p) => p.status === 'Sold' || p.status === 'Unsold')
      .map((p) => {
        const team = teams.find((t) => t.id === p.auction_team_id);
        return {
          player_id: p.auction_player_id,
          display_name: p.display_name,
          role: p.role,
          tier: p.tier,
          status: p.status as 'Sold' | 'Unsold',
          sold_price: p.sold_price,
          true_value: p.true_value,
          team_name: team ? team.name : undefined,
          team_color: team?.primary_color,
        };
      })
      .reverse();

    if (sold.length === 0) {
      return {
        highest: null,
        steal: null,
        overpaid: null,
        totalSpent: 0,
        totalSold: 0,
        totalUnsold: unsold.length,
        topSpender: null,
        recentSales: processed,
      };
    }

    const highest = [...sold].sort((a, b) => (b.sold_price || 0) - (a.sold_price || 0))[0];
    const highestTeam = teams.find((t) => t.id === highest.auction_team_id);

    // Steal: only when true_value exceeds sold_price
    const stealCandidates = sold.filter((p) => (p.true_value || 0) > (p.sold_price || 0));
    const steal =
      stealCandidates.length > 0
        ? [...stealCandidates].sort(
            (a, b) => ((b.true_value || 0) - (b.sold_price || 0)) - ((a.true_value || 0) - (a.sold_price || 0))
          )[0]
        : null;
    const stealTeam = steal ? teams.find((t) => t.id === steal.auction_team_id) : null;

    // Overpaid: only when sold_price exceeds true_value
    const overpaidCandidates = sold.filter((p) => (p.sold_price || 0) > (p.true_value || 0));
    const overpaid =
      overpaidCandidates.length > 0
        ? [...overpaidCandidates].sort(
            (a, b) => ((b.sold_price || 0) - (b.true_value || 0)) - ((a.sold_price || 0) - (a.true_value || 0))
          )[0]
        : null;
    const overpaidTeam = overpaid ? teams.find((t) => t.id === overpaid.auction_team_id) : null;

    return {
      highest: highest
        ? {
            display_name: highest.display_name,
            sold_price: highest.sold_price || 0,
            team_name: highestTeam ? highestTeam.name : 'Unknown Team',
            team_color: highestTeam?.primary_color,
            role: highest.role,
            tier: highest.tier,
          }
        : null,
      steal: steal
        ? {
            display_name: steal.display_name,
            sold_price: steal.sold_price || 0,
            true_value: steal.true_value || 0,
            savings: (steal.true_value || 0) - (steal.sold_price || 0),
            team_name: stealTeam ? stealTeam.name : 'Unknown Team',
            team_color: stealTeam?.primary_color,
          }
        : null,
      overpaid: overpaid
        ? {
            display_name: overpaid.display_name,
            sold_price: overpaid.sold_price || 0,
            true_value: overpaid.true_value || 0,
            premium: (overpaid.sold_price || 0) - (overpaid.true_value || 0),
            team_name: overpaidTeam ? overpaidTeam.name : 'Unknown Team',
            team_color: overpaidTeam?.primary_color,
          }
        : null,
      totalSpent,
      totalSold: sold.length,
      totalUnsold: unsold.length,
      topSpender,
      recentSales: processed,
    };
  }, [playerPool, teams]);

  // Setup broadcast channel for multiplayer synchronization across tabs/browsers
  useEffect(() => {
    const channelName = roomCode ? `ipl_auction_room_${roomCode}` : 'ipl_auction_solo';
    const channel = new BroadcastChannel(channelName);
    broadcastChannelRef.current = channel;

    channel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'STATE_PULSE') {
        const state: BroadcastState = data.state;
        if (!state) return;

        // If guest, sync state from host
        if (!isHost) {
          if (state.player && (!currentPlayer || currentPlayer.auction_player_id !== state.player.auction_player_id)) {
            setCurrentPlayer(state.player);
            setCurrentBid(state.bid);
            setActiveBiddingTeam(state.activeTeam);
          } else if (state.bid > currentBid) {
            setCurrentBid(state.bid);
            setActiveBiddingTeam(state.activeTeam);
          }
          setTimeLeft(state.time);
          setIsBiddingLocked(state.locked);
          if (state.activeTeam !== undefined) {
            setActiveBiddingTeam(state.activeTeam);
          }
        } else {
          // Host receives bid from guest
          if (state.bid > currentBid) {
            setCurrentBid(state.bid);
            setActiveBiddingTeam(state.activeTeam);
            setTimeLeft(currentAuction ? currentAuction.timer_seconds : 60);
          }
        }
      } else if (data.type === 'DATA_UPDATED') {
        // Reload data
        setFranchises(getStoredFranchises(roomCode));
        setAuctions(getStoredAuctions(roomCode));
        if (currentAuction) {
          setTeams(getStoredTeams(currentAuction.id, roomCode));
          setPlayerPool(getStoredAuctionPlayers(currentAuction.id, roomCode));
        }
      } else if (data.type === 'AUCTION_STARTED') {
        if (!isHost && data.auctionId) {
          loadAuction(data.auctionId);
        }
      }
    };

    return () => {
      channel.close();
    };
  }, [roomCode, isHost, currentPlayer, currentBid, currentAuction]);

  // Helper to broadcast state
  const broadcastState = useCallback(
    (overrides?: Partial<BroadcastState>) => {
      if (!broadcastChannelRef.current) return;
      const state: BroadcastState = {
        player: currentPlayer,
        bid: currentBid,
        time: timeLeft,
        locked: isBiddingLocked,
        activeTeam: activeBiddingTeam,
        ...overrides,
      };
      broadcastChannelRef.current.postMessage({ type: 'STATE_PULSE', state });
    },
    [currentPlayer, currentBid, timeLeft, isBiddingLocked, activeBiddingTeam]
  );

  const broadcastDataUpdate = useCallback(() => {
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: 'DATA_UPDATED' });
    }
  }, []);

  // Check saved active auction on load
  useEffect(() => {
    const activeId = getActiveAuctionId(roomCode);
    if (activeId) {
      const allAuctions = getStoredAuctions(roomCode);
      const match = allAuctions.find((a) => a.id === activeId && a.status === 'In Progress');
      if (match) {
        const rawTeams = getStoredTeams(match.id, roomCode);
        const storedPlayers = getStoredAuctionPlayers(match.id, roomCode);
        
        // Enrich loaded players with latest definitions & recalibrated ratings
        const enriched: AuctionPlayer[] = storedPlayers.map((lp) => {
          const defaultMatch = DEFAULT_PLAYERS.find(
            (dp) => dp.display_name === lp.display_name || dp.id === lp.player_id
          );
          const metrics = calculateAiPlayerMetrics(defaultMatch ? { ...defaultMatch, ...lp } : lp, match.pitch_type);
          return {
            ...defaultMatch,
            ...lp,
            ai_rating: metrics.ai_rating,
            true_value: metrics.true_value,
            t20i_stats: defaultMatch?.t20i_stats || lp.t20i_stats,
            overall_t20_stats: defaultMatch?.overall_t20_stats || lp.overall_t20_stats,
          };
        });

        // Add any newly added players from DEFAULT_PLAYERS
        let maxId = enriched.length > 0 ? Math.max(...enriched.map((p) => p.auction_player_id)) : 0;
        for (const dp of DEFAULT_PLAYERS) {
          if (!enriched.some((ep) => ep.display_name === dp.display_name || ep.player_id === dp.id)) {
            maxId++;
            const metrics = calculateAiPlayerMetrics(dp, match.pitch_type);
            enriched.push({
              ...dp,
              auction_player_id: maxId,
              auction_id: match.id,
              player_id: dp.id,
              status: 'Available',
              sold_price: null,
              auction_team_id: null,
              ai_rating: metrics.ai_rating,
              true_value: metrics.true_value,
            });
          }
        }

        // Self-heal team spent and purse against actual sold players in database
        const healedTeams = rawTeams.map((t) => {
          const teamRoster = enriched.filter((p) => p.auction_team_id === t.id && p.status === 'Sold');
          const actualSpent = teamRoster.reduce((sum, p) => sum + (p.sold_price || 0), 0);
          if (t.spent !== actualSpent) {
            const diff = t.spent - actualSpent;
            return {
              ...t,
              spent: actualSpent,
              purse: t.purse + diff,
              squad_size: teamRoster.length,
            };
          }
          return t;
        });

        saveStoredTeams(match.id, healedTeams, roomCode);
        setTeams(healedTeams);
        saveStoredAuctionPlayers(match.id, enriched, roomCode);
        setPlayerPool(enriched);
        setSuddenDeathActive(Boolean(match.sudden_death_active));
        setScreen('auction');
      }
    }
  }, [roomCode]);

  // Timer logic for Host
  useEffect(() => {
    if (screen !== 'auction' || !currentPlayer || isBiddingLocked || !isHost) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsBiddingLocked(true);
          broadcastState({ time: 0, locked: true });
          showToast('TIME UP! Bidding locked. Assign team and execute SOLD.', 'warning');
          return 0;
        }
        const nextTime = prev - 1;
        broadcastState({ time: nextTime, locked: false });
        return nextTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screen, currentPlayer, isBiddingLocked, isHost, broadcastState, showToast]);

  // Create room
  const createRoom = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    createRoomStorage(code);
    setRoomCode(code);
    setIsHost(true);
    sessionStorage.setItem('active_room_code', code);
    sessionStorage.setItem('is_host', 'true');
    setFranchises(getStoredFranchises(code));
    setAuctions(getStoredAuctions(code));
    showToast(`Room ${code} Created! You are Commissioner (Host).`, 'success');
    return code;
  }, [showToast]);

  // Join room
  const joinRoom = useCallback(
    (inputCode: string) => {
      const code = inputCode.trim().toUpperCase();
      if (code.length !== 4) {
        showToast('Room code must be exactly 4 letters.', 'warning');
        return false;
      }
      if (!checkRoomExists(code)) {
        showToast('Room code not found.', 'error');
        return false;
      }
      setRoomCode(code);
      setIsHost(false);
      sessionStorage.setItem('active_room_code', code);
      sessionStorage.setItem('is_host', 'false');
      setFranchises(getStoredFranchises(code));
      setAuctions(getStoredAuctions(code));
      showToast(`Connected to Room ${code} as Guest!`, 'success');
      return true;
    },
    [showToast]
  );

  // Leave room
  const leaveRoom = useCallback(() => {
    setRoomCode(null);
    setIsHost(true);
    sessionStorage.removeItem('active_room_code');
    sessionStorage.removeItem('is_host');
    setFranchises(getStoredFranchises(null));
    setAuctions(getStoredAuctions(null));
    showToast('Returned to isolated Sandbox', 'info');
  }, [showToast]);

  // Claim franchise
  const claimFranchise = useCallback(
    (franchiseId: number) => {
      const currentList = getStoredFranchises(roomCode);
      const team = currentList.find((f) => f.id === franchiseId);
      if (!team) return { success: false, message: 'Franchise not found.' };

      if (team.owner_token) {
        if (team.owner_token === userToken) {
          return { success: true, message: 'You already own this team.' };
        }
        return { success: false, message: `${team.name} has already been claimed by another player!` };
      }

      const updated = currentList.map((f) =>
        f.id === franchiseId ? { ...f, owner_token: userToken } : f
      );
      saveStoredFranchises(updated, roomCode);
      setFranchises(updated);
      broadcastDataUpdate();
      return { success: true, message: `Successfully claimed ${team.name}!` };
    },
    [roomCode, userToken, broadcastDataUpdate]
  );

  // Add franchise
  const addNewFranchise = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        showToast('Enter a franchise name!', 'error');
        return false;
      }
      const current = getStoredFranchises(roomCode);
      if (current.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
        showToast('Franchise with this name already exists!', 'error');
        return false;
      }
      const newId = current.length > 0 ? Math.max(...current.map((f) => f.id)) + 1 : 1;
      const updated = [...current, { id: newId, name: trimmed }];
      saveStoredFranchises(updated, roomCode);
      setFranchises(updated);
      broadcastDataUpdate();
      showToast('Franchise Added!', 'success');
      return true;
    },
    [roomCode, broadcastDataUpdate, showToast]
  );

  // Delete franchise
  const deleteFranchise = useCallback(
    (id: number) => {
      const current = getStoredFranchises(roomCode);
      const updated = current.filter((f) => f.id !== id);
      saveStoredFranchises(updated, roomCode);
      setFranchises(updated);
      broadcastDataUpdate();
      showToast('Franchise Deleted', 'warning');
    },
    [roomCode, broadcastDataUpdate, showToast]
  );

  // Create auction
  const createAuction = useCallback(
    ({
      name,
      budgetCr,
      pitchType,
      minSquadSize,
      timerSeconds,
      franchiseIds,
    }: {
      name: string;
      budgetCr: number;
      pitchType: PitchType;
      minSquadSize: number;
      timerSeconds: number;
      franchiseIds: number[];
    }) => {
      const allFranchises = getStoredFranchises(roomCode);
      const selectedFranchises = allFranchises.filter((f) => franchiseIds.includes(f.id));
      if (selectedFranchises.length === 0) {
        showToast('Select at least one franchise!', 'error');
        return;
      }

      const allAuctions = getStoredAuctions(roomCode).map((a) => ({
        ...a,
        status: (a.status === 'In Progress' ? 'Paused' : a.status) as AuctionSession['status'],
      }));

      const newAuctionId = allAuctions.length > 0 ? Math.max(...allAuctions.map((a) => a.id)) + 1 : 1;
      const startingPurse = Math.floor(budgetCr * 10000000);

      const newAuction: AuctionSession = {
        id: newAuctionId,
        name: name || `Season ${newAuctionId}`,
        pitch_type: pitchType,
        min_squad_size: minSquadSize,
        timer_seconds: timerSeconds,
        sudden_death_active: 0,
        date_created: new Date().toISOString(),
        status: 'In Progress',
      };

      const updatedAuctions = [newAuction, ...allAuctions];
      saveStoredAuctions(updatedAuctions, roomCode);
      setAuctions(updatedAuctions);

      // Create Auction Teams
      const createdTeams: AuctionTeam[] = selectedFranchises.map((f, idx) => ({
        id: idx + 1,
        auction_id: newAuctionId,
        franchise_id: f.id,
        name: f.name,
        short_name: f.short_name || f.name.substring(0, 3).toUpperCase(),
        primary_color: f.primary_color || '#3b82f6',
        owner_token: f.owner_token || null,
        purse: startingPurse,
        squad_size: 0,
        is_finished: 0,
        sudden_death_draws_left: 0,
        sudden_death_needs: 0,
        spent: 0,
      }));
      saveStoredTeams(newAuctionId, createdTeams, roomCode);
      setTeams(createdTeams);

      // Create Auction Players from DEFAULT_PLAYERS
      const createdPlayers: AuctionPlayer[] = DEFAULT_PLAYERS.map((p, idx) => {
        const metrics = calculateAiPlayerMetrics(p, pitchType);
        return {
          ...p,
          auction_player_id: idx + 1,
          auction_id: newAuctionId,
          player_id: p.id,
          status: 'Available',
          sold_price: null,
          auction_team_id: null,
          ai_rating: metrics.ai_rating,
          true_value: metrics.true_value,
        };
      });
      saveStoredAuctionPlayers(newAuctionId, createdPlayers, roomCode);
      setPlayerPool(createdPlayers);

      setCurrentAuction(newAuction);
      setActiveAuctionId(newAuctionId, roomCode);
      setCurrentPlayer(null);
      setCurrentBid(0);
      setActiveBiddingTeam(null);
      setLastTransaction(null);
      setSuddenDeathActive(false);
      setScreen('auction');

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: 'AUCTION_STARTED',
          auctionId: newAuctionId,
        });
      }
    },
    [roomCode, showToast]
  );

  // Load / resume auction
  const loadAuction = useCallback(
    (auctionId: number) => {
      const allAuctions = getStoredAuctions(roomCode);
      const match = allAuctions.find((a) => a.id === auctionId);
      if (!match) return;

      const updated = allAuctions.map((a) =>
        a.id === auctionId
          ? { ...a, status: 'In Progress' as const }
          : a.status === 'In Progress'
          ? { ...a, status: 'Paused' as const }
          : a
      );
      saveStoredAuctions(updated, roomCode);
      setAuctions(updated);
      setCurrentAuction({ ...match, status: 'In Progress' });
      setActiveAuctionId(auctionId, roomCode);

      const loadedTeams = getStoredTeams(auctionId, roomCode);
      const loadedPlayers = getStoredAuctionPlayers(auctionId, roomCode);
      setTeams(loadedTeams);

      const enriched: AuctionPlayer[] = loadedPlayers.map((lp) => {
        const defaultMatch = DEFAULT_PLAYERS.find(
          (dp) => dp.display_name === lp.display_name || dp.id === lp.player_id
        );
        const metrics = calculateAiPlayerMetrics(defaultMatch ? { ...defaultMatch, ...lp } : lp, match.pitch_type);
        return {
          ...defaultMatch,
          ...lp,
          ai_rating: metrics.ai_rating,
          true_value: metrics.true_value,
          t20i_stats: defaultMatch?.t20i_stats || lp.t20i_stats,
          overall_t20_stats: defaultMatch?.overall_t20_stats || lp.overall_t20_stats,
        };
      });

      let maxId = enriched.length > 0 ? Math.max(...enriched.map((p) => p.auction_player_id)) : 0;
      for (const dp of DEFAULT_PLAYERS) {
        if (!enriched.some((ep) => ep.display_name === dp.display_name || ep.player_id === dp.id)) {
          maxId++;
          const metrics = calculateAiPlayerMetrics(dp, match.pitch_type);
          enriched.push({
            ...dp,
            auction_player_id: maxId,
            auction_id: auctionId,
            player_id: dp.id,
            status: 'Available',
            sold_price: null,
            auction_team_id: null,
            ai_rating: metrics.ai_rating,
            true_value: metrics.true_value,
          });
        }
      }

      // Self-heal team spent and purse against actual sold players in database
      const healedTeams = loadedTeams.map((t) => {
        const teamRoster = enriched.filter((p) => p.auction_team_id === t.id && p.status === 'Sold');
        const actualSpent = teamRoster.reduce((sum, p) => sum + (p.sold_price || 0), 0);
        if (t.spent !== actualSpent) {
          const diff = t.spent - actualSpent;
          return {
            ...t,
            spent: actualSpent,
            purse: t.purse + diff,
            squad_size: teamRoster.length,
          };
        }
        return t;
      });

      saveStoredTeams(auctionId, healedTeams, roomCode);
      setTeams(healedTeams);
      saveStoredAuctionPlayers(auctionId, enriched, roomCode);
      setPlayerPool(enriched);
      setSuddenDeathActive(Boolean(match.sudden_death_active));
      setCurrentPlayer(null);
      setCurrentBid(0);
      setActiveBiddingTeam(null);
      setLastTransaction(null);
      setScreen('auction');
    },
    [roomCode]
  );

  // Delete auction
  const deleteAuction = useCallback(
    (auctionId: number) => {
      const allAuctions = getStoredAuctions(roomCode).filter((a) => a.id !== auctionId);
      saveStoredAuctions(allAuctions, roomCode);
      setAuctions(allAuctions);
      if (currentAuction && currentAuction.id === auctionId) {
        setCurrentAuction(null);
        setActiveAuctionId(null, roomCode);
        setScreen('lobby');
      }
      showToast('Game session deleted', 'warning');
      broadcastDataUpdate();
    },
    [roomCode, currentAuction, showToast, broadcastDataUpdate]
  );

  // Draft actions
  const fetchNextPlayer = useCallback(
    (poolOverride?: AuctionPlayer[], teamsOverride?: AuctionTeam[]) => {
      let auction = currentAuction;
      if (!auction) {
        const activeId = getActiveAuctionId(roomCode);
        if (activeId) {
          const all = getStoredAuctions(roomCode);
          auction = all.find((a) => a.id === activeId) || null;
          if (auction) setCurrentAuction(auction);
        }
      }
      if (!auction) {
        showToast('No active auction session found. Please return to menu.', 'error');
        return;
      }

      // Ensure teams are loaded and valid
      let currentTeams = teamsOverride || teams;
      if (!currentTeams || currentTeams.length === 0) {
        currentTeams = getStoredTeams(auction.id, roomCode);
        if (!currentTeams || currentTeams.length === 0) {
          const allFranchises = getStoredFranchises(roomCode);
          currentTeams = allFranchises.slice(0, 10).map((f, idx) => ({
            id: idx + 1,
            auction_id: auction!.id,
            franchise_id: f.id,
            name: f.name,
            short_name: f.short_name || f.name.substring(0, 3).toUpperCase(),
            primary_color: f.primary_color || '#3b82f6',
            owner_token: f.owner_token || null,
            purse: 1000000000,
            squad_size: 0,
            is_finished: 0,
            sudden_death_draws_left: 0,
            sudden_death_needs: 0,
            spent: 0,
          }));
          saveStoredTeams(auction.id, currentTeams, roomCode);
        }
        setTeams(currentTeams);
      }

      // Resolve player pool: poolOverride takes immediate precedence, followed by storage, then state
      let currentPool = poolOverride;
      if (!currentPool || currentPool.length === 0) {
        currentPool = getStoredAuctionPlayers(auction.id, roomCode);
      }
      if (!currentPool || currentPool.length === 0) {
        currentPool = playerPool;
      }
      if (!currentPool || currentPool.length === 0) {
        currentPool = DEFAULT_PLAYERS.map((p, idx) => {
          const metrics = calculateAiPlayerMetrics(p, auction!.pitch_type);
          return {
            ...p,
            auction_player_id: idx + 1,
            auction_id: auction!.id,
            player_id: p.id,
            status: 'Available',
            sold_price: null,
            auction_team_id: null,
            ai_rating: metrics.ai_rating,
            true_value: metrics.true_value,
          };
        });
        saveStoredAuctionPlayers(auction.id, currentPool, roomCode);
      }

      // Sanitize and ensure every player has a valid status and price
      currentPool = currentPool.map((p, idx) => {
        let st: 'Available' | 'Sold' | 'Unsold' = 'Available';
        if (p.status === 'Sold') st = 'Sold';
        else if (p.status === 'Unsold') st = 'Unsold';
        return {
          ...p,
          auction_player_id: p.auction_player_id || idx + 1,
          auction_id: auction!.id,
          status: st,
          sold_price: st === 'Sold' ? p.sold_price : null,
          auction_team_id: st === 'Sold' ? p.auction_team_id : null,
          base_price: typeof p.base_price === 'number' && p.base_price > 0 ? p.base_price : 20000000,
        };
      });

      // Update both local storage and React state
      saveStoredAuctionPlayers(auction.id, currentPool, roomCode);
      setPlayerPool(currentPool);

      let available = currentPool.filter((p) => p.status === 'Available');
      if (available.length === 0) {
        const unsold = currentPool.filter((p) => p.status === 'Unsold');
        if (unsold.length > 0) {
          showToast('Recycling unsold players back to available pool for second round!', 'info');
          currentPool = currentPool.map((p) =>
            p.status === 'Unsold' ? { ...p, status: 'Available' as const } : p
          );
          saveStoredAuctionPlayers(auction.id, currentPool, roomCode);
          setPlayerPool(currentPool);
          available = currentPool.filter((p) => p.status === 'Available');
        } else {
          showToast('All draft players have been acquired! Conclude the draft to view final standings.', 'success');
          setCurrentPlayer(null);
          return;
        }
      }

      const randomIndex = Math.floor(Math.random() * available.length);
      const selected = available[randomIndex];

      const metrics = calculateAiPlayerMetrics(selected, auction.pitch_type);
      const updatedPlayer: AuctionPlayer = {
        ...selected,
        ai_rating: metrics.ai_rating,
        true_value: metrics.true_value,
      };

      setCurrentPlayer(updatedPlayer);
      setCurrentBid(updatedPlayer.base_price);
      setActiveBiddingTeam(null);
      setTimeLeft(auction.timer_seconds || 60);
      setIsBiddingLocked(false);

      broadcastState({
        player: updatedPlayer,
        bid: updatedPlayer.base_price,
        time: auction.timer_seconds || 60,
        locked: false,
        activeTeam: null,
      });
    },
    [currentAuction, playerPool, teams, roomCode, broadcastState, showToast]
  );

  const startInitialDraft = useCallback(() => {
    fetchNextPlayer();
  }, [fetchNextPlayer]);

  const increaseBid = useCallback(
    (amt: number) => {
      if (!currentPlayer || isBiddingLocked || !currentAuction) return;

      let biddingTeamId = activeBiddingTeam;
      if (!isHost) {
        const myTeam = teams.find((t) => t.owner_token === userToken);
        if (myTeam) {
          biddingTeamId = myTeam.id;
          setActiveBiddingTeam(myTeam.id);
        } else {
          showToast('You must claim a franchise in the lobby to place bids!', 'warning');
          return;
        }
      } else {
        if (!biddingTeamId) {
          showToast('Commissioner: Select a franchise before bidding on their behalf!', 'warning');
          return;
        }
      }

      const newBid = currentBid + amt;
      setCurrentBid(newBid);
      setTimeLeft(currentAuction.timer_seconds);
      setIsBiddingLocked(false);

      broadcastState({
        bid: newBid,
        time: currentAuction.timer_seconds,
        locked: false,
        activeTeam: biddingTeamId,
      });
    },
    [currentPlayer, isBiddingLocked, currentAuction, activeBiddingTeam, isHost, teams, userToken, currentBid, broadcastState, showToast]
  );

  const selectBiddingTeam = useCallback(
    (teamId: number) => {
      const targetTeam = teams.find((t) => t.id === teamId);
      if (!targetTeam) return;

      if (!isHost && targetTeam.owner_token !== userToken) {
        showToast(`Access Denied: You do not control ${targetTeam.name}`, 'warning');
        return;
      }
      setActiveBiddingTeam(teamId);
      broadcastState({ activeTeam: teamId });
    },
    [teams, isHost, userToken, broadcastState, showToast]
  );

  const sellPlayer = useCallback(() => {
    if (!currentPlayer || !currentAuction) return;
    if (!activeBiddingTeam) {
      showToast('Select a Team Node first!', 'error');
      return;
    }

    const targetTeam = teams.find((t) => t.id === activeBiddingTeam);
    if (!targetTeam) return;

    const formattingPurse = targetTeam.purse;
    const requiredRemainingSlots = Math.max(
      0,
      currentAuction.min_squad_size - (targetTeam.squad_size + 1)
    );
    const absoluteMinimumReserve = requiredRemainingSlots * 2000000;

    if (currentBid > formattingPurse) {
      showToast(
        `Illegal Bid! ${targetTeam.name} only has ${formatCurrency(formattingPurse)} left.`,
        'error'
      );
      return;
    }

    if (formattingPurse - currentBid < absoluteMinimumReserve) {
      const maxAllowedBid = formattingPurse - absoluteMinimumReserve;
      showToast(
        `Bankrupt Warning! safe bid is ${formatCurrency(maxAllowedBid)}.`,
        'warning'
      );
      return;
    }

    // Update player
    const updatedPlayers = playerPool.map((p) =>
      p.auction_player_id === currentPlayer.auction_player_id
        ? {
            ...p,
            status: 'Sold' as const,
            sold_price: currentBid,
            auction_team_id: activeBiddingTeam,
          }
        : p
    );
    setPlayerPool(updatedPlayers);
    saveStoredAuctionPlayers(currentAuction.id, updatedPlayers, roomCode);

    // Update team
    let suddenDeathNeeds = targetTeam.sudden_death_needs;
    let suddenDeathDraws = targetTeam.sudden_death_draws_left;
    if (suddenDeathDraws > 0) {
      suddenDeathDraws = Math.max(0, suddenDeathDraws - 1);
      suddenDeathNeeds = Math.max(0, suddenDeathNeeds - 1);
    }

    let updatedTeams = teams.map((t) => {
      if (t.id === activeBiddingTeam) {
        const nextSquadSize = t.squad_size + 1;
        const isFin = nextSquadSize >= currentAuction.min_squad_size ? 1 : t.is_finished;
        return {
          ...t,
          purse: t.purse - currentBid,
          spent: t.spent + currentBid,
          squad_size: nextSquadSize,
          is_finished: isFin,
          sudden_death_draws_left: suddenDeathDraws,
          sudden_death_needs: suddenDeathNeeds,
        };
      }
      return t;
    });

    // Check if sudden death should trigger
    const anyFinished = updatedTeams.some((t) => t.squad_size >= currentAuction.min_squad_size);
    const laggingTeams = updatedTeams.filter(
      (t) => t.squad_size < currentAuction.min_squad_size && !t.is_finished
    );

    if (anyFinished && laggingTeams.length > 0 && !suddenDeathActive) {
      setSuddenDeathActive(true);
      showToast('SUDDEN DEATH ACTIVATED! Trailing franchises enter 2x draft.', 'error');
      updatedTeams = updatedTeams.map((t) => {
        if (t.squad_size < currentAuction.min_squad_size) {
          const needs = Math.max(0, currentAuction.min_squad_size - t.squad_size);
          return {
            ...t,
            sudden_death_needs: needs,
            sudden_death_draws_left: needs * 2,
          };
        }
        return t;
      });

      // Update auction session
      const allAuctions = getStoredAuctions(roomCode).map((a) =>
        a.id === currentAuction.id ? { ...a, sudden_death_active: 1 } : a
      );
      saveStoredAuctions(allAuctions, roomCode);
      setAuctions(allAuctions);
    }

    setTeams(updatedTeams);
    saveStoredTeams(currentAuction.id, updatedTeams, roomCode);

    setLastTransaction({
      player_id: currentPlayer.auction_player_id,
      was_sold: true,
      team_id: activeBiddingTeam,
      final_price: currentBid,
    });

    showToast(`${currentPlayer.display_name} SOLD to ${targetTeam.name}!`, 'success');
    setCurrentPlayer(null);
    broadcastDataUpdate();
    fetchNextPlayer(updatedPlayers, updatedTeams);
  }, [
    currentPlayer,
    currentAuction,
    activeBiddingTeam,
    teams,
    currentBid,
    playerPool,
    roomCode,
    suddenDeathActive,
    showToast,
    broadcastDataUpdate,
    fetchNextPlayer,
  ]);

  const unsoldPlayer = useCallback(() => {
    if (!currentPlayer || !currentAuction) return;

    const updatedPlayers = playerPool.map((p) =>
      p.auction_player_id === currentPlayer.auction_player_id
        ? {
            ...p,
            status: 'Unsold' as const,
          }
        : p
    );
    setPlayerPool(updatedPlayers);
    saveStoredAuctionPlayers(currentAuction.id, updatedPlayers, roomCode);

    // If sudden death active, decrement draws for active team if selected
    let updatedTeams = teams;
    if (activeBiddingTeam && suddenDeathActive) {
      updatedTeams = teams.map((t) => {
        if (t.id === activeBiddingTeam && t.sudden_death_draws_left > 0) {
          return {
            ...t,
            sudden_death_draws_left: Math.max(0, t.sudden_death_draws_left - 1),
          };
        }
        return t;
      });
      setTeams(updatedTeams);
      saveStoredTeams(currentAuction.id, updatedTeams, roomCode);
    }

    setLastTransaction({
      player_id: currentPlayer.auction_player_id,
      was_sold: false,
    });

    showToast(`${currentPlayer.display_name} passed UNSOLD`, 'error');
    setCurrentPlayer(null);
    broadcastDataUpdate();
    fetchNextPlayer(updatedPlayers, updatedTeams);
  }, [currentPlayer, currentAuction, playerPool, roomCode, activeBiddingTeam, suddenDeathActive, teams, showToast, broadcastDataUpdate, fetchNextPlayer]);

  const undoLast = useCallback(() => {
    if (!lastTransaction || !currentAuction) return;

    const { player_id, was_sold, team_id, final_price } = lastTransaction;

    if (was_sold && team_id && final_price) {
      const updatedTeams = teams.map((t) => {
        if (t.id === team_id) {
          return {
            ...t,
            purse: t.purse + final_price,
            spent: Math.max(0, t.spent - final_price),
            squad_size: Math.max(0, t.squad_size - 1),
            is_finished: 0,
          };
        }
        return t;
      });
      setTeams(updatedTeams);
      saveStoredTeams(currentAuction.id, updatedTeams, roomCode);
    }

    const updatedPlayers = playerPool.map((p) =>
      p.auction_player_id === player_id
        ? {
            ...p,
            status: 'Available' as const,
            sold_price: null,
            auction_team_id: null,
          }
        : p
    );
    setPlayerPool(updatedPlayers);
    saveStoredAuctionPlayers(currentAuction.id, updatedPlayers, roomCode);

    setLastTransaction(null);
    setIsBiddingLocked(false);
    showToast('Undo Successful - Transaction reversed', 'info');
    broadcastDataUpdate();
  }, [lastTransaction, currentAuction, teams, roomCode, playerPool, showToast, broadcastDataUpdate]);

  const finishAndCrown = useCallback(
    (xiData: Record<number, number[]>): ReportCard[] => {
      if (!currentAuction) return [];

      const rostersByTeam: Record<number, AuctionPlayer[]> = {};
      for (const t of teams) {
        rostersByTeam[t.id] = playerPool.filter((p) => p.auction_team_id === t.id);
      }

      const reportCards = calculateTournamentReportCards(teams, rostersByTeam, xiData);

      // Record in history if not already completed
      const allHistory = getStoredHistory(roomCode);
      const newHistoryRecords: FranchiseHistoryRecord[] = reportCards.map((rc, idx) => {
        const teamObj = teams.find((t) => t.franchise_id === rc.franchise_id);
        const teamRoster = teamObj ? rostersByTeam[teamObj.id] || [] : [];
        return {
          id: (allHistory.length > 0 ? Math.max(...allHistory.map((h) => h.id)) : 0) + idx + 1,
          franchise_id: rc.franchise_id,
          franchise_name: rc.team_name,
          auction_name: currentAuction.name,
          tbi_score: rc.tbi_score,
          is_winner: idx === 0 ? 1 : 0,
          total_spent: rc.spent,
          date: new Date().toISOString(),
          roster: teamRoster.map((p) => ({
            display_name: p.display_name,
            role: p.role,
            sold_price: p.sold_price || 0,
            ai_rating: p.ai_rating,
          })),
        };
      });

      saveStoredHistory([...newHistoryRecords, ...allHistory], roomCode);

      // Update auction status
      const updatedAuctions = getStoredAuctions(roomCode).map((a) =>
        a.id === currentAuction.id ? { ...a, status: 'Completed' as const } : a
      );
      saveStoredAuctions(updatedAuctions, roomCode);
      setAuctions(updatedAuctions);
      setCurrentAuction({ ...currentAuction, status: 'Completed' });

      broadcastDataUpdate();
      return reportCards;
    },
    [currentAuction, teams, playerPool, roomCode, broadcastDataUpdate]
  );

  const exitToMenu = useCallback(() => {
    setScreen('lobby');
    setCurrentPlayer(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const getHallOfFame = useCallback((): HallOfFameEntry[] => {
    const allFranchises = getStoredFranchises(roomCode);
    const history = getStoredHistory(roomCode);

    const entries: HallOfFameEntry[] = allFranchises.map((f) => {
      const records = history.filter((h) => h.franchise_id === f.id);
      const matchesPlayed = records.length;
      const trophies = records.filter((r) => r.is_winner === 1).length;
      const avgTbi =
        matchesPlayed > 0
          ? Math.round((records.reduce((acc, r) => acc + r.tbi_score, 0) / matchesPlayed) * 10) / 10
          : 0;
      const avgSpent =
        matchesPlayed > 0
          ? Math.round(records.reduce((acc, r) => acc + r.total_spent, 0) / matchesPlayed)
          : 0;

      return {
        id: f.id,
        name: f.name,
        matches_played: matchesPlayed,
        trophies,
        avg_tbi: avgTbi,
        avg_spent: avgSpent,
      };
    });

    entries.sort((a, b) => b.trophies - a.trophies || b.avg_tbi - a.avg_tbi);
    return entries;
  }, [roomCode]);

  const getPastSquads = useCallback(
    (franchiseId: number): FranchiseHistoryRecord[] => {
      const history = getStoredHistory(roomCode);
      return history.filter((h) => h.franchise_id === franchiseId);
    },
    [roomCode]
  );

  const getTeamRoster = useCallback(
    (teamId: number): AuctionPlayer[] => {
      return playerPool.filter((p) => p.auction_team_id === teamId);
    },
    [playerPool]
  );

  const getSeasonDetails = useCallback(
    (auctionId: number) => {
      const targetAuction = getStoredAuctions(roomCode).find((a) => a.id === auctionId);
      const allHistory = getStoredHistory(roomCode);
      const standings = targetAuction
        ? allHistory.filter((h) => h.auction_name === targetAuction.name)
        : [];
      standings.sort((a, b) => b.tbi_score - a.tbi_score);

      const savedPlayers = getStoredAuctionPlayers(auctionId, roomCode);
      const savedTeams = getStoredTeams(auctionId, roomCode);

      const rosters = savedPlayers
        .filter((p) => p.status === 'Sold' && p.auction_team_id)
        .map((p) => {
          const team = savedTeams.find((t) => t.id === p.auction_team_id);
          return {
            ...p,
            team_name: team ? team.name : 'Unknown Team',
          };
        });

      return { standings, rosters };
    },
    [roomCode]
  );

  return (
    <AuctionContext.Provider
      value={{
        userToken,
        roomCode,
        isHost,
        screen,
        toasts,
        showToast,
        createRoom,
        joinRoom,
        leaveRoom,
        claimFranchise,
        franchises,
        auctions,
        addNewFranchise,
        deleteFranchise,
        createAuction,
        loadAuction,
        deleteAuction,
        currentAuction,
        teams,
        playerPool,
        currentPlayer,
        currentBid,
        activeBiddingTeam,
        timeLeft,
        isBiddingLocked,
        lastTransaction,
        liveHighlights,
        suddenDeathActive,
        startInitialDraft,
        fetchNextPlayer,
        increaseBid,
        selectBiddingTeam,
        sellPlayer,
        unsoldPlayer,
        undoLast,
        exitToMenu,
        finishAndCrown,
        getHallOfFame,
        getPastSquads,
        getTeamRoster,
        getSeasonDetails,
      }}
    >
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuction = (): AuctionContextType => {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error('useAuction must be used within an AuctionProvider');
  }
  return context;
};
