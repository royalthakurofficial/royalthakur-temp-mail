const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Super Admin Credentials (Aapke Details)
const SUPER_ADMIN = {
  username: 'Royalthakurjsp',
  password: 'Royal@638936',
  email: 'royalthakurjsp@gmail.com'
};

// 🔐 ADMIN LOGIN
router.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (username === SUPER_ADMIN.username && password === SUPER_ADMIN.password) {
      const token = jwt.sign(
        { 
          userId: 'super_admin_001', 
          username: SUPER_ADMIN.username,
          role: 'super_admin',
          email: SUPER_ADMIN.email 
        }, 
        process.env.JWT_SECRET || 'royalthakur_secret_2024',
        { expiresIn: '365d' }
      );
      
      res.json({
        success: true,
        token,
        user: {
          id: 'super_admin_001',
          username: SUPER_ADMIN.username,
          email: SUPER_ADMIN.email,
          role: 'super_admin',
          plan: 'admin'
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 👤 USER REGISTRATION
router.post('/register', async (req, res) => {
  try {
    const { email, password, plan = 'free' } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Set API limits based on plan
    const planLimits = {
      free: { dailyCalls: 100, emailsPerDay: 5, storageDays: 1 },
      premium: { dailyCalls: 10000, emailsPerDay: 100, storageDays: 30 }
    };

    const limits = planLimits[plan] || planLimits.free;

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      plan,
      apiCalls: 0,
      maxApiCalls: limits.dailyCalls,
      emailsPerDay: limits.emailsPerDay,
      storageDays: limits.storageDays,
      createdAt: new Date()
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email }, 
      process.env.JWT_SECRET || 'royalthakur_secret_2024',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        plan: user.plan,
        maxApiCalls: user.maxApiCalls,
        emailsPerDay: user.emailsPerDay
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// 🔑 USER LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'royalthakur_secret_2024',
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        plan: user.plan,
        maxApiCalls: user.maxApiCalls,
        emailsPerDay: user.emailsPerDay,
        apiCalls: user.apiCalls,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// 🔄 CHECK AUTH STATUS
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'royalthakur_secret_2024');
    
    if (decoded.userId === 'super_admin_001') {
      // Super Admin
      return res.json({
        success: true,
        user: {
          id: 'super_admin_001',
          username: SUPER_ADMIN.username,
          email: SUPER_ADMIN.email,
          role: 'super_admin',
          plan: 'admin'
        }
      });
    }

    // Regular User
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        plan: user.plan,
        maxApiCalls: user.maxApiCalls,
        emailsPerDay: user.emailsPerDay,
        apiCalls: user.apiCalls
      }
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

module.exports = router;