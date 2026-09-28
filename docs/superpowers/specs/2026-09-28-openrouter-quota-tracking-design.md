# OpenRouter Quota Tracking Design

## 1. Context & Goals
Enable Quota Tracker monitoring for OpenRouter connections in 9Router.
Currently, OpenRouter is configured in `open-sse/providers/registry/openrouter.js` without usage tracking flags (`features.usage` and `features.usageApikey`), and there is no service to fetch and normalize quota and balance statistics for OpenRouter API keys.

The objective is to display both:
1. **Account Balance**: Current available credits on the OpenRouter account in USD.
2. **Key Quota / Usage**: If a key-level limit is configured, show usage against that limit (with remaining percentage and bar). If unlimited, show total key spent with an Unlimited indicator.

## 2. Architecture & Data Flow

### 2.1 Provider Registry
File: `open-sse/providers/registry/openrouter.js`
- Set `features.usage = true`
- Set `features.usageApikey = true`
- This ensures `openrouter` is included in `USAGE_SUPPORTED_PROVIDERS` and `USAGE_APIKEY_PROVIDERS` in `src/shared/constants/providers.js`.

### 2.2 OpenRouter Usage Service
File: `open-sse/services/usage/openrouter.js`
- Implement `getOpenrouterUsage(apiKey, proxyOptions)`
- Make concurrent requests using `proxyAwareFetch`:
  1. `GET https://openrouter.ai/api/v1/auth/key`
  2. `GET https://openrouter.ai/api/v1/credits`
- Auth header: `Authorization: Bearer ${apiKey}`
- Handle HTTP status codes:
  - 401/403: Return `{ plan: "OpenRouter", message: "Invalid API key" }`
  - Fallback: If `/credits` fails but `/auth/key` succeeds, still render key data without failing the whole card.
- Normalized response structure:
  ```json
  {
    "plan": "OpenRouter",
    "quotas": {
      "Account Balance": {
        "used": 0,
        "total": <remaining_credits>,
        "remainingPercentage": <remaining_credits > 0 ? 100 : 0>,
        "isCreditBalance": true,
        "currency": "USD"
      },
      "Key Limit": {
        "used": <usage>,
        "total": <limit>,
        "remainingPercentage": <calculated>,
        "unlimited": false
      }
      // OR if limit is null:
      // "Key Usage": {
      //   "used": <usage>,
      //   "total": 0,
      //   "unlimited": true
      // }
    }
  }
  ```

### 2.3 Service Dispatcher Registration
File: `open-sse/services/usage.js`
- Import `getOpenrouterUsage` from `./usage/openrouter.js`
- Register `openrouter: (c) => getOpenrouterUsage(c.apiKey, c.proxyOptions)` in `USAGE_HANDLERS`.

### 2.4 Frontend Dashboard Normalization
File: `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/utils.js`
- In `parseQuotaData(provider, data)`, add `case "openrouter":`:
  - Iterate through `Object.entries(data.quotas)`
  - Forward `isCreditBalance`, `currency`, `unlimited`, `used`, `total`, and `remainingPercentage` to normalize rows for `QuotaTable` / `QuotaProgressBar`.

## 3. Testing & Verification Plan
1. Unit tests:
   - Create `tests/unit/openrouter-usage.test.js` validating:
     - Normalization with key limit and account credits.
     - Normalization with unlimited key (`limit === null`).
     - Graceful degradation when `/credits` returns an error but `/auth/key` succeeds.
     - 401 Unauthorized handling.
   - Run tests with `npm test tests/unit/openrouter-usage.test.js`.
2. Integration & Container Deployment:
   - Rebuild Docker image: `docker build -t 9router:fork -f Dockerfile .` in `C:\dev\9router-src`.
   - Recreate container: `docker compose up -d --force-recreate` in `C:\dev\9router`.
   - Verify Quota Tracker page at `http://localhost:20128/dashboard/usage` displays OpenRouter connections with balance and key limits.
