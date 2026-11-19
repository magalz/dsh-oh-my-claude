import z from "@deepseek-ai/schemastery";
import type { RemoteWorkspace } from "../sessions.js";
export declare const DSH_VERSION: string | null;
/** Replace the redirect map: the boot read and every panel edit land here. Exported so the offline
 * suite can drive the two lookups below without a dsh mount. */
export declare function setRemoteWorkspaces(workspaces: RemoteWorkspace[]): void;
/**
 * Whether `cwd` is the stand-in of a remote workspace that no longer exists. Removing a box, or
 * deleting the workspace, drops its row and its stand-in folder, but dsh keeps the sessions and
 * lists them under Ungrouped with the stand-in as their cwd. A turn there has no box to run on:
 * spawned here it died on a missing directory as "claude exited -1: no output" (seen live
 * 2026-09-17), and on an ssh box's own provider it would have run in the far `$HOME` instead.
 */
export declare const isOrphanedStandIn: (cwd: string) => boolean;
/** The real remote path for a placeholder workspace on `host`, or `cwd` unchanged. */
export declare function remoteCwdFor(host: string, cwd: string): string;
/** The box a turn runs on: this instance's own host when it has one, else the box a remote-workspace
 * cwd belongs to. The choice is by truthiness because `sshHost` defaults to `""`, not undefined.
 * `??` treats that empty string as an answer, which is how a local provider's turn came to probe the
 * local binary for flags while its spawn ran on the box (2026-09-09: `--forward-subagent-text`, a
 * flag this box's CLI has and the box's 2.1.123 does not). */
export declare const boxFor: (sshHost: string | undefined, workspaceHost: string | undefined) => string | undefined;
/** The remote workspace whose local placeholder is `cwd`, if any. A session opened on this cwd must
 * run over SSH on that box regardless of the provider chosen, so a local provider does not sit in the
 * empty placeholder dir. */
export declare function remoteWorkspaceFor(cwd: string): RemoteWorkspace | undefined;
/** Configuration shape produced by the Config schema with defaults applied. */
export type Config = {
    command: string;
    /** Unset unless the plugin config names one; the Settings switch decides then (spawn-mode.ts). */
    spawn?: "keeper" | "node" | "dsh";
    sshHost: string;
    configDir: string;
    permissionMode: "dsh" | "acceptEdits" | "bypassPermissions" | "plan" | "dontAsk" | "auto" | "manual";
    hiddenModels: string[];
    customModels: CustomModel[];
    allowedTools: string[];
    disallowedTools: string[];
    builtinTools: string[];
    toolLoading: "claude" | "dsh";
    followToolSet: boolean;
    addDirs: string[];
    pluginDirs: string[];
    pluginUrls: string[];
    maxTurns?: number;
    maxBudgetUsd?: number;
    titleModel: string;
    toolActivity: boolean;
    toolsInline?: boolean;
    hookRows: boolean;
    resume: boolean;
    idleTimeoutMs: number;
    toolTextLimit: number;
    dshTools: boolean;
    refusalAsFailure: boolean;
    systemPrompt: "claude" | "dsh";
    instructionFiles: "claude" | "dsh";
    /** Append the workspace's auto-memory index (MEMORY.md) to Claude Code's system prompt: only with
     *  `instructionFiles: "dsh"` and in the default prompt mode, read when the Claude process starts
     *  so a changed index reaches a session when its process next starts. Ignored under `isolate`, under
     *  `systemPrompt: "dsh"`, for side calls and on a remote box. */
    memoryIndex: boolean;
    /** dsh agent preset id → absolute path of a UTF-8 text file whose trimmed text is appended to
     *  Claude Code's system prompt in the default mode; unused under `systemPrompt: "dsh"`. */
    presetGuidance: Record<string, string>;
    /** dsh agent preset ids that always run in engine mode: an exact id, or a prefix with one
     *  trailing `*` (for example `crew-*`) matching every id that starts with it. Only adds presets;
     *  a listed one runs in engine mode whatever the Settings card's switch and ticks say. */
    enginePresets: string[];
    verbatimPrompts: boolean;
    isolate: boolean;
    replayToolTextLimit: number;
    thinkingDisplay: "" | "summarized" | "highlights" | "omitted";
    fastMode: boolean;
    commandBridge: boolean;
    redactSecrets: boolean;
    persistTodos: boolean;
    cliCompaction: boolean;
    debug: boolean;
    approvals: boolean;
    processIdleMs: number;
    maxProcesses: number;
    providerId: string;
    providerName: string;
};
/** One `customModels` entry: a model the picker offers although neither the Models API nor the
 *  CLI's own lineup lists it, such as an alias a local router sends to another model. The shape
 *  (the id passed to the CLI as written, a label for the picker, an optional window and effort
 *  levels) is the one @chopstick1009 asked for in #259. */
