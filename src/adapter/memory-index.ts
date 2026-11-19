// Claude Code's auto-memory index for the dsh instruction mode, where the CLI loads none of its own
// instruction or memory files: the switch, the block appended to its prompt, and the reader.
/** The largest auto-memory index appended, in bytes. The text rides on the command line with the
 *  preset guidance, and Windows refuses a command line over 32,767 characters; 6 KiB leaves room
 *  for the 16 KiB guidance, the tool guidance and the other arguments. A larger index is cut at a
 *  line boundary, never dropped whole. */
export const MEMORY_INDEX_MAX_BYTES = 6 * 1024;

/** What one memory-index read produced. A missing or empty index is `{ ok: false }` with no
 *  problem: "no memory yet" is normal, and only a real read error is worth a log line. */
export type MemoryIndexRead = { ok: true; text: string } | { ok: false; problem?: string };

/**
 * Whether this turn appends the workspace's auto-memory index: the key asks for it, the turn runs
 * in the dsh instruction mode, isolate (which switches memory off altogether) is not on, and dsh's
 * own system prompt is not in use. In every other case Claude Code either loads the index itself
 * or must not see it.
 */
export function usesMemoryIndex(
  config: { memoryIndex: boolean },
  usesDsh: boolean,
  isolated: boolean,
  dshSystem: string | undefined,
): boolean {
  return false;
}

/** The block appended to Claude Code's prompt: a heading, one sentence naming the index file and
 *  where it comes from, then the index text. */
export function memoryIndexBlock(path: string, text: string): string {
  return "";
}

/**
 * Read the UTF-8 `MEMORY.md` index in `dir` and trim it. A missing file or one that is empty after
 * trimming is the normal "no memory yet" case; any other read error is reported in `problem` and
 * the turn goes on without the index.
 */
export async function readMemoryIndex(dir: string): Promise<MemoryIndexRead> {
  return { ok: false };
}
