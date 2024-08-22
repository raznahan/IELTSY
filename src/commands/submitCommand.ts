import TelegramBot from 'node-telegram-bot-api';
import { processText, processFile } from '../services/essayProcessingService';
import { getAssistantResponse } from '../services/openAiService';

export const submitCommand = (bot: TelegramBot) => {
  bot.onText(/\/submit/, async (msg) => {
    const userId = msg.chat.id.toString();
    bot.sendMessage(msg.chat.id, 'Please submit your essay text or upload a file.');

    bot.once('message', async (msg) => {
      try {
        let loadingMessage: TelegramBot.Message | undefined;
        let textToProcess: string | undefined;

        if (msg.text && !msg.text.startsWith('/')) {
          // Send a loading emoji
          loadingMessage = await bot.sendMessage(msg.chat.id, '⏳ Processing your essay...');
          textToProcess = await processText(msg.text);
        } else if (msg.document) {
          // Send a loading emoji
          loadingMessage = await bot.sendMessage(msg.chat.id, '⏳ Processing your file...');
          textToProcess = await processFile(msg.document, bot, msg.chat.id);
        } else {
          bot.sendMessage(msg.chat.id, 'Invalid input. Please submit text or a valid file.');
          return;
        }

        if (textToProcess) {
          const assistantId = 'your_assistant_id'; // Replace with your actual assistant ID
          const completeResponse = await getAssistantResponse(textToProcess, assistantId);

          // Update the loading message with the complete response
          if (loadingMessage) {
            await bot.editMessageText(completeResponse, {
              chat_id: msg.chat.id,
              message_id: loadingMessage.message_id,
            });
          }
        }
      } catch (error) {
        console.error('Error processing submission:', error);
        bot.sendMessage(msg.chat.id, 'There was an error processing your submission. Please try again.');
      }
    });
  });
};
