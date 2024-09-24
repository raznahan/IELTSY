import TelegramBot from 'node-telegram-bot-api';
import User from '../models/userModel';
import { translate } from '../utils/i18n';
import { getUserLanguage } from '../utils/userLanguage';
import { sendMainMenu } from './mainMenuCommand';

// This command handles the /start command for the Telegram bot
export const startCommand = (bot: TelegramBot) => {
  // Listen for /start command, optionally followed by a referral code
  bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
    const userId = msg.chat.id.toString();
    const username = msg.from?.username || null; // Capture the Telegram username if available
    const referralCode = match && match[1] ? match[1] : null; // Capture the referral code if present

    console.log(`User ID: ${userId}, Username: ${username}, Referral Code: ${referralCode}`);

    // Check if the user already exists in the database
    let user = await User.findOne({ telegramId: userId });
    const language = await getUserLanguage(userId); // Use the new function to get the language

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

          // Implement a point system for referrals
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
      // Send welcome message to new users
      const welcomeMessage = translate('welcome_message_newUser', language, { referralCode: referralCode || 'no one' });
      await bot.sendMessage(msg.chat.id, welcomeMessage);
    } else {
      console.log(`User with ID: ${userId} already exists.`);
      // Send welcome back message to existing users
      const welcomeBackMessage = translate('welcome_message_existing', language);
      await bot.sendMessage(msg.chat.id, welcomeBackMessage);
    }
    // Send the main menu without the redundant command list
    await sendMainMenu(bot, msg.chat.id, userId);
  });
};

