import TelegramBot from 'node-telegram-bot-api';
import User from '../models/userModel';
import Essay from '../models/essayModel';
import { translate } from '../utils/i18n';

export const myEssaysCommand = (bot: TelegramBot) => {
  bot.onText(/\/myessays/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) {
      await bot.sendMessage(chatId, translate('COULD_NOT_IDENTIFY_USER', 'en'));
      return;
    }

    try {
      const user = await User.findOne({ telegramId: userId.toString() });
      const languageCode = user?.language || 'en';

      if (!user) {
        await bot.sendMessage(chatId, translate('NO_ESSAYS_SUBMITTED', languageCode));
        return;
      }

      const essays = await Essay.find({ userId: userId.toString() }).sort({ submittedAt: -1 });

      if (essays.length === 0) {
        await bot.sendMessage(chatId, translate('NO_ESSAYS_SUBMITTED', languageCode));
        return;
      }

      const keyboard = essays.map((essay, index) => [{
        text: `${translate('ESSAY', languageCode)} ${index + 1} - ${essay.submittedAt.toLocaleDateString()}`,
        callback_data: `essay:${essay._id}`
      }]);

      await bot.sendMessage(chatId, translate('HERE_ARE_YOUR_ESSAYS', languageCode), {
        reply_markup: {
          inline_keyboard: keyboard
        }
      });

      // Send an initial message for essay details
      const initialMessage = await bot.sendMessage(chatId, translate('SELECT_ESSAY', languageCode));
      
      // Store the message ID for future updates
      user.lastEssayMessageId = initialMessage.message_id;
      await user.save();

    } catch (error) {
      console.error('Error fetching essays:', error);
      await bot.sendMessage(chatId, translate('ERROR_FETCHING_ESSAYS', 'en'));
    }
  });

  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;
    const userId = callbackQuery.from.id;
    if (!chatId || !messageId) return;

    const data = callbackQuery.data;
    if (!data?.startsWith('essay:')) return;

    const essayId = data.split(':')[1];
    try {
      const user = await User.findOne({ telegramId: userId.toString() });
      const languageCode = user?.language || 'en';

      const essay = await Essay.findById(essayId);
      if (!essay) {
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: translate('ESSAY_NOT_FOUND', languageCode),
          show_alert: true
        });
        return;
      }

      const message = `
${translate('ORIGINAL_ESSAY', languageCode)}:
${essay.essayText.substring(0, 100)}... ${translate('TAP_TO_EXPAND', languageCode)}

${translate('SCORES', languageCode)}:
${translate('TR', languageCode)}: ${essay.TR}
${translate('CC', languageCode)}: ${essay.CC}
${translate('LR', languageCode)}: ${essay.LR}
${translate('GRA', languageCode)}: ${essay.GRA}

${translate('OVERALL_SCORE', languageCode)}: ${essay.overallBandScore}
      `;

      // Fetch all essays again to recreate the keyboard
      const essays = await Essay.find({ userId: userId.toString() }).sort({ submittedAt: -1 });
      const keyboard = essays.map((e, index) => [{
        text: e._id.toString() === essayId ? `✅ ${translate('ESSAY', languageCode)} ${index + 1}` : `${translate('ESSAY', languageCode)} ${index + 1}`,
        callback_data: `essay:${e._id}`
      }]);

      // Add a button to expand the current essay
      keyboard.push([{ text: translate('EXPAND_ESSAY', languageCode), callback_data: `expand:${essayId}` }]);

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });

      await bot.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
      console.error('Error fetching essay details:', error);
      const user = await User.findOne({ telegramId: userId.toString() });
      const languageCode = user?.language || 'en';
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: translate('ERROR_FETCHING_ESSAY_DETAILS', languageCode),
        show_alert: true
      });
    }
  });

  // Handle the expand button
  bot.on('callback_query', async (callbackQuery) => {
    if (!callbackQuery.data?.startsWith('expand:')) return;

    const chatId = callbackQuery.message?.chat.id;
    const userId = callbackQuery.from.id;
    if (!chatId) return;

    const user = await User.findOne({ telegramId: userId.toString() });
    const languageCode = user?.language || 'en';

    const essayId = callbackQuery.data.split(':')[1];
    try {
      const essay = await Essay.findById(essayId);
      if (!essay) {
        throw new Error('Essay not found');
      }

      const fullEssayText = `
${translate('FULL_ESSAY', languageCode)}:

${essay.essayText}
      `;

      await bot.answerCallbackQuery(callbackQuery.id);
      await bot.sendMessage(chatId, fullEssayText, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error expanding essay:', error);
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: translate('ERROR_EXPANDING_ESSAY', languageCode),
        show_alert: true
      });
    }
  });
};