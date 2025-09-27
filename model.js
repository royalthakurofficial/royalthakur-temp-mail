const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    enum: ['premium'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'approved', 'rejected'],
    default: 'pending'
  },
  utrNumber: {
    type: String,
    trim: true
  },
  paymentProof: {
    type: String // URL ya base64 encoded image
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date
  },
  approvedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  }
});

// Index for better query performance
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });

// Virtual for payment duration
paymentSchema.virtual('processingTime').get(function() {
  if (this.approvedAt && this.createdAt) {
    return this.approvedAt - this.createdAt;
  }
  return null;
});

module.exports = mongoose.model('Payment', paymentSchema);