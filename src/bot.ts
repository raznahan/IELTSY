import TelegramBot from 'node-telegram-bot-api';
import config from './config';

// Import command handlers
import { startCommand } from './commands/startCommand';
import { submitCommand } from './commands/submitCommand';
import { generateReferralCodeCommand } from './commands/generateReferralCodeCommand';
import { setupMyEssaysCommand } from './commands/myEssaysCommand';
import { mainMenuCommand } from './commands/mainMenuCommand'; 
import { setupSettingsCommand } from './commands/settingsCommand';
import { setupAnalyticsCommand } from './commands/analyticsCommand';
import { setupReferralCommand } from './commands/referralCommand';
import { setupHelpCommand } from './commands/helpCommand';

// Ensure the Telegram bot token is defined in the config
if (!config.telegramBotToken) {
    throw new Error('Telegram bot token is not defined.');
}

// Initialize the Telegram bot with the token and enable polling
const bot = new TelegramBot(config.telegramBotToken, { polling: true });

// Register command handlers
startCommand(bot);
submitCommand(bot);
generateReferralCodeCommand(bot);
setupMyEssaysCommand(bot);
mainMenuCommand(bot);
setupSettingsCommand(bot);
setupAnalyticsCommand(bot);
setupReferralCommand(bot);
setupHelpCommand(bot);

// Handle polling errors
// This is crucial for maintaining the bot's connection and debugging issues
bot.on('polling_error', (error) => {
    console.error('Fatal polling error:', error.message);
});

// Export the bot instance for use in other parts of the application
export default bot;
