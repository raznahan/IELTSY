import TelegramBot from 'node-telegram-bot-api';
import { processText, processFile } from '../services/essayProcessingService';
import { getAssistantResponse } from '../services/openAiService';

function isLikelyCompleteEssay(text: string): boolean {
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).length - 1;
    const paragraphCount = text.split(/\n\n/).length;

    return wordCount >= 200 && sentenceCount >= 4 && paragraphCount >= 1;
}


export const submitCommand = (bot: TelegramBot) => {
    bot.onText(/\/submit/, async (msg) => {
        const userId = msg.chat.id.toString();
        bot.sendMessage(msg.chat.id, 'Please submit your essay text along with the essay prompt or upload a file.');

        bot.once('message', async (msg) => {
            try {
                let loadingMessage: TelegramBot.Message | undefined;
                let textToProcess: string | undefined;

                if (msg.text && !msg.text.startsWith('/')) {
                    textToProcess = await processText(msg.text);

                    if (isLikelyCompleteEssay(textToProcess)) {
                        loadingMessage = await bot.sendMessage(msg.chat.id, '⏳ Processing your essay...');
                        const assistantId = process.env.OPENAI_ASSISTANT_ID!;
                        const completeResponse = await getAssistantResponse(textToProcess, assistantId);
                        if (loadingMessage) {
                            await bot.editMessageText(completeResponse, {
                                chat_id: msg.chat.id,
                                message_id: loadingMessage.message_id,
                            });
                        }
                    } else {
                        bot.sendMessage(msg.chat.id, "It seems like the text you submitted might not be a complete IELTS essay. Please ensure your submission meets the requirements so I can provide a detailed analysis.");
                    }
                } else if (msg.document) {
                    loadingMessage = await bot.sendMessage(msg.chat.id, '⏳ Processing your file...');
                    textToProcess = await processFile(msg.document, bot, msg.chat.id);

                    if (isLikelyCompleteEssay(textToProcess)) {
                        const assistantId = 'your_assistant_id';
                        const completeResponse = await getAssistantResponse(textToProcess, assistantId);
                        if (loadingMessage) {
                            await bot.editMessageText(completeResponse, {
                                chat_id: msg.chat.id,
                                message_id: loadingMessage.message_id,
                            });
                        }
                    } else {
                        bot.sendMessage(msg.chat.id, "It seems like the text you submitted might not be a complete IELTS essay. Please ensure your submission meets the requirements so I can provide a detailed analysis.");
                    }
                } else {
                    bot.sendMessage(msg.chat.id, 'Invalid input. Please submit text or a valid file.');
                }
            } catch (error) {
                console.error('Error processing submission:', error);
                bot.sendMessage(msg.chat.id, 'There was an error processing your submission. Please try again.');
            }
        });
    });
};
