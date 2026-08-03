const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Book = require('../models/Book');
const Review = require('../models/Review');
const LikeDislike = require('../models/LikeDislike');
const User = require('../models/User');

// @route   GET /books/search
// @desc    Search books by title or author
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q, author } = req.query;
    let query = {};

    if (q) {
      query.title = { $regex: q, $options: 'i' }; // Case-insensitive search
    }
    if (author) {
      query.author = { $regex: author, $options: 'i' };
    }

    const books = await Book.find(query);
    res.json(books);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /books/recommend
// @desc    Get recommended books
// @access  Private
router.get('/recommend', auth, async (req, res) => {
  try {
    // Basic recommendation: simply fetch recent books or highly liked books.
    // A more advanced one would use genres or user's likedBooks history.
    const user = await User.findById(req.user.id);
    
    // For now, let's just return books they haven't liked yet as a simple mock.
    const recommended = await Book.find({ _id: { $nin: user.likedBooks } }).limit(10);
    res.json(recommended);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /books
// @desc    Get all books
// @access  Public
router.get('/', async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    res.json(books);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /books
// @desc    Add a book directly (Admin only)
// @access  Private/Admin
router.post('/', [auth, admin], async (req, res) => {
  try {
    const newBook = new Book({
      ...req.body,
      addedBy: req.user.id,
      duplicateCheckPass: true // Assume admin adds verified books
    });

    const book = await newBook.save();
    res.json(book);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /books/:id/reviews
// @desc    Get reviews for a book
// @access  Public
router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ bookId: req.params.id }).populate('userId', 'name profilePic');
    res.json(reviews);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /books/:id/reviews
// @desc    Add a review for a book
// @access  Private
router.post('/:id/reviews', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    // Check if user already reviewed
    const existingReview = await Review.findOne({ bookId: req.params.id, userId: req.user.id });
    if (existingReview) {
      return res.status(400).json({ msg: 'You have already reviewed this book' });
    }

    const newReview = new Review({
      bookId: req.params.id,
      userId: req.user.id,
      rating,
      comment
    });

    const review = await newReview.save();
    res.json(review);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /books/:id/reviews/:reviewId
// @desc    Delete a review (Admin only)
// @access  Private/Admin
router.delete('/:id/reviews/:reviewId', [auth, admin], async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    
    if (!review) {
      return res.status(404).json({ msg: 'Review not found' });
    }

    // Ensure the review belongs to the book specified
    if (review.bookId.toString() !== req.params.id) {
      return res.status(400).json({ msg: 'Review does not belong to this book' });
    }

    await Review.findByIdAndDelete(req.params.reviewId);
    res.json({ msg: 'Review deleted successfully' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Review not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET /books/:id/likes
// @desc    Get likes/dislikes count for a book
// @access  Public
router.get('/:id/likes', async (req, res) => {
  try {
    const likes = await LikeDislike.countDocuments({ bookId: req.params.id, type: 'like' });
    const dislikes = await LikeDislike.countDocuments({ bookId: req.params.id, type: 'dislike' });
    res.json({ likes, dislikes });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /books/:id/like
// @desc    Like a book
// @access  Private
router.post('/:id/like', auth, async (req, res) => {
  try {
    let interaction = await LikeDislike.findOne({ bookId: req.params.id, userId: req.user.id });
    
    if (interaction) {
      if (interaction.type === 'like') {
         return res.status(400).json({ msg: 'Already liked' });
      } else {
         interaction.type = 'like';
         await interaction.save();
      }
    } else {
      interaction = new LikeDislike({ bookId: req.params.id, userId: req.user.id, type: 'like' });
      await interaction.save();
    }

    // Add to user's liked books
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { likedBooks: req.params.id } });

    res.json({ msg: 'Book liked' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /books/:id/dislike
// @desc    Dislike a book
// @access  Private
router.post('/:id/dislike', auth, async (req, res) => {
  try {
    let interaction = await LikeDislike.findOne({ bookId: req.params.id, userId: req.user.id });
    
    if (interaction) {
      if (interaction.type === 'dislike') {
         return res.status(400).json({ msg: 'Already disliked' });
      } else {
         interaction.type = 'dislike';
         await interaction.save();
      }
    } else {
      interaction = new LikeDislike({ bookId: req.params.id, userId: req.user.id, type: 'dislike' });
      await interaction.save();
    }

    // Remove from user's liked books
    await User.findByIdAndUpdate(req.user.id, { $pull: { likedBooks: req.params.id } });

    res.json({ msg: 'Book disliked' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
