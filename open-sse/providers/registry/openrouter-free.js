export default {
  id: "openrouter-free",
  priority: 11,
  hasFree: true,
  alias: "openrouter-free",
  aliases: ["orf"],
  display: {
    name: "OpenRouter Free",
    icon: "router",
    color: "#F97316",
    textIcon: "ORF",
    website: "https://openrouter.ai",
    notice: {
      text: "Free tier: 27+ free models, no credit card needed, 200 req/day. After $10 credit: 1,000 req/day.",
      apiKeyUrl: "https://openrouter.ai/settings/keys",
    },
  },
  category: "freeTier",
  authType: "apikey",
  authModes: ["apikey"],
  transport: {
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    thinkingFormat: "openai",
    headers: {
      "HTTP-Referer": "https://endpoint-proxy.local",
      "X-Title": "Endpoint Proxy",
    },
  },
  modelsFetcher: { url: "https://openrouter.ai/api/v1/models", type: "openrouter-free" },
  passthroughModels: true,
  features: {
    usage: true,
    usageApikey: true,
  },
};
