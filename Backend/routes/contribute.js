const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const Contribution = require('../models/Contribution');
const { validateContribution } = require('../services/aiValidation');

// @route   POST /contribute/upload
// @desc    Upload an image for book contribution validation and auto-database insertion
// @access  Private
router.post('/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const imagePath = req.file.path;
    const metadata = { ...req.body, userId: req.user.id };

    // Create a pending contribution record
    let contribution = new Contribution({
      userId: req.user.id,
      imagePath: imagePath,
      status: 'pending'
    });
    
    await contribution.save();

    // Call AI Validation service (extracts OCR metadata, checks duplicates, & auto-inserts new book)
    const aiResult = await validateContribution(imagePath, metadata);
    
    contribution.aiResult = aiResult;

    if (aiResult.success && aiResult.book) {
      // Contribution approved & auto-inserted into Book collection
      contribution.status = 'approved';
      contribution.finalBookId = aiResult.book._id;
      await contribution.save();

      res.json({
        msg: aiResult.message || 'Book successfully identified and added to BookNest!',
        book: aiResult.book,
        contribution
      });
    } else if (aiResult.status === 'DUPLICATE_ENTRY' || aiResult.isDuplicate) {
      // Duplicate book entry found in database
      contribution.status = 'rejected';
      contribution.finalBookId = aiResult.existingBookId;
      await contribution.save();

      res.status(409).json({ 
        msg: aiResult.message || aiResult.reason || 'This book already exists in BookNest database.', 
        existingBookId: aiResult.existingBookId, 
        contribution 
      });
    } else {
      // Invalid cover or quality check failed
      contribution.status = 'rejected';
      await contribution.save();
      
      res.status(400).json({ 
        msg: aiResult.message || aiResult.reason || 'Uploaded image does not appear to be a valid book cover.', 
        contribution 
      });
    }
  } catch (err) {
    console.error('[Contribute Route Error]:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
