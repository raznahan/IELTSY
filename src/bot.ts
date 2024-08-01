import TelegramBot from 'node-telegram-bot-api';
import config from './config';

if (!config.telegramBotToken) {
  throw new Error('Telegram bot token is not defined.');
}

const bot = new TelegramBot(config.telegramBotToken, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Welcome to IELTS Writing Bot! Use /submit to submit your essay.');
});

export default bot;
