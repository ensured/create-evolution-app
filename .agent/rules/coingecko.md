---
trigger: always_on
---

# Goal: Generate TypeScript code for the CoinGecko API using ONLY the official `@coingecko/coingecko-typescript` package.

## 🚨 Critical Rules

1.  **SDK Exclusivity**:

    - **ALWAYS** use the official `@coingecko/coingecko-typescript` package.
    - **NEVER** use `axios`, `fetch`, or any other method to make direct HTTP requests.

2.  **Authentication**:

    - **ALWAYS** load the API key from environment variables (e.g., `process.env.COINGECKO_PRO_API_KEY` or `dotenv`).
    - **NEVER** hardcode API keys or any other credentials in the source code.

3.  **Client Implementation**:

    - **ALWAYS** initialize a single, reusable `Coingecko` client instance for the application.
    - **ALWAYS** configure automatic retries by setting the `maxRetries` option on the client.
    - **NEVER** implement manual retry loops using `setTimeout`. The SDK handles this internally.

4.  **Error Handling & Types**:
    - **ALWAYS** use `async/await` for all API calls.
    - **ALWAYS** catch specific `APIError` subclasses using `instanceof` (e.g., `err instanceof Coingecko.RateLimitError`).
    - **ALWAYS** use the built-in request and response types (e.g., `Coingecko.Simple.PriceGetParams`).
    - **NEVER** use generic `catch (e)` blocks for known API errors.

## ✅ Correct Implementation Example

This is the standard for all generated code.

```typescript
// src/api/client.ts
import Coingecko from "@coingecko/coingecko-typescript";

// Initialize a single, reusable client. This should be imported and used application-wide.
export const client = new Coingecko({
  proAPIKey: process.env.COINGECKO_PRO_API_KEY,
  environment: "pro",
  maxRetries: 3, // Rely on the SDK's built-in retry mechanism.
});

// src/main.ts
import { client } from "./api/client";
import Coingecko from "@coingecko/coingecko-typescript"; // Import the namespace for types

async function getBitcoinPrice(): Promise<number | null> {
  try {
    const params: Coingecko.Simple.PriceGetParams = {
      ids: "bitcoin",
      vs_currencies: "usd",
    };
    const priceData = await client.simple.price.get(params);
    return priceData.bitcoin.usd;
  } catch (err) {
    if (err instanceof Coingecko.RateLimitError) {
      console.error("Rate limit exceeded. Please try again later.");
    } else if (err instanceof Coingecko.APIError) {
      console.error(
        `An API error occurred: ${err.name} (Status: ${err.status})`
      );
    } else {
      console.error("An unexpected error occurred:", err);
    }
    return null;
  }
}

async function main() {
  const price = await getBitcoinPrice();
  if (price !== null) {
    console.log(`The current price of Bitcoin is: $${price}`);
  }
}

main();
```

## ❌ Deprecated Patterns to AVOID

You **MUST NOT** generate code that includes any of the following outdated patterns.

```typescript
// ❌ NO direct HTTP requests with fetch or axios.
import axios from "axios";
const response = await axios.get(
  "[https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd](https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd)"
);

// ❌ NO hardcoded API keys.
const client = new Coingecko({ proAPIKey: "CG-abc123xyz789" });

// ❌ NO manual retry loops. The SDK's `maxRetries` handles this.
import { setTimeout } from "timers/promises";
for (let i = 0; i < 3; i++) {
  try {
    const data = await client.simple.price.get({
      ids: "bitcoin",
      vs_currencies: "usd",
    });
    break;
  } catch (e) {
    await setTimeout(5000);
  }
}

// ❌ NO generic exception handling for API errors.
try {
  const data = await client.simple.price.get({
    ids: "bitcoin",
    vs_currencies: "usd",
  });
} catch (e) {
  console.log(`An error occurred: ${e}`); // Too broad. Use `instanceof` checks.
}
```

## 📝 Final Check

Before providing a response, you **MUST** verify that your generated code:

