const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Engineer = require('../models/Engineer');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d'
  });
};

const register = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user
    const user = new User({
      email,
      password,
      name,
      role: role || 'engineer'
    });

    await user.save();

    // Create engineer profile if role is engineer
    if (user.role === 'engineer') {
      const engineer = new Engineer({
        userId: user._id,
        employeeId: `ENG${Date.now()}`,
        department: 'fullstack',
        skills: [],
        experience: { total: 0, current: 0 },
        joiningDate: new Date()
      });
      await engineer.save();
    }

    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User created successfully',
      user,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      user,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    let profile = { user };

    // Get engineer profile if user is an engineer
    if (user.role === 'engineer') {
      const engineer = await Engineer.findOne({ userId: user._id });
      profile.engineer = engineer;
    }

    res.json(profile);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, avatar },
      { new: true }
    );

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};