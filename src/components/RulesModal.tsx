import React from 'react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '500px', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>⚖️ E-Sports Draft Rules</h2>
        <ul style={{ textAlign: 'left', fontSize: '1.1em', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          <li>
            <strong>Timer Rule:</strong> Bids must be placed before the timer reaches 0. When the timer hits 0, the current value is locked.
          </li>
          <li>
            <strong>Hidden Valuation:</strong> AI evaluation insights remain hidden during active bidding to preserve raw tension.
          </li>
          <li>
            <strong>Sudden Death:</strong> If a team hits the squad limit, trailing franchises enter a forced 2x draft matrix.
          </li>
        </ul>
        <button
          style={{
            background: 'var(--success)',
            color: 'white',
            width: '100%',
            padding: '15px',
            borderRadius: '8px',
            fontSize: '1.1em',
            marginTop: '20px',
          }}
          onClick={onConfirm}
        >
          I Agree. Initialize Engine.
        </button>
      </div>
    </div>
  );
};
