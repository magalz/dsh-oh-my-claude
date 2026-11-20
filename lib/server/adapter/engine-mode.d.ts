import { type PluginContext } from "../dsh.js";
import type { Config } from "./config.js";
/** Hints-store key of the card's master switch. Off (absent), no session runs in engine mode, and
 *  the presets ticked under it are kept for when it is turned back on. */
export declare const ENGINE_ON_KEY = "engineOn";
/** Hints-store key that turns engine mode on for one preset: `enginePreset:<preset id>`. */
export declare const ENGINE_PRESET_PREFIX = "enginePreset:";
/** Hints-store prefix of the keys that leave one engine option out for one preset. */
export declare const ENGINE_SKIP_PREFIX = "engineSkip:";
/** The hints-store key that leaves `option` out for `preset`: `engineSkip:<preset id>:<option>`.
 *  Each preset has its own set, and every option applies until skipped, so ticking a preset gives
 *  the whole bundle and its boxes take things away. */
export declare const engineSkipKey: (option: EngineOption, preset: string) => string;
/**
 * Whether `preset` matches an entry in `entries`: an exact preset id, or an entry ending in one `*`
 * that matches every id starting with the text before it (`crew-*` covers `crew-scout`). No other
 * pattern syntax: `crew` is only `crew`, and a `*` anywhere but the end is a literal character.
 * Null, undefined and the empty id never match, so a session with no preset never runs in engine
 * mode however the list is written.
 */
export declare function matchesEnginePreset(entries: readonly string[], preset: string | null | undefined): boolean;
/**
 * `rows` with `listed: true` added to every row whose id the config's list names, matched the way
 * engine mode matches a preset: an exact id or a trailing-star prefix. Every other row comes back
 * untouched, with no `listed` key, so a card reads the key's presence and never a false value.
 */
export declare function markListed<T extends {
    id: string;
}>(rows: readonly T[], listed: readonly string[]): (T & {
    listed?: true;
})[];
/** The config keys engine mode sets, in the order Settings lists them. */
export declare const ENGINE_OPTIONS: readonly ["systemPrompt", "builtinTools", "toolLoading", "followToolSet", "verbatimPrompts", "isolate", "thinkingDisplay"];
/** One of the config keys engine mode sets. */
export type EngineOption = (typeof ENGINE_OPTIONS)[number];
/** The part of the plugin's config engine mode reads: the options it sets, and the preset ids the
 *  config keeps in engine mode. */
type EngineKeys = Pick<Config, EngineOption | "enginePresets">;
/** Whether engine mode sends dsh's system prompt for a session under `preset`, given the
 *  `enginePresets` list its mount's config names: on for the preset (listed there, or ticked in
 *  the hints store with the master switch on), and its `systemPrompt` box not cleared. The chat's
 *  row mask asks this, beside the mount's own `systemPrompt`, to tell whether dsh's "System
 *  prompt" row reached Claude. */
export declare function engineSendsDshPrompt(listed: readonly string[], hints: Readonly<Record<string, boolean | number>>, preset: string | null | undefined): boolean;
/** The agent preset `sessionId` runs under, from dsh's preset service; null when the session is not
 *  loaded, this dsh mounts no preset service, or the lookup throws. */
export declare function presetOfSession(ctx: PluginContext | undefined, sessionId: string): string | null;
/** The preset ids engine mode is on for, read off the hints store's `enginePreset:` keys. */
export declare function enginePresets(hints: Readonly<Record<string, boolean | number>>): string[];
/** Record the `enginePresets` list `providerId`'s config names; the adapter calls this once, from
 *  its constructor. The list is copied, so a later edit to the config object cannot change what the
 *  route answers. */
export declare function registerEnginePresets(providerId: string, presets: readonly string[]): void;
/** The `enginePresets` list `providerId`'s config named: what the status route hands to
 *  `engineSendsDshPrompt`. Empty for a provider this process has not mounted, so a request naming
 *  an unknown provider reads as no config-listed presets rather than failing. */
export declare function registeredEnginePresets(providerId: string | null | undefined): readonly string[];
/**
 * The config a session under `preset` runs on: the plugin's own `config` when the preset is neither
 * listed in the config's `enginePresets` nor ticked in the hints store (or the session has none, or
 * the preset service is missing); else a copy with every option the preset's own skips leave in set
 * to its engine value. The same object comes back when nothing applies, so a caller can tell the
 * two apart by identity.
 */
export declare function engineOverlay<T extends EngineKeys>(config: T, hints: Readonly<Record<string, boolean | number>>, preset: string | null | undefined): T;
export {};
