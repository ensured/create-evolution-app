"use client";

import { UserButton, useUser, SignInButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "lucide-react";
import Link from "next/link";
import { GradientText } from "./ui/shadcn-io/gradient-text";
import FeedbackButton from "./FeedbackButton";
import { QuoteToast } from "./QuoteToast";

export function Header() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border backdrop-blur dark:bg-background/60 bg-accent">
        <div className=" flex h-14 items-center justify-between px-3 sm:px-4 md:px-5 lg:px-6 xl:px-7">
          <div className="flex items-center space-x-2 select-none">
            <Link href="/" className="hover:underline flex items-center gap-1">

              <GradientText
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className=" font-bold text-xl"
                text="Depth Oracle"
              />
            </Link>
          </div>

          <Skeleton className="h-8 w-22 animate-pulse rounded-md bg-black/5 dark:bg-white/5" />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border backdrop-blur bg-background/80">
      <div className=" flex px-3 sm:px-4 md:px-5 lg:px-6 xl:px-7 h-14 items-center justify-between">
        <div className="flex items-center gap-1 select-none">
          <Link href="/" className="hover:underline flex items-center gap-1">

            <GradientText
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "linear",
              }}
              className=" font-bold text-xl"
              text="Depth Oracle"
            />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <QuoteToast />

          {user ? (
            <div className="flex items-center">
              <UserButton
                appearance={{
                  elements: {
                    rootBox: "!mr-0 !px-1.5",
                    avatarBox: "!mr-0",
                  },
                }}
              />
            </div>
          ) : (
            <SignInButton mode="modal">
              <Button asChild variant="ghost" className="cursor-pointer">
                <div className="flex items-center">
                  <User className="!h-5.5 !w-5.5" />
                </div>
              </Button>
            </SignInButton>
          )}
          <FeedbackButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
