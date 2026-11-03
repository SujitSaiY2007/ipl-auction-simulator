import React, { useState, useMemo } from 'react';
import { AuctionPlayer } from '../types';
import { formatCurrency } from '../utils/aiMetrics';

interface StatsModalProps {
  player: AuctionPlayer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ player, isOpen, onClose }) => {
  const [statsTab, setStatsTab] = useState<'IPL' | 'T20I' | 'Overall'>('IPL');

  const currentStats = useMemo(() => {
    if (!player) return null;

    if (statsTab === 'T20I' && player.t20i_stats) {
      return {
        scope: 'T20 International (T20I) Career',
        matches: player.t20i_stats.matches,
        runs: player.t20i_stats.batting_runs,
        avg: player.t20i_stats.batting_avg,
        sr: player.t20i_stats.batting_strike_rate,
        fifties: player.t20i_stats.fifties || 0,
        hundreds: player.t20i_stats.hundreds || 0,
        hs: player.t20i_stats.highest_score || '-',
        wickets: player.t20i_stats.bowling_wickets,
        econ: player.t20i_stats.bowling_economy,
        bowlAvg: player.t20i_stats.bowling_avg,
        best: player.t20i_stats.best_bowling || '-',
      };
    }

    if (statsTab === 'Overall' && player.overall_t20_stats) {
      return {
        scope: 'Overall Global T20 Career (IPL, CPL, BBL, PSL & T20Is)',
        matches: player.overall_t20_stats.matches,
        runs: player.overall_t20_stats.batting_runs,
        avg: player.overall_t20_stats.batting_avg,
        sr: player.overall_t20_stats.batting_strike_rate,
        fifties: player.overall_t20_stats.fifties || 0,
        hundreds: player.overall_t20_stats.hundreds || 0,
        hs: player.overall_t20_stats.highest_score || '-',
        wickets: player.overall_t20_stats.bowling_wickets,
        econ: player.overall_t20_stats.bowling_economy,
        bowlAvg: player.overall_t20_stats.bowling_avg,
        best: player.overall_t20_stats.best_bowling || '-',
      };
    }

    return {
      scope: 'Indian Premier League (IPL) Career',
      matches: player.matches || 0,
      runs: player.batting_runs,
      avg: player.batting_avg,
      sr: player.batting_strike_rate,
      fifties: player.fifties || 0,
      hundreds: player.hundreds || 0,
      hs: player.highest_score || '-',
      wickets: player.bowling_wickets,
      econ: player.bowling_economy,
      bowlAvg: player.bowling_avg,
      best: player.best_bowling || '-',
    };
  }, [player, statsTab]);

  if (!isOpen || !player || !currentStats) return null;

  const isOS = player.country.toLowerCase() !== 'india';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '680px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Player Header Banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.75em', color: '#ffffff' }}>{player.display_name}</h2>
              {isOS && <span className="overseas-tag">Overseas ({player.country})</span>}
              {player.tier && (
                <span className={`tier-tag tier-${player.tier.toLowerCase()}`}>
                  {player.tier}
                </span>
              )}
              {player.ipl_team_2026 && (
                <span
                  style={{
                    background: 'rgba(59, 130, 246, 0.25)',
                    color: '#93c5fd',
                    border: '1px solid rgba(59, 130, 246, 0.45)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75em',
                    fontWeight: 700,
                  }}
                >
                  2026 Team: {player.ipl_team_2026}
                </span>
              )}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.88em', marginTop: '4px' }}>
              {player.role} • Age {player.age || 'N/A'} • {player.batting_style || 'Right-hand bat'}
              {player.bowling_style ? ` • ${player.bowling_style}` : ''}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#000',
                padding: '4px 12px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '1.05em',
                display: 'inline-block',
                boxShadow: '0 2px 10px rgba(245, 158, 11, 0.3)',
              }}
            >
              AI Rating: {player.ai_rating}/100
            </span>
            <div style={{ fontSize: '0.82em', color: '#38bdf8', marginTop: '4px', fontWeight: 700 }}>
              AI Val: {formatCurrency(player.true_value)}
            </div>
          </div>
        </div>

        {/* Specialization Pill */}
        {player.specialization && (
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              color: '#93c5fd',
              fontSize: '0.9em',
              fontWeight: 600,
            }}
          >
            🎯 Specialization: {player.specialization}
          </div>
        )}

        {/* Interactive Stats Scope Tabs (IPL vs T20I vs Overall T20) */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <button
            onClick={() => setStatsTab('IPL')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: statsTab === 'IPL' ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
              background: statsTab === 'IPL' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'rgba(255, 255, 255, 0.05)',
              color: statsTab === 'IPL' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.85em',
              transition: 'all 0.15s ease',
            }}
          >
            🏏 IPL Career
          </button>
          <button
            onClick={() => setStatsTab('T20I')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: statsTab === 'T20I' ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
              background: statsTab === 'T20I' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'rgba(255, 255, 255, 0.05)',
              color: statsTab === 'T20I' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.85em',
              transition: 'all 0.15s ease',
            }}
          >
            🌍 T20 International
          </button>
          <button
            onClick={() => setStatsTab('Overall')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: statsTab === 'Overall' ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
              background: statsTab === 'Overall' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'rgba(255, 255, 255, 0.05)',
              color: statsTab === 'Overall' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.85em',
              transition: 'all 0.15s ease',
            }}
          >
            ⚡ Overall T20
          </button>
        </div>

        {/* Tab Context Banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.78em', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Telemetry Scope: {currentStats.scope}
          </span>
          <span style={{ fontSize: '0.8em', color: '#f8fafc', fontWeight: 700, background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '4px' }}>
            {currentStats.matches} Matches Played
          </span>
        </div>

        {/* Batting Metrics Grid */}
        <div style={{ marginBottom: '14px' }}>
          <h4 style={{ color: '#38bdf8', marginBottom: '6px', fontSize: '0.88em', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🏏 Batting Telemetry
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '8px',
              background: 'rgba(15, 23, 42, 0.7)',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72em' }}>RUNS</div>
              <div style={{ fontWeight: 800, fontSize: '1.05em', color: '#fff' }}>{currentStats.runs}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72em' }}>AVERAGE</div>
              <div style={{ fontWeight: 800, fontSize: '1.05em', color: '#fff' }}>{currentStats.avg}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72em' }}>STRIKE RATE</div>
              <div style={{ fontWeight: 800, fontSize: '1.05em', color: '#10b981' }}>{currentStats.sr}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72em' }}>50s / 100s</div>
              <div style={{ fontWeight: 800, fontSize: '1.05em', color: '#fff' }}>
                {currentStats.fifties} / {currentStats.hundreds}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72em' }}>HIGH SCORE</div>
              <div style={{ fontWeight: 800, fontSize: '1.05em', color: '#fbbf24' }}>{currentStats.hs}</div>
            </div>
          </div>
        </div>

        {/* Bowling Metrics Grid */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ color: '#c084fc', marginBottom: '6px', fontSize: '0.88em', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ⚡ Bowling Telemetry
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              background: 'rgba(15, 23, 42, 0.7)',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72em' }}>WICKETS</div>
              <div style={{ fontWeight: 800, fontSize: '1.05em', color: '#fff' }}>{currentStats.wickets}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72em' }}>ECONOMY</div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '1.05em',
                  color: currentStats.econ > 0 && currentStats.econ <= 7.8 ? '#10b981' : '#fff',
                }}
              >
                {currentStats.econ || '0.00'}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72em' }}>BOWLING AVG</div>
              <div style={{ fontWeight: 800, fontSize: '1.05em', color: '#fff' }}>
                {currentStats.bowlAvg || '0.0'}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72em' }}>BEST SPELL</div>
              <div style={{ fontWeight: 800, fontSize: '1.05em', color: '#38bdf8' }}>
                {currentStats.best || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Scouting Trait & Tactical Report */}
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '18px',
          }}
        >
          <div style={{ color: '#f59e0b', fontSize: '0.78em', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
            ⚡ Scouting Trait & Tactical Report
          </div>
          <div style={{ color: '#f8fafc', fontSize: '0.92em', lineHeight: 1.5 }}>
            "{player.career_highlight}"
          </div>
        </div>

        {/* Action Button */}
        <button
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            color: 'white',
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            fontSize: '1em',
            fontWeight: 700,
          }}
          onClick={onClose}
        >
          Close Telemetry
        </button>
      </div>
    </div>
  );
};
