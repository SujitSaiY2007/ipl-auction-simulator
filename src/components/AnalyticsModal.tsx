import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { ReportCard, PitchType } from '../types';
import { formatCurrency } from '../utils/aiMetrics';

interface AnalyticsModalProps {
  isOpen: boolean;
  rankings: ReportCard[];
  pitchType: PitchType;
  onClose: () => void;
}

interface ForecastResult {
  headline: string;
  orangeCapPrediction: string;
  purpleCapPrediction: string;
  darkHorseTeam: string;
  tournamentNarrative: string;
  isAiPowered: boolean;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  rankings,
  pitchType,
  onClose,
}) => {
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loadingForecast, setLoadingForecast] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && rankings.length > 0) {
      try {
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.6 },
        });
      } catch {
        // Safe fallback
      }
    } else {
      setForecast(null);
    }
  }, [isOpen, rankings]);

  const handleGenerateForecast = async () => {
    setLoadingForecast(true);
    try {
      const res = await fetch('/api/ai/season-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rankings, pitchType }),
      });
      const data = await res.json();
      setForecast(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingForecast(false);
    }
  };

  if (!isOpen) return null;

  const champion = rankings[0];

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '880px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <span className="ai-glow-badge" style={{ marginBottom: '8px' }}>
            🏆 Tournament Completed
          </span>
          <h2 style={{ color: '#ffffff', fontSize: '2.4em', marginBottom: '4px' }}>
            📊 Final Tactical Standings & Crowned Champion
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95em' }}>
            Tactical Balance Index (TBI) composite score across Playing XI chemistry, batting depth, and bowling balance on {pitchType} surface.
          </p>
        </div>

        {/* Champion Showcase Banner */}
        {champion && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(139, 92, 246, 0.2))',
              border: '2px solid rgba(245, 158, 11, 0.5)',
              borderRadius: '14px',
              padding: '20px',
              textAlign: 'center',
              marginBottom: '20px',
              boxShadow: '0 0 25px rgba(245, 158, 11, 0.2)',
            }}
          >
            <div style={{ fontSize: '2.8em', marginBottom: '4px' }}>👑</div>
            <div style={{ fontSize: '0.9em', color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              IPL 2026 Simulation Champions
            </div>
            <h2 style={{ fontSize: '2.2em', color: '#ffffff', margin: '4px 0 6px 0' }}>
              {champion.team_name}
            </h2>
            <div style={{ color: '#e2e8f0', fontSize: '1.05em', fontWeight: 600 }}>
              Tournament Balance Index: <span style={{ color: '#38bdf8', fontWeight: 800 }}>{champion.tbi_score}</span> / 100 • Total Spent: {formatCurrency(champion.spent)}
            </div>
          </div>
        )}

        {/* Gemini Season Simulation Trigger Button */}
        <div style={{ marginBottom: '22px', textAlign: 'center' }}>
          {!forecast ? (
            <button
              onClick={handleGenerateForecast}
              disabled={loadingForecast}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                padding: '14px 28px',
                borderRadius: '12px',
                fontSize: '1em',
                fontWeight: 700,
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
              }}
            >
              {loadingForecast ? (
                <>
                  <div className="spinner" style={{ width: '20px', height: '20px' }} />
                  Simulating Full Season with Gemini AI...
                </>
              ) : (
                '✨ Generate Gemini AI Season Simulation & Awards Forecast'
              )}
            </button>
          ) : (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                borderRadius: '14px',
                padding: '20px',
                textAlign: 'left',
                boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span className="ai-glow-badge">✨ Gemini AI Season Simulation Report</span>
                <span style={{ color: '#34d399', fontSize: '0.8em', fontWeight: 700 }}>● Live Simulation Generated</span>
              </div>
              <h3 style={{ color: '#ffffff', fontSize: '1.4em', marginBottom: '10px' }}>
                {forecast.headline}
              </h3>
              <p style={{ color: '#e2e8f0', fontSize: '0.95em', lineHeight: 1.6, marginBottom: '16px' }}>
                {forecast.tournamentNarrative}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ color: '#f59e0b', fontSize: '0.8em', fontWeight: 800, textTransform: 'uppercase' }}>
                    🧡 Orange Cap Forecast
                  </div>
                  <div style={{ color: '#fff', fontSize: '0.9em', marginTop: '4px' }}>
                    {forecast.orangeCapPrediction}
                  </div>
                </div>

                <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ color: '#c084fc', fontSize: '0.8em', fontWeight: 800, textTransform: 'uppercase' }}>
                    💜 Purple Cap Forecast
                  </div>
                  <div style={{ color: '#fff', fontSize: '0.9em', marginTop: '4px' }}>
                    {forecast.purpleCapPrediction}
                  </div>
                </div>

                <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ color: '#38bdf8', fontSize: '0.8em', fontWeight: 800, textTransform: 'uppercase' }}>
                    🐎 Dark Horse Team
                  </div>
                  <div style={{ color: '#fff', fontSize: '0.9em', marginTop: '4px' }}>
                    {forecast.darkHorseTeam}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Standings Card */}
        <div id="scorecardContainer" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {rankings.map((r, i) => {
            const stars =
              '⭐'.repeat(Math.floor(r.stars)) + (r.stars % 1 !== 0 ? '✨' : '');

            return (
              <div
                key={r.franchise_id}
                style={{
                  borderLeft: `5px solid ${i === 0 ? 'var(--accent-gold)' : i < 4 ? 'var(--primary)' : 'var(--border-subtle)'}`,
                  background: i === 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(22, 31, 51, 0.75)',
                  padding: '16px 20px',
                  borderRadius: '10px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, color: i === 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                        #{i + 1}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '1.25em', color: '#ffffff' }}>
                        {r.team_name} {i === 0 && '👑'} {i < 4 && <span style={{ fontSize: '0.65em', color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>PLAYOFFS</span>}
                      </h3>
                    </div>

                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85em', fontWeight: 600, marginTop: '4px' }}>
                      Total Cap Deployed: {formatCurrency(r.spent)}
                    </div>

                    {r.highlights.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        {r.highlights.map((h, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.8em',
                              marginRight: '6px',
                              display: 'inline-block',
                              marginBottom: '4px',
                              fontWeight: 600,
                            }}
                          >
                            + {h}
                          </span>
                        ))}
                      </div>
                    )}

                    {r.drawbacks.length > 0 && (
                      <div style={{ marginTop: '4px' }}>
                        {r.drawbacks.map((d, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.8em',
                              marginRight: '6px',
                              display: 'inline-block',
                              marginBottom: '4px',
                              fontWeight: 600,
                            }}
                          >
                            - {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                    <div style={{ fontSize: '1.6em', fontWeight: 900, color: '#38bdf8' }}>
                      {r.tbi_score}{' '}
                      <span style={{ fontSize: '0.5em', color: 'var(--text-muted)' }}>/ 100</span>
                    </div>
                    <div style={{ fontSize: '1.1em', marginTop: '2px' }}>{stars}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          style={{
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: 'white',
            width: '100%',
            padding: '16px',
            marginTop: '25px',
            borderRadius: '12px',
            fontSize: '1.1em',
            fontWeight: 800,
          }}
          onClick={onClose}
        >
          Exit Draft to Main Menu
        </button>
      </div>
    </div>
  );
};
