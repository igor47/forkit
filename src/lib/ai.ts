import Anthropic from "@anthropic-ai/sdk"
import { config } from "@src/config"

export function getClient() {
  return new Anthropic({ apiKey: config.anthropicApiKey })
}
