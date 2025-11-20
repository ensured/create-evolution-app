// app/dashboard/InputForm.tsx
"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Download,
  Lightbulb,
  Zap,
  MessageSquare,
  ArrowUp,
  RefreshCcw,
} from "lucide-react";
import {
  CoreArchetypesSection,
  ExpandedArchetypesSection,
} from "@/components/Archetypes";
import { HybridTooltip } from "@/components/HybridTooltip";
import { AI_MODEL } from "@/consts/const";
import { RollingText } from "@/components/ui/shadcn-io/rolling-text";
import { ThreadSelector } from "@/components/ThreadSelector";
import { toast } from "sonner";
import {
  getAllThreads,
  getThread,
  createThread,
  updateThread,
  deleteThread as deleteThreadStorage,
  renameThread,
  getLastActiveThreadId,
  migrateOldChatIfNeeded,
  getMaxThreads,
  isAtThreadLimit,
  type ChatThread,
  type Message,
} from "@/lib/chat-storage";
import { MessageMarkdown } from "./Markdown";


const helpTopics = [
  {
    title: "Emotional Regulation",
    desc: "Calm anxiety, anger, or overwhelm",
    prompt: "I'm feeling overwhelmed and anxious right now. Can you help me calm down?"
  },
  {
    title: "Shadow Work",
    desc: "Identify and integrate hidden aspects",
    prompt: "I want to explore my shadow. How do I start identifying my hidden patterns?"
  },
  {
    title: "Archetypal Insight",
    desc: "Map recurring patterns using archetypes",
    prompt: "Can you help me identify which archetypes are active in my life right now?"
  },
  {
    title: "Relationship Dynamics",
    desc: "Improve communication & boundaries",
    prompt: "I'm having trouble with a relationship. How can I set better boundaries?"
  },
  {
    title: "Stress & Anxiety",
    desc: "Reduce rumination & boost resilience",
    prompt: "I can't stop overthinking. Do you have any strategies to stop rumination?"
  },
  {
    title: "Life Purpose",
    desc: "Clarify values & set meaningful goals",
    prompt: "I feel lost and unsure of my direction. How can I clarify my life purpose?"
  },
  {
    title: "Habit Building",
    desc: "Turn small actions into lasting change",
    prompt: "I want to build better habits but I keep failing. Can you help me start small?"
  }
];

interface CreditsMeterProps {
  creditInfo: {
    remaining: number;
    plan: string;
    percentageUsed: number;
  } | null;
  animateCredits: boolean;
  onOpenPricing?: () => void;
}

const CreditsMeter = ({ creditInfo, animateCredits, onOpenPricing }: CreditsMeterProps) => {
  if (!creditInfo) return null;

  const getStatusColor = () => {
    if (creditInfo.percentageUsed < 32) return "bg-green-500/95";
    if (creditInfo.percentageUsed < 56) return "bg-yellow-500/95";
    if (creditInfo.percentageUsed < 76) return "bg-orange-500/95";
    return "bg-red-500/95";
  };

  return (
    <div className="rounded-lg border border-indigo-200/50 bg-white/80 p-2 sm:p-3 shadow-sm backdrop-blur-sm dark:bg-slate-800/80 dark:border-indigo-700/50 w-full sm:w-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 sm:h-3 sm:w-3 rounded-full ${getStatusColor()} shrink-0`}
          ></div>
          <span className="font-medium text-muted-foreground truncate">
            {animateCredits ? (
              <RollingText
                key={`credits-${creditInfo.remaining}`}
                text={`${creditInfo.remaining}`}
              />
            ) : (
              `${creditInfo.remaining}`
            )}{" "}
            credit{creditInfo.remaining === 1 ? "" : "s"} left
          </span>
        </div>
        <span className="text-xs text-muted-foreground sm:ml-2 md:ml-4 lg:ml-6 truncate">
          {creditInfo.plan} plan
        </span>
      </div>
      <div className="mt-2 h-1.5 sm:h-2 w-full rounded-full  dark:bg-gray-700">
        <div
          className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
          style={{ width: `${creditInfo.percentageUsed}%` }}
        ></div>
      </div>
      {onOpenPricing && (
        <Button
          onClick={onOpenPricing}
          size="sm"
          variant="outline"
          className="cursor-pointer w-full text-xs border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 dark:border-indigo-600 dark:text-indigo-400 dark:hover:bg-indigo-900/20 mt-2 h-6 sm:h-7"
        >
          <Zap className="h-3 w-3 mr-1" />
          <span className="hidden sm:inline">
            Change Plan / Get More Credits
          </span>
          <span className="sm:hidden">Get Credits</span>
        </Button>
      )}
    </div>
  );
};

