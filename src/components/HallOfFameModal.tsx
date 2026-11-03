import React from 'react';
import { useAuction } from '../context/AuctionContext';

interface HallOfFameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewHistory: (franchiseId: number, franchiseName: string) => void;
}

export const HallOfFameModal: React.FC<HallOfFameModalProps> = ({
  isOpen,
  onClose,
  onViewHistory,
}) => {
  const { getHallOfFame } = useAuction();

  if (!isOpen) return null;

  const hof = getHallOfFame();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ textAlign: 'center', color: 'var(--primary)' }}>🏆 Hall of Fame</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '15px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc' }}>
              <th style={{ padding: '10px' }}>Rank</th>
              <th>Franchise</th>
              <th>Played</th>
              <th>Avg Score</th>
              <th>Trophies</th>
              <th>History</th>
            </tr>
          </thead>
          <tbody>
            {hof.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '15px' }}>
                  No data.
                </td>
              </tr>
            ) : (
              hof.map((h, i) => (
                <tr key={h.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px', fontWeight: 'bold', color: 'gray' }}>#{i + 1}</td>
                  <td style={{ padding: '15px', fontWeight: 'bold', color: 'var(--primary)' }}>{h.name}</td>
                  <td style={{ padding: '15px' }}>{h.matches_played}</td>
                  <td style={{ padding: '15px', fontWeight: 'bold', color: 'var(--info)' }}>
                    {h.avg_tbi.toFixed(1)}
                  </td>
                  <td style={{ padding: '15px' }}>{'🏆'.repeat(h.trophies) || '-'}</td>
                  <td style={{ padding: '15px' }}>
                    <button
                      style={{
                        background: '#eee',
                        color: '#333',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        fontSize: '0.85em',
                      }}
                      onClick={() => onViewHistory(h.id, h.name)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
          Close Ledger
        </button>
      </div>
    </div>
  );
};
