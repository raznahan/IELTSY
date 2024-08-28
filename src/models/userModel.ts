import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  username: { type: String },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: String },
  referralPoints: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },  // Total points including referral and purchased points
  freeUsesLeft: { type: Number, default: 5 },
  paidUses: { type: Number, default: 0 },
  totalUses: { type: Number, default: 0 },
  creditBalance: { type: Number, default: 0 },
  aiConsent: { type: Boolean, default: false },
  threadId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  language: { type: String, default: 'en' }, // Default language
  payments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }]  // Array of payments made by the user
});

const User = mongoose.model('User', userSchema);

export default User;
