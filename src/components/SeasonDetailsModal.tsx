import React from 'react';
import { useAuction } from '../context/AuctionContext';
import { formatCurrency } from '../utils/aiMetrics';

interface SeasonDetailsModalProps {
  isOpen: boolean;
  auctionId: number | null;
  auctionName: string;
  onClose: () => void;
}

export const SeasonDetailsModal: React.FC<SeasonDetailsModalProps> = ({
  isOpen,
  auctionId,
  auctionName,
  onClose,
}) => {
  const { getSeasonDetails } = useAuction();

  if (!isOpen || auctionId === null) return null;

  const { standings, rosters } = getSeasonDetails(auctionId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ color: 'var(--primary)' }}>{auctionName} - Breakdown</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
          <div>
            <h3 style={{ color: 'var(--secondary)', borderBottom: '2px solid #eee', paddingBottom: '5px' }}>
              🏆 Final Standings
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {standings.length === 0 ? (
                <p style={{ color: 'gray', fontStyle: 'italic' }}>No completed standings yet.</p>
              ) : (
                standings.map((s, i) => (
                  <div
                    key={s.id}
                    style={{
                      background: '#f8f9fa',
                      padding: '10px',
                      borderRadius: '6px',
                      borderLeft: `4px solid ${i === 0 ? 'var(--accent)' : 'var(--primary)'}`,
                    }}
                  >
                    <strong>
                      #{i + 1} {s.franchise_name}
                    </strong>{' '}
                    {s.is_winner === 1 && '👑'}
                    <br />
                    <span style={{ fontSize: '0.85em', color: 'gray' }}>
                      Score: {s.tbi_score} | Spent: {formatCurrency(s.total_spent)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <h3 style={{ color: 'var(--info)', borderBottom: '2px solid #eee', paddingBottom: '5px' }}>
              📋 Full Rosters
            </h3>
            <div
              style={{
                maxHeight: '400px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                paddingRight: '10px',
              }}
            >
              {standings.length === 0 ? (
                <p style={{ color: 'gray', fontStyle: 'italic' }}>No player records available.</p>
              ) : (
                standings.map((s) => {
                  const teamPlayers = rosters.filter((p) => p.team_name === s.franchise_name);
                  return (
                    <div key={s.id} style={{ marginBottom: '10px' }}>
                      <h4 style={{ marginBottom: '5px', color: 'var(--primary)' }}>{s.franchise_name}</h4>
                      {teamPlayers.length === 0 ? (
                        <p style={{ color: 'gray', fontSize: '0.85em', margin: 0 }}>No players sold.</p>
                      ) : (
                        teamPlayers.map((p) => (
                          <div
                            key={p.auction_player_id}
                            style={{
                              fontSize: '0.85em',
                              display: 'flex',
                              justifyContent: 'space-between',
                              borderBottom: '1px solid #eee',
                              padding: '4px 0',
                            }}
                          >
                            <span>
                              {p.display_name} <small style={{ color: 'gray' }}>({p.role})</small>
                            </span>
                            <span>
                              <span
                                style={{
                                  background: 'var(--accent)',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  marginRight: '5px',
                                  fontSize: '0.8em',
                                  fontWeight: 'bold',
                                }}
                              >
                                {p.ai_rating}
                              </span>
                              <strong>{formatCurrency(p.sold_price)}</strong>
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        <button
          style={{
            background: 'var(--primary)',
            color: 'white',
            width: '100%',
            padding: '15px',
            marginTop: '20px',
            borderRadius: '8px',
          }}
          onClick={onClose}
        >
          Close Breakdown
        </button>
      </div>
    </div>
  );
};
