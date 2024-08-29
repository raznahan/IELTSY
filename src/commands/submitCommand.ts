import TelegramBot from 'node-telegram-bot-api';
import config from '../config';
import User from '../models/userModel';
import Essay from '../models/essayModel';
import { processFile } from '../services/essayProcessingService';
import { getAssistantResponse, getOrCreateThreadId, addMessageToThread, createThread } from '../services/openAiService';
import { saveUserThreadId } from '../services/userService';
import { translate } from '../utils/i18n';
import { getUserLanguage } from '../utils/userLanguage';
import { saveEssay } from '../services/essayProcessingService';

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

function escapeMarkdownV2(text: string): string {
    return text
        // Escape characters that are used for MarkdownV2 formatting if they are not part of Markdown formatting.
        .replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')
        // Don't escape Markdown characters that are actually part of Markdown syntax.
        .replace(/\\([\*_])/g, '$1');
}

export const submitCommand = (bot: TelegramBot) => {
    bot.onText(/\/submit/, async (msg) => {
        const userId = msg.chat.id.toString();
        const userLanguage = await getUserLanguage(userId);

        await bot.sendMessage(msg.chat.id, translate('submit_prompt', userLanguage));
        let textToProcess: string | undefined;
        let loadingMessage: TelegramBot.Message | undefined;

        bot.once('message', async (msg) => {
            try {
                if (msg.text && !msg.text.startsWith('/')) {
                    if (isLikelyCompleteEssay(msg.text)) {
                        loadingMessage = await bot.sendMessage(msg.chat.id, translate('processing_essay', userLanguage));
                        textToProcess = msg.text;
                    } else {
                        await bot.sendMessage(msg.chat.id, translate('incomplete_essay', userLanguage));
                        return;
                    }
                } else if (msg.document) {
                    loadingMessage = await bot.sendMessage(msg.chat.id, translate('processing_essay', userLanguage));
                    textToProcess = await processFile(msg.document, bot, msg.chat.id);
                    if (!isLikelyCompleteEssay(textToProcess)) {
                        await bot.sendMessage(msg.chat.id, translate('incomplete_essay', userLanguage));
                        return;
                    }
                }

                if (textToProcess) {
                    const assistantId = process.env.OPENAI_ASSISTANT_ID!;
                    let threadId = await getOrCreateThreadId(userId); // Function to get existing thread or create a new one if necessary
                    let completeResponse;

                    try {
                        // Try to add message and run assistant
                        await addMessageToThread(threadId, textToProcess);
                        if (process.env.TEST_MODE)
                            completeResponse = "TEST MODE"
                        else completeResponse = await getAssistantResponse(threadId, assistantId);
                        await saveEssay(userId, textToProcess, completeResponse);
                    } catch (error) {
                        if (error instanceof Error) {
                            if (error.message.includes('thread not found') || error.message.includes('expired thread')) {
                                // If thread is invalid, create a new thread and retry
                                threadId = await createThread();
                                await saveUserThreadId(userId, threadId); // Save new threadId to database or state
                                await addMessageToThread(threadId, textToProcess);
                                completeResponse = await getAssistantResponse(threadId, assistantId);
                            } else {
                                throw error; // Re-throw if it's a different error
                            }
                        } else {
                            console.error('Unexpected error type:', error);
                            throw error; // Re-throw the unexpected error
                        }
                    }

                    const escapedResponse = escapeMarkdownV2(completeResponse);
                    const messageParts = splitMessage(escapedResponse);

                    if (loadingMessage) {
                        await bot.editMessageText(messageParts[0], {
                            chat_id: msg.chat.id,
                            message_id: loadingMessage.message_id,
                            parse_mode: 'MarkdownV2',
                        });
                    }
                    for (let i = 1; i < messageParts.length; i++) {
                        await bot.sendMessage(msg.chat.id, messageParts[i], { parse_mode: 'MarkdownV2' });
                    }
                }
            } catch (error) {
                console.error('Error processing submission:', error);
                const errorMessage = translate('error_processing', userLanguage);
                if (loadingMessage) {
                    await bot.editMessageText(errorMessage, {
                        chat_id: msg.chat.id,
                        message_id: loadingMessage.message_id
                    });
                } else {
                    await bot.sendMessage(msg.chat.id, errorMessage);
                }
            }
        });
    });
};

