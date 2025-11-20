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

    // Determine network and API key
    const isTestnet = process.env.NODE_ENV === "development";
    const blockfrostApiKey = isTestnet
      ? process.env.BLOCKFROST_API_KEY_TESTNET
      : process.env.BLOCKFROST_API_KEY_MAINNET;
    const blockfrostUrl = isTestnet
      ? "https://cardano-preprod.blockfrost.io/api/v0"
      : "https://cardano-mainnet.blockfrost.io/api/v0";

    if (!blockfrostApiKey) {
      return NextResponse.json(
        { error: "Blockfrost API key not configured" },
        { status: 500 }
      );
    }

    // Fetch transaction details from Blockfrost (single call)
    const response = await fetch(`${blockfrostUrl}/txs/${txHash}`, {
      headers: {
        project_id: blockfrostApiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Transaction not found", confirmations: 0, credited: false },
          { status: 404 }
        );
      }
      throw new Error(`Blockfrost API error: ${response.statusText}`);
    }

    const txData = await response.json();

    // Check if transaction is confirmed
    const confirmations = txData.block_height ? 1 : 0;
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
      blockHeight: txData.block_height,
      blockHash: txData.block,
      confirmations,
      slot: txData.slot,
      index: txData.index,
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
