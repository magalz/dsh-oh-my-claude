// Claude Code's auto-memory index for the dsh instruction mode, where the CLI loads none of its own
// instruction or memory files: the switch, the block appended to its prompt, and the reader.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { errorText } from "../process.js";
import { isEnoent } from "../remote-fs.js";

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
  return config.memoryIndex && usesDsh && !isolated && dshSystem === undefined;
}

/** The block appended to Claude Code's prompt: a heading, one sentence naming the index file and
 *  where it comes from, then the index text. */
export function memoryIndexBlock(path: string, text: string): string {
  return [
    "# Auto-memory index",
    "",
    `The file ${path} is the index of the persistent memory directory, loaded when this process ` +
      "started; read a file it lists when that file is relevant.",
    "",
    text,
  ].join("\n");
}

/** The last line of a cut index: the limit it was cut at, and where the rest stays. */
const CUT_NOTICE = `[auto-memory index cut at ${MEMORY_INDEX_MAX_BYTES} bytes; the rest is in the file]`;

/**
 * The longest run of whole lines at the start of `text` whose UTF-8 bytes fit in `limit`. An empty
 * answer means not even the first line fitted; a character is never split, since whole lines are.
 */
function fitIndexLines(text: string, limit: number): string {
  const kept: string[] = [];
  let bytes = 0;
  for (const line of text.split("\n")) {
    const next = bytes + (kept.length === 0 ? 0 : 1) + Buffer.byteLength(line, "utf8");
    if (next > limit) break;
    kept.push(line);
    bytes = next;
  }
  return kept.join("\n");
}

/**
 * Read the UTF-8 `MEMORY.md` index in `dir` and trim it. A missing file or one that is empty after
 * trimming is the normal "no memory yet" case; any other read error is reported in `problem` and
 * the turn goes on without the index. A file over `MEMORY_INDEX_MAX_BYTES` keeps the longest run of
 * whole lines that fits and ends with a line saying it was cut, so the index is never dropped.
 */
export async function readMemoryIndex(dir: string): Promise<MemoryIndexRead> {
  let raw: Buffer;
  try {
    raw = await readFile(join(dir, "MEMORY.md"));
  } catch (error) {
    if (isEnoent(error)) return { ok: false };
    return { ok: false, problem: `not readable (${errorText(error)})` };
  }
  const text = raw.toString("utf8").trim();
  if (text.length === 0) return { ok: false };
  if (raw.byteLength <= MEMORY_INDEX_MAX_BYTES) return { ok: true, text };
  const kept = fitIndexLines(text, MEMORY_INDEX_MAX_BYTES);
  return { ok: true, text: kept === "" ? CUT_NOTICE : `${kept}\n${CUT_NOTICE}` };
}
