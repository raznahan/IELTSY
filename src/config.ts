import dotenv from 'dotenv';

dotenv.config();

type Config = {
  port: string | number;
  mongoURI: string | undefined;
  telegramBotToken: string | undefined;
  gptApiKey: string | undefined;
};

const configs: { [key: string]: Config } = {
  development: {
    port: process.env.PORT || 3000,
    mongoURI: process.env.MONGO_URI,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    gptApiKey: process.env.GPT_API_KEY,
  },
  production: {
    port: process.env.PORT || 3000,
    mongoURI: process.env.MONGO_URI,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    gptApiKey: process.env.GPT_API_KEY,
  },
};

const currentEnv: string = process.env.NODE_ENV || 'development';
const config: Config = configs[currentEnv];

export default config;
