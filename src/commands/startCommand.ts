import TelegramBot from 'node-telegram-bot-api';
import User from '../models/userModel';

export const startCommand = (bot: TelegramBot) => {
  bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
    const userId = msg.chat.id.toString();
    const referralCode = match[1]; // Capture the referral code if present

    let user = await User.findOne({ telegramId: userId });

    if (!user) {
      // New user - create an entry in the database
      user = new User({ telegramId: userId });

      if (referralCode) {
        // Check if the referral code exists and is valid
        let referringUser = await User.findOne({ referralCode });
        if (referringUser) {
          user.referredBy = referralCode;
          referringUser.referralPoints += 1;

          const REFERRAL_TO_POINT_RATIO = 3;  // Example ratio: 3 referrals = 1 point
          if (referringUser.referralPoints >= REFERRAL_TO_POINT_RATIO) {
            referringUser.totalPoints += 1;
            referringUser.referralPoints -= REFERRAL_TO_POINT_RATIO;
          }

          await referringUser.save();
        }
      }

      await user.save();

      bot.sendMessage(msg.chat.id, `Welcome to the IELTS Writing Bot! You were referred by ${referralCode || 'no one'}.`);
    } else {
      bot.sendMessage(msg.chat.id, `Welcome back to the IELTS Writing Bot!`);
    }

    const welcomeMessage = `
      Here are some commands you can use:
      - /submit: Submit your essay for review.
      - /generateReferralCode: Get your referral code to share with friends.
      - /applyReferralCode <code>: Apply a referral code to get bonus points.
      - /checkPoints: Check your current point balance.
      - /addCredits: Add credits to your account.
      - /updateAIConsent <yes/no>: Update your consent for AI training data collection.
      
      Let's get started by submitting your first essay!
    `;
    bot.sendMessage(msg.chat.id, welcomeMessage);
  });
};
