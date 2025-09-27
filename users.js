const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  plan: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  apiCalls: {
    type: Number,
    default: 0
  },
  maxApiCalls: {
    type: Number,
    default: 100
  },
  emailsPerDay: {
    type: Number,
    default: 5
  },
  storageDays: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
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
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if user can make API call
userSchema.methods.canMakeAPICall = function() {
  return this.apiCalls < this.maxApiCalls;
};

// Method to increment API calls
userSchema.methods.incrementAPICall = function() {
  if (this.canMakeAPICall()) {
    this.apiCalls += 1;
    return this.save();
  }
  return Promise.reject(new Error('Daily API limit exceeded'));
};

// Static method to reset daily API calls (cron job ke liye)
userSchema.statics.resetDailyAPICalls = function() {
  return this.updateMany({}, { apiCalls: 0 });
};

module.exports = mongoose.model('User', userSchema);