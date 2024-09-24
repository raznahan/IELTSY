import TelegramBot from 'node-telegram-bot-api';
import User from '../models/userModel';
import Essay from '../models/essayModel';
import { translate } from '../utils/i18n';
import { getUserLanguage } from '../utils/userLanguage';

// This function sets up the /myessays command for the Telegram bot
export const setupMyEssaysCommand = (bot: TelegramBot) => {
  // Handle the /myessays command with an optional page number
  bot.onText(/\/myessays(?:\s+(\d+))?/, (msg, match) => handleMyEssays(bot, msg, match));

  // Handle callback queries for essay list navigation and essay details
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;
    const userId = callbackQuery.from.id;
    if (!chatId || !messageId) return;

    const data = callbackQuery.data;
    console.log('Received callback data:', data);

    const user = await User.findOne({ telegramId: userId.toString() });
    const languageCode = user?.language || 'en';

    try {
      // Handle different types of callback queries
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
        console.log('Unhandled callback data:', data);
      }
    } catch (error) {
      console.error('Error handling callback query:', error);
      await bot.sendMessage(chatId, translate('ERROR_PROCESSING', languageCode));
    }

    await bot.answerCallbackQuery(callbackQuery.id);
  });
};

// Function to handle /myessays command and menu option
export const handleMyEssays = async (bot: TelegramBot, msg: TelegramBot.Message, match?: RegExpExecArray | null) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const page = match && match[1] ? parseInt(match[1]) : 1;

  if (!userId) {
    await bot.sendMessage(chatId, translate('COULD_NOT_IDENTIFY_USER', 'en'));
    return;
  }

  const user = await User.findOne({ telegramId: userId.toString() });
  const languageCode = user?.language || 'en';

  await showEssayList(bot, chatId, null, userId.toString(), page, languageCode);
};

// Function to show the full essay text and scores
async function showExpandedEssay(bot: TelegramBot, chatId: number, messageId: number, essayId: string, currentPage: number, languageCode: string) {
  const essay = await Essay.findById(essayId);
  if (!essay) {
    await bot.editMessageText(translate('ESSAY_NOT_FOUND', languageCode), {
      chat_id: chatId,
      message_id: messageId
    });
    return;
  }

  // Prepare the message with full essay text and scores
  const message = `
${translate('FULL_ESSAY', languageCode)}:
${essay.essayText}

${translate('SCORES', languageCode)}:
${translate('TR', languageCode)}: ${essay.TR ?? 'N/A'}
${translate('CC', languageCode)}: ${essay.CC ?? 'N/A'}
${translate('LR', languageCode)}: ${essay.LR ?? 'N/A'}
${translate('GRA', languageCode)}: ${essay.GRA ?? 'N/A'}
${translate('OVERALL_SCORE', languageCode)}: ${essay.overallBandScore ?? 'N/A'}
  `;

  const keyboard = [
    [{ text: translate('BACK_TO_DETAILS', languageCode), callback_data: `essay:${essay._id}:${currentPage}` }],
    [{ text: translate('BACK_TO_LIST', languageCode), callback_data: `back_to_list:${currentPage}` }]
  ];

  // Edit the existing message with the full essay details
  await bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: keyboard },
    parse_mode: 'Markdown'
  });
}

// Function to display the list of essays with pagination
async function showEssayList(bot: TelegramBot, chatId: number, messageId: number | null, userId: string, page: number, languageCode: string) {
  const itemsPerPage = 10;
  const totalEssays = await Essay.countDocuments({ userId: userId.toString() });
  const totalPages = Math.ceil(totalEssays / itemsPerPage);

  // Ensure page is within valid range
  page = Math.max(1, Math.min(page, totalPages));

  // Fetch essays for the current page
  const essays = await Essay.find({ userId: userId.toString() })
    .sort({ submittedAt: -1 })
    .skip((page - 1) * itemsPerPage)
    .limit(itemsPerPage);

  console.log(`Fetched ${essays.length} essays for page ${page}`);

  // Create keyboard with essay buttons
  const keyboard = essays.map((essay, index) => [{
    text: `${translate('ESSAY', languageCode)} ${(page - 1) * itemsPerPage + index + 1} - ${essay.submittedAt.toLocaleDateString()}`,
    callback_data: `essay:${essay._id}:${page}`
  }]);

  // Add navigation buttons if necessary
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

  // Edit the existing message with the updated essay list
  const message = `${translate('HERE_ARE_YOUR_ESSAYS', languageCode)} (${translate('PAGE', languageCode)} ${page}/${totalPages})`;
  if (messageId) {
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: keyboard }
    });
  } else {
    await bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  }
}

// Function to display details of a specific essay
async function showEssayDetails(bot: TelegramBot, chatId: number, messageId: number, essayId: string, currentPage: number, languageCode: string) {
  console.log('Showing details for essay:', essayId, 'Page:', currentPage);
  const essay = await Essay.findById(essayId);
  if (!essay) {
    await bot.editMessageText(translate('ESSAY_NOT_FOUND', languageCode), {
      chat_id: chatId,
      message_id: messageId
    });
    return;
  }

  console.log('Essay details:', JSON.stringify(essay, null, 2));

  // Truncate essay text if it's too long
  const essayText = essay.essayText.length > 100 
    ? essay.essayText.substring(0, 100) + '...' 
    : essay.essayText;

  // Prepare the message with essay details and scores
  const message = `
${translate('ORIGINAL_ESSAY', languageCode)}:
${essayText}

${translate('SCORES', languageCode)}:
${translate('TR', languageCode)}: ${essay.TR ?? 'N/A'}
${translate('CC', languageCode)}: ${essay.CC ?? 'N/A'}
${translate('LR', languageCode)}: ${essay.LR ?? 'N/A'}
${translate('GRA', languageCode)}: ${essay.GRA ?? 'N/A'}
${translate('OVERALL_SCORE', languageCode)}: ${essay.overallBandScore ?? 'N/A'}

Submitted: ${essay.submittedAt.toLocaleDateString()}
  `;

  const keyboard = [
    [{ text: translate('EXPAND_ESSAY', languageCode), callback_data: `expand:${essay._id}:${currentPage}` }],
    [{ text: translate('BACK_TO_LIST', languageCode), callback_data: `back_to_list:${currentPage}` }]
  ];

  // Edit the existing message with the essay details
  await bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: keyboard },
    parse_mode: 'Markdown'
  });
}