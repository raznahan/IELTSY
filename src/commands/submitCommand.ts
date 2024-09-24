import TelegramBot from 'node-telegram-bot-api';
import { processFile } from '../services/essayProcessingService';
import { getAssistantResponse, getOrCreateThreadId, addMessageToThread, createThread } from '../services/openAiService';
import { saveUserThreadId } from '../services/userService';
import { translate } from '../utils/i18n';
import { getUserLanguage } from '../utils/userLanguage';
import { saveEssay, parseAIResponse } from '../services/essayProcessingService';
import { checkMilestones } from '../services/analyticsService';
/**
 * Checks if the given text is likely to be a complete essay based on word count,
 * sentence count, and paragraph count.
 * @param text The text to analyze
 * @returns True if the text meets the criteria for a complete essay, false otherwise
 */
function isLikelyCompleteEssay(text: string): boolean {
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).length - 1;
    const paragraphCount = text.split(/\n\n/).length;

    return wordCount >= 200 && sentenceCount >= 4 && paragraphCount >= 1;
}

/**
 * Splits a long message into smaller chunks for Telegram, preserving Markdown formatting.
 * @param text The text to split
 * @param maxLength Maximum length of each chunk (default: 4096 characters)
 * @returns An array of message chunks
 */
function splitMessage(text: string, maxLength: number = 4096): string[] {
    const messages: string[] = [];
    let position = 0;
    let reopenTags = '';

    while (position < text.length) {
        let chunk = text.substr(position, maxLength);
        let nextPosition = position + chunk.length;

        // Check if we need to adjust the chunk to avoid splitting in the middle of a formatting tag
        const lastOpenTagIndex = findLastOpenTagIndex(chunk);

        if (lastOpenTagIndex !== -1 && nextPosition < text.length) {
            // Adjust chunk to end before the last open tag
            chunk = chunk.substr(0, lastOpenTagIndex);
            nextPosition = position + chunk.length;
        }

        // Close any open tags in the chunk
        const { adjustedChunk, unclosedTags } = closeOpenTags(chunk);

        // Prepend any tags that need to be reopened (from previous chunks)
        const message = reopenTags + adjustedChunk;

        // Update reopenTags for the next chunk
        reopenTags = unclosedTags.map(tag => tag.char).join('');

        messages.push(message);

        position = nextPosition;
    }

    return messages;
}

/**
 * Finds the index of the last open formatting tag in the text. so the message is not cut off in the middle of a tag when sent in Telegram.
 * @param text The text to analyze
 * @returns The index of the last open tag, or -1 if no open tags are found
 */
function findLastOpenTagIndex(text: string): number {
    const formattingChars = ['*', '_', '~', '`'];
    const openTagsStack: { char: string; index: number }[] = [];

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (formattingChars.includes(char)) {
            if (openTagsStack.length > 0 && openTagsStack[openTagsStack.length - 1].char === char) {
                // Closing tag found
                openTagsStack.pop();
            } else {
                // Opening tag found
                openTagsStack.push({ char, index: i });
            }
        }
    }

    if (openTagsStack.length > 0) {
        // Return the index of the last open tag
        return openTagsStack[openTagsStack.length - 1].index;
    } else {
        return -1;
    }
}

/**
 * Closes any open formatting tags at the end of the text.
 * @param text The text to process
 * @returns An object containing the adjusted text with closed tags and any unclosed tags
 */
function closeOpenTags(text: string) {
    const formattingChars = ['*', '_', '~', '`'];
    const openTagsStack: { char: string }[] = [];
    const adjustedText = [];
    let i = 0;

    while (i < text.length) {
        const char = text[i];

        if (formattingChars.includes(char)) {
            if (openTagsStack.length > 0 && openTagsStack[openTagsStack.length - 1].char === char) {
                // Closing tag found
                openTagsStack.pop();
            } else {
                // Opening tag found
                openTagsStack.push({ char });
            }
        }

        adjustedText.push(char);
        i++;
    }

    // Close any unclosed tags at the end of the text
    const unclosedTags = openTagsStack.slice();
    while (openTagsStack.length > 0) {
        const tag = openTagsStack.pop();
        adjustedText.push(tag!.char);
    }

    return { adjustedChunk: adjustedText.join(''), unclosedTags };
}

