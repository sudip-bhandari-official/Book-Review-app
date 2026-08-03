import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ toasts, removeToast }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.type === 'error' ? 'toast--error' : 'toast--success'}`}
        >
          {toast.type === 'error' ? (
            <AlertCircle size={20} className="text-red" />
          ) : (
            <CheckCircle size={20} className="text-teal" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: 'auto' }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
