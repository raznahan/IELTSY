import TelegramBot from 'node-telegram-bot-api';
import config from './config';

console.log("token is: "+config.telegramBotToken);

if (!config.telegramBotToken) {
    throw new Error('Telegram bot token is not defined.');
}

const bot = new TelegramBot(config.telegramBotToken, { polling: true });


bot.onText(/\/start/, (msg) => {
    console.log("received text");
    bot.sendMessage(msg.chat.id, 'Welcome to IELTS Writing Bot! Use /submit to submit your essay.');
});

// Handle timeout events.
bot.on('polling_error', (error) => {
    console.error('Fatal polling error:', error.message);
}
);


export default bot;
