import React, { useState } from 'react';
import { BookOpen, Search, User, LogOut, PlusCircle, ShieldCheck, Sparkles, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({
  openAuthModal,
  openProfileModal,
  openContributeModal,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  activeTab,
  setActiveTab
}) => {
  const { user, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearchSubmit) onSearchSubmit(searchQuery);
  };

  return (
    <header className="site-header">
      <nav className="navbar" aria-label="Main navigation">
        <div className="navbar__logo" onClick={() => setActiveTab('explore')} style={{ cursor: 'pointer' }}>
          <BookOpen className="text-primary" size={28} style={{ color: 'var(--color-primary)' }} />
          <span>Book<span className="navbar__logo-accent">Nest</span></span>
        </div>

        <div className="navbar__menu">
          <ul className="navbar__links">
            <li>
              <span
                className={`navbar__link ${activeTab === 'explore' ? 'active' : ''}`}
                onClick={() => setActiveTab('explore')}
              >
                Explore Books
              </span>
            </li>
            <li>
              <span
                className={`navbar__link ${activeTab === 'recommended' ? 'active' : ''}`}
                onClick={() => setActiveTab('recommended')}
              >
                Recommended
              </span>
            </li>
            <li>
              <span
                className={`navbar__link ${activeTab === 'categories' ? 'active' : ''}`}
                onClick={() => setActiveTab('categories')}
              >
                Categories
              </span>
            </li>
          </ul>

          <button
            className="btn btn--outline"
            style={{ padding: '0.5rem 1.1rem', fontSize: '0.88rem' }}
            onClick={openContributeModal}
          >
            <PlusCircle size={18} />
            <span>Contribute Book</span>
          </button>

          {user ? (
            <div className="user-badge" onClick={openProfileModal} title="View Profile & Stats">
              <div className="user-avatar">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-ink)' }}>
                {user.name || user.email}
              </span>
              {isAdmin && <span className="admin-tag">ADMIN</span>}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  logout();
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', marginLeft: '0.2rem' }}
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button className="btn btn--primary" onClick={() => openAuthModal('login')}>
              <User size={18} />
              <span>Login / Sign Up</span>
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};
