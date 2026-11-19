/** The largest guidance file used, in bytes. A system prompt is not an essay, and an accidentally
 *  named log or source file would otherwise be sent to the model on every turn. The text travels on
 *  the command line (`--append-system-prompt`), and Windows refuses a command line over 32,767
 *  characters: the limit leaves room for the tool guidance and the other arguments. */
export declare const PRESET_GUIDANCE_MAX_BYTES: number;
/**
 * The guidance file a session under `preset` names in the config, or undefined when it has no
 * preset or the config has no entry for it. No entry is the normal case: most presets have no
 * guidance, and a preset id inherited from `Object.prototype` is not an entry either.
 */
export declare function guidancePathFor(config: {
    presetGuidance: Record<string, string>;
}, preset: string | null): string | undefined;
/** What one guidance file read produced: the trimmed text, or the reason it contributes nothing.
 *  The caller decides whether to log that reason; a missing file is a configuration mistake, not a
 *  reason to fail the turn. */
export type GuidanceRead = {
    ok: true;
    text: string;
} | {
    ok: false;
    problem: string;
};
/**
 * Read the UTF-8 guidance file at `path` for one turn. The text is trimmed, and a file that is
 * missing, unreadable, empty after trimming, or over `PRESET_GUIDANCE_MAX_BYTES` bytes contributes
 * nothing: `problem` says which, and the turn goes on without it. The file is read once; the
 * caller reads it at most once per turn preparation.
 */
export declare function readGuidanceFile(path: string): Promise<GuidanceRead>;
/**
 * The `spec.system` digest for a process started with these prompts: dsh's system prompt under
 * `systemPrompt: dsh`, else the preset guidance appended in the default mode. Undefined when
 * neither is sent, so a session without guidance keys exactly as it did before the guidance
 * existed and does not respawn. A changed text changes the digest, so the session's next turn
 * starts a process that reads the new one.
 */
export declare function systemPromptDigest(dshSystem: string | undefined, presetGuidance: string | undefined): string | undefined;
