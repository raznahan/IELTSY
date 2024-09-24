import mongoose from 'mongoose';

// Define the user schema for MongoDB
const userSchema = new mongoose.Schema({
  // Unique identifier for the user in Telegram
  telegramId: { type: String, required: true, unique: true },
  // User's Telegram username (optional)
  username: { type: String },
  // Unique referral code for the user (optional, but must be unique if present)
  referralCode: { type: String, unique: true, sparse: true },
  // Referral code of the user who referred this user
  referredBy: { type: String },
  // Points earned through referrals
  referralPoints: { type: Number, default: 0 },
  // Total points including referral and purchased points
  totalPoints: { type: Number, default: 0 },
  // Number of free uses remaining for the user
  freeUsesLeft: { type: Number, default: 5 },
  // Number of paid uses by the user
  paidUses: { type: Number, default: 0 },
  // Total number of uses (free + paid)
  totalUses: { type: Number, default: 0 },
  // User's credit balance
  creditBalance: { type: Number, default: 0 },
  // Flag indicating user's consent for AI processing
  aiConsent: { type: Boolean, default: false },
  // OpenAI thread ID for the user's conversation
  threadId: { type: String, default: null },
  // Timestamp of user creation
  createdAt: { type: Date, default: Date.now },
  // User's preferred language (default: English)
  language: { type: String, default: 'en' },
  // Array of payment references made by the user
  payments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }],
  // ID of the last essay message sent by the user
  lastEssayMessageId: { type: Number },
  // User's target scores for different IELTS components
  targetScores: {
    overall: { type: Number, default: 0 },
    TR: { type: Number, default: 0 }, // Task Response
    CC: { type: Number, default: 0 }, // Coherence and Cohesion
    LR: { type: Number, default: 0 }, // Lexical Resource
    GRA: { type: Number, default: 0 }, // Grammatical Range and Accuracy
  },
});

// Create and export the User model based on the schema
const User = mongoose.model('User', userSchema);

export default User;
