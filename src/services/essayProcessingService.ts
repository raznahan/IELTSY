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

export const parseAIResponse = (completeResponse: string): { aiResponse: string, essayData: any } => {
 
  // Find the start of the JSON block
  const jsonStartMarker = '```json';
  const jsonStartIndex = completeResponse.indexOf(jsonStartMarker);
  
  if (jsonStartIndex === -1) {
    throw new Error('JSON data not found in AI response');
  }

  // Find the end of the JSON block
  const jsonEndMarker = '```';
  const jsonEndIndex = completeResponse.indexOf(jsonEndMarker, jsonStartIndex + jsonStartMarker.length);

  if (jsonEndIndex === -1) {
    throw new Error('End of JSON data not found in AI response');
  }

  // Extract the JSON string
  const jsonString = completeResponse.substring(jsonStartIndex + jsonStartMarker.length, jsonEndIndex).trim();

  // Extract the AI response (everything before the JSON block)
  const aiResponse = completeResponse.substring(0, jsonStartIndex).trim();

  try {
    const essayData = JSON.parse(jsonString);
    return { aiResponse, essayData };
  } catch (error) {
    console.error('Error parsing JSON from AI response:', error);
    throw new Error('Failed to parse AI response data');
  }
};

export const saveEssay = async (
    userId: string, 
    essayText: string, 
    aiResponse: string, 
    essayData: any
) => {
    const newEssay = new Essay({
        userId,
        essayText,
        feedback: aiResponse,
        essayType: essayData.essay_type,
        overallBandScore: essayData.overall,
        TR: essayData.TR,
        CC: essayData.CC,
        LR: essayData.LR,
        GRA: essayData.GRA,
        submittedAt: new Date(),
        errors: essayData.errors
    });

    try {
        await newEssay.save();
        console.log('Essay saved successfully');
        return newEssay;
    } catch (error) {
        console.error('Error saving essay:', error);
        throw error;
    }
};

// Remove the following functions as they are no longer needed:
// parseEssayType
// parseOverallBandScore
// parseCriteriaScores
// extractScore
