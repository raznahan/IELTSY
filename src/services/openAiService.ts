import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!, 
  });

export async function createThread(assistantId: string) {
    const thread = await openai.beta.threads.create();
    console.log("Thread created with ID:", thread.id);
    return thread.id;
}

export async function addMessageToThread(threadId: string, essayText: string) {
    const message = await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: essayText
    });
    console.log("Message added to thread:", message);
}

export async function runAssistantWithStreaming(
    threadId: string,
    assistantId: string,
    onDataReceived: (data: string) => void
): Promise<void> {
    const run = openai.beta.threads.runs.stream(threadId, {
        assistant_id: assistantId
    });

    run
        .on('textCreated', (text) => {
            if (text.value) {
                onDataReceived(text.value);
            }
        })
        .on('textDelta', (textDelta, snapshot) => {
            if (textDelta.value) {
                onDataReceived(textDelta.value);
            }
        })
        .on('toolCallCreated', (toolCall) => {
            console.log(`Tool call created: ${toolCall.type}`);
        })
        .on('toolCallDelta', (toolCallDelta, snapshot) => {
            console.log(`Tool call delta: ${toolCallDelta.type}`);
        })
        .on('error', (error) => {
            console.error('Error with assistant run:', error);
        });
}
