// Stub for the failing tests committed first: the mode's decisions land in the next commit.
import { contextDrops, type ContextSource } from "../context-sources.js";
import type { NativeCopies } from "./prompt.js";

/**
 * Stub: the mode never applies yet, so every turn keeps today's arrangement. The decision lands in
 * the next commit.
 */
export function usesDshInstructions(
  config: { instructionFiles: "claude" | "dsh" },
  targetHost: string | undefined,
  purpose: string | undefined,
): boolean {
  return false;
}

/**
 * Stub: no environment addition yet, so the test that expects the variable fails for the missing
 * behavior. It lands in the next commit.
 */
export function instructionEnvFor(
  usesDsh: boolean,
  isolated: boolean,
): Record<string, string> | undefined {
  return undefined;
}

/**
 * Stub: today's copies, with no mode to keep dsh's CLAUDE.md sections. The mode's copy decision
 * lands in the next commit.
 */
export function instructionCopiesFor(
  usesDsh: boolean,
  isolated: boolean,
  verbatimPrompts: boolean,
): NativeCopies {
  return { claudeMd: !isolated, skills: !verbatimPrompts };
}

/**
 * Stub: today's drops, with the mode changing nothing. The mode's forwarding lands in the next
 * commit.
 */
export function instructionDropsFor(
  hints: Record<string, boolean | number>,
  usesDsh: boolean,
): Set<ContextSource> {
  return contextDrops(hints);
}
