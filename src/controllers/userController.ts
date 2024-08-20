import { Request, Response } from 'express';
import User from '../models/userModel';
import Essay from '../models/essayModel';
import config from '../config';

const REFERRAL_TO_POINT_RATIO = config.referralToPointRatio;

// Get or create a user
export const getUser = async (req: Request, res: Response) => {
  const { telegramId, username } = req.body;
  let user = await User.findOne({ telegramId });
  if (!user) {
    user = new User({ telegramId, username });
    await user.save();
  }
  res.json(user);
};

// Submit an essay
export const submitEssay = async (req: Request, res: Response) => {
  const { telegramId, essay } = req.body;
  let user = await User.findOne({ telegramId });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Simulate essay correction and feedback
  const feedback = `Your essay has been reviewed. Good job!`;
  const score = Math.floor(Math.random() * (9 - 5 + 1)) + 5;

  const newEssay = new Essay({
    userId: user._id,
    essay,
    feedback,
    score
  });

  await newEssay.save();

  user.totalUses += 1;
  await user.save();

  res.json({ feedback, score });
};

export const submitPaidEssay = async (req: Request, res: Response) => {
    const { telegramId, essay } = req.body;
    let user = await User.findOne({ telegramId });
  
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
  
    if (user.totalPoints < 1) {
      return res.status(400).json({ message: 'Insufficient points. Please add more credits.' });
    }
  
    // Simulate essay correction and feedback
    const feedback = `Your essay has been reviewed. Good job!`;
    const score = Math.floor(Math.random() * (9 - 5 + 1)) + 5;
  
    const newEssay = new Essay({
      userId: user._id,
      essay,
      feedback,
      score,
    });
  
    await newEssay.save();
  
    // Deduct points and update usage
    user.totalPoints -= 1;
    user.totalUses += 1;
    user.paidUses += 1;
    await user.save();
  
    res.json({ feedback, score });
  };

// Generate a referral code
export const generateReferralCode = async (req: Request, res: Response) => {
  const { telegramId } = req.body;
  let user = await User.findOne({ telegramId });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (!user.referralCode) {
    user.referralCode = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await user.save();
  }

  res.json({ referralCode: user.referralCode });
};

// Apply a referral code
export const applyReferralCode = async (req: Request, res: Response) => {
  const { telegramId, referralCode } = req.body;
  let user = await User.findOne({ telegramId });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.referredBy) {
    return res.status(400).json({ message: 'Referral code already applied.' });
  }

  let referringUser = await User.findOne({ referralCode });
  if (!referringUser) {
    return res.status(404).json({ message: 'Invalid referral code.' });
  }

  // Apply referral and calculate points
  user.referredBy = referralCode;
  referringUser.referralPoints += 1;

  if (referringUser.referralPoints >= REFERRAL_TO_POINT_RATIO) {
    referringUser.totalPoints += 1;
    referringUser.referralPoints -= REFERRAL_TO_POINT_RATIO;  // Consume referral points
  }

  await user.save();
  await referringUser.save();

  res.json({ message: 'Referral code applied successfully.' });
};

// Update AI data collection consent
export const updateAIConsent = async (req: Request, res: Response) => {
  const { telegramId, consent } = req.body;
  let user = await User.findOne({ telegramId });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.aiConsent = consent;
  await user.save();

  res.json({ message: `AI training data collection consent updated to ${consent}` });
};
