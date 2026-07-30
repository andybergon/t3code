import type { StatusTone } from "../../components/StatusPill";
import type { OrchestrationLatestTurn, OrchestrationSession } from "@t3tools/contracts";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/shell";

export type ThreadStatusKind =
  | "pending-approval"
  | "awaiting-input"
  | "working"
  | "connecting"
  | "error"
  | "plan-ready"
  | "done";

export interface ThreadStatusPresentation extends StatusTone {
  readonly kind: ThreadStatusKind;
  /** Foreground color for the leading status icon. */
  readonly iconColor: string;
  /** Background color for the leading status icon circle. */
  readonly iconBackground: string;
  /** Whether the indicator represents in-flight activity. */
  readonly pulse: boolean;
}

function isLatestTurnSettled(
  latestTurn: OrchestrationLatestTurn | null,
  session: OrchestrationSession | null,
): boolean {
  if (!latestTurn?.startedAt) return false;
  if (!latestTurn.completedAt) return false;
  if (!session) return true;
  return session.status !== "running";
}

export function hasUnseenCompletion(input: {
  readonly latestTurn: OrchestrationLatestTurn | null;
  readonly lastVisitedAt: string | null | undefined;
}): boolean {
  if (input.latestTurn?.state !== "completed" || !input.latestTurn.completedAt) return false;
  const completedAt = Date.parse(input.latestTurn.completedAt);
  if (Number.isNaN(completedAt)) return false;
  if (!input.lastVisitedAt) return false;

  const lastVisitedAt = Date.parse(input.lastVisitedAt);
  if (Number.isNaN(lastVisitedAt)) return true;
  return completedAt > lastVisitedAt;
}

/**
 * Resolves the user-facing status of a thread, in priority order. Returns
 * `null` for quiescent threads so rows stay free of "Idle"-style noise.
 * Mirrors `resolveThreadStatusPill` in apps/web/src/components/Sidebar.logic.ts.
 */
export function resolveThreadStatus(
  thread: EnvironmentThreadShell,
  lastVisitedAt?: string | null,
): ThreadStatusPresentation | null {
  if (thread.hasPendingApprovals) {
    return {
      kind: "pending-approval",
      label: "Needs Approval",
      pillClassName: "bg-adaptive-amber-500-a12-a16",
      textClassName: "text-adaptive-amber-700-300",
      iconColor: "#ff9f0a",
      iconBackground: "rgba(255,159,10,0.22)",
      pulse: false,
    };
  }

  if (thread.hasPendingUserInput) {
    return {
      kind: "awaiting-input",
      label: "Awaiting Input",
      pillClassName: "bg-adaptive-indigo-500-a12-a16",
      textClassName: "text-adaptive-indigo-700-300",
      iconColor: "#5e5ce6",
      iconBackground: "rgba(94,92,230,0.22)",
      pulse: false,
    };
  }

  if (thread.session?.status === "running") {
    return {
      kind: "working",
      label: "Working",
      pillClassName: "bg-adaptive-sky-500-a12-a16",
      textClassName: "text-adaptive-sky-700-300",
      iconColor: "#0a84ff",
      iconBackground: "rgba(10,132,255,0.22)",
      pulse: true,
    };
  }

  if (thread.session?.status === "starting") {
    return {
      kind: "connecting",
      label: "Connecting",
      pillClassName: "bg-adaptive-sky-500-a12-a16",
      textClassName: "text-adaptive-sky-700-300",
      iconColor: "#0a84ff",
      iconBackground: "rgba(10,132,255,0.22)",
      pulse: true,
    };
  }

  if (thread.session?.status === "error" || thread.latestTurn?.state === "error") {
    return {
      kind: "error",
      label: "Error",
      pillClassName: "bg-adaptive-rose-500-a12-a16",
      textClassName: "text-adaptive-rose-700-300",
      iconColor: "#ff453a",
      iconBackground: "rgba(255,69,58,0.22)",
      pulse: false,
    };
  }

  const hasPlanReadyPrompt =
    thread.interactionMode === "plan" &&
    isLatestTurnSettled(thread.latestTurn, thread.session) &&
    thread.hasActionableProposedPlan;
  if (hasPlanReadyPrompt) {
    return {
      kind: "plan-ready",
      label: "Plan Ready",
      pillClassName: "bg-adaptive-violet-500-a12-a16",
      textClassName: "text-adaptive-violet-700-300",
      iconColor: "#bf5af2",
      iconBackground: "rgba(191,90,242,0.22)",
      pulse: false,
    };
  }

  if (hasUnseenCompletion({ latestTurn: thread.latestTurn, lastVisitedAt })) {
    return {
      kind: "done",
      label: "Done",
      pillClassName: "bg-adaptive-emerald-500-a12-a16",
      textClassName: "text-adaptive-emerald-700-300",
      iconColor: "#30d158",
      iconBackground: "rgba(48,209,88,0.22)",
      pulse: false,
    };
  }

  return null;
}
