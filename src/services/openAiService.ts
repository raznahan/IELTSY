import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!, // Ensure this is set correctly
});

export async function createThread(): Promise<string> {
  const thread = await openai.beta.threads.create();
  console.log("Thread created with ID:", thread.id);
  return thread.id;
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
  let completeResponse = '';
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

export async function getAssistantResponse(text: string, assistantId: string): Promise<string> {
  const threadId = await createThread();
  await addMessageToThread(threadId, text);

  let completeResponse = '';
  await runAssistantWithStreaming(threadId, assistantId, (chunk) => {
    completeResponse += chunk;
  });

  return completeResponse;
}
