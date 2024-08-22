import TelegramBot from 'node-telegram-bot-api';
import { processText, processFile } from '../services/essayProcessingService'

export const submitCommand = (bot: TelegramBot) => {
  bot.onText(/\/submit/, async (msg) => {
    const userId = msg.chat.id.toString();
    bot.sendMessage(msg.chat.id, 'Please submit your essay text or upload a file.');

    bot.once('message', async (msg) => {
      try {
        if (msg.text && !msg.text.startsWith('/')) {
          await processText(msg.text, userId, bot, msg.chat.id);
        } else if (msg.document) {
          await processFile(msg.document, userId, bot, msg.chat.id);
        } else {
          bot.sendMessage(msg.chat.id, 'Invalid input. Please submit text or a valid file.');
        }
      } catch (error) {
        bot.sendMessage(msg.chat.id, 'There was an error processing your submission. Please try again.');
      }
    });
  });
};
