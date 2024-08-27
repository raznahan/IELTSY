import OpenAI from 'openai';
import { getUserThreadId, saveUserThreadId } from './userService';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!, // Ensure this is set correctly
});

export async function createThread(): Promise<string> {
  const thread = await openai.beta.threads.create();
  console.log("Thread created with ID:", thread.id);
  return thread.id;
}

export async function getOrCreateThreadId(userId: string): Promise<string> {
  // Fetch the current thread ID associated with the user
  let threadId = await getUserThreadId(userId);

  if (!threadId) {
    // If no thread ID exists for the user, create a new one
    console.log(`No thread found for user ${userId}. Creating a new thread...`);
    threadId = await createThread();

    // Save the new thread ID in the user's record
    await saveUserThreadId(userId, threadId);
  }

  return threadId;
}

export async function addMessageToThread(threadId: string, essayText: string): Promise<void> {
  const message = await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: essayText,
  });
  console.log("Message added to thread:", message);
}

export async function runAssistantWithStreaming(
  threadId: string,
  assistantId: string,
  onDataReceived: (data: string) => void
): Promise<void> {
  const run = openai.beta.threads.runs.stream(threadId, {
    assistant_id: assistantId,
  });

  return new Promise((resolve, reject) => {
    run
      .on('textCreated', (text) => {
        if (text.value) {
          onDataReceived(text.value);
        }
      })
      .on('textDelta', (textDelta) => {
        if (textDelta.value) {
          onDataReceived(textDelta.value);
        }
      })
      .on('end', () => {
        resolve();
      })
      .on('error', (error) => {
        console.error('Error with assistant run:', error);
        reject(error);
      });
  });
}

export async function getAssistantResponse(threadId: string, assistantId: string): Promise<string> {

  let completeResponse = '';
  await runAssistantWithStreaming(threadId, assistantId, (chunk) => {
    completeResponse += chunk;
  });

  return completeResponse;
}
