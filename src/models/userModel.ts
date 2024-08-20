import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  username: { type: String },
  freeUsesLeft: { type: Number, default: 5 },
  referralPoints: { type: Number, default: 0 },
  paidUses: { type: Number, default: 0 },
  totalUses: { type: Number, default: 0 },
});

const User = mongoose.model('User', userSchema);

export default User;
