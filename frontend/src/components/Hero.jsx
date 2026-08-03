import React from 'react';
import { Search, Sparkles, BookOpen, Star, ShieldCheck } from 'lucide-react';

export const Hero = ({ searchQuery, setSearchQuery, handleSearch, openContributeModal }) => {
  const onSubmit = (e) => {
    e.preventDefault();
    if (handleSearch) handleSearch(searchQuery);
  };

  return (
    <section className="hero">
      <div className="hero__inner">
        <div className="hero__content">
          <div className="hero__eyebrow">
            <Sparkles size={16} className="text-primary" />
            <span>AI-Validated Book Community</span>
          </div>
          <h1 className="hero__title">
            Read. Review. <span className="hero__title-accent">Discover.</span>
          </h1>
          <p className="hero__subtitle">
            Explore thousands of books, share honest community reviews, and contribute new titles with instant AI validation.
          </p>

          <form className="hero__search" onSubmit={onSubmit}>
            <Search size={20} style={{ color: 'var(--color-muted)', marginLeft: '0.8rem' }} />
            <input
              type="search"
              className="hero__search-input"
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn btn--primary">
              Search
            </button>
          </form>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn--outline" onClick={openContributeModal}>
              Upload Book Cover
            </button>
          </div>
        </div>

        <div className="hero__media" style={{ textAlign: 'center' }}>
          <img
            src="assets/images/books/atomic-habits.jpg"
            alt="Hero featured book"
            className="hero__image"
            style={{ maxHeight: '380px', margin: '0 auto', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }}
          />
        </div>
      </div>
    </section>
  );
};
