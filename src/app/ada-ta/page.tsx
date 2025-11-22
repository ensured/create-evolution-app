import { CardanoLiveAIAnalystWrapper } from "@/components/CardanoLiveAIAnalystWrapper"
import { isProSubscribed } from "./actions";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

const page = async () => {
    const isProMembership = await isProSubscribed();

    return isProMembership ? (
        <CardanoLiveAIAnalystWrapper />
    ) : (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
            <p className="text-2xl font-bold">You need to be a pro member to use this feature</p>
            <SignedIn>
                <Link href="/" className="mt-4 text-blue-500 hover:underline">Upgrade to Pro</Link>
            </SignedIn>
            <SignedOut>
                <SignInButton mode="modal" forceRedirectUrl="/ada-ta">
                    <Button >
                        Sign in to upgrade to Pro
                    </Button>
                </SignInButton>
            </SignedOut>
        </div>
    )
}

export default page