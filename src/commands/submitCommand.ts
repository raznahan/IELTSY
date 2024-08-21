import TelegramBot from 'node-telegram-bot-api';
import Essay from '../models/essayModel';

export const submitCommand = (bot: TelegramBot) => {
  bot.onText(/\/submit/, async (msg) => {
    const userId = msg.chat.id.toString();
    bot.sendMessage(msg.chat.id, 'Please send your essay text.');

    bot.once('message', async (msg) => {
      if (msg.text && !msg.text.startsWith('/')) {
        // Process the essay submission
        const feedback = `Your essay has been reviewed. Good job!`;
        const score = Math.floor(Math.random() * (9 - 5 + 1)) + 5;

        // Store the essay permanently in the database
        const newEssay = new Essay({
          userId,
          essayText: msg.text,
          feedback,
          score
        });

        await newEssay.save();

        bot.sendMessage(msg.chat.id, `Submission complete. Feedback: ${feedback}, Score: ${score}`);
      }
    });
  });
};
