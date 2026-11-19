// Per-preset guidance for Claude's system prompt: the file a dsh agent preset names in the
// plugin's config, read once for a turn in the default mode, and the digest that keys the Claude
// process when that text changes.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { errorText } from "../process.js";

/** The largest guidance file used, in bytes. A system prompt is not an essay, and an accidentally
 *  named log or source file would otherwise be sent to the model on every turn. The text travels on
 *  the command line (`--append-system-prompt`), and Windows refuses a command line over 32,767
 *  characters: the limit leaves room for the tool guidance and the other arguments. */
export const PRESET_GUIDANCE_MAX_BYTES = 16 * 1024;

/**
 * The guidance file a session under `preset` names in the config, or undefined when it has no
 * preset or the config has no entry for it. No entry is the normal case: most presets have no
 * guidance, and a preset id inherited from `Object.prototype` is not an entry either.
 */
export function guidancePathFor(
  config: { presetGuidance: Record<string, string> },
  preset: string | null,
): string | undefined {
  if (preset === null || !Object.hasOwn(config.presetGuidance, preset)) return undefined;
  return config.presetGuidance[preset];
}

/** What one guidance file read produced: the trimmed text, or the reason it contributes nothing.
 *  The caller decides whether to log that reason; a missing file is a configuration mistake, not a
 *  reason to fail the turn. */
export type GuidanceRead = { ok: true; text: string } | { ok: false; problem: string };

/**
 * Read the UTF-8 guidance file at `path` for one turn. The text is trimmed, and a file that is
 * missing, unreadable, empty after trimming, or over `PRESET_GUIDANCE_MAX_BYTES` bytes contributes
 * nothing: `problem` says which, and the turn goes on without it. The file is read once; the
 * caller reads it at most once per turn preparation.
 */
export async function readGuidanceFile(path: string): Promise<GuidanceRead> {
  let raw: Buffer;
  try {
    raw = await readFile(path);
  } catch (error) {
    return { ok: false, problem: `not readable (${errorText(error)})` };
  }
  if (raw.byteLength > PRESET_GUIDANCE_MAX_BYTES) {
    return {
      ok: false,
      problem: `${raw.byteLength} bytes, over the ${PRESET_GUIDANCE_MAX_BYTES}-byte limit`,
    };
  }
  const text = raw.toString("utf8").trim();
  if (text.length === 0) return { ok: false, problem: "empty after trimming" };
  return { ok: true, text };
}

/**
 * The `spec.system` digest for a process started with these prompts: dsh's system prompt under
 * `systemPrompt: dsh`, else the preset guidance appended in the default mode. Undefined when
 * neither is sent, so a session without guidance keys exactly as it did before the guidance
 * existed and does not respawn. A changed text changes the digest, so the session's next turn
 * starts a process that reads the new one.
 */
export function systemPromptDigest(
  dshSystem: string | undefined,
  presetGuidance: string | undefined,
): string | undefined {
  // Under dsh's prompt nothing is appended, so its text is the whole prompt that process started
  // with; the guidance is only the prompt text where the default mode appended it.
  const text = dshSystem ?? presetGuidance;
  return text === undefined
    ? undefined
    : createHash("sha256").update(text).digest("hex").slice(0, 16);
}
