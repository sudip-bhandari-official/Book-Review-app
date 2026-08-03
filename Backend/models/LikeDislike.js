const mongoose = require('mongoose');

const LikeDislikeSchema = new mongoose.Schema({
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'dislike'], required: true },
});

// Ensure a user can only like or dislike a book once (composite unique key)
LikeDislikeSchema.index({ bookId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('LikeDislike', LikeDislikeSchema);
