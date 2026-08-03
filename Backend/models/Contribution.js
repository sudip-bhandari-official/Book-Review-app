const mongoose = require('mongoose');

const ContributionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imagePath: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  aiResult: { type: mongoose.Schema.Types.Mixed },
  finalBookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
}, { timestamps: true });

module.exports = mongoose.model('Contribution', ContributionSchema);
