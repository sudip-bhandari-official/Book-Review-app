import React, { useState } from 'react';
import { X, ShieldCheck, PlusCircle, BookPlus, Trash2 } from 'lucide-react';
import { booksAPI } from '../services/api';

export const AdminPanelModal = ({ onClose, addToast, onBookAdded }) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddBook = async (e) => {
    e.preventDefault();
    if (!title || !author) {
      addToast('Title and author are required', 'error');
      return;
    }

    setLoading(true);
    try {
      const newBook = await booksAPI.addBookAdmin({
        title,
        author,
        coverImageUrl: coverImageUrl || 'assets/images/books/atomic-habits.jpg',
        summary
      });
      addToast('Book added directly to database by Admin!', 'success');
      if (onBookAdded) onBookAdded(newBook);
      setTitle('');
      setAuthor('');
      setCoverImageUrl('');
      setSummary('');
    } catch (err) {
      addToast(err.message || 'Failed to add book as admin', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ background: '#fff0f0' }}>
          <h2 className="modal-title" style={{ color: '#d63031', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={24} />
            <span>Admin Control Panel</span>
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.9rem', color: 'var(--color-body)', marginBottom: '1.5rem' }}>
            As an Administrator, you can bypass AI validation to add verified books directly to the database or moderate community reviews.
          </p>

          <div style={{ background: 'var(--color-bg-soft)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-line)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BookPlus size={20} className="text-primary" />
              <span>Direct Add Book (Bypass AI Validation)</span>
            </h3>

            <form onSubmit={handleAddBook}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Book Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Design Patterns"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Author Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Erich Gamma"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cover Image URL / Path</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://... or assets/images/books/..."
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Book Summary</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Comprehensive description of the book..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn--primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                disabled={loading}
              >
                {loading ? 'Adding Book...' : 'Add Book directly to Catalog'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
