import React, { useState, useEffect } from 'react';
import { useAuction } from '../context/AuctionContext';
import { AuctionTeam, AuctionPlayer } from '../types';
import { formatCurrency } from '../utils/aiMetrics';

interface XIBuilderModalProps {
  isOpen: boolean;
  teams: AuctionTeam[];
  onComplete: (xiData: Record<number, number[]>) => void;
  onCancel: () => void;
}

export const XIBuilderModal: React.FC<XIBuilderModalProps> = ({
  isOpen,
  teams,
  onComplete,
  onCancel,
}) => {
  const { getTeamRoster, showToast } = useAuction();
  const [currentTeamIndex, setCurrentTeamIndex] = useState<number>(0);
  const [selections, setSelections] = useState<Record<number, number[]>>({});
  const [currentRoster, setCurrentRoster] = useState<AuctionPlayer[]>([]);

  const currentTeam = teams[currentTeamIndex];

  useEffect(() => {
    if (isOpen && currentTeam) {
      const roster = getTeamRoster(currentTeam.id);
      setCurrentRoster(roster);
      // Auto-preselect up to 11 if not yet chosen
      if (!selections[currentTeam.id]) {
        let osCount = 0;
        const initialSelected: number[] = [];
        for (const p of roster) {
          if (initialSelected.length >= 11) break;
          const isOverseas = p.country.toLowerCase() !== 'india';
          if (isOverseas) {
            if (osCount < 4) {
              osCount++;
              initialSelected.push(p.id);
            }
          } else {
            initialSelected.push(p.id);
          }
        }
        setSelections((prev) => ({ ...prev, [currentTeam.id]: initialSelected }));
      }
    }
  }, [isOpen, currentTeamIndex, currentTeam, getTeamRoster, selections]);

  if (!isOpen || !currentTeam) return null;

  const currentSelected = selections[currentTeam.id] || [];
  const overseasCount = currentRoster.filter(
    (p) => currentSelected.includes(p.id) && p.country.toLowerCase() !== 'india'
  ).length;

  const handleToggle = (playerId: number, isOverseas: boolean) => {
    const isCurrentlySelected = currentSelected.includes(playerId);

    if (isCurrentlySelected) {
      setSelections((prev) => ({
        ...prev,
        [currentTeam.id]: currentSelected.filter((id) => id !== playerId),
      }));
    } else {
      if (currentSelected.length >= 11) {
        showToast('Max 11 Players allowed!', 'error');
        return;
      }
      if (isOverseas && overseasCount >= 4) {
        showToast('Max 4 Overseas allowed!', 'error');
        return;
      }
      setSelections((prev) => ({
        ...prev,
        [currentTeam.id]: [...currentSelected, playerId],
      }));
    }
  };

  const handleNext = () => {
    if (currentSelected.length !== 11 && currentRoster.length >= 11) {
      showToast('Select exactly 11 players for your Playing XI!', 'warning');
      return;
    }

    if (currentTeamIndex < teams.length - 1) {
      setCurrentTeamIndex((prev) => prev + 1);
    } else {
      onComplete(selections);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>
            📋 Build Playing XI:{' '}
            <span style={{ color: 'var(--accent)' }}>{currentTeam.name}</span>
          </h2>
          <span style={{ fontSize: '0.9em', color: 'gray', fontWeight: 'bold' }}>
            Team {currentTeamIndex + 1} of {teams.length}
          </span>
        </div>

        <div
          style={{
            background: '#e1f5fe',
            padding: '12px',
            textAlign: 'center',
            borderRadius: '6px',
            margin: '15px 0',
            fontWeight: 'bold',
            color: '#0277bd',
          }}
        >
          Selected: <span>{currentSelected.length}</span>/11 | Overseas:{' '}
          <span>{overseasCount}</span>/4
        </div>

        <div
          style={{
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid #eee',
            borderRadius: '8px',
            paddingRight: '5px',
          }}
        >
          {currentRoster.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'gray', padding: '30px' }}>
              No players were bought by this franchise.
            </p>
          ) : (
            currentRoster.map((p) => {
              const isOS = p.country.toLowerCase() !== 'india';
              const isChecked = currentSelected.includes(p.id);

              return (
                <div
                  key={p.auction_player_id}
                  className="xi-player-row"
                  onClick={() => handleToggle(p.id, isOS)}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="xi-checkbox"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <strong>{p.display_name}</strong>
                    <span style={{ color: 'gray', fontSize: '0.85em', marginLeft: '10px' }}>
                      {p.role}
                    </span>
                    {isOS && <span className="overseas-tag">Overseas</span>}
                  </div>
                  <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                    {formatCurrency(p.sold_price)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            style={{
              background: '#636e72',
              color: 'white',
              padding: '15px 25px',
              borderRadius: '8px',
              fontSize: '1em',
            }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            style={{
              background: 'var(--success)',
              color: 'white',
              flex: 1,
              padding: '15px',
              borderRadius: '8px',
              fontSize: '1.1em',
            }}
            onClick={handleNext}
          >
            {currentTeamIndex < teams.length - 1
              ? 'Confirm Squad & Next Team →'
              : 'Finalize Tournament & View Analytics 🏆'}
          </button>
        </div>
      </div>
    </div>
  );
};
