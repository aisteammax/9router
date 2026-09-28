import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch: vi.fn(),
}));

import { proxyAwareFetch } from "../../open-sse/utils/proxyFetch.js";
import { getUsageForProvider } from "../../open-sse/services/usage.js";
import {
  USAGE_SUPPORTED_PROVIDERS,
  USAGE_APIKEY_PROVIDERS,
} from "../../src/shared/constants/providers.js";
import { parseQuotaData } from "../../src/app/(dashboard)/dashboard/usage/components/ProviderLimits/utils.js";

const AUTH_KEY_URL = "https://openrouter.ai/api/v1/auth/key";
const CREDITS_URL = "https://openrouter.ai/api/v1/credits";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("openrouter registry usage flags", () => {
  it("lists openrouter and openrouter-free in usage supported providers", () => {
    expect(USAGE_SUPPORTED_PROVIDERS).toContain("openrouter");
    expect(USAGE_APIKEY_PROVIDERS).toContain("openrouter");
    expect(USAGE_SUPPORTED_PROVIDERS).toContain("openrouter-free");
    expect(USAGE_APIKEY_PROVIDERS).toContain("openrouter-free");
  });
});

describe("getUsageForProvider(openrouter)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches both key info and account credits", async () => {
    proxyAwareFetch.mockImplementation(async (url) => {
      if (url === AUTH_KEY_URL) {
        return jsonResponse({
          data: {
            label: "test-key",
            usage: 2.0,
            limit: 10.0,
            limit_remaining: 8.0,
            is_free_tier: false,
          },
        });
      }
      if (url === CREDITS_URL) {
        return jsonResponse({
          data: {
            total_credits: 25.0,
            total_usage: 5.0,
          },
        });
      }
      return new Response("Not found", { status: 404 });
    });

    const usage = await getUsageForProvider({
      provider: "openrouter",
      apiKey: "sk-or-test-key",
    });

    expect(usage.plan).toBe("OpenRouter");
    expect(usage.quotas["Account Balance"]).toEqual({
      used: 5.0,
      total: 20.0,
      remainingPercentage: 100,
      resetAt: null,
      unlimited: false,
      isCreditBalance: true,
      currency: "USD",
    });

    expect(usage.quotas["Key Limit"]).toEqual({
      used: 2.0,
      total: 10.0,
      remainingPercentage: 80,
      resetAt: null,
      unlimited: false,
    });
  });

  it("handles unlimited key limit correctly", async () => {
    proxyAwareFetch.mockImplementation(async (url) => {
      if (url === AUTH_KEY_URL) {
        return jsonResponse({
          data: {
            label: "unlimited-key",
            usage: 1.5,
            limit: null,
            is_free_tier: false,
          },
        });
      }
      if (url === CREDITS_URL) {
        return jsonResponse({
          data: {
            total_credits: 10.0,
            total_usage: 2.0,
          },
        });
      }
      return new Response("Not found", { status: 404 });
    });

    const usage = await getUsageForProvider({
      provider: "openrouter",
      apiKey: "sk-or-test-key",
    });

    expect(usage.quotas["Key Usage"]).toEqual({
      used: 1.5,
      total: 0,
      remainingPercentage: 100,
      resetAt: null,
      unlimited: true,
    });
    expect(usage.quotas["Account Balance"].total).toBe(8.0);
  });

  it("handles 401 authentication failure", async () => {
    proxyAwareFetch.mockImplementation(async (url) => {
      if (url === AUTH_KEY_URL) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response("Unauthorized", { status: 401 });
    });

    const usage = await getUsageForProvider({
      provider: "openrouter",
      apiKey: "invalid-key",
    });

    expect(usage.plan).toBe("OpenRouter");
    expect(usage.message).toBe("Invalid API key");
  });
});

describe("parseQuotaData(openrouter)", () => {
  it("normalizes quotas for dashboard table", () => {
    const raw = {
      plan: "OpenRouter",
      quotas: {
        "Account Balance": {
          used: 4.2,
          total: 9.8,
          remainingPercentage: 100,
          resetAt: null,
          unlimited: false,
          isCreditBalance: true,
          currency: "USD",
        },
        "Key Limit": {
          used: 0.05,
          total: 5.0,
          remainingPercentage: 99,
          resetAt: null,
          unlimited: false,
        },
      },
    };

    const rows = parseQuotaData("openrouter", raw);
    expect(rows).toHaveLength(2);

    const balanceRow = rows.find((r) => r.name === "Account Balance");
    expect(balanceRow.isCreditBalance).toBe(true);
    expect(balanceRow.currency).toBe("USD");
    expect(balanceRow.total).toBe(9.8);

    const limitRow = rows.find((r) => r.name === "Key Limit");
    expect(limitRow.used).toBe(0.05);
    expect(limitRow.total).toBe(5.0);
    expect(limitRow.remainingPercentage).toBe(99);
  });
});
