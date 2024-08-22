import TelegramBot from 'node-telegram-bot-api';
import { extractTextFromFile } from './fileProcessingService';
import { createThread, addMessageToThread, runAssistantWithStreaming } from './openAiService';
import Essay from '../models/essayModel';

export const processText = async (text: string): Promise<string> => {
    // Return the plain text directly
    return text;
};

export const processFile = async (document: TelegramBot.Document, bot: TelegramBot, chatId: number): Promise<string> => {
    // Extract text from the document
    const filePath = await bot.downloadFile(document.file_id, '/tmp');
    const extractedText = await extractTextFromFile(filePath);

    if (extractedText) {
        return extractedText;
    } else {
        throw new Error('Could not extract text from the file.');
    }
};
const saveEssay = async (userId: string, essayText: string, response: string) => {
    const newEssay = new Essay({
        userId,
        essay: essayText,
        feedback: response,
        score: extractScore(response)
    });

    await newEssay.save();
};

const extractScore = (text: string): number => {
    const match = text.match(/Score:\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
};
