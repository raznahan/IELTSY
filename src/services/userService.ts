
import User from '../models/userModel';

export async function getUserThreadId(userId: string): Promise<string | null> {
    const user = await User.findOne({ telegramId: userId });
    return user?.threadId || null;
}

export async function saveUserThreadId(userId: string, threadId: string): Promise<void> {
    await User.updateOne({ telegramId: userId }, { $set: { threadId } }, { upsert: true });
}