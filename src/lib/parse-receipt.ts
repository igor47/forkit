import { config } from "@src/config"
import { logger } from "@src/lib/logger"
import { z } from "zod"
import { getClient } from "./ai"

const ReceiptItemSchema = z.object({
  name: z.string(),
  price_cents: z.number().int(),
})

const ParseResultSchema = z.object({
  restaurant_name: z.string().nullable(),
  items: z.array(ReceiptItemSchema),
  total_cents: z.number().int().nullable(),
  tax_cents: z.number().int().nullable(),
  gratuity_cents: z.number().int().nullable(),
  error: z.string().nullable(),
})

export type ParseResult = z.infer<typeof ParseResultSchema>

const SYSTEM_PROMPT = `You are a receipt parser. The user will send you a photo of a restaurant receipt.

Your job is to extract the itemized list of items and their prices, plus the total, sales tax, and gratuity if present.

Respond with ONLY a JSON object in this exact format:
{
  "restaurant_name": "Restaurant Name",
  "items": [{ "name": "Item name", "price_cents": 1299 }],
  "total_cents": 5432,
  "tax_cents": 434,
  "gratuity_cents": null,
  "error": null
}

Rules:
- restaurant_name is the name of the restaurant (null if not visible on the receipt)
- All prices must be in cents (e.g. $12.99 = 1299)
- Include every line item on the receipt
- total_cents is the receipt total (including tax and gratuity)
- tax_cents is the sales tax amount
- gratuity_cents is the tip/gratuity if printed on the receipt (null if not present)
- If the image is not a recognizable itemized restaurant receipt, set error to a brief description of why and leave items as an empty array
- Do not include tax or gratuity as line items — they go in their own fields
- Respond with ONLY the JSON, no markdown fences or other text`

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp"

const MIME_MAP: Record<string, ImageMediaType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
}

export async function parseReceipt(filepath: string): Promise<ParseResult> {
  const ext = filepath.split(".").pop()?.toLowerCase() ?? "jpg"
  const mediaType = MIME_MAP[ext] ?? "image/jpeg"

  const imageData = await Bun.file(filepath).bytes()
  const base64 = Buffer.from(imageData).toString("base64")

  const client = getClient()
  const response = await client.messages.create({
    model: config.aiModelName,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: "Please parse this receipt.",
          },
        ],
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    return {
      restaurant_name: null,
      items: [],
      total_cents: null,
      tax_cents: null,
      gratuity_cents: null,
      error: "No text response from AI",
    }
  }

  try {
    // Strip markdown fences if the model wraps the JSON
    let jsonText = textBlock.text.trim()
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    }
    const parsed = JSON.parse(jsonText)
    return ParseResultSchema.parse(parsed)
  } catch (e) {
    logger.error("Failed to parse AI response", e as Error, { raw: textBlock.text })
    return {
      restaurant_name: null,
      items: [],
      total_cents: null,
      tax_cents: null,
      gratuity_cents: null,
      error: "Failed to parse AI response",
    }
  }
}