export default function InputForm({
  userId,
  onCreditsUsed,
  creditInfo,
  onOpenPricing,
}: {
  userId: string;
  onCreditsUsed?: () => Promise<void>;
  creditInfo: {
    used: number;
    remaining: number;
    total: number;
    plan: string;
    resetDate?: string;
    percentageUsed: number;
  } | null;
  onOpenPricing?: () => void;
}) {
  // Thread Management State
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const threadsRef = useRef<ChatThread[]>([]);

  // Keep threads ref in sync
  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  // UI State
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [animateCredits, setAnimateCredits] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const prevRemaining = useRef<number | undefined>(undefined);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Initialize threads on mount
  useEffect(() => {
    // Migrate old chat format if needed
    migrateOldChatIfNeeded(userId);

    // Load all threads
    const loadedThreads = getAllThreads(userId);
    setThreads(loadedThreads);

    // Determine which thread to load
    let threadToLoad: ChatThread | null = null;

    if (loadedThreads.length > 0) {
      // Try to load last active thread
      const lastThreadId = getLastActiveThreadId(userId);
      if (lastThreadId) {
        threadToLoad = loadedThreads.find(t => t.id === lastThreadId) || loadedThreads[0];
      } else {
        threadToLoad = loadedThreads[0];
      }
    } else {
      // No threads exist, create first one
      threadToLoad = createThread(userId);
      setThreads([threadToLoad]);
    }

    if (threadToLoad) {
      setCurrentThreadId(threadToLoad.id);
      setMessages(threadToLoad.messages);
    }
  }, [userId]);

  // Save current thread whenever messages change (debounced)
  useEffect(() => {
    if (currentThreadId && messages.length > 0) {
      // Debounce the save to avoid excessive localStorage writes
      const saveTimer = setTimeout(() => {
        // Use ref to get latest threads without triggering effect loop
        const currentThread = threadsRef.current.find(t => t.id === currentThreadId);
        if (currentThread) {
          const updatedThread = { ...currentThread, messages };
          updateThread(updatedThread);

          // Only update the specific thread in state, not re-fetch all
          setThreads(prevThreads =>
            prevThreads.map(t => t.id === currentThreadId ? updatedThread : t)
          );
        }
      }, 500); // 500ms debounce

      return () => clearTimeout(saveTimer);
    }
  }, [messages, currentThreadId]); // Removed threads from dependency

  // Effect to handle scrolling when messages change
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      const behavior = isInitialMount.current ? "auto" : "smooth";

      // Find the last assistant message
      const lastAssistantMessage = [...messages]
        .reverse()
        .find((m) => m.role === "assistant");

      if (lastAssistantMessage) {
        // Find the message element in the DOM
        const messageElement = document.getElementById(
          `message-${lastAssistantMessage.id}`
        );

        if (messageElement) {
          // Scroll to the top of the assistant's message
          messageElement.scrollIntoView({
            behavior,
            block: "start", // Align to the top of the viewport
          });
        }
      }

      if (isInitialMount.current) {
        isInitialMount.current = false;
      }
    }
  }, [messages]); // Re-run when messages change

  const submitMessage = useCallback(async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    const wordCount = userMessage.split(/\s+/).length;

    // Check word count (10 for first message, 5 for follow-ups)
    const minWords = messages.length === 0 ? 10 : 5;
    if (wordCount < minWords) {
      setError(
        messages.length === 0
          ? "Share a bit more to dive deeper with Elara (10+ words)."
          : "Share a bit more to continue (5+ words)."
      );
      return;
    }

    setInput("");
    setError("");

    // Add user message immediately
    const userMessageObj = {
      role: "user" as const,
      content: userMessage,
      timestamp: new Date(),
      id: Date.now().toString(),
    };
    setMessages((prev) => [...prev, userMessageObj]);

    // Add assistant message placeholder
    const assistantMessageObj = {
      role: "assistant" as const,
      content: "",
      timestamp: new Date(),
      id: (Date.now() + 1).toString(),
    };

    // Add assistant message and clear input
    setMessages((prev) => [...prev, assistantMessageObj]);
    startTransition(async () => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: messages.concat(userMessageObj),
            userId,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to get response");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            accumulatedContent += chunk;

            // Update the assistant message with accumulated content
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageObj.id
                  ? { ...msg, content: accumulatedContent }
                  : msg
              )
            );
          }
        }

        // After streaming is complete, deduct credits and update credit info
        if (onCreditsUsed) {
          await onCreditsUsed();
        }
      } catch (err: unknown) {
        setError(
          (err instanceof Error ? err.message : String(err)) ||
          "Connection glitch—Elara's lantern flickered. Try again."
        );
        // Remove the failed assistant message
        setMessages((prev) => prev.slice(0, -1));
        setRetryMessage(userMessage); // Store for retry
      }
    });
  }, [input, messages, userId, startTransition, onCreditsUsed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitMessage();
  };

  const retryLastMessage = () => {
    if (retryMessage) {
      setInput(retryMessage);
      setRetryMessage(null);
      setError("");
    }
  };

  // Thread Management Functions
  const handleNewThread = useCallback(() => {
    try {
      if (isAtThreadLimit(userId)) {
        toast.error(`Maximum ${getMaxThreads()} threads reached`, {
          description: "Please delete some old threads to create new ones.",
        });
        return;
      }

      const newThread = createThread(userId);
      setThreads(getAllThreads(userId));
      setCurrentThreadId(newThread.id);
      setMessages([]);
      setError("");
      toast.success("New conversation started");

      // Focus the input
      setTimeout(() => {
        textareaRef.current?.focus();
        setInput("");
      }, 0);
    } catch (error) {
      toast.error("Failed to create new thread", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [userId]);

  const handleThreadSwitch = useCallback(
    (threadId: string) => {
      const thread = getThread(threadId, userId);
      if (thread) {
        setCurrentThreadId(thread.id);
        setMessages(thread.messages);
        setError("");
        toast.success(`Switched to: ${thread.title}`);
      }
    },
    [userId]
  );

  const handleDeleteThread = useCallback(
    (threadId: string) => {
      try {
        deleteThreadStorage(threadId, userId);
        const remainingThreads = getAllThreads(userId);
        setThreads(remainingThreads);

        // If we deleted the current thread, switch to another or create new
        if (threadId === currentThreadId) {
          if (remainingThreads.length > 0) {
            const nextThread = remainingThreads[0];
            setCurrentThreadId(nextThread.id);
            setMessages(nextThread.messages);
          } else {
            // No threads left, create a new one
            const newThread = createThread(userId);
            setThreads([newThread]);
            setCurrentThreadId(newThread.id);
            setMessages([]);
          }
        }

        toast.success("Thread deleted");
      } catch (error) {
        toast.error("Failed to delete thread", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [userId, currentThreadId]
  );

  const handleRenameThread = useCallback(
    (threadId: string, newTitle: string) => {
      try {
        renameThread(threadId, userId, newTitle);
        setThreads(getAllThreads(userId));
        toast.success("Thread renamed");
      } catch (error) {
        toast.error("Failed to rename thread", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [userId]
  );

  const clearConversation = useCallback(() => {
    // Clear messages in current thread
    if (currentThreadId) {
      const currentThread = threads.find(t => t.id === currentThreadId);
      if (currentThread) {
        const clearedThread = { ...currentThread, messages: [] };
        updateThread(clearedThread);
        setThreads(getAllThreads(userId));
        setMessages([]);
        setError("");

        // Focus the input after clearing
        setTimeout(() => {
          textareaRef.current?.focus();
          setInput("");
        }, 0);
      }
    }
  }, [currentThreadId, threads, userId]);

  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copiedMessageId) {
      const timer = setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedMessageId]);

  // Animate credits when they change
  useEffect(() => {
    if (creditInfo) {
      if (prevRemaining.current === undefined) {
        // First time setting tokenInfo, just record it without animating
        prevRemaining.current = creditInfo.remaining;
      } else if (creditInfo.remaining !== prevRemaining.current) {
        // Actual change, animate
        prevRemaining.current = creditInfo.remaining;
        setAnimateCredits(true);
        const timer = setTimeout(() => {
          setAnimateCredits(false);
        }, 1000); // Animation duration
        return () => clearTimeout(timer);
      }
    }
  }, [creditInfo?.remaining]);

  return (
    <div className="mx-auto w-full">
      <div className="rounded-md w-[100vw] h-[calc(100vh-3.6rem)] flex flex-col bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/20 dark:from-slate-800 dark:via-indigo-900/20 dark:to-purple-900/20 shadow-xl dark:border-gray-700/50">
        {/* Chat Header */}
        <div className="border-b border-gray-200/50 p-4 sm:p-6 dark:border-gray-700/50">
          <div className="flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center flex-1 min-w-0">
                <div className="mr-3 sm:mr-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 shrink-0">
                  <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-lg sm:text-xl font-bold text-transparent truncate dark:text-primary">
                    Chat with Elara
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                    Uncover Your Depths, Embrace Your Whole Self
                  </p>
                </div>
              </div>

              <div className="flex-shrink-0">
                <CreditsMeter
                  creditInfo={creditInfo}
                  animateCredits={animateCredits}
                  onOpenPricing={onOpenPricing}
                />
              </div>
            </div>

            {/* Thread Selector */}
            <div className="flex items-center gap-2">
              <ThreadSelector
                threads={threads}
                currentThreadId={currentThreadId}
                onThreadSelect={handleThreadSwitch}
                onNewThread={handleNewThread}
                onDeleteThread={handleDeleteThread}
                onRenameThread={handleRenameThread}
                maxThreads={getMaxThreads()}
              />
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div
          className={`flex flex-col flex-1 overflow-y-auto p-3 sm:p-6 ${messages.length === 0 ? "" : "gap-3 sm:gap-4"
            }`}
          ref={messagesContainerRef}
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center min-h-full text-gray-500 dark:text-gray-400 px-4 py-8">
              <div className="w-full max-w-4xl my-auto flex flex-col items-center">
                <div className="text-center mb-8 shrink-0">
                  <MessageSquare className="mx-auto h-10 w-10 sm:h-12 sm:w-12 mb-2 opacity-50 text-indigo-500" />
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-200">
                    How can Elara help you today?
                  </h2>
                  <p className="text-sm sm:text-base max-w-md mx-auto">
                    Select a topic to start your journey of self-discovery and growth.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full pb-4">
                  {helpTopics.map((topic, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(topic.prompt)}
                      className="text-left p-4 rounded-xl border border-gray-200/50 bg-white/50 hover:bg-white hover:border-indigo-300 hover:shadow-md transition-all dark:bg-slate-800/50 dark:border-gray-700/50 dark:hover:bg-slate-800 dark:hover:border-indigo-500 group"
                    >
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm sm:text-base">
                        {topic.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {topic.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={message.id}
              id={`message-${message.id}`}
              data-message-id={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                }`}
              ref={index === messages.length - 1 ? messagesEndRef : null}
            >
              <div
                className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-3 group relative ${message.role === "user"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                  : "border border-indigo-200/50 bg-white/90 text-gray-800 dark:bg-slate-700/90 dark:text-gray-200 dark:border-indigo-700/50 shadow-sm"
                  }`}
              >
                {/* Message actions - positioned top right */}
                {message.role === "assistant" && message.content.trim() && (
                  <div className="absolute top-2 right-0.5">
                    {/* Copy Button */}
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(message.content);
                        setCopiedMessageId(message.id);
                      }}
                      variant="outline"
                      size="sm"
                      className={`!h-6 !w-6 sm:!h-7 sm:!w-7 transition-all p-1 cursor-pointer border ${copiedMessageId === message.id
                        ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-600"
                        : "bg-gray-50 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-indigo-700 dark:hover:border-indigo-500"
                        }`}
                      title={
                        copiedMessageId === message.id
                          ? "Copied!"
                          : "Copy message"
                      }
                    >
                      {copiedMessageId === message.id ? (
                        <svg
                          className="w-2.5 h-2.5 sm:w-3 sm:h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-2.5 h-2.5 sm:w-3 sm:h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </Button>
                  </div>
                )}

                <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-p:leading-relaxed prose-pre:p-0 pr-4 overflow-hidden">
                  <MessageMarkdown content={message.content} />
                </div>

                {/* Message metadata and actions */}
                <div
                  className={`flex items-center justify-between mt-2 text-xs gap-2 ${message.role === "user"
                    ? "text-white/70"
                    : "text-gray-500 dark:text-gray-400"
                    }`}
                >
                  <span className="truncate">
                    {message.timestamp instanceof Date &&
                      !isNaN(message.timestamp.getTime())
                      ? message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      : ""}
                  </span>

                  {isPending &&
                    message.role === "assistant" &&
                    !message.content && (
                      <div className="flex justify-start">
                        <div className="w-full rounded-2xl border border-indigo-200/50 bg-white/90 px-3 py-2 sm:px-4 sm:py-3 shadow-sm dark:bg-slate-700/90 dark:border-indigo-700/50">
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-indigo-400 rounded-full animate-bounce"></div>
                              <div
                                className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-indigo-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0.1s" }}
                              ></div>
                              <div
                                className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-indigo-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0.2s" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Copy button has been moved to the top right */}
                </div>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Section */}
        <div className="border-t border-gray-200/50 p-3 sm:p-6 dark:border-gray-700/50">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="relative">
              {/* Error Display */}
              {error && (
                <div
                  className={`mt-4 mb-2 rounded-xl border p-4 ${error.includes("credits") || error.includes("Credit")
                    ? "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300"
                    : "border-red-200 bg-red-50 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {error.includes("credits") || error.includes("Credit") ? (
                        <>
                          {error}{" "}
                          <button
                            onClick={() => {
                              onOpenPricing?.();
                              // Scroll to pricing section after a short delay to ensure component is rendered
                              setTimeout(() => {
                                const pricingElement =
                                  document.getElementById("pricing");
                                if (pricingElement) {
                                  pricingElement.scrollIntoView({ behavior: "smooth" });
                                }
                              }, 100);
                            }}
                            className="font-semibold underline hover:text-orange-900 dark:hover:text-orange-200"
                          >
                            Upgrade or top up
                          </button>
                        </>
                      ) : (
                        error
                      )}
                    </div>

                    {!error.includes("credits") &&
                      !error.includes("Credit") &&
                      !error.includes("token limit") &&
                      retryMessage && (
                        <Button
                          onClick={retryLastMessage}
                          size="sm"
                          variant="outline"
                          className="ml-4 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          Retry
                        </Button>
                      )}

                    {!error.includes("credits") &&
                      !error.includes("Credit") &&
                      error.includes("token limit") && (
                        <Button
                          onClick={() => {
                            clearConversation();
                            setError("");
                          }}
                          size="sm"
                          variant="outline"
                          className="ml-4 border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-900/20"
                        >
                          Reset Chat
                        </Button>
                      )}
                  </div>
                </div>
              )}
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What&apos;s on your mind? Share a dream, feeling, or thought..."
                className="resize-none border-indigo-200 !text-sm sm:!text-base focus:border-indigo-400 focus:ring-indigo-400/20 pr-10 sm:pr-12 dark:border-indigo-700 dark:bg-slate-800 dark:text-gray-100 dark:placeholder-gray-400 overflow-hidden min-h-[44px]"
                disabled={isPending || (creditInfo?.remaining ?? 0) === 0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitMessage();
                  }
                }}
                title="Elara listens to your dreams, emotions, or reflections to offer Jungian insights."
              />

              <Button
                type="submit"
                disabled={
                  isPending ||
                  !input.trim() ||
                  (creditInfo?.remaining ?? 0) === 0
                }
                size="sm"
                className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 h-7 w-7 sm:h-8 sm:w-8 rounded-full p-0 cursor-pointer"
              >
                <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <div className="absolute -bottom-3.25 flex flex-row items-center gap-2 justify-center w-full">
                <HybridTooltip
                  content={
                    <div className="space-y-2 max-w-xs">
                      <p className="font-medium">Groq&apos;s Compound System</p>
                      <p className="text-sm">
                        Groq&apos;s Compound system integrates OpenAI&apos;s
                        GPT-OSS 120B and Llama 4 models with external tools like
                        web search and code execution. This allows applications
                        to access real-time data and interact with external
                        environments, providing more accurate and current
                        responses than standalone LLMs.
                      </p>
                    </div>
                  }
                >
                  <span className="select-none text-[.6rem] text-muted-foreground hover:underline cursor-help">
                    {AI_MODEL}
                  </span>
                </HybridTooltip>
              </div>
            </div>

            <div className="flex flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
              {/* Left Area: Information and Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                {/* Archetype and Guide Links */}
                <div className="flex flex-col sm:flex-row items-start xs:items-center gap-2 xs:gap-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      <span className="flex items-center gap-2 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">
                          Explore Your Archetypes
                        </span>
                        <span className="sm:hidden">Archetypes</span>
                      </span>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto ">
                      <DialogHeader>
                        <DialogTitle>Jungian Archetypes</DialogTitle>
                        <DialogDescription>
                          Explore the fundamental archetypes that shape human
                          psychology according to Carl Jung&apos;s analytical
                          psychology.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="mt-4 space-y-4">
                        <CoreArchetypesSection />
                        <ExpandedArchetypesSection />
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <span className="flex items-center gap-2 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        <Lightbulb className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">
                          How Jung Guides Your Journey
                        </span>
                        <span className="sm:hidden">Jungian Guide</span>
                      </span>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto flex flex-col">
                      <DialogHeader>
                        <DialogTitle>How Jung Guides Your Journey</DialogTitle>
                        <DialogDescription>
                          Understanding how Carl Jung&apos;s analytical
                          psychology powers your experience with Elara
                        </DialogDescription>
                      </DialogHeader>
                      <div className="mt-4 space-y-4">
                        <div className="border-l-4 border-indigo-500 pl-3 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-r-lg py-2">
                          <h4 className="font-bold text-indigo-700 dark:text-indigo-300 mb-2 text-sm">
                            What is Jungian Psychology?
                          </h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            Carl Jung&apos;s analytical psychology explores the
                            unconscious mind, including the personal unconscious
                            (your unique experiences) and the collective
                            unconscious (shared human patterns). It emphasizes
                            archetypes (universal symbols) and individuation
                            (the journey to psychological wholeness). Unlike
                            Freud&apos;s focus on drives, Jung highlighted the
                            spiritual and symbolic dimensions of human
                            experience.
                          </p>
                        </div>

                        <div className="border-l-4 border-purple-500 pl-3 bg-purple-50/50 dark:bg-purple-900/20 rounded-r-lg py-2">
                          <h4 className="font-bold text-purple-700 dark:text-purple-300 mb-2 text-sm">
                            How Elara Uses Jungian Principles
                          </h4>
                          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                            <div>
                              <strong className="text-purple-600 dark:text-purple-400">
                                Archetype Analysis:
                              </strong>{" "}
                              Uncovers universal patterns in your dreams,
                              emotions, and life, revealing their deeper
                              meaning.
                            </div>
                            <div>
                              <strong className="text-purple-600 dark:text-purple-400">
                                Shadow Work:
                              </strong>{" "}
                              Gently explores repressed or hidden parts of your
                              personality to foster inner wholeness.
                            </div>
                            <div>
                              <strong className="text-purple-600 dark:text-purple-400">
                                Persona Exploration:
                              </strong>{" "}
                              Helps you navigate the social mask you wear,
                              aligning it with your authentic self.
                            </div>
                            <div>
                              <strong className="text-purple-600 dark:text-purple-400">
                                Individuation Process:
                              </strong>{" "}
                              Supports your journey toward integrating all
                              aspects of your psyche for self-realization.
                            </div>
                            <div>
                              <strong className="text-purple-600 dark:text-purple-400">
                                Anima/Animus Integration:
                              </strong>{" "}
                              Helps you balance the masculine and feminine
                              energies within for healthier relationships.
                            </div>
                          </div>
                        </div>

                        <div className="border-l-4 border-green-500 pl-3 bg-green-50/50 dark:bg-green-900/20 rounded-r-lg py-2">
                          <h4 className="font-bold text-green-700 dark:text-green-300 mb-2 text-sm">
                            Key Jungian Concepts in Your Journey
                          </h4>
                          <div className="flex flex-col gap-3 text-sm">
                            <div className="bg-white/50 dark:bg-slate-800/50 p-2 rounded">
                              <strong className="text-green-600 dark:text-green-400">
                                The Self:
                              </strong>{" "}
                              The unifying center of your psyche, guiding you
                              toward wholeness, reflected in Elara&apos;s
                              holistic insights.
                            </div>
                            <div className="bg-white/50 dark:bg-slate-800/50 p-2 rounded">
                              <strong className="text-green-600 dark:text-green-400">
                                The Shadow:
                              </strong>{" "}
                              Hidden or repressed traits that Elara helps you
                              explore for emotional healing.
                            </div>
                            <div className="bg-white/50 dark:bg-slate-800/50 p-2 rounded">
                              <strong className="text-green-600 dark:text-green-400">
                                Collective Unconscious:
                              </strong>{" "}
                              Universal patterns shared across humanity, which
                              Elara taps into for dream interpretation.
                            </div>
                            <div className="bg-white/50 dark:bg-slate-800/50 p-2 rounded">
                              <strong className="text-green-600 dark:text-green-400">
                                Synchronicity:
                              </strong>{" "}
                              Meaningful coincidences that Elara highlights to
                              connect your dreams and life events.
                            </div>
                            <div className="bg-white/50 dark:bg-slate-800/50 p-2 rounded">
                              <strong className="text-green-600 dark:text-green-400">
                                Complexes:
                              </strong>{" "}
                              Emotional patterns in your unconscious that Elara
                              identifies through recurring dream themes.
                            </div>
                            <div className="bg-white/50 dark:bg-slate-800/50 p-2 rounded">
                              <strong className="text-green-600 dark:text-green-400">
                                Active Imagination:
                              </strong>{" "}
                              A creative method Elara uses to help you engage
                              with unconscious symbols through guided
                              reflection.
                            </div>
                          </div>
                        </div>

                        <div className="border-l-4 border-blue-500 pl-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-r-lg py-2">
                          <h4 className="font-bold text-blue-700 dark:text-blue-300 mb-2 text-sm">
                            Why Jungian Psychology for Dream Analysis?
                          </h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            Dreams are the voice of your unconscious, rich with
                            symbols and meaning. Jungian psychology offers a
                            powerful lens to decode dream imagery, archetypes,
                            and hidden emotions. Elara uses this approach to
                            reveal the deeper significance of your dreams,
                            providing insights that connect to your waking life
                            and guide you toward individuation.
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

              </div>

              {/* Right Area: Action Buttons */}
              {messages.length > 0 && (
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    onClick={clearConversation}
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 sm:h-8 px-2 sm:px-3 cursor-pointer group transition-colors duration-75"
                  >
                    <span className=" text-primary/90 group-hover:text-primary">
                      <span className="flex items-center gap-1 text-primary/90 group-hover:text-primary">
                        <RefreshCcw className=" !h-3.5 !w-3.5 text-muted-foreground group-hover:text-primary" />
                        Clear
                      </span>
                    </span>
                  </Button>
                  <Button
                    onClick={() =>
                      downloadText(
                        messages
                          .map(
                            (m) =>
                              `${m.role === "user" ? "You" : "Elara"}: ${m.content
                              }`
                          )
                          .join("\n\n"),
                        `depth-oracle-chat_${new Date()
                          .toISOString()
                          .slice(0, 10)
                          .replace(/-/g, "_")}.txt`
                      )
                    }
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 sm:h-8 px-2 sm:px-3 cursor-pointer group transition-colors duration-75"
                  >
                    <Download className="mr-1 !h-3.5 !w-3.5 text-primary/90 group-hover:text-primary" />
                    <span className="hidden sm:inline text-primary/90 group-hover:text-primary">
                      Save Chat
                    </span>
                    <span className="sm:hidden text-primary/90 group-hover:text-primary">
                      Save
                    </span>
                  </Button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
