import React from 'react';
import { useAuction } from '../context/AuctionContext';
import { formatCurrency } from '../utils/aiMetrics';

interface PastHistoryModalProps {
  isOpen: boolean;
  franchiseId: number | null;
  franchiseName: string;
  onClose: () => void;
}

export const PastHistoryModal: React.FC<PastHistoryModalProps> = ({
  isOpen,
  franchiseId,
  franchiseName,
  onClose,
}) => {
  const { getPastSquads } = useAuction();

  if (!isOpen || franchiseId === null) return null;

  const seasons = getPastSquads(franchiseId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ color: 'var(--primary)' }}>{franchiseName} - Historical Seasons</h2>
        <div style={{ marginTop: '15px', display: 'grid', gap: '15px' }}>
          {seasons.length === 0 ? (
            <p style={{ color: 'gray', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
              No completed squads recorded yet.
            </p>
          ) : (
            seasons.map((s) => (
              <div
                key={s.id}
                style={{
                  background: '#f8f9fa',
                  border: '1px solid #dfe6e9',
                  borderRadius: '8px',
                  padding: '15px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '2px solid #eee',
                    paddingBottom: '10px',
                    marginBottom: '10px',
                  }}
                >
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>
                    {s.auction_name}{' '}
                    {s.is_winner === 1 && (
                      <span style={{ color: 'var(--accent)', fontSize: '0.8em', marginLeft: '10px' }}>
                        🏆 CHAMPION
                      </span>
                    )}
                  </h3>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--info)' }}>
                      AI Score: {s.tbi_score}
                    </span>
                    <br />
                    <span style={{ fontSize: '0.85em', color: 'gray' }}>
                      Spent: {formatCurrency(s.total_spent)}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {!s.roster || s.roster.length === 0 ? (
                    <p style={{ color: 'gray', fontStyle: 'italic', margin: 0 }}>No players recorded.</p>
                  ) : (
                    s.roster.map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.9em',
                        }}
                      >
                        <div>
                          <strong>{p.display_name}</strong>{' '}
                          <span style={{ color: 'gray' }}>({p.role})</span>
                        </div>
                        <div>
                          <span
                            style={{
                              background: 'var(--accent)',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              fontWeight: 'bold',
                              marginRight: '8px',
                              fontSize: '0.85em',
                            }}
                          >
                            AI: {p.ai_rating}
                          </span>
                          <strong>{formatCurrency(p.sold_price)}</strong>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
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
          Back to Hall of Fame
        </button>
      </div>
    </div>
  );
};
