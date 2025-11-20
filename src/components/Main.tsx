"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import InputForm from "./InputForm";
import { WalletCreditsModal } from "./WalletCreditsModal";
import { getCreditUsageInfo } from "@/lib/token-usage";

export default function Main() {
  const { user } = useUser();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{
    used: number;
    remaining: number;
    total: number;
    plan: string;
    resetDate?: string;
    percentageUsed: number;
  } | null>(null);

  const fetchTokenInfo = async () => {
    if (user?.id) {
      try {
        const info = await getCreditUsageInfo(user.id);
        setTokenInfo(info);
      } catch (error) {
        console.error("Failed to fetch token info:", error);
      }
    }
  };

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    fetchTokenInfo();
  }, [user?.id]);

  if (!user) {
    return null;
  }

  return (
    <div className="w-full h-full">
      <InputForm
        userId={user.id}
        tokenInfo={tokenInfo}
        onCreditsUsed={fetchTokenInfo}
        onOpenPricing={() => setShowWalletModal(true)}
      />
      <WalletCreditsModal
        open={showWalletModal}
        onOpenChange={setShowWalletModal}
        tokenInfo={tokenInfo}
        onSuccess={fetchTokenInfo}
      />
    </div>
  );
}
