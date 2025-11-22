import { NextRequest, NextResponse } from "next/server";
import { addCredits } from "@/lib/token-usage";

// Track which transactions have already been credited to prevent double-crediting
const creditedTransactions = new Set<string>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const txHash = searchParams.get("txHash");
    const userId = searchParams.get("userId");

    if (!txHash) {
      return NextResponse.json(
        { error: "Transaction hash is required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Determine network and API URL
    const isTestnet = process.env.NODE_ENV === "development";
    const koiosUrl = isTestnet
      ? "https://preprod.koios.rest/api/v1/tx_status"
      : "https://api.koios.rest/api/v1/tx_status";

    // Fetch transaction details from Koios
    const response = await fetch(koiosUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        authorization: "Bearer " + process.env.KOIOS_API_KEY,
      },
      body: JSON.stringify({
        _tx_hashes: [txHash],
      }),
    });

    if (!response.ok) {
      throw new Error(`Koios API error: ${response.statusText}`);
    }

    // Define interface for Koios response
    interface KoiosTxStatus {
      tx_hash: string;
      num_confirmations: number;
    }

    const txData = (await response.json()) as KoiosTxStatus[];

    // Check if transaction is found and confirmed
    // Koios returns an array of objects: [{ tx_hash: "...", num_confirmations: 123 }]
    // If tx is not found on chain yet, it might not be in the list or have 0 confirmations.

    const txInfo = txData.find((t) => t.tx_hash === txHash);
    const confirmations = txInfo?.num_confirmations || 0;

    let credited = false;

    // If confirmed and not already credited, add credits to user's account
    if (confirmations >= 1 && !creditedTransactions.has(txHash)) {
      const creditResult = await addCredits(userId, 100);

      if (creditResult.success) {
        creditedTransactions.add(txHash);
        credited = true;
      } else {
        console.error(`Failed to credit user ${userId}:`, creditResult.error);
      }
    } else if (creditedTransactions.has(txHash)) {
      credited = true; // Already credited previously
    }

    return NextResponse.json({
      txHash,
      confirmations,
      credited,
    });
  } catch (error) {
    console.error("Error checking transaction confirmations:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to check transaction confirmations",
      },
      { status: 500 }
    );
  }
}
