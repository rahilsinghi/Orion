import OpenAI from "openai";

// Singleton pattern: reuse OpenAI client across hot-reloads in dev
const globalForOpenAI = global as unknown as { openai?: OpenAI };

export const openai =
  globalForOpenAI.openai ??
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

if (process.env.NODE_ENV !== "production") globalForOpenAI.openai = openai; 