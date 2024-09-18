import TelegramBot from 'node-telegram-bot-api';
import config from '../config';
import User from '../models/userModel';
import Essay from '../models/essayModel';
import { processFile } from '../services/essayProcessingService';
import { getAssistantResponse, getOrCreateThreadId, addMessageToThread, createThread } from '../services/openAiService';
import { saveUserThreadId } from '../services/userService';
import { translate } from '../utils/i18n';
import { getUserLanguage } from '../utils/userLanguage';
import { saveEssay, parseAIResponse } from '../services/essayProcessingService';
import { getScoresOverTime, getTaskSpecificScores, getErrorHeatmap, checkMilestones } from '../services/analyticsService';
import { createChart } from '../utils/chartGenerator'; // You'll need to implement this

function isLikelyCompleteEssay(text: string): boolean {
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).length - 1;
    const paragraphCount = text.split(/\n\n/).length;

    return wordCount >= 200 && sentenceCount >= 4 && paragraphCount >= 1;
}

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


function escapeMarkdownV2(text: string): string {
    return text
        // Escape characters that are used for MarkdownV2 formatting if they are not part of Markdown formatting.
        .replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1')
        // Don't escape Markdown characters that are actually part of Markdown syntax.
        .replace(/\\([*_])/g, '$1');
}

