import React, { useState } from 'react';
import { X, Upload, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { contributeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ContributeModal = ({ onClose, addToast, onBookAdded }) => {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState(null); // { type: 'success' | 'duplicate' | 'rejected', msg, book }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setAiStatus(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      addToast('Please login to contribute a book', 'error');
      return;
    }
    if (!file) {
      addToast('Please select a book cover image', 'error');
      return;
    }

    setLoading(true);
    setAiStatus(null);

    try {
      const res = await contributeAPI.uploadContribution(file, title, author);

      if (res.isDuplicate) {
        setAiStatus({
          type: 'duplicate',
          msg: `Duplicate detected! This book already exists (ID: ${res.existingBookId}).`
        });
        addToast('Duplicate book found in database', 'error');
      } else if (res.book) {
        setAiStatus({
          type: 'success',
          msg: 'AI Validation Passed! Book approved and added to catalog.',
          book: res.book
        });
        addToast('Book approved and added!', 'success');
        if (onBookAdded) onBookAdded(res.book);
      } else {
        setAiStatus({
          type: 'rejected',
          msg: res.msg || 'Image rejected by AI validation.'
        });
        addToast(res.msg || 'Image rejected by AI validation', 'error');
      }
    } catch (err) {
      setAiStatus({
        type: 'rejected',
        msg: err.message || 'Image rejected by AI validation.'
      });
      addToast(err.message || 'AI Validation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} className="text-primary" />
            <span>AI Book Validation & Upload</span>
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.9rem', color: 'var(--color-body)', marginBottom: '1.25rem' }}>
            Upload a book cover image. Our AI validation engine scans the cover to detect book details and check for duplicates.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Book Cover Image *</label>
              <div
                style={{
                  border: '2px dashed var(--color-line)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'var(--color-bg-soft)',
                  position: 'relative'
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%'
                  }}
                  required
                />
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{ maxHeight: '160px', margin: '0 auto', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}
                  />
                ) : (
                  <div>
                    <Upload size={32} style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }} />
                    <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-ink)' }}>
                      Click or drag cover image here
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>PNG, JPG or WEBP up to 5MB</p>
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Book Title (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Clean Code"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Author Name (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Robert C. Martin"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>

            {aiStatus && (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background:
                    aiStatus.type === 'success'
                      ? '#e6fbf7'
                      : aiStatus.type === 'duplicate'
                      ? '#fff8e6'
                      : '#ffe6e6',
                  color:
                    aiStatus.type === 'success'
                      ? '#008767'
                      : aiStatus.type === 'duplicate'
                      ? '#b7791f'
                      : 'var(--color-red)'
                }}
              >
                {aiStatus.type === 'success' ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <AlertTriangle size={20} />
                )}
                <span>{aiStatus.msg}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn--primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? 'AI Validating Image...' : 'Submit for AI Validation'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
