import TelegramBot from 'node-telegram-bot-api';
import { extractTextFromFile } from './fileProcessingService';
import { createThread, addMessageToThread, runAssistantWithStreaming } from './openAiService';
import Essay from '../models/essayModel';

export const processText = async (text: string, userId: string, bot: TelegramBot, chatId: number) => {
  try {
    const assistantId = process.env.OPENAI_ASSISTANT_ID!;
    const threadId = await createThread(assistantId);
    await addMessageToThread(threadId, text);

    let completeResponse = '';
    await runAssistantWithStreaming(threadId, assistantId, (chunk) => {
      completeResponse += chunk;
      bot.sendMessage(chatId, chunk);
    });

    await saveEssay(userId, text, completeResponse);
  } catch (error) {
    bot.sendMessage(chatId, 'There was an error processing your essay. Please try again.');
  }
};

export const processFile = async (file: TelegramBot.Document, userId: string, bot: TelegramBot, chatId: number) => {
  try {
    const filePath = await bot.downloadFile(file.file_id, '/tmp');
    const extractedText = await extractTextFromFile(filePath);
    if (extractedText) {
      const assistantId = process.env.OPENAI_ASSISTANT_ID!;
      const threadId = await createThread(assistantId);
      await addMessageToThread(threadId, extractedText);

      let completeResponse = '';
      await runAssistantWithStreaming(threadId, assistantId, (chunk) => {
        completeResponse += chunk;
        bot.sendMessage(chatId, chunk);
      });

      await saveEssay(userId, extractedText, completeResponse);
    } else {
      bot.sendMessage(chatId, 'Could not extract text from the file. Please submit a plain text file, PDF, or Word document.');
    }
  } catch (error) {
    bot.sendMessage(chatId, 'There was an error processing your file. Please try again.');
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
