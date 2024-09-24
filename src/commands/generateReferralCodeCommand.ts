import TelegramBot from 'node-telegram-bot-api';
import User from '../models/userModel';
import config from '../config';
import { translate } from '../utils/i18n';

/**
 * Handles the /generatereferralcode command in the Telegram bot.
 * This function generates a unique referral code for users and sends it to them.
 * @param bot The Telegram bot instance
 */
export const generateReferralCodeCommand = (bot: TelegramBot) => {
  bot.onText(/\/generatereferralcode/, async (msg) => {
    const userId = msg.chat.id.toString();
    let user = await User.findOne({ telegramId: userId });
    const userLanguage = user?.language || 'en';

    // Create a new user if they don't exist in the database
    if (!user) {
      user = new User({ telegramId: userId });
      await user.save();
    }

    // Generate a new referral code if the user doesn't have one
    if (!user.referralCode) {
      // Generate a random 6-character alphanumeric code prefixed with 'REF'
      user.referralCode = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await user.save();
    }

    // Construct the full referral link using the bot's ID and the user's referral code
    const referralLink = `https://t.me/${config.botID}?start=${user.referralCode}`;

    // Send the referral code and link to the user in their preferred language
    await bot.sendMessage(msg.chat.id, translate('referral_code_message', userLanguage, { 
      referralCode: user.referralCode, 
      referralLink: referralLink 
    }));
  });
};
