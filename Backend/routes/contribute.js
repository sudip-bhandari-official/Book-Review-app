const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const Contribution = require('../models/Contribution');
const Book = require('../models/Book');
const { validateContribution } = require('../services/aiValidation');

// @route   POST /contribute/upload
// @desc    Upload an image for book contribution validation
// @access  Private
router.post('/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const imagePath = req.file.path;
    const metadata = req.body; // e.g. title, author entered by user if any

    // Create a pending contribution record
    let contribution = new Contribution({
      userId: req.user.id,
      imagePath: imagePath,
      status: 'pending'
    });
    
    await contribution.save();

    // Call AI Validation service
    const aiResult = await validateContribution(imagePath, metadata);
    
    contribution.aiResult = aiResult;

    if (aiResult.validated && !aiResult.isDuplicate) {
      // Create new book entry based on user metadata or AI extracted data
      const newBook = new Book({
        title: metadata.title || aiResult.detectedTitle || 'Unknown Title',
        author: metadata.author || aiResult.detectedAuthor || 'Unknown Author',
        coverImageUrl: imagePath,
        addedBy: req.user.id,
        duplicateCheckPass: true
      });

      const savedBook = await newBook.save();
      
      // Update contribution
      contribution.status = 'approved';
      contribution.finalBookId = savedBook._id;
      await contribution.save();

      res.json({ msg: 'Contribution approved and book added', book: savedBook, contribution });
    } else if (aiResult.isDuplicate) {
      contribution.status = 'rejected';
      contribution.finalBookId = aiResult.existingBookId;
      await contribution.save();

      res.status(409).json({ 
        msg: aiResult.reason || 'Duplicate book found', 
        existingBookId: aiResult.existingBookId, 
        contribution 
      });
    } else {
      contribution.status = 'rejected';
      await contribution.save();
      
      res.status(400).json({ 
        msg: aiResult.reason || 'Contribution rejected by AI validation', 
        contribution 
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
