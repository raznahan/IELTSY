import TelegramBot from 'node-telegram-bot-api';
import { processText, processFile } from '../services/essayProcessingService';
import { getAssistantResponse } from '../services/openAiService';

function isLikelyCompleteEssay(text: string): boolean {
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).length - 1;
    const paragraphCount = text.split(/\n\n/).length;

    return wordCount >= 200 && sentenceCount >= 4 && paragraphCount >= 1;
}

function splitMessage(text: string, maxLength: number = 4096): string[] {
    const parts = [];
    let currentPart = '';

    text.split('\n').forEach((line) => {
        if ((currentPart + line).length > maxLength) {
            parts.push(currentPart);
            currentPart = '';
        }
        currentPart += line + '\n';
    });

    if (currentPart.length > 0) {
        parts.push(currentPart);
    }

    return parts;
}

export const submitCommand = (bot: TelegramBot) => {
    bot.onText(/\/submit/, async (msg) => {
        const userId = msg.chat.id.toString();
        bot.sendMessage(msg.chat.id, 'Please submit your essay text or upload a file.');
        let loadingMessage: TelegramBot.Message | undefined;
        let textToProcess: string | undefined;
        bot.once('message', async (msg) => {
            try {


                if (msg.text && !msg.text.startsWith('/')) {
                    if (isLikelyCompleteEssay(msg.text)) {
                        loadingMessage = await bot.sendMessage(msg.chat.id, '⏳ Processing your essay...');
                        textToProcess = msg.text;
                    } else {
                        bot.sendMessage(msg.chat.id, "It seems like the text you submitted might not be a complete IELTS essay. Please ensure your submission meets the requirements so I can provide a detailed analysis.");
                        return;
                    }
                } else if (msg.document) {
                    loadingMessage = await bot.sendMessage(msg.chat.id, '⏳ Processing your file...');
                    textToProcess = await processFile(msg.document, bot, msg.chat.id);
                }

                if (textToProcess) {
                    const assistantId = process.env.OPENAI_ASSISTANT_ID!;
                    const completeResponse = await getAssistantResponse(textToProcess, assistantId);

                    if (loadingMessage) {
                        const messageParts = splitMessage(completeResponse);

                        // Update the loading message with the first part
                        await bot.editMessageText(messageParts[0], {
                            chat_id: msg.chat.id,
                            message_id: loadingMessage.message_id,
                        });

                        // Send the remaining parts as new messages
                        for (let i = 1; i < messageParts.length; i++) {
                            await bot.sendMessage(msg.chat.id, messageParts[i]);
                        }
                    }
                }
            } catch (error) {
                console.error('Error processing submission:', error);
                if (loadingMessage) {
                    await bot.editMessageText('There was an error processing your submission. Please try again.', {
                        chat_id: msg.chat.id,
                        message_id: loadingMessage.message_id,
                    });
                } else {
                    bot.sendMessage(msg.chat.id, 'There was an error processing your submission. Please try again.');
                }
            }
        });
    });
};