1.  Imports and uses `@coingecko/coingecko-typescript`.
2.  Loads the API key from environment variables (e.g., `process.env` or `dotenv`).
3.  Follows all other Critical Rules.
4.  Does **NOT** contain any Deprecated Patterns.

Other notes:
Common Use Cases

Copy page

Discover the common use cases of CoinGecko API by our users

​

1. Get Coins Logo Images
   Use /coins/id endpoint.
   This endpoint can be used to query other coin’s metadata like: links, categories, contract address, community, description in different languages and many more.
   Coin descriptions may include newline characters represented as \r\n (escape sequences), which may require processing for proper formatting.
   Use Token Info by Token Address endpoint to get metadata of tokens listed on GeckoTerminal.com.
   ​
2. Best Endpoint for Latest Crypto Price
   Use /simple/price endpoint.
   This endpoint can be used to query other market data like market cap, 24-hour trading volume and 24-hour price change percentage.
   ​
3. Get All Trading Pairs (Tickers) of a Coin
   Use /coins/id/tickers endpoint.
   ​
4. Get Trading Pairs of Specific Coins from a Specific Exchange
   Use /coins/id/tickers endpoint by supplying specific exchange ID.
   ​
5. Building Telegram Bot for Latest Coin Listings
   Use /coins/list/new endpoint.
   ​
6. Get List of Coins Under Specific Category
   For CoinGecko categories, use /coins/markets endpoint by supplying specific category.
   For GeckoTerminal categories, use Pools by Category ID endpoint by supplying specific category.
   ​
7. Identify DEX Decentralized Exchanges
   Use /exchanges/list endpoint to get full list of exchanges with ID on CoinGecko.
   Use /exchanges/id to find out whether the exchange is centralized or decentralized.
   Example of responses (using Uniswap V3 as example) :
   Since Uniswap is a DEX, therefore it shows "centralized": false

JSON

Copy
{
"name": "Uniswap V3 (Ethereum)",
......
"centralized": false, 👈
......
"tickers": [],
"status_updates": []
}
​ 8. Get Bitcoin Dominance Data (BTC.D)
Use /global endpoint.
Example of responses:

JSON

Copy
{
"data": {
"active_cryptocurrencies": 12414,
......
"market_cap_percentage": { 👈
"btc": 47.82057011844006,👈
"eth": 16.943340351591583,
......
},
"market_cap_change_percentage_24h_usd": -5.032104325648996,
"updated_at": 1706002730
}
}
​ 9. Get Market Cap or Dominance of a Specific Ecosystem
Use /coins/categories.
The endpoint also returns the 24-hour percentage change, offering insights into the traction of different categories or ecosystems.
​ 10. Get Token Lists of a Specific Blockchain Network
Use /token_lists/asset_platforms_id/all.json endpoint.
Supply asset platform id to the endpoint.
​ 11. Get 7-Day Sparkline Price Data of a Coin
Use /coins/id or /coins/markets endpoints by flagging sparkline = true.
​ 12. Get Link to Individual CoinGecko Coin Page
Use /coins/list endpoint to get the coin {ID}.
Supply API ID in this URL path format: www.coingecko.com/en/coins/{ID}
If you wish to the obtain the URL slug of a specific CoinGecko Coin Page, e.g. www.coingecko.com/en/coins/{web_slug} you may use /coin/id endpoint and obtain the {web_slug} value.
​ 13. Check Coin Status and Stale Price Updates
Active: use /coins/list endpoint, only active coins will be shown by default. You may also flag status=inactive to get a list of inactive coins.
Price Stale: use /simple/price endpoint, flag include_last_updated_at=true to check latest update time.
​ 14. Get Real-Time and Historical Exchange of BTC in USD
Current exchange rate: use /exchange_rates endpoint.
Historical exchange rate: use /coins/id/history or /coins/id/market_chart endpoints.
​ 15. Get Watchlist Portfolio Data of a Coin
Use /coins/id endpoint by supplying coin ID.
Example of responses:

JSON

