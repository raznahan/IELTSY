import TelegramBot from 'node-telegram-bot-api';
import { translate } from '../utils/i18n';
import { getScoresOverTime, getTaskSpecificScoresOverTime } from '../services/analyticsService';
import { createChart } from '../utils/chartGenerator';
import { getUserLanguage } from '../utils/userLanguage';

export const analyticsCommand = async (bot: TelegramBot, chatId: number, userId: string, languageCode: string) => {
  try {
    // Overall Band Score Over Time
    const scoresOverTime = await getScoresOverTime(userId);
    if (scoresOverTime.length === 0) {
      await bot.sendMessage(chatId, translate('NO_SCORES_AVAILABLE', languageCode));
      return;
    }
    const overallScoreChart = await createChart(scoresOverTime, 'line', translate('OVERALL_SCORE_TRENDS', languageCode));
    await bot.sendPhoto(chatId, overallScoreChart);

    // Task-specific Scores Over Time
    const taskScoresOverTime = await getTaskSpecificScoresOverTime(userId);
    if (taskScoresOverTime.length === 0) {
      await bot.sendMessage(chatId, translate('NO_TASK_SCORES_AVAILABLE', languageCode));
      return;
    }
    const taskScoreChart = await createChart(taskScoresOverTime, 'line', translate('TASK_SCORE_TRENDS', languageCode));
    await bot.sendPhoto(chatId, taskScoreChart);

  } catch (error) {
    console.error('Error generating analytics:', error);
    await bot.sendMessage(chatId, translate('ANALYTICS_ERROR', languageCode));
  }
};

export const setupAnalyticsCommand = (bot: TelegramBot) => {
  bot.onText(/\/analytics/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    const languageCode = await getUserLanguage(userId);
    await analyticsCommand(bot, chatId, userId, languageCode);
  });
};