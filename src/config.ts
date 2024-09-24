import dotenv from 'dotenv';

dotenv.config();

type Config = {
  port: string | number;
  mongoURI: string | undefined;
  telegramBotToken: string | undefined;
  gptApiKey: string | undefined;
  botID:string | undefined;
  referralToPointRatio: number | 0,
  botUsername: string | undefined;
};

const configs: { [key: string]: Config } = {
  development: {
    port: process.env.PORT || 3000,
    mongoURI: process.env.MONGO_URI,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    gptApiKey: process.env.GPT_API_KEY,
    botID: process.env.BOTID,
    referralToPointRatio: parseInt(process.env.REFERRAL_TO_POINT_RATIO || '3', 10),
    botUsername: process.env.BOTID,
  },
  production: {
    port: process.env.PORT || 3000,
    mongoURI: process.env.MONGO_URI,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    gptApiKey: process.env.GPT_API_KEY,
    botID: process.env.BOTID,
    referralToPointRatio: parseInt(process.env.REFERRAL_TO_POINT_RATIO || '3', 10),
    botUsername: process.env.BOT_USERNAME,
  },
};

const currentEnv: string = process.env.NODE_ENV || 'development';
const config: Config = configs[currentEnv];

export default config;