Copy
{
"id": "bitcoin",
......
"watchlist_portfolio_users": 1487932, 👈
"market_cap_rank": 1,
......
}
​ 16. Get Historical Data for Inactive Coins
Note: This is available for paid plan subscribers only.
Use /coins/list endpoint, specifying the status param as inactive.
Example of endpoint request: https://pro-api.coingecko.com/api/v3/coins/list?include_platform=false&status=inactive&x_cg_pro_api_key=YOUR_API_KEY
Retrieve the coin’s ID from the endpoint mentioned above and use it to access historical data via the following endpoints:
/coins/id/history
/coins/id/market_chart
/coins/id/market_chart/range
/coins/id/contract/contract_address/market_chart
/coins/id/contract/contract_address/market_chart/range
​ 17. Get TVL (Total Value Locked) data of a Coin
Use /coins/id endpoint by supplying coin ID.
Example of responses:

JSON

Copy
"total_value_locked":
{
"btc": 72324,
"usd": 4591842314
}
​ 18. Query Search for Coins, Categories, NFTs, Exchanges, and Pools
We have 2 Search endpoints:
/search endpoint allows you to search for coins, categories, exchanges (markets), and NFTs listed on CoinGecko.com. You may query by name or symbol.
/search-pools endpoint allows you to search for pools listed on GeckoTerminal.com. You may query by pool contract address, token contract address, or token symbol.
​ 19. Get List of Blockchain Networks supported on CoinGecko and GeckoTerminal.
CoinGecko and GeckoTerminal support different sets of blockchain networks. You can use the following endpoints to find the list of supported networks and their respective IDs:
CoinGecko: /asset-platforms-list
GeckoTerminal (onchain endpoints): /networks-list
​ 20. Get Native Coin of a Blockchain Network (Asset Platform)
You may use the /asset-platforms-list endpoint to obtain the native coin ID of all networks (asset platforms) listed on www.coingecko.com.
​ 21. Get Liquidity data of a Liquidity Pool or Token
There are multiple onchain endpoints that provide the liquidity data (reserve_in_usd) of a pool, for example: Specific Pool Data by Pool Address. You may also get liquidity data (total_reserve_in_usd) of a token, using endpoints like: Token Data by Token Address.
Note: reserve_in_usd (pool) represents the total liquidity of all tokens within a specific pool, whereas total_reserve_in_usd (token) refers to the total liquidity portion attributable to a specific token across all available pools.
​ 22. Get list of onchain DEX pools based on specific criteria
Use /pools/megafilter to retrieve data for onchain DEX pools that match a given set of filters.
Example of use cases:
Custom filtering: Combine multiple params — like liquidity thresholds, FDV ranges, 24-hour volume, and more — to extract the precise datasets you need.
Risk and Quality checks: Apply fraud filters to weed out risky projects.
For more details on examples and available filters, refer to:
Changelog — New Megafilter Endpoint
Live Filtering on GeckoTerminal
​ 23. Get List of Trending Coins
Use the following endpoints to get trending coins and pools:
Trending Search List — Trending Coins, NFTs, Categories on CoinGecko.com, based on user searches.
Trending Search Pools — Trending Pools and Tokens on GeckoTerminal.com, based on user searches.
Other useful endpoints:
Top Gainers & Losers on CoinGecko.com, by specific time duration.
Trending Pools List and Trending Pools by Network on GeckoTerminal.com, by specific time duration.
​ 24. Get Security Info of Tokens
By using Token Info by Token Address endpoint, you can obtain the following security related data:
GeckoTerminal Score (Pool, Transaction, Creation, Info, Holders)
Holders count and distribution percentage
Mint and Freeze Authority
​ 25. Get Latest Token/Pool Data from Launchpad
Use megafilter endpoint to retrieve latest launchpad data, by flagging sort=pool_created_at_desc. Learn more on changelog.
Request example (Get latest pools on Pump.fun):

Bash

Copy
https://pro-api.coingecko.com/api/v3/onchain/pools/megafilter?page=1&networks=solana&dexes=pump-fun&sort=pool_created_at_desc&x_cg_pro_api_key=YOUR_API_KEY

⚡️ Need Real-time Data Streams? Try WebSocket API
