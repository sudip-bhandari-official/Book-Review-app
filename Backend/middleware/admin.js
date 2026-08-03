const User = require('../models/User');

module.exports = async function(req, res, next) {
  try {
    // Assuming `auth` middleware has already run, so req.user.id is available
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied: Admins only' });
    }

    next();
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
