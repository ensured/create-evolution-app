"use client";
import dynamic from "next/dynamic";

const CardanoLiveAIAnalyst = dynamic(() => import("@/components/CardanoLiveAIAnalyst"), { ssr: false });

export function CardanoLiveAIAnalystWrapper() {
    return <CardanoLiveAIAnalyst />;
}
