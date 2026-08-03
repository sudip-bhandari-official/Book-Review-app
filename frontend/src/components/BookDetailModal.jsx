import React, { useState, useEffect } from 'react';
import { X, Star, ThumbsUp, ThumbsDown, MessageSquare, Trash2, Send } from 'lucide-react';
import { booksAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toAssetUrl } from '../config.js';

export const BookDetailModal = ({ book, onClose, addToast }) => {
  const { user, isAdmin } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [likesData, setLikesData] = useState({ likes: book?.likesCount || 0, dislikes: book?.dislikesCount || 0 });
  const [userRating, setUserRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!book) return;
    loadBookDetails();
  }, [book]);

  const loadBookDetails = async () => {
    setLoading(true);
    try {
      const [revData, lkData] = await Promise.all([
        booksAPI.getReviews(book._id).catch(() => []),
        booksAPI.getLikes(book._id).catch(() => ({ likes: 0, dislikes: 0 }))
      ]);
      setReviews(revData || []);
      if (lkData) setLikesData(lkData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      addToast('Please login to like this book', 'error');
      return;
    }
    try {
      await booksAPI.likeBook(book._id);
      setLikesData((prev) => ({ ...prev, likes: prev.likes + 1 }));
      addToast('Liked book!', 'success');
    } catch (err) {
      addToast(err.message || 'Already liked or failed to like', 'error');
    }
  };

  const handleDislike = async () => {
    if (!user) {
      addToast('Please login to dislike this book', 'error');
      return;
    }
    try {
      await booksAPI.dislikeBook(book._id);
      setLikesData((prev) => ({ ...prev, dislikes: prev.dislikes + 1 }));
      addToast('Disliked book', 'info');
    } catch (err) {
      addToast(err.message || 'Failed to dislike', 'error');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      addToast('Please login to write a review', 'error');
      return;
    }
    if (!comment.trim()) {
      addToast('Please enter a review comment', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await booksAPI.addReview(book._id, userRating, comment);
      addToast('Review submitted successfully!', 'success');
      setComment('');
      loadBookDetails();
    } catch (err) {
      addToast(err.message || 'Failed to submit review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review as Admin?')) return;
    try {
      await booksAPI.deleteReview(book._id, reviewId);
      addToast('Review deleted by Admin', 'success');
      setReviews(reviews.filter((r) => r._id !== reviewId));
    } catch (err) {
      addToast(err.message || 'Failed to delete review', 'error');
    }
  };

  if (!book) return null;

  const getCoverUrl = (url) => toAssetUrl(url);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{book.title}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '2rem' }}>
          <div>
            <img
              src={getCoverUrl(book.coverImageUrl)}
              alt={book.title}
              style={{ width: '100%', borderRadius: '12px', boxShadow: 'var(--shadow-md)', marginBottom: '1rem' }}
            />
            <p style={{ fontWeight: 600, color: 'var(--color-ink)', textAlign: 'center' }}>by {book.author}</p>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', justifyContent: 'center' }}>
              <button
                className="btn btn--ghost"
                onClick={handleLike}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                <ThumbsUp size={16} />
                <span>{likesData.likes}</span>
              </button>
              <button
                className="btn btn--ghost"
                onClick={handleDislike}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                <ThumbsDown size={16} />
                <span>{likesData.dislikes}</span>
              </button>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--color-ink)' }}>Summary</h3>
            <p style={{ color: 'var(--color-body)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              {book.summary || 'No summary available for this book yet.'}
            </p>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-line)', margin: '1.5rem 0' }} />

            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-ink)' }}>
              Community Reviews ({reviews.length})
            </h3>

            {/* Submit Review Form */}
            <form onSubmit={handleSubmitReview} style={{ marginBottom: '1.5rem', background: 'var(--color-bg-soft)', padding: '1rem', borderRadius: '12px' }}>
              <label className="form-label">Write a Review</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={22}
                    fill={star <= userRating ? 'var(--star)' : 'none'}
                    stroke={star <= userRating ? 'none' : 'var(--color-muted)'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setUserRating(star)}
                  />
                ))}
              </div>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Share your thoughts on this book..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn--primary"
                disabled={submitting}
                style={{ marginTop: '0.75rem', padding: '0.45rem 1.2rem', fontSize: '0.88rem' }}
              >
                <Send size={15} />
                <span>{submitting ? 'Submitting...' : 'Post Review'}</span>
              </button>
            </form>

            {/* Reviews List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '250px', overflowY: 'auto' }}>
              {reviews.length === 0 ? (
                <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>No reviews yet. Be the first to review!</p>
              ) : (
                reviews.map((rev) => (
                  <div
                    key={rev._id}
                    style={{
                      background: '#fff',
                      border: '1px solid var(--color-line)',
                      padding: '0.9rem 1.1rem',
                      borderRadius: '10px',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: '0.9rem' }}>
                        {rev.userId?.name || 'Anonymous Reader'}
                      </span>
                      <div className="star-rating">
                        {[...Array(rev.rating || 5)].map((_, i) => (
                          <Star key={i} size={14} fill="var(--star)" stroke="none" />
                        ))}
                      </div>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-body)' }}>{rev.comment}</p>

                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteReview(rev._id)}
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-red)',
                          cursor: 'pointer'
                        }}
                        title="Admin Delete Review"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
