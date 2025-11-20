"use server";

import { getSupabaseInstance } from "../lib/supabaseSingletonServer";

const supabase = await getSupabaseInstance();

export interface CreditUsage {
  user_id: string;
  credits_used: number;
  plan: "free" | "pro" | "enterprise";
  reset_date?: string;
  created_at: string;
  updated_at: string;
}

export interface PlanLimits {
  free: { tokens: number; resetDays?: number };
  pro: { tokens: number; resetDays?: number };
  enterprise: { tokens: number; resetDays?: number };
}

/**
 * Get plan limits configuration
 */
export async function getPlanLimitsConfig(): Promise<PlanLimits> {
  return {
    free: { tokens: 5, resetDays: 30 },
    pro: { tokens: 100 },
    enterprise: { tokens: 10000, resetDays: 30 },
  };
}

/**
 * Get or create credit usage record for a user
 */
export async function getOrCreateCreditUsage(
  userId: string
): Promise<CreditUsage> {
  try {
    // First, try to get existing record
    const { data: existingRecord, error: fetchError } = await supabase
      .from("token_usage")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (existingRecord && !fetchError) {
      return existingRecord as CreditUsage;
    }

    // If no record exists, create one
    const { data: newRecord, error: insertError } = await supabase
      .from("token_usage")
      .insert({
        user_id: userId,
        credits_used: 0,
        plan: "free",
        reset_date: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30 days from now
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(
        `Failed to create token usage record: ${insertError.message}`
      );
    }

    return newRecord as CreditUsage;
  } catch (error) {
    console.error("Error getting or creating token usage:", error);
    throw error;
  }
}

/**
 * Check if user has enough credits for an operation
 */
export async function checkCreditLimit(
  userId: string,
  creditsNeeded: number = 100
): Promise<{
  canUse: boolean;
  remainingCredits: number;
  plan: string;
  error?: string;
}> {
  try {
    const tokenUsage = await getOrCreateCreditUsage(userId);
    const planLimits = await getPlanLimitsConfig();

    // Check if monthly reset is needed for free users
    const now = new Date();
    if (
      tokenUsage.reset_date &&
      new Date(tokenUsage.reset_date) <= now &&
      tokenUsage.plan === "free"
    ) {
      // Reset credits for free users when month ends
      const { error: resetError } = await supabase
        .from("token_usage")
        .update({
          credits_used: 0,
          reset_date: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(), // 30 days from now
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (resetError) {
        console.error("Error resetting credits:", resetError);
      } else {
        // Update the tokenUsage object with reset values
        tokenUsage.credits_used = 0;
        tokenUsage.reset_date = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString();
      }
    }

    const planLimit = planLimits[tokenUsage.plan as keyof PlanLimits];

    if (!planLimit) {
      return {
        canUse: false,
        remainingCredits: 0,
        plan: tokenUsage.plan,
        error: "Invalid plan type",
      };
    }

    const remainingCredits = Math.max(
      0,
      planLimit.tokens - tokenUsage.credits_used
    );

    if (remainingCredits < creditsNeeded) {
      return {
        canUse: false,
        remainingCredits,
        plan: tokenUsage.plan,
        error: `Not enough credits. You have ${remainingCredits} credits remaining on your ${tokenUsage.plan} plan.`,
      };
    }

    return {
      canUse: true,
      remainingCredits,
      plan: tokenUsage.plan,
    };
  } catch (error) {
    console.error("Error checking credit limit:", error);
    return {
      canUse: false,
      remainingCredits: 0,
      plan: "free",
      error: "Failed to check credit usage",
    };
  }
}

/**
 * Deduct credits from user's usage
 */
export async function deductCredits(
  userId: string,
  creditsUsed: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const tokenUsage = await getOrCreateCreditUsage(userId);
    const planLimits = await getPlanLimitsConfig();

    // Convert to integer to avoid floating point precision issues
    const currentCredits = Math.round(tokenUsage.credits_used * 10);
    const creditsToDeduct = Math.round(creditsUsed * 10);

    let newCreditsUsed = Math.max(0, (currentCredits + creditsToDeduct) / 10);
    let newPlan = tokenUsage.plan;
    let newResetDate = tokenUsage.reset_date;

    // Check if we need to downgrade from pro to free
    if (tokenUsage.plan === "pro") {
      const proLimit = planLimits.pro.tokens;
      const remaining = Math.max(0, proLimit - newCreditsUsed);

      // If they drop below 5 tokens (the free tier limit), downgrade them immediately
      // This ensures they always have at least the free monthly allowance
      if (remaining < 5) {
        newPlan = "free";
        newCreditsUsed = 0; // Reset usage so they get full 5 free tokens
        // Start their new monthly cycle from now
        newResetDate = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString();
      }
    }

    const { error } = await supabase
      .from("token_usage")
      .update({
        credits_used: newCreditsUsed, // Store as decimal with 1 digit precision
        plan: newPlan,
        reset_date: newResetDate,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to deduct tokens: ${error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error deducting tokens:", error);
    return {
      success: false,
      error: "Failed to deduct tokens",
    };
  }
}

/**
 * Get credit usage information for display
 */
export async function getCreditUsageInfo(userId: string): Promise<{
  used: number;
  remaining: number;
  total: number;
  plan: string;
  resetDate?: string;
  percentageUsed: number;
}> {
  try {
    const tokenUsage = await getOrCreateCreditUsage(userId);
    const planLimits = await getPlanLimitsConfig();

    if (!planLimits) {
      throw new Error("Invalid plan type");
    }

    const planLimit = planLimits[tokenUsage.plan as keyof PlanLimits];
    const totalCredits = planLimit.tokens;
    // Ensure we're working with numbers rounded to 1 decimal place
    const usedCredits = parseFloat(tokenUsage.credits_used.toFixed(1));
    const remainingCredits = parseFloat(
      Math.max(0, totalCredits - usedCredits).toFixed(1)
    );
    const percentageUsed = Math.min(
      100,
      Math.round((usedCredits / totalCredits) * 100)
    );

    return {
      used: usedCredits,
      remaining: remainingCredits,
      total: totalCredits,
      plan: tokenUsage.plan,
      resetDate: tokenUsage.reset_date || undefined,
      percentageUsed: Math.round(percentageUsed),
    };
  } catch (error) {
    console.error("Error getting token usage info:", error);
    // Return default values on error
    return {
      used: 0,
      remaining: 5000,
      total: 5000,
      plan: "free",
      percentageUsed: 0,
    };
  }
}

/**
 * Update user's plan
 */
export async function updateUserPlan(
  userId: string,
  newPlan: "free" | "pro" | "enterprise"
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const tokenUsage = await getOrCreateCreditUsage(userId);
    const planLimits = await getPlanLimitsConfig();

    // Calculate new token allocation
    const newLimit = planLimits[newPlan].tokens;

    // If upgrading, reset tokens used (or keep proportional usage)
    let newTokensUsed = tokenUsage.credits_used;
    if (newPlan !== tokenUsage.plan) {
      // For upgrades, keep the proportional usage
      const currentPercentage =
        tokenUsage.credits_used /
        planLimits[tokenUsage.plan as keyof PlanLimits].tokens;
      newTokensUsed = Math.floor(newLimit * currentPercentage);
    }

    // Calculate next reset date
    const resetDate = new Date();
    resetDate.setDate(
      resetDate.getDate() + (planLimits[newPlan]?.resetDays || 30)
    );

    const { error } = await supabase
      .from("token_usage")
      .update({
        plan: newPlan,
        credits_used: newTokensUsed,
        reset_date: resetDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to update plan: ${error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating user plan:", error);
    return {
      success: false,
      error: "Failed to update plan",
    };
  }
}

/**
 * Add credits to user's account (for pay-as-you-go)
 */
export async function addCredits(
  userId: string,
  creditsToAdd: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const tokenUsage = await getOrCreateCreditUsage(userId);

    // Convert to integer to avoid floating point precision issues
    const currentCredits = Math.round(tokenUsage.credits_used * 10);
    const creditsToAddRounded = Math.round(creditsToAdd * 10);

    const { error } = await supabase
      .from("token_usage")
      .update({
        credits_used: Math.max(0, (currentCredits - creditsToAddRounded) / 10), // Store as decimal with 1 digit precision
        plan: "pro", // Upgrade to pro when adding credits
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to add tokens: ${error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error adding tokens:", error);
    return {
      success: false,
      error: "Failed to add tokens",
    };
  }
}

/**
 * Get usage statistics for admin/analytics
 */
export async function getUsageStats(): Promise<{
  totalUsers: number;
  totalTokensUsed: number;
  averageUsage: number;
  planDistribution: Record<string, number>;
}> {
  try {
    const { data: allUsage, error } = await supabase
      .from("token_usage")
      .select("plan, credits_used");

    if (error) {
      throw new Error(`Failed to get usage stats: ${error.message}`);
    }

    const totalUsers = allUsage.length;
    const totalTokensUsed = allUsage.reduce(
      (sum, record) => sum + record.credits_used,
      0
    );
    const averageUsage = totalUsers > 0 ? totalTokensUsed / totalUsers : 0;

    const planDistribution = allUsage.reduce((acc, record) => {
      acc[record.plan] = (acc[record.plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalUsers,
      totalTokensUsed,
      averageUsage: Math.round(averageUsage),
      planDistribution,
    };
  } catch (error) {
    console.error("Error getting usage stats:", error);
    return {
      totalUsers: 0,
      totalTokensUsed: 0,
      averageUsage: 0,
      planDistribution: {},
    };
  }
}
