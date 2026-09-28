/**
 * OpenRouter usage fetcher
 * Endpoints:
 * - Key info: GET https://openrouter.ai/api/v1/auth/key
 * - Account credits: GET https://openrouter.ai/api/v1/credits
 */

import { proxyAwareFetch } from "../../utils/proxyFetch.js";
import { toFiniteNumber, parseResetTime } from "./shared.js";

const AUTH_KEY_URL = "https://openrouter.ai/api/v1/auth/key";
const CREDITS_URL = "https://openrouter.ai/api/v1/credits";

/**
 * @param {string|null|undefined} apiKey
 * @param {object|null} proxyOptions
 */
export async function getOpenrouterUsage(apiKey = null, proxyOptions = null) {
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return { message: "OpenRouter API key not available." };
  }

  const trimmedKey = apiKey.trim();
  const headers = {
    Authorization: `Bearer ${trimmedKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  try {
    const [keyResult, creditsResult] = await Promise.allSettled([
      proxyAwareFetch(AUTH_KEY_URL, { method: "GET", headers }, proxyOptions),
      proxyAwareFetch(CREDITS_URL, { method: "GET", headers }, proxyOptions),
    ]);

    if (keyResult.status === "rejected") {
      return { message: `OpenRouter request failed: ${keyResult.reason?.message || "Network error"}` };
    }

    const keyRes = keyResult.value;
    if (keyRes.status === 401 || keyRes.status === 403) {
      return {
        plan: "OpenRouter",
        message: "Invalid API key",
      };
    }

    if (!keyRes.ok) {
      const errText = await keyRes.text().catch(() => "");
      return {
        plan: "OpenRouter",
        message: `OpenRouter API error (${keyRes.status})${errText ? `: ${errText.slice(0, 100)}` : ""}`,
      };
    }

    const keyJson = await keyRes.json().catch(() => null);
    const keyData = keyJson?.data;
    if (!keyData || typeof keyData !== "object") {
      return { message: "OpenRouter key response was invalid JSON." };
    }

    const quotas = {};

    // 1. Account credits / balance
    if (creditsResult.status === "fulfilled" && creditsResult.value.ok) {
      const creditsJson = await creditsResult.value.json().catch(() => null);
      const creditsData = creditsJson?.data;
      if (creditsData && typeof creditsData === "object") {
        const totalCredits = toFiniteNumber(creditsData.total_credits, 0);
        const totalUsage = toFiniteNumber(creditsData.total_usage, 0);
        const availableBalance = Math.max(0, totalCredits - totalUsage);

        quotas["Account Balance"] = {
          used: totalUsage,
          total: availableBalance,
          remainingPercentage: availableBalance > 0 ? 100 : 0,
          resetAt: null,
          unlimited: false,
          isCreditBalance: true,
          currency: "USD",
        };
      }
    }

    // 2. Key Limit / Usage
    const keyUsage = toFiniteNumber(keyData.usage, 0);
    const keyLimit = keyData.limit != null ? toFiniteNumber(keyData.limit, null) : null;

    if (keyLimit != null && keyLimit > 0) {
      const remaining = keyData.limit_remaining != null
        ? toFiniteNumber(keyData.limit_remaining, Math.max(0, keyLimit - keyUsage))
        : Math.max(0, keyLimit - keyUsage);
      const remainingPercentage = Math.round((remaining / keyLimit) * 100);

      quotas["Key Limit"] = {
        used: keyUsage,
        total: keyLimit,
        remainingPercentage: Math.max(0, Math.min(100, remainingPercentage)),
        resetAt: parseResetTime(keyData.limit_reset),
        unlimited: false,
      };
    } else {
      quotas["Key Usage"] = {
        used: keyUsage,
        total: 0,
        remainingPercentage: 100,
        resetAt: null,
        unlimited: true,
      };
    }

    // 3. Free daily requests limit (if present)
    if (keyData.free_model_daily_requests && typeof keyData.free_model_daily_requests === "object") {
      const freeReqs = keyData.free_model_daily_requests;
      const fLimit = toFiniteNumber(freeReqs.limit, 0);
      const fUsed = toFiniteNumber(freeReqs.used, 0);
      if (fLimit > 0) {
        const fRemaining = freeReqs.remaining != null ? toFiniteNumber(freeReqs.remaining, 0) : Math.max(0, fLimit - fUsed);
        const fPercentage = Math.round((fRemaining / fLimit) * 100);

        quotas["Free Daily Requests"] = {
          used: fUsed,
          total: fLimit,
          remainingPercentage: Math.max(0, Math.min(100, fPercentage)),
          resetAt: null,
          unlimited: false,
        };
      }
    }

    const planLabel = keyData.is_free_tier ? "OpenRouter (Free)" : "OpenRouter";

    return {
      plan: planLabel,
      quotas,
    };
  } catch (error) {
    return { message: `OpenRouter error: ${error.message}` };
  }
}
