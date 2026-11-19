// Which instruction files a local Claude Code child loads: its own (the default), or dsh's with
// Claude Code's own loading switched off for the session and dsh's block forwarded whole.
import { contextDrops, type ContextSource } from "../context-sources.js";
import type { NativeCopies } from "./prompt.js";

/** The environment that switches Claude Code's own CLAUDE.md loading off. Deliberately the only
 *  variable: isolate's set also turns off memory, skills, checkpoints and telemetry, which this
 *  mode keeps native. */
const CLAUDE_MDS_OFF = { CLAUDE_CODE_DISABLE_CLAUDE_MDS: "1" } as const;

/**
 * Whether this turn runs with Claude Code's own instruction-file loading off: the config asks for
 * dsh's instruction files and the turn is not a side call on this machine. A side call (title,
 * compaction) carries no conversation to instruct, and a box's Claude Code cannot be handed the
 * variable, so both keep the default arrangement.
 */
export function usesDshInstructions(
  config: { instructionFiles: "claude" | "dsh" },
  targetHost: string | undefined,
  purpose: string | undefined,
): boolean {
  return config.instructionFiles === "dsh" && purpose === undefined && targetHost === undefined;
}

/**
 * What the mode adds to the child's environment: the one variable above, or undefined when the
 * loading stays on. Under `isolate` the variable is already in `ISOLATED_ENV`, so nothing is added
 * there and isolate's environment stays exactly what it was.
 */
export function instructionEnvFor(
  usesDsh: boolean,
  isolated: boolean,
): Record<string, string> | undefined {
  return usesDsh && !isolated ? { ...CLAUDE_MDS_OFF } : undefined;
}

/**
 * What dsh copies of what Claude Code adds itself, for this turn. With Claude Code's own loading
 * off, dsh's CLAUDE.md sections are no longer a duplicate and are kept; skills still follow
 * `verbatimPrompts`, since the mode changes nothing about slash expansion.
 */
export function instructionCopiesFor(
  usesDsh: boolean,
  isolated: boolean,
  verbatimPrompts: boolean,
): NativeCopies {
  return { claudeMd: !isolated && !usesDsh, skills: !verbatimPrompts };
}

/**
 * Which dsh blocks this turn withholds: the switches' own decision, except that in the mode dsh's
 * instruction block is always forwarded, whatever the master or per-source switch says, while the
 * skills block keeps following them.
 */
export function instructionDropsFor(
  hints: Record<string, boolean | number>,
  usesDsh: boolean,
): Set<ContextSource> {
  const drops = contextDrops(hints);
  if (usesDsh) drops.delete("instructions");
  return drops;
}
