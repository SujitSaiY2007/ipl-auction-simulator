import React, { useState, useEffect } from 'react';
import { AuctionTeam, AuctionPlayer, AiSquadAuditResponse, PitchType } from '../types';
import { formatCurrency } from '../utils/aiMetrics';

interface SquadAuditModalProps {
  isOpen: boolean;
  team: AuctionTeam | null;
  roster: AuctionPlayer[];
  pitchType: PitchType;
  onClose: () => void;
}

export const SquadAuditModal: React.FC<SquadAuditModalProps> = ({
  isOpen,
  team,
  roster,
  pitchType,
  onClose,
}) => {
  const [audit, setAudit] = useState<AiSquadAuditResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && team) {
      setLoading(true);
      fetch('/api/ai/squad-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName: team.name,
          roster,
          pitchType,
          spent: team.spent,
          purse: team.purse,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setAudit(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setAudit(null);
    }
  }, [isOpen, team, roster, pitchType]);

  if (!isOpen || !team) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '600px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: team.primary_color || '#3b82f6',
                }}
              />
              <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '1.5em' }}>
                {team.name} Squad Audit
              </h2>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85em', marginTop: '4px' }}>
              Squad Size: {roster.length} Players • Spent: {formatCurrency(team.spent)} • Purse Left: {formatCurrency(team.purse)}
            </div>
          </div>
          <span className="ai-glow-badge">
            {audit?.isAiPowered ? '✨ Gemini AI Analyst' : '⚡ Tactical Squad Analyst'}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div className="spinner" style={{ margin: '0 auto 15px auto' }} />
            <p style={{ color: 'var(--accent-neon)', fontWeight: 600 }}>
              Analyzing squad synergies and pitch dynamics...
            </p>
          </div>
        ) : audit ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Overall Rating Banner */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))',
                padding: '16px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8em', textTransform: 'uppercase', fontWeight: 700 }}>
                  Tactical Composition Rating
                </div>
                <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.95em', marginTop: '2px' }}>
                  Tournament Readiness Score
                </div>
              </div>
              <div style={{ fontSize: '2em', fontWeight: 900, color: '#38bdf8' }}>
                {audit.overallRating}{' '}
                <span style={{ fontSize: '0.5em', color: 'var(--text-muted)' }}>/ 100</span>
              </div>
            </div>

            {/* Key Strength */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '14px',
                borderRadius: '10px',
              }}
            >
              <div style={{ color: '#10b981', fontWeight: 800, fontSize: '0.85em', textTransform: 'uppercase', marginBottom: '4px' }}>
                🛡️ Primary Strength
              </div>
              <div style={{ color: '#f8fafc', fontSize: '0.95em', lineHeight: 1.5 }}>
                {audit.keyStrength}
              </div>
            </div>

            {/* Critical Weakness */}
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                padding: '14px',
                borderRadius: '10px',
              }}
            >
              <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.85em', textTransform: 'uppercase', marginBottom: '4px' }}>
                ⚠️ Tactical Vulnerability
              </div>
              <div style={{ color: '#f8fafc', fontSize: '0.95em', lineHeight: 1.5 }}>
                {audit.criticalWeakness}
              </div>
            </div>

            {/* Impact Player Suggestion */}
            <div
              style={{
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                padding: '14px',
                borderRadius: '10px',
              }}
            >
              <div style={{ color: '#c084fc', fontWeight: 800, fontSize: '0.85em', textTransform: 'uppercase', marginBottom: '4px' }}>
                ⚡ Impact Player Deployment Strategy
              </div>
              <div style={{ color: '#f8fafc', fontSize: '0.95em', lineHeight: 1.5 }}>
                {audit.impactPlayerRecommendation}
              </div>
            </div>

            {/* Championship Verdict */}
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                padding: '14px',
                borderRadius: '10px',
              }}
            >
              <div style={{ color: '#f59e0b', fontWeight: 800, fontSize: '0.85em', textTransform: 'uppercase', marginBottom: '4px' }}>
                🏆 Playoff & Title Outlook
              </div>
              <div style={{ color: '#f8fafc', fontSize: '0.95em', lineHeight: 1.5 }}>
                {audit.championshipVerdict}
              </div>
            </div>
          </div>
        ) : (
          <p style={{ color: 'gray', textAlign: 'center' }}>Audit data unavailable.</p>
        )}

        <button
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            color: 'white',
            width: '100%',
            padding: '12px',
            marginTop: '20px',
            borderRadius: '10px',
          }}
          onClick={onClose}
        >
          Close Audit
        </button>
      </div>
    </div>
  );
};
