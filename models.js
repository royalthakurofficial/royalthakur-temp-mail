const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    default: 'No Subject',
    trim: true
  },
  body: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  }
});

const emailSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emailAddress: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
emailSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Auto-delete old emails based on user's storage days
emailSchema.statics.cleanupOldEmails = async function() {
  const users = await mongoose.model('User').find();
  
  for (const user of users) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - user.storageDays);
    
    await this.deleteMany({
      userId: user._id,
      createdAt: { $lt: cutoffDate }
    });
  }
};

module.exports = mongoose.model('Email', emailSchema);