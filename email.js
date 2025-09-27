const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Email = require('../models/Email');

const router = express.Router();

// Middleware to verify user
const verifyUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'royalthakur_secret_2024');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// 📧 CREATE TEMPORARY EMAIL ADDRESS
router.post('/create', verifyUser, async (req, res) => {
  try {
    const { customName } = req.body;
    
    // Check daily email limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayEmails = await Email.countDocuments({
      userId: req.user._id,
      createdAt: { $gte: today }
    });

    if (todayEmails >= req.user.emailsPerDay) {
      return res.status(400).json({ 
        success: false, 
        message: `Daily email limit reached (${req.user.emailsPerDay} emails per day)` 
      });
    }

    // Generate email address
    const randomId = Math.random().toString(36).substring(2, 8);
    const emailAddress = customName ? 
      `${customName}@royalthakur.xyz` : 
      `temp${randomId}@royalthakur.xyz`;

    // Create email record
    const email = new Email({
      userId: req.user._id,
      emailAddress,
      isActive: true,
      createdAt: new Date()
    });

    await email.save();

    res.json({
      success: true,
      email: {
        id: email._id,
        address: emailAddress,
        createdAt: email.createdAt
      }
    });
  } catch (error) {
    console.error('Email creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 📨 GET INBOX MESSAGES
router.get('/inbox/:emailAddress', verifyUser, async (req, res) => {
  try {
    const { emailAddress } = req.params;
    
    const email = await Email.findOne({ 
      emailAddress, 
      userId: req.user._id 
    });

    if (!email) {
      return res.status(404).json({ success: false, message: 'Email address not found' });
    }

    const messages = await Email.aggregate([
      { $match: { emailAddress } },
      { $unwind: '$messages' },
      { 
        $project: {
          _id: '$messages._id',
          from: '$messages.from',
          subject: '$messages.subject',
          body: '$messages.body',
          timestamp: '$messages.timestamp',
          read: '$messages.read'
        }
      },
      { $sort: { timestamp: -1 } }
    ]);

    res.json({
      success: true,
      email: emailAddress,
      messages: messages || []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 📩 RECEIVE EMAIL (External Service Ke Liye)
router.post('/receive', async (req, res) => {
  try {
    const { to, from, subject, body, html } = req.body;

    // Find email address
    const email = await Email.findOne({ emailAddress: to });
    if (!email) {
      return res.status(404).json({ success: false, message: 'Email address not found' });
    }

    // Add message to inbox
    email.messages.push({
      from,
      subject,
      body: body || html || 'No content',
      timestamp: new Date(),
      read: false
    });

    await email.save();

    res.json({ success: true, message: 'Email received successfully' });
  } catch (error) {
    console.error('Email receive error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 👀 MARK MESSAGE AS READ
router.put('/message/:messageId/read', verifyUser, async (req, res) => {
  try {
    const { messageId } = req.params;

    const email = await Email.findOneAndUpdate(
      { 
        'messages._id': messageId,
        userId: req.user._id 
      },
      { $set: { 'messages.$.read': true } },
      { new: true }
    );

    if (!email) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.json({ success: true, message: 'Message marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 🗑️ DELETE MESSAGE
router.delete('/message/:messageId', verifyUser, async (req, res) => {
  try {
    const { messageId } = req.params;

    const email = await Email.findOneAndUpdate(
      { userId: req.user._id },
      { $pull: { messages: { _id: messageId } } },
      { new: true }
    );

    if (!email) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 📧 GET USER'S ALL EMAIL ADDRESSES
router.get('/my-emails', verifyUser, async (req, res) => {
  try {
    const emails = await Email.find({ userId: req.user._id })
      .select('emailAddress isActive createdAt messages')
      .sort({ createdAt: -1 });

    const emailsWithStats = emails.map(email => ({
      id: email._id,
      address: email.emailAddress,
      isActive: email.isActive,
      createdAt: email.createdAt,
      totalMessages: email.messages.length,
      unreadMessages: email.messages.filter(m => !m.read).length
    }));

    res.json({
      success: true,
      emails: emailsWithStats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 🔄 UPDATE EMAIL STATUS (Activate/Deactivate)
router.put('/:emailId/status', verifyUser, async (req, res) => {
  try {
    const { emailId } = req.params;
    const { isActive } = req.body;

    const email = await Email.findOneAndUpdate(
      { _id: emailId, userId: req.user._id },
      { isActive },
      { new: true }
    );

    if (!email) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    res.json({
      success: true,
      email: {
        id: email._id,
        address: email.emailAddress,
        isActive: email.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;