import { motion } from "framer-motion"; // Optional for subtle animation
import { HelpCircle, Info, Play } from "lucide-react"; // Icons for flair
import { Button } from "@/components/ui/button";
import { HybridTooltip } from "@/components/HybridTooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import VideoJS from "@/components/VideoJS";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import Image from "next/image";
import ogImage from "../../public/og-image-transparent.png";
import videojs from "video.js";
import { useWindowWidth } from "@/hooks/useWindowWidth";
import { WalletCreditsModal } from "@/components/WalletCreditsModal";
import { useState } from "react";

export default function HeroSection({
  setShowInputForm,
}: {
  setShowInputForm?: (show: boolean) => void;
}) {
  const width = useWindowWidth();
  const [showWalletModal, setShowWalletModal] = useState(false);

  const videoJsOptions: Parameters<typeof videojs>[1] = {
    autoplay: true, // Disable autoplay initially
    controls: true,
    responsive: true,
    fluid: true, // Makes the player responsive
    sources: [
      {
        src: "/demo.mp4", // Replace with your video URL
        type: "video/mp4",
      },
    ],
  };

  const handlePlayerReady = (player: ReturnType<typeof videojs>) => {
    if (!player) {
      console.error("Player is not available");
      return;
    }
    player.requestFullscreen?.();

    setTimeout(() => {
      try {
        if (player.readyState() >= 1) {
          player.muted(true); // Mute to bypass autoplay restrictions
          player.play()?.catch((error) => {
            console.error("Autoplay failed:", error);
          });
        }
      } catch (error) {
        console.error("Error in autoplay:", error);
      }
    }, 1000);
  };

  return (
    <section className="relative flex items-center justify-center w-full ">
      {/* Subtle background pattern (SVG or CSS for whisper effect) */}
      <div className="absolute inset-0 opacity-10">
        <svg className="h-full w-full" fill="none" viewBox="0 0 100 100">
          {/* Mandala-like whisper waves */}
          <path
            d="M50 10 Q70 30 50 50 Q30 70 50 90"
            stroke="currentColor"
            strokeWidth="0.5"
          />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 text-center pb-20 ">
        {/* Animated title with whisper effect */}
        <motion.div
          key="hero-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-6 flex flex-col items-center justify-center py-5.5"
        >
          {width < 512 ? (
            <Image
              src={ogImage}
              alt="Depth Oracle"
              width={230}
              height={230}
              className="rounded-full select-none"
            />
          ) : (
            <Image
              src={ogImage}
              alt="Depth Oracle"
              width={270}
              height={270}
              className="rounded-full select-none"
            />
          )}
        </motion.div>

        {/* Subtitle: Punchier, benefit-focused */}
        <motion.p
          key="hero-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className=" mx-auto mb-12 text-xl leading-relaxed text-muted-foreground md:text-2xl relative"
        >
          Your Jungian shadow work companion. Discover the hidden you through
          intimate, guided conversations. Uncover buried patterns,{" "}
          <HybridTooltip
            content={
              <div>
                Your shadow self holds the parts of you that are hidden—fears,
                desires, or traits you’ve pushed away. Embracing them through
                compassionate dialogue brings balance, reduces inner conflict,
                and sparks authentic growth.
              </div>
            }
          >
            <span className="inline-flex items-center gap-1 cursor-help hover:text-foreground/40 text-foreground/80 transition-colors">
              embrace your shadow self
              <HelpCircle className="h-4 w-4 opacity-60 hover:opacity-100 transition-opacity" />
            </span>
          </HybridTooltip>
          , and unlock profound growth with Elara, your compassionate AI guide
          rooted in Jungian wisdom, shaped by your unique journey.
        </motion.p>

        <motion.div
          key="hero-buttons"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          id="go-to-app"
          className="flex mb-11 w-full justify-center gap-4 sm:flex-row flex-col pt-8 items-center"
        >
          <SignedOut>
            <SignInButton mode="modal">
              <Button
                variant="outline"
                size="lg"
                className="text-lg h-14 w-40 cursor-pointer  bg-gradient-to-r text-white hover:text-white select-none from-indigo-600 to-purple-600 shadow-lg hover:from-indigo-700 hover:to-purple-700 transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
                onClick={() => setShowInputForm?.(true)}
              >
                Try for free <span className=" text-base">🚀</span>
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                size="lg"
                className="text-lg h-14 w-40 cursor-pointer  bg-gradient-to-r text-white hover:text-white select-none from-indigo-600 to-purple-600 shadow-lg hover:from-indigo-700 hover:to-purple-700 transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
                onClick={() => setShowInputForm?.(false)}
              >
                Go to app <span className="text-base">🚀</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-lg h-14 w-40 cursor-pointer  select-none shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl border-zinc-700"
                onClick={() => setShowWalletModal(true)}
              >
                Buy Credits <span className="text-base">💎</span>
              </Button>
            </div>
          </SignedIn>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className="flex items-center justify-center text-lg h-14 w-38 cursor-pointer bg-gradient-to-r text-white hover:text-white select-none from-indigo-600 to-purple-600 shadow-lg hover:from-indigo-700 hover:to-purple-700 transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <span>See a Demo</span>
                <Play className="size-4.5 mt-0.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="!max-w-[90vw] border !border-border">
              <DialogHeader>
                <DialogTitle>Elara&apos;s Shadow Work Demo</DialogTitle>
                <DialogDescription></DialogDescription>
              </DialogHeader>
              {/* Demo Video */}
              <VideoJS options={videoJsOptions} onReady={handlePlayerReady} />
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Brief explanation of Jungian psychology */}
        <motion.div
          key="hero-jungian"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="mb-8 text-lg text-muted-foreground flex flex-col gap-6"
        >
          <p className="py-6">
            <strong>What is Jungian Shadow Work?</strong>
            <br />
            Pioneered by Carl Jung, shadow work is your gateway to the
            unconscious—unveiling hidden aspects of yourself through dreams,
            symbols, and archetypes. It&apos;s a compassionate path to deeper
            self-awareness, emotional balance, and true wholeness. With Elara as
            your empathetic AI guide, this journey becomes personal, profound,
            and transformative—ready to reveal the you that&apos;s been waiting.
          </p>
        </motion.div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="link"
              className="py-6 cursor-pointer text-sm text-muted-foreground hover:text-foreground select-none"
            >
              <strong>What data do we collect?</strong>
              <Info className="ml-2 !h-6 !w-6  " />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-w-72 sm:max-w-96">
            <DropdownMenuItem className="flex-col items-start p-4">
              <div className="text-sm sm:text-base md:text-base text-muted-foreground space-y-2 divide-y divide-muted">
                <p className="pt-2">
                  <span className="font-semibold">Free Tier:</span> User ID and
                  plan stored for account access.
                </p>
                <p className="pt-2">
                  <span className="font-semibold">Paid Tier:</span> Name, email,
                  payment processed by{" "}
                  <a
                    href="https://stripe.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                  >
                    Stripe
                  </a>
                  , never stored.
                </p>
                <p className="pt-2">
                  <span className="font-semibold text-foreground">
                    All Tiers:
                  </span>{" "}
                  Elara chats and inputs processed live, never stored in a
                  database. See{" "}
                  <a
                    href="https://console.groq.com/docs/legal/customer-data-processing-addendum#2-scope-and-purposes-of-processing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                  >
                    Groqs Data Processing Addendum
                  </a>{" "}
                  at section 2.3.
                </p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <WalletCreditsModal open={showWalletModal} onOpenChange={setShowWalletModal} />
    </section>
  );
}

