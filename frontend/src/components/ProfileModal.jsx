import React, { useState } from 'react';
import { X, User, Heart, MessageSquare, PlusCircle, Edit3, ShieldAlert, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../services/api';

export const ProfileModal = ({ onClose, addToast, openAuthModal }) => {
  const { user, stats, isAdmin, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [profilePic, setProfilePic] = useState(user?.profilePic || '');
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await profileAPI.updateProfile(name, profilePic);
      addToast('Profile updated successfully!', 'success');
      setEditing(false);
      refreshProfile();
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">User Profile & Stats</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Header section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--color-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                fontWeight: 700
              }}
            >
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                {user.name || 'Book Reader'}
              </h3>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>{user.email}</p>
              {isAdmin && (
                <span className="admin-tag" style={{ display: 'inline-block', marginTop: '0.3rem' }}>
                  ADMINISTRATOR
                </span>
              )}
            </div>
            <button
              className="btn btn--ghost"
              onClick={() => setEditing(!editing)}
              style={{ marginLeft: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              <Edit3 size={15} />
              <span>{editing ? 'Cancel' : 'Edit'}</span>
            </button>
          </div>

          {editing ? (
            <form onSubmit={handleUpdate} style={{ marginBottom: '1.5rem', background: 'var(--color-bg-soft)', padding: '1rem', borderRadius: '12px' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Profile Picture URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={profilePic}
                  onChange={(e) => setProfilePic(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                <Check size={16} />
                <span>{saving ? 'Saving...' : 'Save Profile'}</span>
              </button>
            </form>
          ) : null}

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'var(--color-bg-soft)', padding: '1.25rem', borderRadius: '12px', textAlign: 'center' }}>
              <MessageSquare size={24} style={{ color: 'var(--color-primary)', marginBottom: '0.4rem' }} />
              <h4 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-ink)' }}>{stats.reviewsCount || 0}</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>Reviews Posted</p>
            </div>
            <div style={{ background: 'var(--color-bg-soft)', padding: '1.25rem', borderRadius: '12px', textAlign: 'center' }}>
              <PlusCircle size={24} style={{ color: 'var(--color-teal)', marginBottom: '0.4rem' }} />
              <h4 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-ink)' }}>{stats.contributionsCount || 0}</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>Books Contributed</p>
            </div>
          </div>

          {/* Liked Books */}
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '0.75rem' }}>
            Liked Books Collection ({user.likedBooks?.length || 0})
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', maxHeight: '150px', overflowY: 'auto' }}>
            {!user.likedBooks || user.likedBooks.length === 0 ? (
              <p style={{ fontSize: '0.88rem', color: 'var(--color-muted)' }}>You haven't liked any books yet.</p>
            ) : (
              user.likedBooks.map((b) => (
                <span
                  key={typeof b === 'object' ? b._id : b}
                  style={{
                    background: '#fff',
                    border: '1px solid var(--color-line)',
                    padding: '0.35rem 0.8rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    color: 'var(--color-ink)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Heart size={14} fill="var(--color-red)" stroke="none" />
                  <span>{typeof b === 'object' ? b.title : 'Liked Book'}</span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
