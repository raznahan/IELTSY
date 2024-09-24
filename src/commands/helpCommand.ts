import TelegramBot from 'node-telegram-bot-api';
import { translate } from '../utils/i18n';
import { getUserLanguage } from '../utils/userLanguage';
import config from '../config';

export const helpCommand = async (bot: TelegramBot, chatId: number, userId: string, languageCode: string) => {
  const helpMessage = translate('HELP_MESSAGE', languageCode);
  const faqMessage = translate('FAQ', languageCode);
  const tutorialMessage = translate('TUTORIAL', languageCode);
  const contactMessage = translate('CONTACT_INFO', languageCode);
  const commandsMessage = translate('AVAILABLE_COMMANDS', languageCode);

  const fullHelpMessage = `
${helpMessage}

${faqMessage}

${tutorialMessage}

${commandsMessage}

${contactMessage}

${translate('BOT_USERNAME', languageCode, { username: config.botUsername || '' })}
  `;

  await bot.sendMessage(chatId, fullHelpMessage, { parse_mode: 'Markdown' });
};

export const setupHelpCommand = (bot: TelegramBot) => {
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    const languageCode = await getUserLanguage(userId);
    await helpCommand(bot, chatId, userId, languageCode);
  });
};