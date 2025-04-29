import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { decodeCaesar } from "@/utils/decodeCaesar";
import { openai } from "@/lib/openai";
import { ChatMessage, GameState } from "@/types/chat";

export const runtime = "edge";

// Define function schemas for OpenAI tool-calling
const functionDefs: OpenAI.Chat.ChatCompletionCreateParams.Function[] = [
  {
    name: "decode_caesar",
    description: "Decode Caesar cipher with given shift",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Ciphertext to decode" },
        shift: {
          type: "integer",
          description: "Shift value used during encoding (positive integer)",
        },
      },
      required: ["text", "shift"],
    },
  },
  {
    name: "analyze_image",
    description: "Analyze an image URL for hidden codes or QR values and return any extracted text/code or 'NO_CODE' if nothing found.",
    parameters: {
      type: "object",
      properties: {
        imageUrl: { type: "string", description: "Publicly accessible image URL" },
      },
      required: ["imageUrl"],
    },
  },
];

const toOpenAiRole = (
  role: ChatMessage["role"],
): "user" | "assistant" | "system" => {
  if (role === "ally" || role === "narrator" || role === "assistant") return "assistant";
  if (role === "system") return "system";
  return "user";
};

// Simple state progress helper
const progressState = (
  state: GameState,
  event: string,
): GameState => {
  const newState = { ...state } as GameState;
  switch (event) {
    case "cipher1_solved":
      newState.cipher1_solved = true;
      newState.cipher1_active = false;
      break;
    case "puzzle2_solved":
      newState.puzzle2_solved = true;
      newState.have_drive = true;
      break;
    case "secure_channel_open":
      newState.secure_channel_open = true;
      break;
    default:
      break;
  }
  return newState;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, state: incomingState } = body as {
      messages: ChatMessage[];
      state: GameState;
    };

    let currentState: GameState = incomingState;

    // Detect direct user solutions before calling AI
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      if (!currentState.puzzle2_solved && /\b9482\b/.test(lastUserMsg.content)) {
        currentState = progressState(currentState, "puzzle2_solved");
      }
    }

    const systemPrompt = `You are ORION Game Master, narrating a dark sci-fi interactive fiction in second person. Stay in narrative style, never reveal meta details. Current game state: ${JSON.stringify(
      currentState,
    )}.`;

    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: toOpenAiRole(m.role),
        content: m.content,
      })),
    ];

    // First attempt at completion
    let completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openaiMessages,
      functions: functionDefs,
      function_call: "auto",
    });

    let responseMessage = completion.choices[0].message;
    let updatedState = currentState;

    // Handle single level function call for prototype
    if (responseMessage.function_call) {
      const { name, arguments: argsJson } = responseMessage.function_call;
      let toolResult: string = "";
      try {
        const args = JSON.parse(argsJson || "{}");
        switch (name) {
          case "decode_caesar": {
            const { text, shift } = args as {
              text: string;
              shift: number;
            };
            toolResult = decodeCaesar(text, shift);
            if (toolResult.toLowerCase().includes("elevator has the key")) {
              updatedState = progressState(updatedState, "cipher1_solved");
            }
            break;
          }
          case "analyze_image": {
            const { imageUrl } = args as { imageUrl: string };
            // internal call to our tools endpoint could also be done, for now reuse openai vision
            const visionResp = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Analyze the image for hidden codes or QR values. Respond with only the extracted text or URL if found, else say 'NO_CODE'.",
                    },
                    {
                      type: "image_url",
                      image_url: { url: imageUrl },
                    },
                  ],
                },
              ],
            });
            toolResult = visionResp.choices[0].message?.content?.trim() || "";
            break;
          }
          default:
            toolResult = "ERROR: Unknown tool";
        }
      } catch {
        toolResult = "ERROR executing tool";
      }

      // Send tool result back to model for final response
      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          ...openaiMessages,
          responseMessage, // function call message
          {
            role: "function",
            name,
            content: toolResult,
          },
        ],
      });
      responseMessage = completion.choices[0].message;
    }

    // Automatic Act I -> Act II transition check
    const actIComplete =
      updatedState.act === 1 &&
      updatedState.cipher1_solved &&
      updatedState.puzzle2_solved &&
      updatedState.secure_channel_open;

    if (actIComplete) {
      updatedState = { ...updatedState, act: 2 };
      const transitionText =
        "Alarms erupt overhead. Red strobes paint the hall. You sprint; doors auto-seal behind you. At Elevator Bay 4 the panel blinks > ENTER ACCESS CODE.\nYou key NODE17. The lift doors sigh open—revealing darkness below.\n\n─── ACT II: INFILTRATION ───";
      responseMessage = {
        ...responseMessage,
        content: `${responseMessage.content}\n\n${transitionText}`,
      } as OpenAI.Chat.ChatCompletionMessage;
    }

    return NextResponse.json({ content: responseMessage.content, state: updatedState });
  } catch {
    return NextResponse.json({ error: "Chat error" }, { status: 500 });
  }
} 