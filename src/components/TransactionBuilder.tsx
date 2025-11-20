"use client";

import { useCardano } from "@cardano-foundation/cardano-connect-with-wallet";
import { NetworkType } from "@cardano-foundation/cardano-connect-with-wallet-core";
import { useState, useEffect, useRef } from "react";
import { Emulator, Lucid } from "@lucid-evolution/lucid";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { HybridTooltip } from "@/components/HybridTooltip";


interface TransactionBuilderProps {
  creditsRemaining: number;
  onTransactionSuccess?: () => void;
}

export default function TransactionBuilder({ creditsRemaining, onTransactionSuccess }: TransactionBuilderProps) {
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmations, setConfirmations] = useState<number>(0);
  const [isPolling, setIsPolling] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasNotifiedRef = useRef(false);

  const { user } = useUser();

  const network =
    process.env.NODE_ENV === "development"
      ? NetworkType.TESTNET
      : NetworkType.MAINNET;

  const { isConnected, usedAddresses, enabledWallet, accountBalance } = useCardano({
    limitNetwork: network,
  });

  // Poll for transaction confirmations
  useEffect(() => {
    const checkConfirmations = async () => {
      if (!txHash || hasNotifiedRef.current || !user?.id) return;

      setIsChecking(true);
      // Artificial delay to show "Checking..." state
      await new Promise((resolve) => setTimeout(resolve, 1000));

      try {
        const response = await fetch(
          `/api/tx-confirmations?txHash=${txHash}&userId=${user.id}`
        );

        if (response.ok) {
          const data = await response.json();
          setConfirmations(data.confirmations);

          // Show toast when we get at least 1 confirmation
          if (data.confirmations >= 1 && !hasNotifiedRef.current) {
            hasNotifiedRef.current = true;

            // Show different toast message based on whether credits were added
            if (data.credited) {
              toast.success("Transaction Confirmed!", {
                description: "100 credits have been added to your account! 🎉",
                duration: 5000,
                position: "top-center",
              });
              // Trigger success callback to refresh balance
              onTransactionSuccess?.();
            } else {
              toast.success("Transaction Confirmed!", {
                description: `Your transaction has ${data.confirmations} confirmation${data.confirmations > 1 ? "s" : ""}!`,
                duration: 5000,
                position: "top-center",
              });
            }

            // Stop polling after confirmation
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
              setIsPolling(false);
            }
          }
        } else if (response.status === 404) {
          // Transaction not yet on-chain, this is normal - keep polling
        } else {
          // Other errors
          console.error("Error checking confirmations:", response.statusText);
        }
      } catch (err) {
        console.error("Error checking confirmations:", err);
      } finally {
        setIsChecking(false);
      }
    };

    if (txHash && !hasNotifiedRef.current) {
      // Start polling immediately
      checkConfirmations();
      setIsPolling(true);

      // Then poll every 15 seconds
      pollingIntervalRef.current = setInterval(checkConfirmations, 15000);
    }

    // Cleanup on unmount or when txHash changes
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [txHash, user?.id, onTransactionSuccess]);

  const handleBuildTransaction = async () => {
    if (!isConnected || !enabledWallet) {
      setError("Wallet not connected");
      return;
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);
    setConfirmations(0);
    hasNotifiedRef.current = false;

    try {
      // Initialize Lucid with an emulator (will be replaced with actual provider)
      const lucid = await Lucid(new Emulator([]), "Preprod");

      // Get API from wallet
      const api = await window.cardano[enabledWallet].enable();

      // Select wallet
      lucid.selectWallet.fromAPI(api);


      // if (accountBalance < 5) {
      //   throw new Error("Not enough ada in wallet");
      // }
      // Make API request to build transaction
      const response = await fetch("/api/transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: usedAddresses[0], walletBalance: accountBalance }),
      });
      console.log(response);



      const { tx, error } = await response.json();
      if (error) {
        throw new Error(error);
      }

      // Sign transaction with wallet
      const signedTx = await lucid.fromTx(tx).sign.withWallet().complete();

      // Submit transaction
      const txHash = await signedTx.submit();

      setTxHash(txHash);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="px-5 py-8 flex items-center justify-center min-h-[150px]">
        <p className="text-xs text-zinc-500">Connect your wallet to continue</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Main action button */}
      {creditsRemaining > 0 ? (
        <button className="text-zinc-100 w-full py-2.5 rounded-md text-xs font-medium transition-all bg-green-900/50 cursor-not-allowed border border-green-900/30">Use remaining {creditsRemaining} credits before buying more</button>
      ) : (
        <button
          className={`text-zinc-100 w-full py-2.5 rounded-md text-xs font-medium transition-all focus:outline-none focus:ring-1 ${isLoading
            ? "bg-green-900/50 cursor-not-allowed border border-green-900/30"
            : "bg-green-900/90 hover:bg-green-800 border border-green-900/60 focus:ring-green-700/30"
            }`}
          onClick={handleBuildTransaction}
          disabled={isLoading || !isConnected}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2 w-full justify-center">
              <span>Processing Transaction</span>
              <Loader2 className="w-3 h-3 animate-spin" />
            </div>
          ) : (
            "Buy 100 Credits"
          )
          }
        </button >

      )}

      {/* Error state */}
      {
        error && (
          <div className="py-2 px-3 bg-red-500/10 dark:bg-red-950/30 border border-red-900/30 rounded-md text-xs">
            {error}
          </div>
        )
      }

      {/* Success state */}
      {
        txHash && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">


              {isPolling && confirmations === 0 ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />
                  <HybridTooltip
                    content={
                      <div>
                        This usually takes less than a minute to confirm.
                      </div>
                    }
                  >
                    <span className="text-xs font-medium text-yellow-400 cursor-help border-b border-dotted border-yellow-400/50">
                      {isChecking ? "Checking for confirmation..." : "Waiting for confirmation..."}
                    </span>
                  </HybridTooltip>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs font-medium text-green-400">
                    Transaction Confirmed!
                  </span>
                </>
              )}
            </div>
            <div className=" border border-border rounded-md overflow-hidden">
              <div className="px-3 py-2 border-b border-border text-[10px] ">
                Transaction Hash
              </div>
              <div className="px-3 py-2 font-mono text-xs break-all">
                <Link
                  className="hover:underline"
                  target="_blank"
                  href={`https://preprod.cardanoscan.io/transaction/${txHash}`}
                >
                  {txHash}
                </Link>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
