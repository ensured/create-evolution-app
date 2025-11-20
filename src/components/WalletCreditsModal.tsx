"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import dynamic from "next/dynamic";
import WalletConnect from "./WalletConnect";
import { NetworkType } from "@cardano-foundation/cardano-connect-with-wallet-core";
import { useCardano } from "@cardano-foundation/cardano-connect-with-wallet";
import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { getCreditUsageInfo } from "@/lib/token-usage";
import { CreditCard, Calendar, Zap, Wallet } from "lucide-react";

// Dynamically import the TransactionBuilder with SSR disabled
const DynamicTransactionBuilder = dynamic(
    () => import("./TransactionBuilder"),
    { ssr: false }
);

interface WalletCreditsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    creditInfo?: {
        remaining: number;
        plan: string;
        resetDate?: string;
    } | null;
    onSuccess?: () => void;
}

export function WalletCreditsModal({ open, onOpenChange, creditInfo: propCreditInfo, onSuccess }: WalletCreditsModalProps) {
    const { user, isLoaded } = useUser();
    const [internalCreditInfo, setInternalCreditInfo] = useState<{
        remaining: number;
        plan: string;
        resetDate?: string;
    } | null>(null);

    const network =
        process.env.NODE_ENV === "development"
            ? NetworkType.TESTNET
            : NetworkType.MAINNET;

    const [isProcessing, setIsProcessing] = useState(false);
    const { isConnected } = useCardano({
        limitNetwork: network,
    });

    const fetchCreditInfo = useCallback(async () => {
        if (user?.id) {
            try {
                const info = await getCreditUsageInfo(user.id);
                setInternalCreditInfo(info);
            } catch (error) {
                console.error("Failed to fetch credit info:", error);
            }
        }
    }, [user?.id]);

    useEffect(() => {
        // If prop is provided, don't fetch
        if (propCreditInfo) return;

        // If modal is not open, don't fetch (optimization)
        if (!open) return;

        if (isLoaded) {
            fetchCreditInfo();
        }
    }, [isLoaded, propCreditInfo, open, fetchCreditInfo]);

    const handleTransactionSuccess = () => {
        // Call the parent's onSuccess callback if provided
        onSuccess?.();

        // Also refresh internal state if we're using it
        if (!propCreditInfo) {
            fetchCreditInfo();
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        // Prevent closing if processing
        if (!newOpen && isProcessing) {
            return;
        }
        onOpenChange(newOpen);
    };

    const displayCreditInfo = propCreditInfo || internalCreditInfo;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                className="sm:max-w-[500px] p-0 overflow-hidden border-border bg-background"
                onInteractOutside={(e) => {
                    if (isProcessing) {
                        e.preventDefault();
                    }
                }}
                onEscapeKeyDown={(e) => {
                    if (isProcessing) {
                        e.preventDefault();
                    }
                }}
            >
                <DialogHeader className="p-6 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                            <Wallet className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl">Wallet & Credits</DialogTitle>
                            <DialogDescription className="mt-1">
                                Manage your subscription and credit balance.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg border border-border/50">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Balance</span>
                            <div className="flex items-center gap-1.5">
                                <Zap className="w-4 h-4 text-amber-500" />
                                <span className="text-xl font-bold">{displayCreditInfo ? displayCreditInfo.remaining : "-"}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg border border-border/50">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Plan</span>
                            <div className="flex items-center gap-1.5">
                                <CreditCard className="w-4 h-4 text-blue-500" />
                                <span className="text-xl font-bold capitalize">{displayCreditInfo ? displayCreditInfo.plan : "-"}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg border border-border/50">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Reset</span>
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4 text-green-500" />
                                <span className="text-sm font-bold">
                                    {displayCreditInfo?.plan === "pro" ? "N/A" :
                                        displayCreditInfo?.resetDate ? new Date(displayCreditInfo.resetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "-"}
                                </span>
                            </div>
                        </div>

                    </div>

                    {/* Wallet Connection */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground/80">Wallet Connection</h4>
                        <div className={isConnected ? "p-4 rounded-lg border border-border bg-card" : ""}>
                            <WalletConnect />
                        </div>
                    </div>

                    {/* Transaction Builder */}
                    {isConnected && (
                        <div className="space-y-3 pt-2 border-t border-border">
                            <h4 className="text-sm font-medium text-foreground/80">Top Up Credits</h4>
                            <div className="bg-muted/10 rounded-lg overflow-hidden">
                                <DynamicTransactionBuilder
                                    creditsRemaining={displayCreditInfo?.remaining || 0}
                                    onTransactionSuccess={handleTransactionSuccess}
                                    onProcessingChange={setIsProcessing}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
