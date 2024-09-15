import TelegramBot from 'node-telegram-bot-api';
import User from '../models/userModel';
import config from '../config';
import { translate } from '../utils/i18n';

export const generateReferralCodeCommand = (bot: TelegramBot) => {
  bot.onText(/\/generatereferralcode/, async (msg) => {
    const userId = msg.chat.id.toString();
    let user = await User.findOne({ telegramId: userId });
    const userLanguage = user?.language || 'en';

    // Check if the user exists
    if (!user) {
      user = new User({ telegramId: userId });
      await user.save();
    }

    // Check if the user already has a referral code
    if (!user.referralCode) {
      user.referralCode = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await user.save();
    }

    const referralLink = `https://t.me/${config.botID}?start=${user.referralCode}`;
    await bot.sendMessage(msg.chat.id, translate('referral_code_message', userLanguage, { 
      referralCode: user.referralCode, 
      referralLink: referralLink 
    }));
  });
};
