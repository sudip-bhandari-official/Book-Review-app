const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Review = require('../models/Review');
const Contribution = require('../models/Contribution');

// @route   GET /profile/me
// @desc    Get current user's profile and stats
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash').populate('likedBooks', 'title author coverImageUrl');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const reviewsCount = await Review.countDocuments({ userId: req.user.id });
    const contributionsCount = await Contribution.countDocuments({ userId: req.user.id, status: 'approved' });

    res.json({
      user,
      stats: {
        reviewsCount,
        contributionsCount
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /profile/update
// @desc    Update user profile
// @access  Private
router.put('/update', auth, async (req, res) => {
  const { name, profilePic } = req.body;
  const profileFields = {};
  if (name) profileFields.name = name;
  if (profilePic !== undefined) profileFields.profilePic = profilePic;

  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: profileFields },
      { new: true }
    ).select('-passwordHash');

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
