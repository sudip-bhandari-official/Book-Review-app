const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  coverImageUrl: { type: String, default: '' },
  summary: { type: String, default: '' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  duplicateCheckPass: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Book', BookSchema);
