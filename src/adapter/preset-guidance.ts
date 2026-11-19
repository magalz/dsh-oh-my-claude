// Stub for the failing tests committed first: the reader and the process-key digest land in the
// next commit.

/** The largest guidance file used, in bytes. */
export const PRESET_GUIDANCE_MAX_BYTES = 32 * 1024;

/** What one guidance file read produced: the trimmed text, or the reason it contributes nothing. */
export type GuidanceRead = { ok: true; text: string } | { ok: false; problem: string };

/**
 * Stub: contributes no text yet, so the tests that expect a file's text fail for the missing
 * behavior. The reader lands in the next commit.
 */
export async function readGuidanceFile(path: string): Promise<GuidanceRead> {
  return { ok: false, problem: `not implemented: ${path}` };
}

/**
 * Stub: returns no digest yet, so the tests that expect one fail for the missing behavior. The
 * digest lands in the next commit.
 */
export function systemPromptDigest(
  dshSystem: string | undefined,
  presetGuidance: string | undefined,
): string | undefined {
  return undefined;
}
