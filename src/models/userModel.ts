import mongoose, { Document, Schema } from 'mongoose';

interface IUser extends Document {
  telegramId: string;
  freeUses: number;
  referralPoints: number;
  credits: number;
  history: Array<{ date: Date; score: number }>;
}

const userSchema: Schema = new Schema({
  telegramId: { type: String, required: true },
  freeUses: { type: Number, default: 3 },
  referralPoints: { type: Number, default: 0 },
  credits: { type: Number, default: 0 },
  history: [{ date: Date, score: Number }],
});

const User = mongoose.model<IUser>('User', userSchema);
export default User;
