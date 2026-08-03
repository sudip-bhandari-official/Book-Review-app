import React from 'react';
import { Star, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { toAssetUrl } from '../config.js';

export const BookCard = ({ book, onSelectBook, onLike, onDislike }) => {
  const getCoverUrl = (url) => toAssetUrl(url);

  return (
    <article className="book-card" onClick={() => onSelectBook(book)}>
      <div className="book-card__cover-wrap">
        <img
          src={getCoverUrl(book.coverImageUrl)}
          alt={`Cover of ${book.title}`}
          className="book-card__img"
          onError={(e) => {
            e.target.src = 'https://placehold.co/300x400/6d5efc/ffffff?text=BookCover';
          }}
        />
        {book.duplicateCheckPass && (
          <span className="book-card__badge">Verified</span>
        )}
      </div>

      <div className="book-card__body">
        <h3 className="book-card__title">{book.title}</h3>
        <p className="book-card__author">by {book.author}</p>

        <div className="book-card__footer">
          <div className="star-rating">
            <Star size={16} fill="var(--star)" stroke="none" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-ink)', marginLeft: '4px' }}>
              {book.rating || '4.5'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-muted)', fontSize: '0.85rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <MessageSquare size={14} />
              {book.reviewsCount || 0}
            </span>
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                if (onLike) onLike(book._id);
              }}
            >
              <ThumbsUp size={14} />
              {book.likesCount || 0}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};