function convertToTelegramMarkdown(text: string): string {
    // Maps to store placeholders and their content
    const placeholders: { [key: string]: string } = {};
    let placeholderIndex = 0;

    // Step 0: Convert headings (### Heading) to bold text
    text = text.replace(/^### (.+)$/gm, (match, p1) => {
        const placeholder = `HEADING_PLACEHOLDER_${placeholderIndex++}`;
        placeholders[placeholder] = `*${p1.trim()}*`;
        return placeholder;
    });

    // Step 1: Replace bold (**text**) with placeholders
    text = text.replace(/\*\*([\s\S]+?)\*\*/g, (match, p1) => {
        const placeholder = `BOLD_PLACEHOLDER_${placeholderIndex++}`;
        placeholders[placeholder] = `*${p1}*`;
        return placeholder;
    });

    // Step 2: Replace italic (*text*) with placeholders
    text = text.replace(/\*([\s\S]+?)\*/g, (match, p1) => {
        const placeholder = `ITALIC_PLACEHOLDER_${placeholderIndex++}`;
        placeholders[placeholder] = `_${p1}_`;
        return placeholder;
    });

    // Step 3: Escape special characters in the text (excluding placeholders)
    // Exclude asterisks (*) and underscores (_) since they are used for formatting
    const specialChars = ['\\', '[', ']', '(', ')', '~', '`', '>', '+', '-', '=', '|', '{', '}', '.', '!'];
    const specialCharsRegex = new RegExp(`([${specialChars.map(c => '\\' + c).join('')}])`, 'g');
    text = text.replace(specialCharsRegex, '\\$1');

    // Step 4: Replace placeholders with their formatted content
    for (const placeholder in placeholders) {
        const value = placeholders[placeholder];
        // Escape special characters in the value, excluding formatting markers (* and _)
        const escapedValue = value.replace(/([\\\[\]()~`>#+\-=|{}.!])/g, '\\$1');
        text = text.replace(placeholder, escapedValue);
    }

    // Step 5: Escape hyphens and plus signs at the start of lines
    text = text.replace(/^([\-+])/gm, '\\$1');

    // Step 6: Normalize line breaks
    text = text.replace(/\r\n/g, '\n');

    return text;
}





function parseErrors(completeResponse: string): { [key: string]: string[] } {
    const errorCategories = ['TR', 'CC', 'LR', 'GRA'];
    const errors: { [key: string]: string[] } = {};

    errorCategories.forEach(category => {
        const regex = new RegExp(`${category}\\d+`, 'g');
        const matches = completeResponse.match(regex);
        if (matches) {
            errors[category] = matches;
        }
    });

    return errors;
}

export const submitCommand = (bot: TelegramBot) => {
    bot.onText(/\/submit/, async (msg) => {
        const userId = msg.chat.id.toString();
        const userLanguage = await getUserLanguage(userId);

        await bot.sendMessage(msg.chat.id, translate('submit_prompt', userLanguage));
        let textToProcess: string | undefined;
        let loadingMessage: TelegramBot.Message | undefined;
        let responseSent = false;

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
                    let essay;
                    let overallBandScore;

                    try {
                        // Try to add message and run assistant
                        await addMessageToThread(threadId, textToProcess);
                        if (process.env.TEST_MODE == "true")
                            completeResponse = "TEST MODE"
                        else completeResponse = await getAssistantResponse(threadId, assistantId);

                        console.log("completeResponse: ", completeResponse);
                        // Parse the AI response
                        const { aiResponse, essayData } = parseAIResponse(completeResponse);

                        essay = await saveEssay(userId, textToProcess, aiResponse, essayData);
                        if (!essay) {
                            throw new Error('Failed to save essay');
                        }

                        // Extract overall band score from essayData
                        overallBandScore = essayData.overall;

                        // Check for milestones
                        const milestoneMessages = await checkMilestones(userId, overallBandScore, userLanguage);
                        if ((milestoneMessages ?? []).length > 0) {
                            await bot.sendMessage(msg.chat.id, milestoneMessages!.join('\n'));
                        }

                        const escapedResponse = convertToTelegramMarkdown(aiResponse);
                        const messageParts = splitMessage(escapedResponse);

                        // Send all parts of the response
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


                        // Generate and send charts
                        await sendAnalytics(bot, msg.chat.id, userId, userLanguage);

                        // Add option to share results
                        const keyboard = {
                            inline_keyboard: [
                                [{ text: translate('SHARE_RESULTS', userLanguage), callback_data: `share:${essay?._id ?? 'unknown'}` }]
                            ]
                        };
                        await bot.sendMessage(msg.chat.id, translate('SHARE_OPTION', userLanguage), { reply_markup: keyboard });
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

                    // Check for milestones
                    const milestoneMessages = await checkMilestones(userId, overallBandScore, userLanguage);
                    if ((milestoneMessages ?? []).length > 0) {
                        await bot.sendMessage(msg.chat.id, milestoneMessages!.join('\n'));
                    }
                }
            } catch (error) {
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

    // Handle share callback
    bot.on('callback_query', async (query) => {
        if (query.message?.chat.id) {
            const userId = query.message.chat.id.toString();
            const userLanguage = await getUserLanguage(userId);
            if (query.data && query.data.startsWith('share:')) {
                const essayId = query.data.split(':')[1];
                const essay = await Essay.findById(essayId);
                if (essay) {
                    const shareMessage = `
                        I just completed an IELTS essay!
                        Overall Score: ${essay.overallBandScore}
                        TR: ${essay.TR}, CC: ${essay.CC}, LR: ${essay.LR}, GRA: ${essay.GRA}
                    `;
                    await bot.answerCallbackQuery(query.id, { text: translate('SHARE_SUCCESS', userLanguage) });
                    await bot.sendMessage(query.message?.chat.id, shareMessage);
                }
            }
        }
    });

    async function sendAnalytics(bot: TelegramBot, chatId: number, userId: string, userLanguage: string) {
        try {
            const scoresOverTime = await getScoresOverTime(userId);
            const scoreChart = await createChart(scoresOverTime, 'line', 'Scores Over Time');
            await bot.sendPhoto(chatId, scoreChart);

            const taskScores = await getTaskSpecificScores(userId);
            const taskChart = await createChart(taskScores, 'bar', 'Task-Specific Scores');
            await bot.sendPhoto(chatId, taskChart);

            const errorHeatmap = await getErrorHeatmap(userId);
            const heatmapChart = await createChart(errorHeatmap, 'heatmap', 'Error Heatmap');
            await bot.sendPhoto(chatId, heatmapChart);
        } catch (error) {
            console.error('Error sending analytics:', error);
            await bot.sendMessage(chatId, translate('error_analytics', userLanguage));
        }
    }
};
