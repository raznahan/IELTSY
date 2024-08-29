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

export const saveEssay = async (userId: string, essayText: string, aiResponse: string) => {
    const essayType = parseEssayType(aiResponse);
    const overallBandScore = parseOverallBandScore(aiResponse);
    const criteriaScores = parseCriteriaScores(aiResponse);

    const newEssay = new Essay({
        userId,
        essayText,
        feedback: aiResponse,
        essayType,
        overallBandScore,
        TR: criteriaScores.TR,
        CC: criteriaScores.CC,
        LR: criteriaScores.LR,
        GRA: criteriaScores.GRA,
        submittedAt: new Date()
    });

    try {
        await newEssay.save();
        console.log('Essay saved successfully');
    } catch (error) {
        console.error('Error saving essay:', error);
        throw error; // Re-throw the error to be handled by the caller
    }
};

function parseEssayType(aiResponse: string): string {
    const match = aiResponse.match(/This is an IELTS (.+)/);
    return match ? match[1] : 'Unknown';
}

function parseOverallBandScore(aiResponse: string): number {
    const match = aiResponse.match(/Overall Band Score: (\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
}

function parseCriteriaScores(aiResponse: string): {
    TR: number;
    CC: number;
    LR: number;
    GRA: number;
} {
    const scores = {
        TR: 0,
        CC: 0,
        LR: 0,
        GRA: 0
    };

    const criteriaRegex = {
        TR: /Task Response \(Band (\d+(\.\d+)?)\)/,
        CC: /Coherence and Cohesion \(Band (\d+(\.\d+)?)\)/,
        LR: /Lexical Resource \(Band (\d+(\.\d+)?)\)/,
        GRA: /Grammatical Range and Accuracy \(Band (\d+(\.\d+)?)\)/
    };

    for (const [criterion, regex] of Object.entries(criteriaRegex)) {
        const match = aiResponse.match(regex);
        if (match) {
            scores[criterion as keyof typeof scores] = parseFloat(match[1]);
        }
    }

    return scores;
}

const extractScore = (text: string): number => {
    const match = text.match(/Score:\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
};