/**
 * Converts OpenAI-flavored Markdown to Telegram-compatible Markdown.
 * @param text The text to convert
 * @returns The converted text with Telegram-compatible Markdown
 */
function convertToTelegramMarkdown(text: string): string {
    // Maps to store placeholders and their content
    const placeholders: { [key: string]: string } = {};

    // Function to generate a unique placeholder
    function generatePlaceholder(): string {
        return `PLACEHOLDER_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Step 1: Replace bold (**text**) with placeholders
    text = text.replace(/\*\*([\s\S]+?)\*\*/g, (match, p1) => {
        const placeholder = generatePlaceholder();
        placeholders[placeholder] = `*${p1}*`;
        return placeholder;
    });

    // Step 2: Replace italic (*text*) with placeholders
    text = text.replace(/\*([\s\S]+?)\*/g, (match, p1) => {
        const placeholder = generatePlaceholder();
        placeholders[placeholder] = `_${p1}_`;
        return placeholder;
    });

    // Step 3: Escape special characters in the text (excluding placeholders)
    // Exclude asterisks (*) and underscores (_) since they are used for formatting
    const specialChars = ['\\', '`', '[', ']', '(', ')', '~', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
    const specialCharsRegex = new RegExp(`([${specialChars.map(c => '\\' + c).join('')}])`, 'g');

    // Temporarily replace placeholders with tokens to protect them during escaping
    const tokens: { [key: string]: string } = {};
    for (const placeholder in placeholders) {
        const token = generatePlaceholder();
        tokens[token] = placeholder;
        text = text.replace(new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), token);
    }

    // Escape special characters in the text
    text = text.replace(specialCharsRegex, '\\$1');

    // Restore placeholders from tokens
    for (const token in tokens) {
        const placeholder = tokens[token];
        text = text.replace(new RegExp(token, 'g'), placeholder);
    }

    // Step 4: Replace placeholders with their formatted content
    for (const placeholder in placeholders) {
        const value = placeholders[placeholder];
        // Escape special characters in the value, excluding formatting markers (* and _)
        const escapedValue = value.replace(/([\\`\[\]()~>#+\-=|{}.!])/g, '\\$1');
        text = text.replace(new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), escapedValue);
    }

    // Step 5: Escape hyphens and plus signs at the start of lines
    text = text.replace(/^([\-+])/gm, '\\$1');

    // Step 6: Normalize line breaks
    text = text.replace(/\r\n/g, '\n');

    return text;
}


/**
 * Handles the /submit command for essay submission and evaluation.
 * @param bot The Telegram bot instance
 */
export const submitCommand = (bot: TelegramBot) => {
    bot.onText(/\/submit/, async (msg) => {
        const userId = msg.chat.id.toString();
        const userLanguage = await getUserLanguage(userId);

        await bot.sendMessage(msg.chat.id, translate('submit_prompt', userLanguage));
        let textToProcess: string | undefined;
        let loadingMessage: TelegramBot.Message | undefined;
        let responseSent = false;

        // Listen for the user's response (essay submission)
        bot.once('message', async (msg) => {
            try {
                // Check if the submitted content is text or a document
                if (msg.text && !msg.text.startsWith('/')) {
                    // Process text submission
                    if (isLikelyCompleteEssay(msg.text)) {
                        loadingMessage = await bot.sendMessage(msg.chat.id, translate('processing_essay', userLanguage));
                        textToProcess = msg.text;
                    } else {
                        await bot.sendMessage(msg.chat.id, translate('incomplete_essay', userLanguage));
                        return;
                    }
                } else if (msg.document) {
                    // Process document submission
                    loadingMessage = await bot.sendMessage(msg.chat.id, translate('processing_essay', userLanguage));
                    textToProcess = await processFile(msg.document, bot, msg.chat.id);
                    if (!isLikelyCompleteEssay(textToProcess)) {
                        await bot.sendMessage(msg.chat.id, translate('incomplete_essay', userLanguage));
                        return;
                    }
                }

                if (textToProcess) {
                    // Process the essay using OpenAI assistant
                    const assistantId = process.env.OPENAI_ASSISTANT_ID!;
                    let threadId = await getOrCreateThreadId(userId);
                    let completeResponse;
                    let essay;
                    let overallBandScore;

                    try {
                        // Add message to thread and get assistant response
                        await addMessageToThread(threadId, textToProcess);
                        if (process.env.TEST_MODE == "true")
                            completeResponse = "TEST MODE"
                        else
                            completeResponse = await getAssistantResponse(threadId, assistantId);

                        console.log("completeResponse: ", completeResponse);
                        
                        // Parse the AI response and save the essay
                        const { aiResponse, essayData } = parseAIResponse(completeResponse);
                        essay = await saveEssay(userId, textToProcess, aiResponse, essayData);
                        if (!essay) {
                            throw new Error('Failed to save essay');
                        }

                        overallBandScore = essayData.overall;

                        // Check for milestones and send milestone messages
                        const milestoneMessages = await checkMilestones(userId, overallBandScore, userLanguage);
                        if ((milestoneMessages ?? []).length > 0) {
                            await bot.sendMessage(msg.chat.id, milestoneMessages!.join('\n'));
                        }

                        // Format and send the AI response
                        const escapedResponse = convertToTelegramMarkdown(aiResponse);
                        const messageParts = splitMessage(escapedResponse);

                        for (let i = 0; i < messageParts.length; i++) {
                            if (i === 0 && loadingMessage) {
                                await bot.editMessageText(messageParts[i], {
                                    chat_id: msg.chat.id,
                                    message_id: loadingMessage.message_id,
                                    parse_mode: 'MarkdownV2',
                                });
                            } else {
                                await bot.sendMessage(msg.chat.id, messageParts[i], { parse_mode: 'MarkdownV2' });
                            }
                        }
                        responseSent = true;

                    } catch (error) {
                        // Handle errors, including expired threads
                        if (error instanceof Error) {
                            if (error.message.includes('thread not found') || error.message.includes('expired thread')) {
                                // If thread is invalid, create a new thread and retry
                                threadId = await createThread();
                                await saveUserThreadId(userId, threadId);
                                await addMessageToThread(threadId, textToProcess);
                                completeResponse = await getAssistantResponse(threadId, assistantId);
                            } else {
                                throw error;
                            }
                        } else {
                            console.error('Unexpected error type:', error);
                            throw error;
                        }
                    }

                    // Check for milestones again (in case of retry)
                    const milestoneMessages = await checkMilestones(userId, overallBandScore, userLanguage);
                    if ((milestoneMessages ?? []).length > 0) {
                        await bot.sendMessage(msg.chat.id, milestoneMessages!.join('\n'));
                    }
                }
            } catch (error) {
                // Handle and report any errors during processing
                console.error('Error processing submission:', error);
                const errorMessage = translate('error_processing', userLanguage);

                if (!responseSent) {
                    if (loadingMessage) {
                        await bot.editMessageText(errorMessage, {
                            chat_id: msg.chat.id,
                            message_id: loadingMessage.message_id
                        });
                    } else {
                        await bot.sendMessage(msg.chat.id, errorMessage);
                    }
                } else {
                    // If response was already sent, send error as a new message
                    await bot.sendMessage(msg.chat.id, errorMessage);
                }
            }
        });
    });
};
