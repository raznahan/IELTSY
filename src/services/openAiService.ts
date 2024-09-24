import OpenAI from 'openai';
import { getUserThreadId, saveUserThreadId } from './userService';

// Initialize the OpenAI client with the API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!, // Ensure this is set correctly in the environment
});

/**
 * Creates a new thread in the OpenAI conversation system.
 * @returns A Promise that resolves to the ID of the newly created thread.
 */
export async function createThread(): Promise<string> {
  const thread = await openai.beta.threads.create();
  console.log("Thread created with ID:", thread.id);
  return thread.id;
}

/**
 * Retrieves an existing thread ID for a user or creates a new one if it doesn't exist.
 * @param userId - The unique identifier of the user.
 * @returns A Promise that resolves to the thread ID associated with the user.
 */
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

/**
 * Adds a user message to an existing thread.
 * @param threadId - The ID of the thread to add the message to.
 * @param essayText - The content of the message to be added.
 */
export async function addMessageToThread(threadId: string, essayText: string): Promise<void> {
  const message = await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: essayText,
  });
  console.log("Message added to thread:", message);
}

/**
 * Runs an AI assistant on a thread and streams the response.
 * @param threadId - The ID of the thread to run the assistant on.
 * @param assistantId - The ID of the AI assistant to use.
 * @param onDataReceived - A callback function to handle streamed response chunks.
 * @returns A Promise that resolves when the streaming is complete.
 */
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

/**
 * Gets the complete response from an AI assistant for a given thread.
 * @param threadId - The ID of the thread to get the response from.
 * @param assistantId - The ID of the AI assistant to use.
 * @returns A Promise that resolves to the complete response string.
 */
export async function getAssistantResponse(threadId: string, assistantId: string): Promise<string> {
  let completeResponse = '';
  await runAssistantWithStreaming(threadId, assistantId, (chunk) => {
    completeResponse += chunk;
  });

  return completeResponse;
}
