import TelegramBot from 'node-telegram-bot-api';
import User from '../models/userModel';
import config from '../config';

export const generateReferralCodeCommand = (bot: TelegramBot) => {
  bot.onText(/\/generateReferralCode/, async (msg) => {
    const userId = msg.chat.id.toString();
    let user = await User.findOne({ telegramId: userId });

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
    bot.sendMessage(msg.chat.id, `Your referral code is: ${user.referralCode}\nShare this link to invite others: ${referralLink}`);
  });
};
