import TelegramBot from 'node-telegram-bot-api';
import { setUserState, getUserState, clearUserState } from '../state/userState';

export const submitCommand = (bot: TelegramBot) => {
  bot.onText(/\/submit/, (msg) => {
    const userId = msg.chat.id.toString();
    setUserState(userId, 'awaiting_essay_text');
    bot.sendMessage(msg.chat.id, 'Please send your essay text.');
  });

  bot.on('message', (msg) => {
    const userId = msg.chat.id.toString();
    const state = getUserState(userId);

    if (state.step === 'awaiting_essay_text' && msg.text && !msg.text.startsWith('/')) {
      // Process the essay submission
      const essayText = msg.text;
      bot.sendMessage(msg.chat.id, `You submitted: ${essayText}`);
      
      // Proceed to the next step or finalize
      clearUserState(userId);
    }
  });
};