export interface CustomModel {
    /** Passed to `claude --model` exactly as written. */
    model: string;
    /** The name the picker shows; the id when absent. */
    label?: string;
    /** The model's context window in tokens; 200,000 when absent. */
    contextWindow?: number;
    /** Effort levels the model takes; none when absent, and the effort picker stays hidden. */
    efforts?: string[];
}
/** Configuration schema for Claude Code plugin settings. */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    command: z<string, string, "defined">;
    spawn: z<"dsh" | "keeper" | "node", "dsh" | "keeper" | "node", "plain">;
    sshHost: z<string, string, "defined">;
    permissionMode: z<"acceptEdits" | "auto" | "bypassPermissions" | "dontAsk" | "dsh" | "manual" | "plan", "acceptEdits" | "auto" | "bypassPermissions" | "dontAsk" | "dsh" | "manual" | "plan", "defined">;
    hiddenModels: z<string[], string[], "defined">;
    customModels: z<({
        model?: string | null | undefined;
        label?: string | null | undefined;
        contextWindow?: number | null | undefined;
        efforts?: string[] | null | undefined;
    } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<NoInfer<{
        model: z<string, string, "defined">;
        label: z<string, string, "plain">;
        contextWindow: z<number, number, "plain">;
        efforts: z<string[], string[], "plain">;
    }>>[], "defined">;
    allowedTools: z<string[], string[], "defined">;
    disallowedTools: z<string[], string[], "defined">;
    builtinTools: z<string[], string[], "defined">;
    toolLoading: z<"claude" | "dsh", "claude" | "dsh", "defined">;
    followToolSet: z<boolean, boolean, "defined">;
    addDirs: z<string[], string[], "defined">;
    pluginDirs: z<string[], string[], "defined">;
    pluginUrls: z<string[], string[], "defined">;
    maxTurns: z<number, number, "plain">;
    maxBudgetUsd: z<number, number, "plain">;
    titleModel: z<string, string, "defined">;
    toolActivity: z<boolean, boolean, "defined">;
    toolsInline: z<boolean, boolean, "plain">;
    hookRows: z<boolean, boolean, "defined">;
    resume: z<boolean, boolean, "defined">;
    idleTimeoutMs: z<number, number, "defined">;
    toolTextLimit: z<number, number, "defined">;
    thinkingDisplay: z<"" | "highlights" | "omitted" | "summarized", "" | "highlights" | "omitted" | "summarized", "defined">;
    replayToolTextLimit: z<number, number, "defined">;
    dshTools: z<boolean, boolean, "defined">;
    systemPrompt: z<"claude" | "dsh", "claude" | "dsh", "defined">;
    instructionFiles: z<"claude" | "dsh", "claude" | "dsh", "defined">;
    memoryIndex: z<boolean, boolean, "defined">;
    presetGuidance: z<import("@deepseek-ai/cosmokit").Dict<string, string>, import("@deepseek-ai/cosmokit").Dict<string, string>, "defined">;
    enginePresets: z<string[], string[], "defined">;
    verbatimPrompts: z<boolean, boolean, "defined">;
    isolate: z<boolean, boolean, "defined">;
    fastMode: z<boolean, boolean, "defined">;
    commandBridge: z<boolean, boolean, "defined">;
    redactSecrets: z<boolean, boolean, "defined">;
    persistTodos: z<boolean, boolean, "defined">;
    cliCompaction: z<boolean, boolean, "defined">;
    refusalAsFailure: z<boolean, boolean, "defined">;
    continueAfterLimit: z<boolean, boolean, "defined">;
    debug: z<boolean, boolean, "defined">;
    approvals: z<boolean, boolean, "defined">;
    processIdleMs: z<number, number, "defined">;
    maxProcesses: z<number, number, "defined">;
    configDir: z<string, string, "defined">;
    ownTranscripts: z<boolean, boolean, "defined">;
    providerId: z<string, string, "defined">;
    providerName: z<string, string, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    command: z<string, string, "defined">;
    spawn: z<"dsh" | "keeper" | "node", "dsh" | "keeper" | "node", "plain">;
    sshHost: z<string, string, "defined">;
    permissionMode: z<"acceptEdits" | "auto" | "bypassPermissions" | "dontAsk" | "dsh" | "manual" | "plan", "acceptEdits" | "auto" | "bypassPermissions" | "dontAsk" | "dsh" | "manual" | "plan", "defined">;
    hiddenModels: z<string[], string[], "defined">;
    customModels: z<({
        model?: string | null | undefined;
        label?: string | null | undefined;
        contextWindow?: number | null | undefined;
        efforts?: string[] | null | undefined;
    } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<NoInfer<{
        model: z<string, string, "defined">;
        label: z<string, string, "plain">;
        contextWindow: z<number, number, "plain">;
        efforts: z<string[], string[], "plain">;
    }>>[], "defined">;
    allowedTools: z<string[], string[], "defined">;
    disallowedTools: z<string[], string[], "defined">;
    builtinTools: z<string[], string[], "defined">;
    toolLoading: z<"claude" | "dsh", "claude" | "dsh", "defined">;
    followToolSet: z<boolean, boolean, "defined">;
    addDirs: z<string[], string[], "defined">;
    pluginDirs: z<string[], string[], "defined">;
    pluginUrls: z<string[], string[], "defined">;
    maxTurns: z<number, number, "plain">;
    maxBudgetUsd: z<number, number, "plain">;
    titleModel: z<string, string, "defined">;
    toolActivity: z<boolean, boolean, "defined">;
    toolsInline: z<boolean, boolean, "plain">;
    hookRows: z<boolean, boolean, "defined">;
    resume: z<boolean, boolean, "defined">;
    idleTimeoutMs: z<number, number, "defined">;
    toolTextLimit: z<number, number, "defined">;
    thinkingDisplay: z<"" | "highlights" | "omitted" | "summarized", "" | "highlights" | "omitted" | "summarized", "defined">;
    replayToolTextLimit: z<number, number, "defined">;
    dshTools: z<boolean, boolean, "defined">;
    systemPrompt: z<"claude" | "dsh", "claude" | "dsh", "defined">;
    instructionFiles: z<"claude" | "dsh", "claude" | "dsh", "defined">;
    memoryIndex: z<boolean, boolean, "defined">;
    presetGuidance: z<import("@deepseek-ai/cosmokit").Dict<string, string>, import("@deepseek-ai/cosmokit").Dict<string, string>, "defined">;
    enginePresets: z<string[], string[], "defined">;
    verbatimPrompts: z<boolean, boolean, "defined">;
    isolate: z<boolean, boolean, "defined">;
    fastMode: z<boolean, boolean, "defined">;
    commandBridge: z<boolean, boolean, "defined">;
    redactSecrets: z<boolean, boolean, "defined">;
    persistTodos: z<boolean, boolean, "defined">;
    cliCompaction: z<boolean, boolean, "defined">;
    refusalAsFailure: z<boolean, boolean, "defined">;
    continueAfterLimit: z<boolean, boolean, "defined">;
    debug: z<boolean, boolean, "defined">;
    approvals: z<boolean, boolean, "defined">;
    processIdleMs: z<number, number, "defined">;
    maxProcesses: z<number, number, "defined">;
    configDir: z<string, string, "defined">;
    ownTranscripts: z<boolean, boolean, "defined">;
    providerId: z<string, string, "defined">;
    providerName: z<string, string, "defined">;
}>>, "plain">;
/** The config as this box runs it, as a copy. A bare local `command` becomes the absolute path
 *  `resolveCommand` finds, so a dsh started with a short PATH (DSH Desktop from the macOS Dock)
 *  still reaches the CLI; a remote one is left alone, the far box has its own PATH. On Windows the
 *  keeper gives way to a plain child: it needs a Unix socket and `systemd-run`, neither of which
 *  exists there, so a keeper spawn would fail every turn. */
export declare function localConfig<T extends {
    command: string;
    sshHost: string;
    spawn?: string;
}>(config: T, platform?: NodeJS.Platform, resolve?: (command: string) => string): T;
