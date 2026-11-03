import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import { PitchType } from '../types';
import { RulesModal } from './RulesModal';
import { HallOfFameModal } from './HallOfFameModal';
import { PastHistoryModal } from './PastHistoryModal';
import { SeasonDetailsModal } from './SeasonDetailsModal';

export const LobbyScreen: React.FC = () => {
  const {
    roomCode,
    isHost,
    userToken,
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
    showToast,
  } = useAuction();

  // Form inputs
  const [sessionTitle, setSessionTitle] = useState('');
  const [budgetCr, setBudgetCr] = useState<number | ''>(100);
  const [pitchType, setPitchType] = useState<PitchType>('Standard');
  const [minSquadSize, setMinSquadSize] = useState<number | ''>(15);
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [selectedFranchiseIds, setSelectedFranchiseIds] = useState<number[]>(() =>
    franchises.slice(0, 10).map((f) => f.id)
  );
  const [newTeamName, setNewTeamName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');

  // Modals state
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isHofModalOpen, setIsHofModalOpen] = useState(false);
  const [historyFranchise, setHistoryFranchise] = useState<{ id: number; name: string } | null>(null);
  const [detailsAuction, setDetailsAuction] = useState<{ id: number; name: string } | null>(null);

  const handleToggleFranchise = (id: number) => {
    setSelectedFranchiseIds((prev) =>
      prev.includes(id) ? prev.filter((fId) => fId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedFranchiseIds(franchises.map((f) => f.id));
  };

  const handleClearAll = () => {
    setSelectedFranchiseIds([]);
  };

  const handleAddTeam = () => {
    if (addNewFranchise(newTeamName)) {
      setNewTeamName('');
    }
  };

  const handleLaunchClick = () => {
    if (!budgetCr || !minSquadSize) {
      showToast('Budget and Minimum Squad Size are required!', 'error');
      return;
    }
    if (selectedFranchiseIds.length === 0) {
      showToast('Select at least one franchise for the draft!', 'error');
      return;
    }
    setIsRulesModalOpen(true);
  };

  const handleConfirmLaunch = () => {
    setIsRulesModalOpen(false);
    createAuction({
      name: sessionTitle.trim() || 'IPL 2026 Mega Draft',
      budgetCr: Number(budgetCr) || 100,
      pitchType,
      minSquadSize: Number(minSquadSize) || 15,
      timerSeconds: Number(timerSeconds) || 60,
      franchiseIds: selectedFranchiseIds,
    });
  };

  const handleJoin = () => {
    if (joinRoom(roomCodeInput)) {
      setRoomCodeInput('');
    }
  };

  const handleClaim = (franchiseId: number) => {
    const res = claimFranchise(franchiseId);
    if (res.success) {
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  return (
    <div className="container" id="lobby-screen">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="ai-glow-badge">✨ IPL 2026 Season Simulation</span>
          <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75em', fontWeight: 700 }}>
            Powered by Gemini AI
          </span>
        </div>
        <h1 className="main-title">🏏 IPL Esports Simulator</h1>
        <p className="sub-title">Advanced EV Valuation • Live Gemini Tactical AI • Multi-Franchise War Room</p>
      </div>

      {/* Game Mode Selection */}
      <div
        className="card panel"
        style={{
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(22, 31, 51, 0.8), rgba(15, 23, 42, 0.9))',
          border: '1px solid rgba(59, 130, 246, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2em', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            👥 Draft Room & Mode Selection
          </h3>
          <span style={{ fontSize: '0.82em', color: 'var(--text-muted)' }}>
            Play Solo in Sandboxed Mode or collaborate live via 4-Letter Room Code
          </span>
        </div>

        {!roomCode ? (
          <div id="mode-selection-zone" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <button
              onClick={createRoom}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                padding: '14px 20px',
                borderRadius: '10px',
                fontSize: '1em',
                fontWeight: 700,
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
              }}
            >
              👑 Host New Multiplayer Room
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="4-LETTER CODE"
                maxLength={4}
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                style={{
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(10, 14, 23, 0.8)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '1.1em',
                  letterSpacing: '2px',
                }}
              />
              <button
                onClick={handleJoin}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  color: 'white',
                  padding: '0 24px',
                  borderRadius: '10px',
                  fontSize: '0.95em',
                  fontWeight: 700,
                }}
              >
                Join Room
              </button>
            </div>
          </div>
        ) : (
          <div
            id="active-room-zone"
            style={{
              textAlign: 'center',
              padding: '16px',
              background: 'rgba(15, 23, 42, 0.8)',
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '1.05em' }}>
                Connected to Shared Room:{' '}
                <strong style={{ fontSize: '30px', color: '#60a5fa', letterSpacing: '4px', marginLeft: '6px' }}>
                  {roomCode}
                </strong>
              </div>
              <span
                style={{
                  background: isHost ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                  color: isHost ? '#fbbf24' : '#60a5fa',
                  border: `1px solid ${isHost ? 'rgba(245, 158, 11, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.85em',
                  fontWeight: 700,
                }}
              >
                {isHost ? '👑 Commissioner (Host)' : '👤 Remote Franchise (Guest)'}
              </span>
              <button
                onClick={leaveRoom}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85em',
                }}
              >
                Disconnect & Solo Sandbox
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="lobby-grid">
        {/* If Guest in a Room: show Guest Waiting Screen */}
        {roomCode && !isHost ? (
          <div className="panel flex-panel" style={{ textAlign: 'center', padding: '36px' }}>
            <h2 style={{ color: '#60a5fa', marginBottom: '8px' }}>⏳ Lobby Waiting Room</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              Claim your franchise below. The draft engine will automatically launch when the commissioner starts!
            </p>

            <div
              style={{
                display: 'grid',
                gap: '10px',
                marginBottom: '24px',
                textAlign: 'left',
                maxHeight: '320px',
                overflowY: 'auto',
                paddingRight: '6px',
              }}
            >
              {franchises.length === 0 ? (
                <p style={{ color: 'gray', textAlign: 'center', fontStyle: 'italic' }}>
                  Waiting for Commissioner to register franchises...
                </p>
              ) : (
                franchises.map((f) => {
                  const isUserTeam = f.owner_token === userToken;
                  const isClaimedByOther = f.owner_token && !isUserTeam;

                  let buttonHtml = (
                    <button
                      onClick={() => handleClaim(f.id)}
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        color: 'white',
                        padding: '6px 16px',
                        borderRadius: '6px',
                        fontSize: '0.85em',
                      }}
                    >
                      🎯 Claim Franchise
                    </button>
                  );

                  let cardStyle = '1px solid var(--border-subtle)';
                  let bgStyle = 'rgba(15, 23, 42, 0.7)';

                  if (isUserTeam) {
                    buttonHtml = (
                      <button
                        disabled
                        style={{
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          padding: '6px 16px',
                          borderRadius: '6px',
                          opacity: 1,
                          fontSize: '0.85em',
                        }}
                      >
                        ✅ Your Franchise
                      </button>
                    );
                    cardStyle = '1.5px solid #10b981';
                    bgStyle = 'rgba(16, 185, 129, 0.08)';
                  } else if (isClaimedByOther) {
                    buttonHtml = (
                      <button
                        disabled
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-dim)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          padding: '6px 16px',
                          borderRadius: '6px',
                          fontSize: '0.85em',
                        }}
                      >
                        🔒 Claimed
                      </button>
                    );
                  }

                  return (
                    <div
                      key={f.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px',
                        background: bgStyle,
                        borderRadius: '10px',
                        border: cardStyle,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: f.primary_color || '#3b82f6',
                          }}
                        />
                        <strong style={{ fontSize: '1.05em', color: '#ffffff' }}>
                          {f.name} {f.short_name ? `(${f.short_name})` : ''}
                        </strong>
                      </div>
                      {buttonHtml}
                    </div>
                  );
                })
              )}
            </div>

            <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
            <p style={{ color: 'var(--accent-neon)', fontWeight: 700, margin: 0 }}>
              Awaiting Host Launch Sequence...
            </p>
          </div>
        ) : (
          /* Host or Solo Sandbox: Setup Form Container */
          <div className="panel flex-panel" style={{ overflowY: 'auto' }}>
            <h3 style={{ color: '#60a5fa', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚙️ 1. Auction Rules & Pitch Environment
            </h3>
            
            <div className="input-group">
              <input
                type="text"
                placeholder="Session Title (e.g. IPL 2026 Mega Auction)"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
              />
              <input
                type="number"
                placeholder="Purse (Crores) *Req"
                value={budgetCr}
                onChange={(e) => setBudgetCr(e.target.value ? Number(e.target.value) : '')}
              />
            </div>

            <div className="input-group">
              <select
                value={pitchType}
                onChange={(e) => setPitchType(e.target.value as PitchType)}
              >
                <option value="Standard">Standard Balanced Track</option>
                <option value="Green Top">🌱 Green Top Surface (+15% Pace Boost)</option>
                <option value="Dust Bowl">🌪️ Dust Bowl (+20% Spin Synergy)</option>
                <option value="Flat Track">🏏 Flat Track (+15% Batting Power)</option>
              </select>
              <input
                type="number"
                placeholder="Min Squad Size (e.g. 15)"
                value={minSquadSize}
                onChange={(e) => setMinSquadSize(e.target.value ? Number(e.target.value) : '')}
              />
              <input
                type="number"
                placeholder="Timer (Seconds, default 60)"
                value={timerSeconds}
                onChange={(e) => setTimerSeconds(Number(e.target.value) || 60)}
              />
            </div>

            {/* Pitch description banner */}
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.85em',
                color: '#93c5fd',
              }}
            >
              {pitchType === 'Green Top' && '🌱 Green Top: High grass cover triggers 15% valuation boosts for express pace bowlers and seam traits.'}
              {pitchType === 'Dust Bowl' && '🌪️ Dust Bowl: Dry crumbling surface provides +20% valuation multipliers for wrist spinners and finger spin all-rounders.'}
              {pitchType === 'Flat Track' && '🏏 Flat Track: Cement-hard belter rewards aggressive openers, death-overs power hitters, and strike-rate accelerators.'}
              {pitchType === 'Standard' && '⚖️ Standard Surface: Neutral conditions rewarding balanced 5-man bowling attacks and top-order anchoring.'}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
                marginTop: '10px',
              }}
            >
              <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '1.15em' }}>
                👥 2. Franchise Selection & Roster Management
              </h3>
              <button
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#000',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.85em',
                }}
                onClick={() => setIsHofModalOpen(true)}
              >
                🏆 Hall of Fame
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.82em', color: 'var(--text-muted)' }}>
                {selectedFranchiseIds.length} of {franchises.length} Franchises Selected
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{ background: 'transparent', color: '#60a5fa', fontSize: '0.78em', padding: '2px 6px' }}
                >
                  Select All
                </button>
                <span style={{ color: 'var(--text-dim)' }}>|</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '0.78em', padding: '2px 6px' }}
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="input-group">
              <input
                type="text"
                placeholder="Register Custom Franchise..."
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTeam()}
              />
              <button className="btn-add" onClick={handleAddTeam}>
                ➕ Add Team
              </button>
            </div>

            <div className="checkbox-list">
              {franchises.map((f) => {
                const isChecked = selectedFranchiseIds.includes(f.id);
                return (
                  <div
                    key={f.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      alignItems: 'center',
                      background: isChecked ? 'rgba(30, 41, 59, 0.7)' : 'rgba(15, 23, 42, 0.5)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${isChecked ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-subtle)'}`,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <label
                      style={{
                        flex: 1,
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        color: isChecked ? '#ffffff' : 'var(--text-muted)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleFranchise(f.id)}
                        style={{ marginRight: '10px', transform: 'scale(1.2)', accentColor: '#3b82f6' }}
                      />
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: f.primary_color || '#3b82f6',
                          marginRight: '8px',
                        }}
                      />
                      {f.name} {f.short_name ? <span style={{ color: 'var(--text-muted)', fontSize: '0.85em', marginLeft: '4px' }}>({f.short_name})</span> : ''}
                    </label>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {f.owner_token ? (
                        <span
                          style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#34d399',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75em',
                            fontWeight: 700,
                          }}
                        >
                          Claimed
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.75em', fontStyle: 'italic' }}>
                          Available
                        </span>
                      )}
                      <button
                        style={{
                          background: 'none',
                          color: '#f87171',
                          border: 'none',
                          padding: '2px 6px',
                          fontSize: '0.9em',
                        }}
                        onClick={() => deleteFranchise(f.id)}
                        title="Delete Franchise"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="btn-launch" onClick={handleLaunchClick}>
              🚀 Launch Live Auction Engine
            </button>
          </div>
        )}

        {/* Operations Ledger Panel */}
        <div className="panel flex-panel" id="operations-ledger-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.2em' }}>📜 Operations Ledger</h3>
            <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>{auctions.length} Saved Sessions</span>
          </div>
          
          <div className="scrollable-content">
            {auctions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2em', marginBottom: '10px' }}>🏏</div>
                <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>No Saved Drafts</div>
                <small>Launch a draft session to record history and tournament results.</small>
              </div>
            ) : (
              auctions.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(15, 23, 42, 0.65)',
                    padding: '12px 14px',
                    marginBottom: '10px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <strong
                      style={{
                        fontSize: '1.05em',
                        color: '#60a5fa',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                      onClick={() => setDetailsAuction({ id: a.id, name: a.name })}
                    >
                      {a.name}
                    </strong>
                    <br />
                    <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Pitch: {a.pitch_type || 'Standard'} •{' '}
                      <span
                        style={{
                          color: a.status === 'Completed' ? '#34d399' : a.status === 'In Progress' ? '#60a5fa' : '#f59e0b',
                          fontWeight: 700,
                        }}
                      >
                        {a.status}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {a.status !== 'Completed' && (
                      <button
                        style={{
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.85em',
                        }}
                        onClick={() => loadAuction(a.id)}
                      >
                        Resume
                      </button>
                    )}
                    <button
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '0.85em',
                      }}
                      onClick={() => deleteAuction(a.id)}
                      title="Delete Auction"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        onConfirm={handleConfirmLaunch}
      />

      <HallOfFameModal
        isOpen={isHofModalOpen}
        onClose={() => setIsHofModalOpen(false)}
        onViewHistory={(id, name) => {
          setIsHofModalOpen(false);
          setHistoryFranchise({ id, name });
        }}
      />

      <PastHistoryModal
        isOpen={Boolean(historyFranchise)}
        franchiseId={historyFranchise?.id || null}
        franchiseName={historyFranchise?.name || ''}
        onClose={() => {
          setHistoryFranchise(null);
          setIsHofModalOpen(true);
        }}
      />

      <SeasonDetailsModal
        isOpen={Boolean(detailsAuction)}
        auctionId={detailsAuction?.id || null}
        auctionName={detailsAuction?.name || ''}
        onClose={() => setDetailsAuction(null)}
      />
    </div>
  );
};
