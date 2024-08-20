import { Request, Response } from 'express';
import Payment from '../models/paymentModel';
import User from '../models/userModel';

// Add credits and points to user account via payment
export const addCredits = async (req: Request, res: Response) => {
  const { telegramId, amount } = req.body;
  let user = await User.findOne({ telegramId });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const pointsPurchased = Math.floor(amount / 10);  // Example: $10 = 1 point
  user.totalPoints += pointsPurchased;

  const payment = new Payment({
    userId: user._id,
    amount,
    pointsPurchased
  });

  await payment.save();
  user.payments.push(payment._id);
  await user.save();

  res.json({ message: `Credits added successfully. Current balance: ${user.totalPoints} points` });
};
