import React from 'react';
import { useAuction } from '../context/AuctionContext';

export const ToastContainer: React.FC = () => {
  const { toasts } = useAuction();

  if (toasts.length === 0) return null;

  return (
    <div id="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.msg}
        </div>
      ))}
    </div>
  );
};
