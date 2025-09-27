const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Email = require('../models/Email');
const Payment = require('../models/Payment');

const router = express.Router();

// Middleware to verify Admin
const verifyAdmin = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'royalthakur_secret_2024');
    
    if (decoded.role !== 'super_admin' && decoded.userId !== 'super_admin_001') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid admin token' });
  }
};

// 📊 ADMIN DASHBOARD STATS
router.get('/dashboard', verifyAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const premiumUsers = await User.countDocuments({ plan: 'premium' });
    const freeUsers = await User.countDocuments({ plan: 'free' });
    
    const totalEmails = await Email.countDocuments();
    const todayEmails = await Email.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const pendingPayments = await Payment.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      stats: {
        totalUsers,
        premiumUsers,
        freeUsers,
        totalEmails,
        todayEmails,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingPayments
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 👥 USER MANAGEMENT
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const query = search ? { email: { $regex: search, $options: 'i' } } : {};
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalUsers: total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 🔧 UPDATE USER PLAN/LIMITS
router.put('/users/:userId', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { plan, maxApiCalls, emailsPerDay, storageDays } = req.body;

    const updateData = {};
    if (plan) updateData.plan = plan;
    if (maxApiCalls) updateData.maxApiCalls = maxApiCalls;
    if (emailsPerDay) updateData.emailsPerDay = emailsPerDay;
    if (storageDays) updateData.storageDays = storageDays;

    const user = await User.findByIdAndUpdate(
      userId, 
      updateData, 
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ❌ DELETE USER
router.delete('/users/:userId', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete user's emails and payments
    await Email.deleteMany({ userId });
    await Payment.deleteMany({ userId });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 💰 PAYMENT MANAGEMENT
router.get('/payments', verifyAdmin, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('userId', 'email plan')
      .sort({ createdAt: -1 });

    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ APPROVE PAYMENT
router.put('/payments/:paymentId/approve', verifyAdmin, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      { status: 'approved', approvedAt: new Date() },
      { new: true }
    ).populate('userId');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Upgrade user to premium
    if (payment.userId) {
      await User.findByIdAndUpdate(payment.userId, { 
        plan: 'premium',
        maxApiCalls: 10000,
        emailsPerDay: 100,
        storageDays: 30
      });
    }

    res.json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 📧 EMAIL MANAGEMENT
router.get('/emails', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const emails = await Email.find()
      .populate('userId', 'email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Email.countDocuments();

    res.json({
      success: true,
      emails,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalEmails: total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ⚙️ SYSTEM SETTINGS
router.get('/settings', verifyAdmin, (req, res) => {
  const settings = {
    freePlan: {
      dailyCalls: 100,
      emailsPerDay: 5,
      storageDays: 1,
      price: 0
    },
    premiumPlan: {
      dailyCalls: 10000,
      emailsPerDay: 100,
      storageDays: 30,
      price: 299
    },
    upiId: 'royalthakur@ptaxis',
    siteName: 'RoyalThakur Temp Mail',
    supportEmail: 'royalthakurjsp@gmail.com'
  };

  res.json({ success: true, settings });
});

// 🔄 UPDATE SETTINGS
router.put('/settings', verifyAdmin, async (req, res) => {
  try {
    // Yahan aap settings update logic add kar sakte hain
    // Currently static hai lekin database mein store kar sakte hain
    
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;