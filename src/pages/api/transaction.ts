import { Koios, Lucid } from "@lucid-evolution/lucid";
import { NextApiRequest, NextApiResponse } from "next";

const paymentAddress = process.env.PAYMENT_ADDRESS;

// Validate that PAYMENT_ADDRESS is set for production
if (process.env.NODE_ENV === "production" && !paymentAddress) {
  throw new Error(
    "PAYMENT_ADDRESS environment variable is required for production"
  );
}

// Initialize Lucid based on environment
async function initLucid() {
  if (process.env.NODE_ENV === "development") {
    // Use Preprod network for development
    return Lucid(new Koios("https://preprod.koios.rest/api/v1"), "Preprod");
  } else {
    // Use Mainnet for production
    return Lucid(new Koios("https://api.koios.rest/api/v1"), "Mainnet");
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Initialize Lucid based on environment
    const lucid = await initLucid();

    // Get address from request body
    const { address, walletBalance } = req.body;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    // Select wallet from address (no private keys on the server)
    lucid.selectWallet.fromAddress(address, []);

    // Build a simple transaction
    const tx = await lucid
      .newTx()
      .pay.ToAddress(
        process.env.NODE_ENV && process.env.NODE_ENV === "development"
          ? "addr_test1qrl6f3gm0uph6vscjqs900yakynas5eu6puzcrua3kyt6q83uu458738004pap9qr9f3tmnck5y3pt9xcwyv58p7fsvsw570xn"
          : paymentAddress!,
        { lovelace: 5_000_000n } // 5 Ada
      )
      .complete();

    // Return the transaction CBOR for the client to sign and submit
    return res.status(200).json({ tx: tx.toCBOR(), error: null });
  } catch (error) {
    let jsonError = JSON.stringify(error);
    const errorObject = JSON.parse(jsonError);
    jsonError = JSON.stringify(errorObject.cause.failure.cause);
    console.log(
      typeof jsonError,
      jsonError.includes(
        "Your wallet does not have enough funds to cover the required assets"
      )
    );
    let err;
    if (
      jsonError.includes(
        "Your wallet does not have enough funds to cover the required assets"
      )
    ) {
      err =
        "Your wallet does not have enough funds for the required tx, please fund your wallet.";
    } else {
      err = "Failed to build transaction";
    }
    return res.status(200).json({
      tx: null,
      error: err,
    });
  }
}
