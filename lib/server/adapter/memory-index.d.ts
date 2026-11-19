/** The largest auto-memory index appended, in bytes. The text rides on the command line with the
 *  preset guidance, and Windows refuses a command line over 32,767 characters; 6 KiB leaves room
 *  for the 16 KiB guidance, the tool guidance and the other arguments. A larger index is cut at a
 *  line boundary; when not even its first line fits, only the notice is sent. */
export declare const MEMORY_INDEX_MAX_BYTES: number;
/** What one memory-index read produced. A missing or empty index is `{ ok: false }` with no
 *  problem: "no memory yet" is normal, and only a real read error is worth a log line. */
export type MemoryIndexRead = {
    ok: true;
    text: string;
} | {
    ok: false;
    problem?: string;
};
/**
 * Whether this turn appends the workspace's auto-memory index: the key asks for it, the turn runs
 * in the dsh instruction mode, isolate (which switches memory off altogether) is not on, and dsh's
 * own system prompt is not in use. In every other case Claude Code either loads the index itself
 * or must not see it.
 */
export declare function usesMemoryIndex(config: {
    memoryIndex: boolean;
}, usesDsh: boolean, isolated: boolean, dshSystem: string | undefined): boolean;
/** The block appended to Claude Code's prompt: a heading, one sentence naming the index file and
 *  where it comes from, then the index text. */
export declare function memoryIndexBlock(path: string, text: string): string;
/**
 * Read the UTF-8 `MEMORY.md` index in `dir` and trim it. A missing file or one that is empty after
 * trimming is the normal "no memory yet" case; any other read error is reported in `problem` and
 * the turn goes on without the index. A text over `MEMORY_INDEX_MAX_BYTES` keeps the longest run of
 * whole lines that fits and ends with a line saying it was cut and where the rest is.
 */
export declare function readMemoryIndex(dir: string): Promise<MemoryIndexRead>;
