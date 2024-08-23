import TelegramBot from 'node-telegram-bot-api';
import { extractTextFromFile } from './fileProcessingService';
import Essay from '../models/essayModel';
import fs from 'fs';
import path from 'path';

export const processText = async (text: string): Promise<string> => {
    // Return the plain text directly
    return text;
};

export const processFile = async (
    document: TelegramBot.Document, 
    bot: TelegramBot, 
    chatId: number
  ): Promise<string> => {
    try {
      const filePath = path.join(__dirname, '../tmp/', document.file_name || 'uploaded_file');
  
      // Ensure the temporary directory exists
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }
  
      // Download the file and save it locally
      const downloadedFilePath = await bot.downloadFile(document.file_id, path.dirname(filePath));
      console.log(`File downloaded to ${downloadedFilePath}`);
  
      // Extract text from the file
      const extractedText = await extractTextFromFile(downloadedFilePath);
  
      if (extractedText) {
        return extractedText;
      } else {
        throw new Error('Could not extract text from the file.');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      throw new Error('There was an error processing your file. Please try again.');
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
