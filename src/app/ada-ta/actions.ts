"use server";

import { getOrCreateCreditUsage } from "@/lib/token-usage";
import { currentUser } from "@clerk/nextjs/server";

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || "";
export const isProSubscribed = async () => {
  // get clerk user
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) return false;

  const usage = await getOrCreateCreditUsage(userId);

  return usage?.plan === "pro";
};

export const getAdaPrice = async () => {
  const priceResponse = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=cardano&vs_currencies=usd&include_24hr_change=true",
    {
      headers: { "x-cg-demo-api-key": COINGECKO_API_KEY },
    }
  );
  return priceResponse;
};
