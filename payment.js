const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Payment = require('../models/Payment');

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

// 💳 GET PAYMENT PLANS
router.get('/plans', (req, res) => {
  const plans = {
    free: {
      name: 'Free Plan',
      price: 0,
      features: [
        '100 API calls/day',
        '5 emails per day',
        '1 day email storage',
        'Basic support'
      ],
      description: 'Perfect for testing and basic use'
    },
    premium: {
      name: 'Premium Plan',
      price: 299,
      features: [
        '10,000 API calls/day',
        '100 emails per day',
        '30 days email storage',
        'Priority support',
        'API access',
        'Advanced features'
      ],
      description: 'Best for developers and businesses'
    }
  };

  res.json({ success: true, plans });
});

// 📱 INITIATE UPI PAYMENT
router.post('/initiate', verifyUser, async (req, res) => {
  try {
    const { plan } = req.body;

    if (plan !== 'premium') {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    const planDetails = {
      name: 'Premium Plan',
      price: 299,
      features: ['10,000 API calls/day', '100 emails/day', '30 days storage']
    };

    // Create payment record
    const payment = new Payment({
      userId: req.user._id,
      plan: 'premium',
      amount: planDetails.price,
      status: 'pending',
      utrNumber: '',
      paymentProof: '',
      createdAt: new Date()
    });

    await payment.save();

    // UPI Payment details
    const upiDetails = {
      upiId: 'royalthakur@ptaxis',
      amount: planDetails.price,
      note: `Premium Plan - ${req.user.email}`,
      paymentId: payment._id.toString()
    };

    res.json({
      success: true,
      payment: {
        id: payment._id,
        amount: upiDetails.amount,
        upiId: upiDetails.upiId,
        note: upiDetails.note
      },
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${upiDetails.upiId}&pn=RoyalThakur&am=${upiDetails.amount}&cu=INR&tn=${encodeURIComponent(upiDetails.note)}`
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ SUBMIT PAYMENT PROOF
router.post('/submit-proof', verifyUser, async (req, res) => {
  try {
    const { paymentId, utrNumber, screenshot } = req.body;

    const payment = await Payment.findOne({
      _id: paymentId,
      userId: req.user._id
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Payment already processed' });
    }

    payment.utrNumber = utrNumber;
    payment.paymentProof = screenshot;
    payment.status = 'submitted';
    payment.submittedAt = new Date();

    await payment.save();

    res.json({
      success: true,
      message: 'Payment proof submitted successfully. Please wait for admin approval.',
      payment: {
        id: payment._id,
        status: payment.status,
        submittedAt: payment.submittedAt
      }
    });
  } catch (error) {
    console.error('Payment proof error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 📊 GET PAYMENT HISTORY
router.get('/history', verifyUser, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments: payments.map(payment => ({
        id: payment._id,
        plan: payment.plan,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt,
        approvedAt: payment.approvedAt
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 🔄 CHECK PAYMENT STATUS
router.get('/status/:paymentId', verifyUser, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      _id: paymentId,
      userId: req.user._id
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.json({
      success: true,
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        plan: payment.plan,
        createdAt: payment.createdAt,
        approvedAt: payment.approvedAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;