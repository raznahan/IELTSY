import TelegramBot from 'node-telegram-bot-api';
import User from '../models/userModel';
import Essay from '../models/essayModel';
import { translate } from '../utils/i18n';

export const myEssaysCommand = (bot: TelegramBot) => {
  bot.onText(/\/myessays(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const page = match && match[1] ? parseInt(match[1]) : 1;
    const itemsPerPage = 10;

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

      const totalEssays = await Essay.countDocuments({ userId: userId.toString() });
      const totalPages = Math.ceil(totalEssays / itemsPerPage);

      if (totalEssays === 0) {
        await bot.sendMessage(chatId, translate('NO_ESSAYS_SUBMITTED', languageCode));
        return;
      }

      const essays = await Essay.find({ userId: userId.toString() })
        .sort({ submittedAt: -1 })
        .skip((page - 1) * itemsPerPage)
        .limit(itemsPerPage);

      const keyboard = essays.map((essay, index) => [{
        text: `${translate('ESSAY', languageCode)} ${(page - 1) * itemsPerPage + index + 1} - ${essay.submittedAt.toLocaleDateString()}`,
        callback_data: `essay:${essay._id}`
      }]);

      // Add navigation buttons
      const navButtons = [];
      if (page > 1) {
        navButtons.push({ text: '⬅️ Previous', callback_data: `page:${page - 1}` });
      }
      if (page < totalPages) {
        navButtons.push({ text: 'Next ➡️', callback_data: `page:${page + 1}` });
      }
      if (navButtons.length > 0) {
        keyboard.push(navButtons);
      }

      const message = `${translate('HERE_ARE_YOUR_ESSAYS', languageCode)} (${translate('PAGE', languageCode)} ${page}/${totalPages})`;
      await bot.sendMessage(chatId, message, {
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
    console.log('Received callback data:', data); // Add this log

    const user = await User.findOne({ telegramId: userId.toString() });
    const languageCode = user?.language || 'en';

    try {
      if (data?.startsWith('page:')) {
        const page = parseInt(data.split(':')[1]);
        await showEssayList(bot, chatId, messageId, userId.toString(), page, languageCode);
      } else if (data?.startsWith('essay:')) {
        const [, essayId, currentPage] = data.split(':');
        await showEssayDetails(bot, chatId, messageId, essayId, parseInt(currentPage) || 1, languageCode);
      } else if (data?.startsWith('back_to_list:')) {
        const currentPage = parseInt(data.split(':')[1]) || 1;
        await showEssayList(bot, chatId, messageId, userId.toString(), currentPage, languageCode);
      } else if (data?.startsWith('expand:')) {
        const [, essayId, currentPage] = data.split(':');
        await showExpandedEssay(bot, chatId, messageId, essayId, parseInt(currentPage) || 1, languageCode);
      } else {
        console.log('Unhandled callback data:', data); // Add this log
      }
    } catch (error) {
      console.error('Error handling callback query:', error);
      await bot.sendMessage(chatId, translate('ERROR_PROCESSING', languageCode));
    }

    await bot.answerCallbackQuery(callbackQuery.id);
  });

  async function showExpandedEssay(bot: TelegramBot, chatId: number, messageId: number, essayId: string, currentPage: number, languageCode: string) {
    console.log('Showing expanded essay:', essayId, 'Page:', currentPage); // Add this log
    const essay = await Essay.findById(essayId);
    if (!essay) {
      await bot.editMessageText(translate('ESSAY_NOT_FOUND', languageCode), {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }

    const message = `
${translate('FULL_ESSAY', languageCode)}:
${essay.essayText}

${translate('SCORES', languageCode)}:
${translate('TR', languageCode)}: ${essay.TR}
${translate('CC', languageCode)}: ${essay.CC}
${translate('LR', languageCode)}: ${essay.LR}
${translate('GRA', languageCode)}: ${essay.GRA}
${translate('OVERALL_SCORE', languageCode)}: ${essay.overallBandScore}
  `;

    const keyboard = [
      [{ text: translate('BACK_TO_DETAILS', languageCode), callback_data: `essay:${essay._id}:${currentPage}` }],
      [{ text: translate('BACK_TO_LIST', languageCode), callback_data: `back_to_list:${currentPage}` }]
    ];

    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: keyboard },
      parse_mode: 'Markdown'
    });
  }

  async function showEssayList(bot: TelegramBot, chatId: number, messageId: number, userId: string, page: number, languageCode: string) {
    const itemsPerPage = 10;
    const totalEssays = await Essay.countDocuments({ userId: userId.toString() });
    const totalPages = Math.ceil(totalEssays / itemsPerPage);

    const essays = await Essay.find({ userId: userId.toString() })
      .sort({ submittedAt: -1 })
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage);

    const keyboard = essays.map((essay, index) => [{
      text: `${translate('ESSAY', languageCode)} ${(page - 1) * itemsPerPage + index + 1} - ${essay.submittedAt.toLocaleDateString()}`,
      callback_data: `essay:${essay._id}:${page}`
    }]);

    // Add navigation buttons
    const navButtons = [];
    if (page > 1) {
      navButtons.push({ text: '⬅️ Previous', callback_data: `page:${page - 1}` });
    }
    if (page < totalPages) {
      navButtons.push({ text: 'Next ➡️', callback_data: `page:${page + 1}` });
    }
    if (navButtons.length > 0) {
      keyboard.push(navButtons);
    }

    const message = `${translate('HERE_ARE_YOUR_ESSAYS', languageCode)} (${translate('PAGE', languageCode)} ${page}/${totalPages})`;
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  async function showEssayDetails(bot: TelegramBot, chatId: number, messageId: number, essayId: string, currentPage: number, languageCode: string) {
    const essay = await Essay.findById(essayId);
    if (!essay) {
      await bot.editMessageText(translate('ESSAY_NOT_FOUND', languageCode), {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }

    const essayText = essay.essayText.length > 100 
      ? essay.essayText.substring(0, 100) + '...' 
      : essay.essayText;

    const message = `
${translate('ORIGINAL_ESSAY', languageCode)}:
${essayText}

${translate('SCORES', languageCode)}:
${translate('TR', languageCode)}: ${essay.TR}
${translate('CC', languageCode)}: ${essay.CC}
${translate('LR', languageCode)}: ${essay.LR}
${translate('GRA', languageCode)}: ${essay.GRA}
${translate('OVERALL_SCORE', languageCode)}: ${essay.overallBandScore}
  `;

    const keyboard = [
      [{ text: translate('EXPAND_ESSAY', languageCode), callback_data: `expand:${essay._id}:${currentPage}` }],
      [{ text: translate('BACK_TO_LIST', languageCode), callback_data: `back_to_list:${currentPage}` }]
    ];

    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: keyboard }
    });
  }
};