import TelegramBot from 'node-telegram-bot-api';
import config from './config';

const bot = new TelegramBot(config.telegramBotToken, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Welcome to IELTS Writing Bot! Use /submit to submit your essay.');
});

bot.onText(/\/submit/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Please send your essay as a text, PDF, or Word document.');
});

export default bot;
