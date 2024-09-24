import TelegramBot from 'node-telegram-bot-api';
import { translate } from '../utils/i18n';
import { getUserLanguage } from '../utils/userLanguage';
import { handleMyEssays } from './myEssaysCommand';
import { analyticsCommand } from './analyticsCommand';
import { settingsCommand } from './settingsCommand';
import { referralCommand } from './referralCommand';
import { helpCommand } from './helpCommand';

export const sendMainMenu = async (bot: TelegramBot, chatId: number, userId: string) => {
  const languageCode = await getUserLanguage(userId);

  const keyboard = {
    inline_keyboard: [
      [{ text: '📝 ' + translate('SUBMIT_ESSAY', languageCode), callback_data: 'submit_essay' }],
      [{ text: '📂 ' + translate('MY_ESSAYS', languageCode), callback_data: 'my_essays' }],
      [{ text: '📊 ' + translate('ANALYTICS', languageCode), callback_data: 'analytics' }],
      [{ text: '⚙️ ' + translate('SETTINGS', languageCode), callback_data: 'settings' }],
      [{ text: '🎁 ' + translate('REFERRAL_PROGRAM', languageCode), callback_data: 'referral' }],
      [{ text: 'ℹ️ ' + translate('HELP', languageCode), callback_data: 'help' }]
    ]
  };

  await bot.sendMessage(chatId, translate('CHOOSE_OPTION', languageCode), {
    reply_markup: keyboard
  });
};

export const mainMenuCommand = (bot: TelegramBot) => {
  bot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString() || '';
    await sendMainMenu(bot, chatId, userId);
  });

  bot.on('callback_query', async (query) => {
    if (!query.data) return;

    const chatId = query.message?.chat.id;
    const userId = query.from.id.toString();
    if (!chatId) return;

    const languageCode = await getUserLanguage(userId);

    switch (query.data) {
      case 'submit_essay':
        await bot.sendMessage(chatId, translate('SUBMIT_ESSAY_PROMPT', languageCode));
        break;
      case 'my_essays':
        await handleMyEssays(bot, { chat: { id: chatId }, from: { id: parseInt(userId) } } as TelegramBot.Message, null);
        break;
      case 'analytics':
        await analyticsCommand(bot, chatId, userId, languageCode);
        break;
      case 'settings':
        await settingsCommand(bot, chatId, userId, languageCode);
        break;
      case 'referral':
        await referralCommand(bot, chatId, userId, languageCode);
        break;
      case 'help':
        await helpCommand(bot, chatId, userId, languageCode);
        break;
    }

    await bot.answerCallbackQuery(query.id);
  });
};