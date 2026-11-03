import React, { useState, useEffect } from 'react';
import { useAuction } from '../context/AuctionContext';
import { formatCurrency } from '../utils/aiMetrics';
import { StatsModal } from './StatsModal';
import { LiveRosterModal } from './LiveRosterModal';
import { XIBuilderModal } from './XIBuilderModal';
import { AnalyticsModal } from './AnalyticsModal';
import { SquadAuditModal } from './SquadAuditModal';
import { ReportCard, AuctionPlayer, AuctionTeam, AiLiveAdviceResponse } from '../types';

export const AuctionScreen: React.FC = () => {
  const {
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
    isHost,
    userToken,
    startInitialDraft,
    fetchNextPlayer,
    increaseBid,
    selectBiddingTeam,
    sellPlayer,
    unsoldPlayer,
    undoLast,
    exitToMenu,
    finishAndCrown,
    getTeamRoster,
  } = useAuction();

  // Tab: Available vs Unsold
  const [inventoryTab, setInventoryTab] = useState<'Available' | 'Unsold'>('Available');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Batter' | 'Bowler' | 'All-Rounder' | 'Wicketkeeper' | 'Overseas'>('All');

  // Tab: Live Budgets vs Session Highlights
  const [rightTab, setRightTab] = useState<'Budgets' | 'Highlights'>('Budgets');

  // Modals
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedRosterTeam, setSelectedRosterTeam] = useState<{
    id: number;
    name: string;
    roster: AuctionPlayer[];
  } | null>(null);

  const [auditTeam, setAuditTeam] = useState<AuctionTeam | null>(null);
  const [isXIBuilderOpen, setIsXIBuilderOpen] = useState(false);
  const [analyticsRankings, setAnalyticsRankings] = useState<ReportCard[] | null>(null);

  // Live Gemini AI War-Room Advice
  const [liveAiAdvice, setLiveAiAdvice] = useState<AiLiveAdviceResponse | null>(null);
  const [loadingAiAdvice, setLoadingAiAdvice] = useState<boolean>(false);

  // Fetch AI War-Room Advice when current player changes
  useEffect(() => {
    if (currentPlayer && currentAuction) {
      const activeTeamObj = teams.find((t) => t.id === activeBiddingTeam) || teams[0];
      setLoadingAiAdvice(true);
      fetch('/api/ai/live-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player: currentPlayer,
          currentBid,
          targetTeam: activeTeamObj ? activeTeamObj.name : undefined,
          purse: activeTeamObj ? activeTeamObj.purse : undefined,
          minSquadSize: currentAuction.min_squad_size,
          squadSize: activeTeamObj ? activeTeamObj.squad_size : 0,
          pitchType: currentAuction.pitch_type,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setLiveAiAdvice(data);
          setLoadingAiAdvice(false);
        })
        .catch(() => {
          setLoadingAiAdvice(false);
        });
    } else {
      setLiveAiAdvice(null);
    }
  }, [currentPlayer?.auction_player_id, currentAuction?.pitch_type]);

  const handleRefreshAiAdvice = () => {
    if (!currentPlayer || !currentAuction) return;
    const activeTeamObj = teams.find((t) => t.id === activeBiddingTeam) || teams[0];
    setLoadingAiAdvice(true);
    fetch('/api/ai/live-advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player: currentPlayer,
        currentBid,
        targetTeam: activeTeamObj ? activeTeamObj.name : undefined,
        purse: activeTeamObj ? activeTeamObj.purse : undefined,
        minSquadSize: currentAuction.min_squad_size,
        squadSize: activeTeamObj ? activeTeamObj.squad_size : 0,
        pitchType: currentAuction.pitch_type,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setLiveAiAdvice(data);
        setLoadingAiAdvice(false);
      })
      .catch(() => {
        setLoadingAiAdvice(false);
      });
  };

  if (!currentAuction) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <h2>No active auction session.</h2>
        <button
          onClick={exitToMenu}
          style={{
            background: 'var(--primary)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
          }}
        >
          Return to Menu
        </button>
      </div>
    );
  }

  // Filter player pool
  const poolByStatus = playerPool.filter((p) => p.status === inventoryTab);
  const filteredPool = poolByStatus.filter((p) => {
    const matchesSearch = p.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.ipl_team_2026 && p.ipl_team_2026.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (roleFilter === 'All') return true;
    if (roleFilter === 'Overseas') return p.country.toLowerCase() !== 'india';
    return p.role === roleFilter;
  });

  const handleOpenRoster = (teamId: number, teamName: string) => {
    const roster = getTeamRoster(teamId);
    setSelectedRosterTeam({ id: teamId, name: teamName, roster });
  };

  const handleOpenAudit = (team: AuctionTeam, e: React.MouseEvent) => {
    e.stopPropagation();
    setAuditTeam(team);
  };

  const handleConcludeDraft = () => {
    if (window.confirm('Conclude Draft and proceed to build Playing XIs for tournament analytics?')) {
      setIsXIBuilderOpen(true);
    }
  };

  const handleXIComplete = (xiData: Record<number, number[]>) => {
    setIsXIBuilderOpen(false);
    const rankings = finishAndCrown(xiData);
    setAnalyticsRankings(rankings);
  };

  const timerMax = currentAuction.timer_seconds || 60;
  const timerPercentage = Math.max(0, Math.min(100, (timeLeft / timerMax) * 100));
  const isTimerCritical = timeLeft <= 10;

  return (
    <div id="auction-screen" style={{ maxWidth: '1440px', margin: '0 auto', paddingTop: '10px' }}>
      <div className="dashboard-layout">
        {/* Left Column: Inventories with Search & Filters */}
        <div className="panel flex-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1.15em', color: '#f8fafc' }}>📋 Player Roster</h3>
            <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>
              {filteredPool.length} of {poolByStatus.length}
            </span>
          </div>

          {/* Available / Unsold Tabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexShrink: 0 }}>
            <button
              className={`tab-btn ${inventoryTab === 'Available' ? 'active' : ''}`}
              onClick={() => setInventoryTab('Available')}
            >
              Available ({playerPool.filter((p) => p.status === 'Available').length})
            </button>
            <button
              className={`tab-btn ${inventoryTab === 'Unsold' ? 'active' : ''}`}
              onClick={() => setInventoryTab('Unsold')}
            >
              Unsold ({playerPool.filter((p) => p.status === 'Unsold').length})
            </button>
          </div>

          {/* Search bar */}
          <div style={{ marginBottom: '10px', flexShrink: 0 }}>
            <input
              type="text"
              placeholder="Search player or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(10, 14, 23, 0.7)',
                color: '#fff',
                fontSize: '0.85em',
              }}
            />
          </div>

          {/* Role Filters */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px', flexShrink: 0 }}>
            {(['All', 'Batter', 'Bowler', 'All-Rounder', 'Wicketkeeper', 'Overseas'] as const).map((rf) => (
              <button
                key={rf}
                onClick={() => setRoleFilter(rf)}
                style={{
                  background: roleFilter === rf ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                  color: roleFilter === rf ? '#60a5fa' : 'var(--text-muted)',
                  border: `1px solid ${roleFilter === rf ? 'rgba(59, 130, 246, 0.5)' : 'transparent'}`,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75em',
                  fontWeight: 600,
                }}
              >
                {rf === 'Wicketkeeper' ? 'WK' : rf === 'All-Rounder' ? 'AR' : rf}
              </button>
            ))}
          </div>

          {/* Filtered Player Pool List */}
          <div className="scrollable-content" style={{ maxHeight: '65vh' }}>
            {filteredPool.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'gray', padding: '24px', fontSize: '0.9em' }}>
                No players match your filters
              </p>
            ) : (
              filteredPool.map((p) => {
                const isOS = p.country.toLowerCase() !== 'india';
                return (
                  <div
                    key={p.auction_player_id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 8px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      alignItems: 'center',
                      borderRadius: '6px',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <strong style={{ color: '#f8fafc', fontSize: '0.95em' }}>
                          {p.display_name}
                        </strong>
                        {isOS && <span className="overseas-tag" style={{ fontSize: '0.65em' }}>OS</span>}
                        {p.tier && (
                          <span
                            className={`tier-tag tier-${p.tier.toLowerCase()}`}
                            style={{ fontSize: '0.65em', padding: '1px 5px' }}
                          >
                            {p.tier}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {p.role} {p.ipl_team_2026 ? `• ${p.ipl_team_2026}` : ''}
                      </div>
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.82em',
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#93c5fd',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        padding: '3px 8px',
                        borderRadius: '10px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatCurrency(p.base_price)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center Column: Live Auction Bidding Stage */}
        <div className="panel flex-panel" style={{ alignItems: 'center' }}>
          {/* Header Bar */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '16px',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <button
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--border-subtle)',
                color: 'white',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.9em',
              }}
              onClick={exitToMenu}
            >
              🏠 Menu
            </button>
            <div style={{ textAlign: 'center' }}>
              <h4
                style={{
                  margin: 0,
                  color: '#ffffff',
                  fontSize: '1.35em',
                  fontWeight: 800,
                }}
              >
                {currentAuction.name}
              </h4>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '3px' }}>
                <span
                  style={{
                    fontSize: '0.75em',
                    fontWeight: 700,
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  Track: {currentAuction.pitch_type}
                </span>
                <span
                  style={{
                    fontSize: '0.75em',
                    fontWeight: 700,
                    background: suddenDeathActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                    color: suddenDeathActive ? '#f87171' : '#34d399',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {suddenDeathActive ? '⚡ 2x Sudden Death' : 'Regular Draft'}
                </span>
              </div>
            </div>
            <button
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.9em',
                fontWeight: 700,
              }}
              onClick={handleConcludeDraft}
            >
              🏁 Conclude Draft
            </button>
          </div>

          {/* Pre-Draft State */}
          {!currentPlayer ? (
            <div
              style={{
                width: '100%',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '380px',
                textAlign: 'center',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '3.5em', marginBottom: '14px' }}>🏏</div>
              <h2 style={{ color: '#f8fafc', marginBottom: '8px' }}>
                Ready to Initiate Draft Engine
              </h2>
              <p style={{ color: 'var(--text-muted)', maxWidth: '420px', marginBottom: '24px' }}>
                Pitch surface is configured for {currentAuction.pitch_type}. Each player will be evaluated live by Gemini AI during bidding.
              </p>
              <button
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  fontSize: '1.4em',
                  padding: '18px 42px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  boxShadow: '0 6px 25px rgba(16, 185, 129, 0.4)',
                }}
                onClick={() => fetchNextPlayer()}
              >
                🚀 Initialize Engine & Next Player
              </button>
            </div>
          ) : (
            /* Active Draft State */
            <div style={{ width: '100%', overflowY: 'auto', paddingRight: '4px' }}>
              {/* AI Card */}
              <div className="ai-card">
                <div
                  className={`timer-text ${isTimerCritical ? 'timer-pulse' : ''}`}
                  style={{ color: isTimerCritical ? 'var(--danger)' : '#fbbf24' }}
                >
                  {timeLeft}s
                </div>

                <div className="timer-bar-container">
                  <div
                    className="timer-fill"
                    style={{
                      width: `${timerPercentage}%`,
                      background: isTimerCritical
                        ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                        : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                    }}
                  />
                </div>

                {/* Player Header with Tier & Team Tag */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                  {currentPlayer.ipl_team_2026 && (
                    <span
                      style={{
                        background: 'rgba(59, 130, 246, 0.25)',
                        color: '#93c5fd',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75em',
                        fontWeight: 800,
                      }}
                    >
                      {currentPlayer.ipl_team_2026}
                    </span>
                  )}
                  {currentPlayer.tier && (
                    <span className={`tier-tag tier-${currentPlayer.tier.toLowerCase()}`}>
                      {currentPlayer.tier}
                    </span>
                  )}
                </div>

                <h1 style={{ fontSize: '2.4em', marginBottom: '4px', letterSpacing: '-0.02em' }}>
                  {currentPlayer.display_name}
                </h1>

                <p style={{ color: '#cbd5e1', fontSize: '1em', margin: '4px 0' }}>
                  <span>
                    {currentPlayer.role} • {currentPlayer.country}
                  </span>
                  <span
                    style={{
                      marginLeft: '12px',
                      background: 'rgba(245, 158, 11, 0.25)',
                      color: '#fbbf24',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontWeight: 800,
                      fontSize: '0.85em',
                    }}
                  >
                    AI Score: {currentPlayer.ai_rating}
                  </span>
                </p>

                {currentPlayer.specialization && (
                  <div style={{ color: '#93c5fd', fontSize: '0.85em', fontWeight: 600, marginTop: '2px' }}>
                    🎯 {currentPlayer.specialization}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '16px',
                    marginTop: '12px',
                  }}
                >
                  <span
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#fbbf24',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.9em',
                    }}
                  >
                    Base: {formatCurrency(currentPlayer.base_price)}
                  </span>
                  <button
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '0.9em',
                    }}
                    onClick={() => setIsStatsModalOpen(true)}
                  >
                    📊 Detailed Telemetry
                  </button>
                </div>
              </div>

              {/* Gemini AI Live Strategic War-Room Card */}
              {liveAiAdvice && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.8), rgba(15, 23, 42, 0.9))',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    marginBottom: '16px',
                    textAlign: 'left',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="ai-glow-badge">
                        {liveAiAdvice.isAiPowered ? '✨ Gemini War-Room Advisor' : '⚡ Tactical War-Room Advisor'}
                      </span>
                      {!liveAiAdvice.isAiPowered && (
                        <span style={{ fontSize: '0.7em', color: '#cbd5e1', background: 'rgba(255, 255, 255, 0.08)', padding: '2px 6px', borderRadius: '4px' }} title="Algorithmic engine active. Add a Gemini API Key in Settings > Secrets for real-time LLM commentary.">
                          Algorithmic Valuation
                        </span>
                      )}
                      <span
                        style={{
                          background:
                            liveAiAdvice.recommendation === 'STRONG_BID'
                              ? 'rgba(16, 185, 129, 0.2)'
                              : liveAiAdvice.recommendation === 'CAUTIOUS_BID'
                              ? 'rgba(245, 158, 11, 0.2)'
                              : 'rgba(239, 68, 68, 0.2)',
                          color:
                            liveAiAdvice.recommendation === 'STRONG_BID'
                              ? '#34d399'
                              : liveAiAdvice.recommendation === 'CAUTIOUS_BID'
                              ? '#fbbf24'
                              : '#f87171',
                          border: `1px solid ${
                            liveAiAdvice.recommendation === 'STRONG_BID'
                              ? '#10b981'
                              : liveAiAdvice.recommendation === 'CAUTIOUS_BID'
                              ? '#f59e0b'
                              : '#ef4444'
                          }`,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.78em',
                          fontWeight: 800,
                        }}
                      >
                        {liveAiAdvice.recommendation.replace('_', ' ')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {liveAiAdvice.target_max_bid > 0 && (
                        <span style={{ fontSize: '0.85em', color: '#cbd5e1', fontWeight: 600 }}>
                          Target Ceiling: <strong style={{ color: '#38bdf8' }}>{formatCurrency(liveAiAdvice.target_max_bid)}</strong>
                        </span>
                      )}
                      <button
                        onClick={handleRefreshAiAdvice}
                        disabled={loadingAiAdvice}
                        style={{
                          background: 'transparent',
                          color: '#c084fc',
                          fontSize: '0.78em',
                          padding: '2px 6px',
                          border: '1px solid rgba(192, 132, 252, 0.3)',
                          borderRadius: '4px',
                        }}
                        title="Re-run Gemini AI strategic valuation"
                      >
                        {loadingAiAdvice ? '...' : '🔄 Refresh'}
                      </button>
                    </div>
                  </div>

                  <p style={{ margin: '0 0 6px 0', fontSize: '0.92em', color: '#f8fafc', lineHeight: 1.45 }}>
                    {liveAiAdvice.tactical_reasoning}
                  </p>

                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.78em', color: 'var(--text-muted)' }}>
                    <span>🌱 {liveAiAdvice.pitch_synergy}</span>
                    <span>•</span>
                    <span>👥 {liveAiAdvice.squad_fit}</span>
                  </div>
                </div>
              )}

              {/* Bidding Area */}
              <div className="bidding-area">
                <h2
                  style={{
                    color: '#10b981',
                    fontSize: '3em',
                    margin: '0 0 8px 0',
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 900,
                    textShadow: '0 0 20px rgba(16, 185, 129, 0.25)',
                  }}
                >
                  {formatCurrency(currentBid)}
                </h2>

                {/* Bid Increments */}
                <div
                  style={{
                    marginBottom: '16px',
                    transition: 'opacity 0.3s',
                    opacity: isBiddingLocked ? 0.4 : 1,
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '12px',
                  }}
                >
                  <button
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: 'black',
                      padding: '11px 22px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '1em',
                    }}
                    onClick={() => increaseBid(2000000)}
                    disabled={isBiddingLocked}
                  >
                    + 20L
                  </button>
                  <button
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: 'black',
                      padding: '11px 22px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '1em',
                    }}
                    onClick={() => increaseBid(5000000)}
                    disabled={isBiddingLocked}
                  >
                    + 50L
                  </button>
                  <button
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: 'black',
                      padding: '11px 22px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '1em',
                    }}
                    onClick={() => increaseBid(10000000)}
                    disabled={isBiddingLocked}
                  >
                    + 1 Cr
                  </button>
                </div>

                <p style={{ margin: '6px 0', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.9em' }}>
                  Assign to Franchise:
                </p>

                {/* Interactive Team Grid */}
                <div className="interactive-team-grid">
                  {teams
                    .filter((t) => !t.is_finished)
                    .map((t) => {
                      const isClaimedByViewer = isHost || t.owner_token === userToken;
                      const isActive = activeBiddingTeam === t.id;

                      return (
                        <button
                          key={t.id}
                          className={`team-bid-btn ${isActive ? 'active-bidder' : ''}`}
                          style={{
                            opacity: isClaimedByViewer ? 1 : 0.45,
                            cursor: isClaimedByViewer ? 'pointer' : 'not-allowed',
                            background: isActive
                              ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                              : !isClaimedByViewer
                              ? 'rgba(15, 23, 42, 0.4)'
                              : 'rgba(30, 41, 59, 0.8)',
                            borderColor: isActive ? '#60a5fa' : t.primary_color || 'var(--border-subtle)',
                          }}
                          onClick={() => selectBiddingTeam(t.id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <div
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: t.primary_color || '#3b82f6',
                              }}
                            />
                            <span>{!isClaimedByViewer ? `🔒 ${t.name}` : t.name}</span>
                          </div>
                        </button>
                      );
                    })}
                </div>

                {/* Action Buttons */}
                <div className="action-btns" style={{ marginTop: '16px' }}>
                  <button
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                    }}
                    onClick={sellPlayer}
                  >
                    🔨 SOLD
                  </button>
                  <button
                    style={{
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                    }}
                    onClick={unsoldPlayer}
                  >
                    ❌ UNSOLD
                  </button>
                  <button
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    }}
                    onClick={() => fetchNextPlayer()}
                  >
                    ⏭️ Next
                  </button>
                  {lastTransaction && (
                    <button style={{ background: '#475569' }} onClick={undoLast}>
                      ↩️ Undo
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Budgets & Session Highlights Tabs */}
        <div className="flex-panel">
          {/* Tab Selector Bar */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexShrink: 0 }}>
            <button
              id="budgets-tab-btn"
              className={`tab-btn ${rightTab === 'Budgets' ? 'active' : ''}`}
              onClick={() => setRightTab('Budgets')}
            >
              💼 Live Budgets ({teams.length})
            </button>
            <button
              id="highlights-tab-btn"
              className={`tab-btn ${rightTab === 'Highlights' ? 'active' : ''}`}
              onClick={() => setRightTab('Highlights')}
              style={{
                position: 'relative',
                border: rightTab === 'Highlights' ? '1px solid rgba(245, 158, 11, 0.4)' : undefined,
              }}
            >
              🔥 Session Highlights {liveHighlights.totalSold ? `(${liveHighlights.totalSold})` : ''}
              {Boolean(liveHighlights.totalSold && liveHighlights.totalSold > 0) && (
                <span
                  style={{
                    marginLeft: '6px',
                    background: '#10b981',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '0.72em',
                    fontWeight: 800,
                  }}
                >
                  LIVE
                </span>
              )}
            </button>
          </div>

          {rightTab === 'Budgets' ? (
            /* Tab 1: Live Budgets */
            <div className="panel flex-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
                <h3 style={{ margin: 0, fontSize: '1.15em', color: '#f8fafc' }}>💼 Franchise Purses</h3>
                <span style={{ fontSize: '0.78em', color: 'var(--text-muted)' }}>Click card to view roster</span>
              </div>

              <div className="scrollable-content" style={{ maxHeight: '58vh', flex: 1 }}>
                {teams.map((t) => {
                  const totalCap = t.purse + t.spent;
                  const perc = totalCap > 0 ? (t.purse / totalCap) * 100 : 0;
                  let c = '#10b981';
                  if (perc < 35) c = '#f59e0b';
                  if (perc < 15) c = '#ef4444';

                  return (
                    <div
                      key={t.id}
                      className="team-card-small"
                      style={{ opacity: t.is_finished ? 0.6 : 1 }}
                      onClick={() => handleOpenRoster(t.id, t.name)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: t.primary_color || '#3b82f6',
                            }}
                          />
                          <strong style={{ color: '#ffffff', fontSize: '0.95em' }}>{t.name}</strong>
                        </div>
                        <span style={{ color: c, fontWeight: 800, fontSize: '0.95em' }}>
                          {formatCurrency(t.purse)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78em', color: 'var(--text-muted)', margin: '6px 0 4px 0' }}>
                        <span>Squad: {t.squad_size}/{currentAuction.min_squad_size}</span>
                        <button
                          onClick={(e) => handleOpenAudit(t, e)}
                          style={{
                            background: 'rgba(139, 92, 246, 0.15)',
                            color: '#c084fc',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '0.75em',
                            fontWeight: 700,
                          }}
                          title="AI Tactical Squad Audit"
                        >
                          ✨ AI Audit
                        </button>
                      </div>

                      <div style={{ background: 'rgba(255, 255, 255, 0.08)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.max(0, Math.min(100, perc))}%`,
                            background: c,
                            height: '100%',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Highlights Teaser Footer */}
              {liveHighlights.highest && (
                <div
                  onClick={() => setRightTab('Highlights')}
                  style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.82em',
                  }}
                  title="Click to switch to Session Highlights tab"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔥</span>
                    <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                      Top Buy: {liveHighlights.highest.display_name} ({formatCurrency(liveHighlights.highest.sold_price)})
                    </span>
                  </div>
                  <span style={{ color: '#60a5fa', fontWeight: 700 }}>View Highlights →</span>
                </div>
              )}
            </div>
          ) : (
            /* Tab 2: Session Highlights */
            <div className="panel live-highlights-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexShrink: 0 }}>
                <h3
                  style={{
                    color: '#f59e0b',
                    margin: 0,
                    fontSize: '1.15em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  🔥 Session Highlights
                </h3>
                <span style={{ fontSize: '0.78em', color: 'var(--text-muted)' }}>Live Draft Telemetry</span>
              </div>

              <div id="highlightsContent" className="scrollable-content" style={{ maxHeight: '62vh', flex: 1, paddingRight: '4px' }}>
                {/* 1. Quick Telemetry Counters */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.72em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Spent</div>
                    <div style={{ fontSize: '0.95em', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
                      {formatCurrency(liveHighlights.totalSpent || 0)}
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.72em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sold / Unsold</div>
                    <div style={{ fontSize: '0.95em', fontWeight: 800, color: '#60a5fa', marginTop: '2px' }}>
                      {liveHighlights.totalSold || 0} / {liveHighlights.totalUnsold || 0}
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.72em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Top Spender</div>
                    <div
                      style={{
                        fontSize: '0.85em',
                        fontWeight: 800,
                        color: liveHighlights.topSpender?.color || '#c084fc',
                        marginTop: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={liveHighlights.topSpender?.name || 'None'}
                    >
                      {liveHighlights.topSpender ? liveHighlights.topSpender.name : '—'}
                    </div>
                  </div>
                </div>

                {!liveHighlights.highest ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '36px 16px',
                      background: 'rgba(15, 23, 42, 0.5)',
                      borderRadius: '10px',
                      border: '1px dashed rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <div style={{ fontSize: '2em', marginBottom: '8px' }}>🏏</div>
                    <div style={{ color: '#f8fafc', fontWeight: 700, marginBottom: '4px' }}>No Players Sold Yet</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82em', margin: '0 0 14px 0' }}>
                      Bids, steals, marquee signings, and franchise acquisitions will populate here live in real-time.
                    </p>
                    <button
                      className="tab-btn"
                      onClick={() => setRightTab('Budgets')}
                      style={{ padding: '6px 14px', fontSize: '0.8em', maxWidth: '180px', margin: '0 auto' }}
                    >
                      View Live Budgets
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Marquee Signings & AI Picks */}
                    <div style={{ marginBottom: '16px' }}>
                      {/* 1. Highest Purchase */}
                      <div
                        className="highlight-item"
                        style={{
                          background: 'rgba(56, 189, 248, 0.08)',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          marginBottom: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <strong style={{ color: '#38bdf8', fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            💰 Highest Purchase
                          </strong>
                          {liveHighlights.highest.tier && (
                            <span style={{ fontSize: '0.7em', color: '#93c5fd', background: 'rgba(56, 189, 248, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>
                              {liveHighlights.highest.tier}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: '1.05em', fontWeight: 800, color: '#fff' }}>
                            {liveHighlights.highest.display_name}
                          </span>
                          <span style={{ fontSize: '1.1em', fontWeight: 800, color: '#38bdf8' }}>
                            {formatCurrency(liveHighlights.highest.sold_price)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          {liveHighlights.highest.team_color && (
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: liveHighlights.highest.team_color,
                                display: 'inline-block',
                              }}
                            />
                          )}
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>
                            Acquired by <strong style={{ color: '#f8fafc' }}>{liveHighlights.highest.team_name}</strong>
                          </span>
                        </div>
                      </div>

                      {/* 2. Best Value Pick */}
                      {liveHighlights.steal && (
                        <div
                          className="highlight-item"
                          style={{
                            background: 'rgba(16, 185, 129, 0.08)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            marginBottom: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <strong style={{ color: '#10b981', fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              🕵️ Best Value Pick (Steal)
                            </strong>
                            <span style={{ fontSize: '0.72em', color: '#6ee7b7', fontWeight: 700 }}>
                              Saved {formatCurrency(liveHighlights.steal.savings)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '1.05em', fontWeight: 800, color: '#fff' }}>
                              {liveHighlights.steal.display_name}
                            </span>
                            <span style={{ fontSize: '1.05em', fontWeight: 800, color: '#10b981' }}>
                              {formatCurrency(liveHighlights.steal.sold_price)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.78em' }}>
                            <span style={{ color: 'var(--text-muted)' }}>
                              by {liveHighlights.steal.team_name}
                            </span>
                            <span style={{ color: '#93c5fd' }}>
                              AI Valuation: {formatCurrency(liveHighlights.steal.true_value)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 3. Overpaid Purchase */}
                      {liveHighlights.overpaid && (
                        <div
                          className="highlight-item"
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            marginBottom: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <strong style={{ color: '#f87171', fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              💸 High Premium Pick
                            </strong>
                            <span style={{ fontSize: '0.72em', color: '#fca5a5', fontWeight: 700 }}>
                              +{formatCurrency(liveHighlights.overpaid.premium)} vs AI
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '1.05em', fontWeight: 800, color: '#fff' }}>
                              {liveHighlights.overpaid.display_name}
                            </span>
                            <span style={{ fontSize: '1.05em', fontWeight: 800, color: '#f87171' }}>
                              {formatCurrency(liveHighlights.overpaid.sold_price)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.78em' }}>
                            <span style={{ color: 'var(--text-muted)' }}>
                              by {liveHighlights.overpaid.team_name}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              Valuation: {formatCurrency(liveHighlights.overpaid.true_value)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2. Live Chronological Deal Feed */}
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '0.88em', color: '#f8fafc' }}>
                          ⚡ Recent Draft Events ({liveHighlights.recentSales?.length || 0})
                        </strong>
                        <span style={{ fontSize: '0.72em', color: 'var(--text-muted)' }}>Latest transactions</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {liveHighlights.recentSales && liveHighlights.recentSales.length > 0 ? (
                          liveHighlights.recentSales.map((sale) => (
                            <div
                              key={sale.player_id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 10px',
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: '6px',
                                fontSize: '0.82em',
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <strong style={{ color: '#fff' }}>{sale.display_name}</strong>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>• {sale.role}</span>
                                </div>
                                <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {sale.status === 'Sold' ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      {sale.team_color && (
                                        <span
                                          style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: sale.team_color,
                                            display: 'inline-block',
                                          }}
                                        />
                                      )}
                                      <span style={{ color: '#93c5fd' }}>{sale.team_name}</span>
                                    </span>
                                  ) : (
                                    <span style={{ color: '#f87171' }}>Passed Unsold</span>
                                  )}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                {sale.status === 'Sold' ? (
                                  <span style={{ fontWeight: 800, color: '#34d399', fontSize: '0.95em' }}>
                                    {formatCurrency(sale.sold_price)}
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.15)',
                                      color: '#f87171',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '0.75em',
                                      fontWeight: 700,
                                    }}
                                  >
                                    UNSOLD
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ color: 'gray', fontSize: '0.8em', fontStyle: 'italic' }}>
                            Transactions will list here.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <StatsModal
        player={currentPlayer}
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
      />

      <LiveRosterModal
        isOpen={Boolean(selectedRosterTeam)}
        teamName={selectedRosterTeam?.name || ''}
        roster={selectedRosterTeam?.roster || []}
        onClose={() => setSelectedRosterTeam(null)}
      />

      <SquadAuditModal
        isOpen={Boolean(auditTeam)}
        team={auditTeam}
        roster={auditTeam ? getTeamRoster(auditTeam.id) : []}
        pitchType={currentAuction.pitch_type}
        onClose={() => setAuditTeam(null)}
      />

      <XIBuilderModal
        isOpen={isXIBuilderOpen}
        teams={teams}
        onComplete={handleXIComplete}
        onCancel={() => setIsXIBuilderOpen(false)}
      />

      <AnalyticsModal
        isOpen={Boolean(analyticsRankings)}
        rankings={analyticsRankings || []}
        pitchType={currentAuction.pitch_type}
        onClose={() => {
          setAnalyticsRankings(null);
          exitToMenu();
        }}
      />
    </div>
  );
};
