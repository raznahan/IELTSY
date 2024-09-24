import TelegramBot from 'node-telegram-bot-api';
import { translate } from '../utils/i18n';
import User from '../models/userModel';
import { getUserLanguage } from '../utils/userLanguage';

export const settingsCommand = async (bot: TelegramBot, chatId: number, userId: string, languageCode: string) => {
  const keyboard = {
    inline_keyboard: [
      [{ text: translate('SET_TARGET_SCORE', languageCode), callback_data: 'set_target_score' }],
      [{ text: translate('NOTIFICATION_PREFERENCES', languageCode), callback_data: 'notification_preferences' }],
      [{ text: translate('LANGUAGE_PREFERENCE', languageCode), callback_data: 'language_preference' }],
      [{ text: translate('AI_CONSENT', languageCode), callback_data: 'ai_consent' }],
      [{ text: translate('FEEDBACK_CHANNEL', languageCode), callback_data: 'feedback_channel' }]
    ]
  };

  await bot.sendMessage(chatId, translate('SETTINGS_MENU_MESSAGE', languageCode), {
    reply_markup: keyboard
  });
};

export const setupSettingsCommand = (bot: TelegramBot) => {
  bot.onText(/\/settings/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    const languageCode = await getUserLanguage(userId);
    await settingsCommand(bot, chatId, userId, languageCode);
  });

  bot.on('callback_query', async (query) => {
    if (!query.data) return;

    const chatId = query.message?.chat.id;
    const userId = query.from.id.toString();
    if (!chatId) return;

    const languageCode = await getUserLanguage(userId);

    switch (query.data) {
      case 'set_target_score':
        await handleSetTargetScore(bot, chatId, userId, languageCode);
        break;
      case 'notification_preferences':
        await bot.sendMessage(chatId, translate('NOTIFICATION_PREFERENCES_MESSAGE', languageCode));
        break;
      case 'language_preference':
        await handleLanguagePreference(bot, chatId, userId, languageCode);
        break;
      case 'ai_consent':
        await handleAIConsent(bot, chatId, userId, languageCode);
        break;
      case 'feedback_channel':
        await bot.sendMessage(chatId, translate('FEEDBACK_CHANNEL_MESSAGE', languageCode));
        break;
    }

    await bot.answerCallbackQuery(query.id);
  });
};

async function handleSetTargetScore(bot: TelegramBot, chatId: number, userId: string, languageCode: string) {
  await bot.sendMessage(chatId, translate('ENTER_TARGET_SCORE', languageCode));
  
  bot.once('message', async (msg) => {
    if (msg.text) {
      const score = parseFloat(msg.text);
      if (isNaN(score) || score < 0 || score > 9) {
        await bot.sendMessage(chatId, translate('INVALID_SCORE', languageCode));
      } else {
        await User.findOneAndUpdate({ telegramId: userId }, { 'targetScores.overall': score });
        await bot.sendMessage(chatId, translate('TARGET_SCORE_SET', languageCode, { score: score.toString() }));
      }
    }
  });
}

async function handleLanguagePreference(bot: TelegramBot, chatId: number, userId: string, languageCode: string) {
  const keyboard = {
    inline_keyboard: [
      [{ text: 'English', callback_data: 'lang_en' }],
      [{ text: '中文', callback_data: 'lang_zh' }],
      // Add more languages as needed
    ]
  };

  await bot.sendMessage(chatId, translate('SELECT_LANGUAGE', languageCode), {
    reply_markup: keyboard
  });

  bot.once('callback_query', async (query) => {
    if (!query.data?.startsWith('lang_')) return;

    const newLanguage = query.data.split('_')[1];
    await User.findOneAndUpdate({ telegramId: userId }, { language: newLanguage });
    await bot.sendMessage(chatId, translate('LANGUAGE_UPDATED', newLanguage));
    await bot.answerCallbackQuery(query.id);
  });
}

async function handleAIConsent(bot: TelegramBot, chatId: number, userId: string, languageCode: string) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: translate('YES', languageCode), callback_data: 'ai_consent_yes' },
        { text: translate('NO', languageCode), callback_data: 'ai_consent_no' }
      ]
    ]
  };

  await bot.sendMessage(chatId, translate('AI_CONSENT_PROMPT', languageCode), {
    reply_markup: keyboard
  });

  bot.once('callback_query', async (query) => {
    if (!query.data?.startsWith('ai_consent_')) return;

    const consent = query.data === 'ai_consent_yes';
    await User.findOneAndUpdate({ telegramId: userId }, { aiConsent: consent });
    await bot.sendMessage(chatId, translate(consent ? 'AI_CONSENT_GIVEN' : 'AI_CONSENT_DECLINED', languageCode));
    await bot.answerCallbackQuery(query.id);
  });
}