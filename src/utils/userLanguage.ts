import User from '../models/userModel';

export async function getUserLanguage(telegramId: string): Promise<string> {
  const user = await User.findOne({ telegramId });
  return user?.language || 'en';
}