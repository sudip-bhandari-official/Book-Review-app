import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { booksAPI } from './services/api';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { BookCard } from './components/BookCard';
import { BookDetailModal } from './components/BookDetailModal';
import { AuthModal } from './components/AuthModal';
import { ContributeModal } from './components/ContributeModal';
import { ProfileModal } from './components/ProfileModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { Toast } from './components/Toast';
import { API_BASE_URL } from './config.js';

function MainApp() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [recommendedBooks, setRecommendedBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'recommended' | 'categories'
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedBook, setSelectedBook] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [contributeModalOpen, setContributeModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    if (user && activeTab === 'recommended') {
      loadRecommendations();
    }
  }, [user, activeTab]);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const data = await booksAPI.getAllBooks();
      setBooks(data || []);
    } catch (err) {
      console.error(err);
      addToast('Error loading books', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      const data = await booksAPI.getRecommendations();
      setRecommendedBooks(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      loadBooks();
      return;
    }
    setLoading(true);
    try {
      const results = await booksAPI.searchBooks(query);
      setBooks(results || []);
      addToast(`Found ${results.length} book(s) for "${query}"`, 'success');
    } catch (err) {
      addToast(err.message || 'Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openAuth = (mode = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const categoriesList = [
    { name: 'Fiction', icon: '📚' },
    { name: 'Fantasy', icon: '🐉' },
    { name: 'Mystery', icon: '🕵️' },
    { name: 'Romance', icon: '💗' },
    { name: 'Biography', icon: '👤' },
    { name: 'History', icon: '🏛️' },
    { name: 'Technology', icon: '💻' },
    { name: 'Self Help', icon: '🌱' },
  ];

  const displayedBooks = activeTab === 'recommended' ? recommendedBooks : books;

  return (
    <div className="app-layout">
      <Navbar
        openAuthModal={openAuth}
        openProfileModal={() => setProfileModalOpen(true)}
        openContributeModal={() => setContributeModalOpen(true)}
        openAdminModal={() => setAdminModalOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchSubmit={handleSearch}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="main-content">
        <Hero
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleSearch={handleSearch}
          openContributeModal={() => setContributeModalOpen(true)}
        />

        {/* Categories Section */}
        <section className="section-wrapper">
          <div className="section__head section__head--center">
            <div>
              <p className="section__eyebrow">Find your genre</p>
              <h2 className="section__title">Popular Categories</h2>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
            {categoriesList.map((cat) => (
              <div
                key={cat.name}
                className="category-card"
                style={{
                  borderColor: activeCategory === cat.name ? 'var(--color-primary)' : 'var(--color-line)',
                  background: activeCategory === cat.name ? 'var(--color-primary-light)' : 'var(--color-bg-soft)'
                }}
                onClick={() => {
                  if (activeCategory === cat.name) {
                    setActiveCategory(null);
                    loadBooks();
                  } else {
                    setActiveCategory(cat.name);
                    handleSearch(cat.name);
                  }
                }}
              >
                <span className="category-card__icon">{cat.icon}</span>
                <span className="category-card__name">{cat.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Books Grid */}
        <section className="section-wrapper" style={{ paddingTop: 0 }}>
          <div className="section__head">
            <div>
              <p className="section__eyebrow">
                {activeTab === 'recommended' ? 'Personalized Picks' : 'What everyone is reading'}
              </p>
              <h2 className="section__title">
                {activeTab === 'recommended' ? 'Recommended for You' : 'Book Catalog'}
              </h2>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-muted)' }}>
              <p style={{ fontSize: '1.1rem' }}>Loading books...</p>
            </div>
          ) : displayedBooks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-muted)' }}>
              <p style={{ fontSize: '1.1rem' }}>No books found.</p>
              <button
                className="btn btn--outline"
                style={{ marginTop: '1rem' }}
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory(null);
                  loadBooks();
                }}
              >
                Reset Search
              </button>
            </div>
          ) : (
            <div className="books-grid">
              {displayedBooks.map((book) => (
                <BookCard
                  key={book._id}
                  book={book}
                  onSelectBook={(b) => setSelectedBook(b)}
                  onLike={(id) => {
                    if (!user) openAuth('login');
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer__inner">
          <div>
            <h3 style={{ fontFamily: 'var(--font-head)', color: '#fff', fontSize: '1.4rem', marginBottom: '1rem' }}>
              BookNest
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#a0a0b8' }}>
              A cozy corner of the internet for readers to discover, review, and celebrate books.
            </p>
          </div>
          <div>
            <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '1rem' }}>Explore</h4>
            <p style={{ fontSize: '0.88rem', color: '#a0a0b8', marginBottom: '0.5rem' }}>Trending Books</p>
            <p style={{ fontSize: '0.88rem', color: '#a0a0b8', marginBottom: '0.5rem' }}>Categories</p>
          </div>
          <div>
            <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '1rem' }}>API Backend</h4>
            <p style={{ fontSize: '0.88rem', color: '#a0a0b8', marginBottom: '0.5rem' }}>Base URL: {API_BASE_URL}</p>
            <p style={{ fontSize: '0.88rem', color: '#a0a0b8' }}>AI Cover Validation Active</p>
          </div>
          <div>
            <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '1rem' }}>Admin Access</h4>
            <button
              className="btn btn--outline"
              style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', borderColor: '#4a4a6e', color: '#a0a0b8' }}
              onClick={() => openAuth('admin')}
            >
              Backdoor Admin Portal
            </button>
          </div>
        </div>
        <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', marginTop: '2.5rem', fontSize: '0.85rem', color: '#7a7a98' }}>
          &copy; {new Date().getFullYear()} BookNest App. All rights reserved.
        </div>
      </footer>

      {/* Modals */}
      {selectedBook && (
        <BookDetailModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          addToast={addToast}
        />
      )}

      {authModalOpen && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setAuthModalOpen(false)}
          addToast={addToast}
        />
      )}

      {contributeModalOpen && (
        <ContributeModal
          onClose={() => setContributeModalOpen(false)}
          addToast={addToast}
          onBookAdded={(newBook) => setBooks((prev) => [newBook, ...prev])}
        />
      )}

      {profileModalOpen && (
        <ProfileModal
          onClose={() => setProfileModalOpen(false)}
          addToast={addToast}
          openAuthModal={openAuth}
        />
      )}

      {adminModalOpen && (
        <AdminPanelModal
          onClose={() => setAdminModalOpen(false)}
          addToast={addToast}
          onBookAdded={(newBook) => setBooks((prev) => [newBook, ...prev])}
        />
      )}

      {/* Toasts */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
