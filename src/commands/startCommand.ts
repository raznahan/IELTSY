import TelegramBot from 'node-telegram-bot-api';
import User from '../models/userModel';

export const startCommand = (bot: TelegramBot) => {
    bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
      const userId = msg.chat.id.toString();
      const username = msg.from?.username || null; // Capture the Telegram username if available
      const referralCode = match && match[1] ? match[1] : null; // Capture the referral code if present
  
      console.log(`User ID: ${userId}, Username: ${username}, Referral Code: ${referralCode}`);
  
      let user = await User.findOne({ telegramId: userId });
  
      if (!user) {
        // New user - create an entry in the database
        user = new User({
          telegramId: userId,
          username: username,
          createdAt: new Date(),
        });
  
        if (referralCode) {
          // Check if the referral code exists and is valid
          let referringUser = await User.findOne({ referralCode });
          if (referringUser) {
            console.log(`Referral found. Referred by: ${referringUser.telegramId}`);
            user.referredBy = referringUser.telegramId;  // Store the telegramId of the referrer
            referringUser.referralPoints += 1;
  
            const REFERRAL_TO_POINT_RATIO = 3;  // Example ratio: 3 referrals = 1 point
            if (referringUser.referralPoints >= REFERRAL_TO_POINT_RATIO) {
              referringUser.totalPoints += 1;
              referringUser.referralPoints -= REFERRAL_TO_POINT_RATIO;
            }
  
            await referringUser.save();
          } else {
            console.log(`Referral code ${referralCode} not found in database.`);
          }
        } else {
          console.log('No referral code provided.');
        }
  
        await user.save();
        console.log(`New user created with ID: ${userId}`);
        bot.sendMessage(msg.chat.id, `Welcome to the IELTS Writing Bot! You were referred by ${referralCode || 'no one'}.`);
      } else {
        console.log(`User with ID: ${userId} already exists.`);
        bot.sendMessage(msg.chat.id, `Welcome back to the IELTS Writing Bot!`);
      }
  
      // Always send this message to all users regardless of whether they're new or returning
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
       
