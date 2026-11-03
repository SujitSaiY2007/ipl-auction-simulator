import React from 'react';
import { AuctionPlayer } from '../types';
import { formatCurrency } from '../utils/aiMetrics';

interface LiveRosterModalProps {
  isOpen: boolean;
  teamName: string;
  roster: AuctionPlayer[];
  onClose: () => void;
}

export const LiveRosterModal: React.FC<LiveRosterModalProps> = ({
  isOpen,
  teamName,
  roster,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ color: 'var(--primary)' }}>{teamName} Current Roster</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '15px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc' }}>
              <th style={{ padding: '10px' }}>Player</th>
              <th>Role</th>
              <th>Price</th>
              <th>AI Score</th>
            </tr>
          </thead>
          <tbody>
            {roster.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '15px', color: 'gray' }}>
                  Empty Roster
                </td>
              </tr>
            ) : (
              roster.map((p) => (
                <tr key={p.auction_player_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{p.display_name}</td>
                  <td style={{ padding: '10px', color: 'gray', fontSize: '0.9em' }}>{p.role}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: 'var(--success)' }}>
                    {formatCurrency(p.sold_price)}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span
                      style={{
                        background: 'var(--accent)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                      }}
                    >
                      {p.ai_rating}
                    </span>
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
          Close
        </button>
      </div>
    </div>
  );
};
