import React, { useState } from 'react';
import { X, Lock, Mail, User, ShieldAlert, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal = ({ initialMode = 'login', onClose, addToast }) => {
  const { login, signup, backdoorAdmin } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [secretKey, setSecretKey] = useState('super_secret_backdoor_key_2026');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        addToast('Welcome back! Logged in successfully.', 'success');
      } else if (mode === 'signup') {
        await signup(email, password, name);
        addToast('Account created successfully!', 'success');
      } else if (mode === 'admin') {
        await backdoorAdmin(email, password, name, secretKey);
        addToast('Admin account created successfully!', 'success');
      }
      onClose();
    } catch (err) {
      addToast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {mode === 'login' && 'Log In to BookNest'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'admin' && 'Backdoor Admin Access'}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="tab-group">
            <button
              className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
            >
              Log In
            </button>
            <button
              className={`tab-btn ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => setMode('signup')}
            >
              Sign Up
            </button>
            <button
              className={`tab-btn ${mode === 'admin' ? 'active' : ''}`}
              onClick={() => setMode('admin')}
            >
              Admin Backdoor
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {(mode === 'signup' || mode === 'admin') && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="reader@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {mode === 'admin' && (
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--color-red)' }}>
                  Admin Backdoor Key
                </label>
                <input
                  type="password"
                  className="form-input"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  required
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn--primary"
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={loading}
            >
              {loading ? 'Processing...' : mode === 'login' ? 'Log In' : mode === 'signup' ? 'Sign Up' : 'Create Admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
