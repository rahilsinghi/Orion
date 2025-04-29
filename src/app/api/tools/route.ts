import { NextRequest, NextResponse } from "next/server";

import { decodeCaesar } from "@/utils/decodeCaesar";
import { openai } from "@/lib/openai";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as unknown;
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    // @ts-expect-error - runtime validation
    const { tool, args } = body;

    switch (tool) {
      case "decode_caesar": {
        const { text, shift } = args as { text: string; shift: number };
        const result = decodeCaesar(text, shift);
        return NextResponse.json({ result });
      }
      case "analyze_image": {
        const { imageUrl } = args as { imageUrl: string };
        // Simple passthrough to GPT-4o vision model
        const visionResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini", // upgrade when gpt-4o available
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
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            },
          ],
        });
        const result = visionResponse.choices[0]?.message?.content?.trim();
        return NextResponse.json({ result });
      }
      default:
        return NextResponse.json({ error: "Unknown tool" }, { status: 400 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
} 