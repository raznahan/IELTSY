import TelegramBot from 'node-telegram-bot-api';
import { translate } from '../utils/i18n';
import User from '../models/userModel';
import { getUserLanguage } from '../utils/userLanguage';
import config from '../config';

export const referralCommand = async (bot: TelegramBot, chatId: number, userId: string, languageCode: string) => {
  const user = await User.findOne({ telegramId: userId });

  if (!user) {
    await bot.sendMessage(chatId, translate('USER_NOT_FOUND', languageCode));
    return;
  }

  const referralCode = user.referralCode || await generateReferralCode(user);
  const successfulReferrals = user.referralPoints;
  const pointsEarned = user.totalPoints - user.referralPoints;

  // First message: Referral stats
  const statsMessage = translate('REFERRAL_STATS', languageCode, {
    successfulReferrals: successfulReferrals.toString(),
    pointsEarned: pointsEarned.toString()
  });
  await bot.sendMessage(chatId, statsMessage);

  // Second message: Referral code and share link
  const referralLink = `https://t.me/${config.botUsername}?start=${referralCode}`;
  const shareMessage = translate('REFERRAL_SHARE_MESSAGE', languageCode, {
    referralCode,
    referralLink
  });

  // Send the message without the share button
  await bot.sendMessage(chatId, shareMessage);
};

export const setupReferralCommand = (bot: TelegramBot) => {
  bot.onText(/\/referral/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    const languageCode = await getUserLanguage(userId);
    await referralCommand(bot, chatId, userId, languageCode);
  });
};

async function generateReferralCode(user: any): Promise<string> {
  const code = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  user.referralCode = code;
  await user.save();
  return code;
}