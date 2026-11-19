// Engine mode per agent preset: sessions started under a preset the owner picked in Settings run
// Claude Code as dsh's model engine (dsh's prompt and tools, none of the user's Claude settings),
// and every other session keeps the plugin's config as it is. The choice is box-wide state in the
// hints store, read each turn. dsh fixes a session's preset once it has a message, so a session
// moves in or out of engine mode only when its preset's tick changes, at its next turn. From
// @soffits's engine options (#286, #287).
import { asSessionId, type PluginContext } from "../dsh.js";
import type { Config } from "./config.js";

/** Hints-store key of the card's master switch. Off (absent), no session runs in engine mode, and
 *  the presets ticked under it are kept for when it is turned back on. */
export const ENGINE_ON_KEY = "engineOn";
/** Hints-store key that turns engine mode on for one preset: `enginePreset:<preset id>`. */
export const ENGINE_PRESET_PREFIX = "enginePreset:";
/** Hints-store prefix of the keys that leave one engine option out for one preset. */
export const ENGINE_SKIP_PREFIX = "engineSkip:";

/** The hints-store key that leaves `option` out for `preset`: `engineSkip:<preset id>:<option>`.
 *  Each preset has its own set, and every option applies until skipped, so ticking a preset gives
 *  the whole bundle and its boxes take things away. */
export const engineSkipKey = (option: EngineOption, preset: string): string =>
  `${ENGINE_SKIP_PREFIX}${preset}:${option}`;

/**
 * Whether `preset` matches an entry in `entries`: an exact preset id, or an entry ending in one `*`
 * that matches every id starting with the text before it (`crew-*` covers `crew-scout`). No other
 * pattern syntax: `crew` is only `crew`, and a `*` anywhere but the end is a literal character.
 * Null, undefined and the empty id never match, so a session with no preset never runs in engine
 * mode however the list is written.
 */
export function matchesEnginePreset(
  entries: readonly string[],
  preset: string | null | undefined,
): boolean {
  // Red commit: exact ids only; the trailing-star form comes with the implementation.
  if (!preset) return false;
  return entries.includes(preset);
}

/** The config keys engine mode sets, in the order Settings lists them. */
export const ENGINE_OPTIONS = [
  "systemPrompt",
  "builtinTools",
  "toolLoading",
  "followToolSet",
  "verbatimPrompts",
  "isolate",
  "thinkingDisplay",
] as const;

/** One of the config keys engine mode sets. */
export type EngineOption = (typeof ENGINE_OPTIONS)[number];

/** The part of the plugin's config engine mode reads and writes. */
type EngineKeys = Pick<Config, EngineOption>;

/** What each option is set to in engine mode. `builtinTools: ["ToolSearch"]` leaves Claude Code
 *  none of its own file or shell tools, so dsh's are served over the bridge in their place. */
const ENGINE_VALUES: EngineKeys = {
  systemPrompt: "dsh",
  builtinTools: ["ToolSearch"],
  toolLoading: "dsh",
  followToolSet: true,
  verbatimPrompts: true,
  isolate: true,
  thinkingDisplay: "summarized",
};

/** Whether engine mode is on for a session under `preset`: the master switch and that preset's tick
 *  both set. False for no preset, so a dsh without the preset service never runs engine mode. */
function engineOn(
  hints: Readonly<Record<string, boolean | number>>,
  preset: string | null | undefined,
): preset is string {
  return !!preset && hints[ENGINE_ON_KEY] === true && hints[ENGINE_PRESET_PREFIX + preset] === true;
}

/** Whether engine mode sends dsh's system prompt for a session under `preset`, given the
 *  `enginePresets` list its mount's config names: on for the preset (listed there, or ticked in
 *  the hints store with the master switch on), and its `systemPrompt` box not cleared. The chat's
 *  row mask asks this, beside the mount's own `systemPrompt`, to tell whether dsh's "System
 *  prompt" row reached Claude. */
export function engineSendsDshPrompt(
  listed: readonly string[],
  hints: Readonly<Record<string, boolean | number>>,
  preset: string | null | undefined,
): boolean {
  // Red commit: the config's list is not consulted yet.
  return engineOn(hints, preset) && hints[engineSkipKey("systemPrompt", preset)] !== true;
}

/** The agent preset `sessionId` runs under, from dsh's preset service; null when the session is not
 *  loaded, this dsh mounts no preset service, or the lookup throws. */
export function presetOfSession(ctx: PluginContext | undefined, sessionId: string): string | null {
  try {
    const session = ctx?.sessions?.get?.(asSessionId(sessionId));
    return session ? (ctx?.get?.("agentPresets")?.presetForSession(session) ?? null) : null;
  } catch {
    return null;
  }
}

/** The preset ids engine mode is on for, read off the hints store's `enginePreset:` keys. */
export function enginePresets(hints: Readonly<Record<string, boolean | number>>): string[] {
  return Object.keys(hints)
    .filter((k) => k.startsWith(ENGINE_PRESET_PREFIX) && hints[k] === true)
    .map((k) => k.slice(ENGINE_PRESET_PREFIX.length));
}

/** The `enginePresets` list each mounted provider's config names, keyed by provider id. A turn's
 *  answer comes from the adapter's own config; the status route has no config object, so the
 *  adapter registers its list here as it is constructed and the route reads it back. A config edit
 *  re-mounts the plugin, so the list is the one the config held when the mount loaded. */
const configPresets = new Map<string, readonly string[]>();

/** Record the `enginePresets` list `providerId`'s config names; the adapter calls this once, from
 *  its constructor. The list is copied, so a later edit to the config object cannot change what the
 *  route answers. */
export function registerEnginePresets(providerId: string, presets: readonly string[]): void {
  configPresets.set(providerId, [...presets]);
}

/** The `enginePresets` list `providerId`'s config named: what the status route hands to
 *  `engineSendsDshPrompt`. Empty for a provider this process has not mounted, so a request naming
 *  an unknown provider reads as no config-listed presets rather than failing. */
export function registeredEnginePresets(providerId: string | null | undefined): readonly string[] {
  if (providerId === null || providerId === undefined) return [];
  return configPresets.get(providerId) ?? [];
}

/**
 * The config a session under `preset` runs on: the plugin's own `config` when the master switch
 * is off, when engine mode is off for that preset, or when the session has none (or the preset
 * service is missing); else a copy with
 * every option the preset's own skips leave in set to its engine value. The same object comes back when
 * nothing applies, so a caller can tell the two apart by identity.
 */
export function engineOverlay<T extends EngineKeys>(
  config: T,
  hints: Readonly<Record<string, boolean | number>>,
  preset: string | null | undefined,
): T {
  if (!engineOn(hints, preset)) return config;
  const skip = (k: EngineOption): boolean => hints[engineSkipKey(k, preset)] === true;
  const out = { ...config };
  // Written through the engine-keys view of the copy: the copy is a T, and T's own key types may be
  // narrower than the values engine mode sets.
  const set: EngineKeys = out;
  if (!skip("systemPrompt")) set.systemPrompt = ENGINE_VALUES.systemPrompt;
  if (!skip("builtinTools")) set.builtinTools = [...ENGINE_VALUES.builtinTools];
  if (!skip("toolLoading")) set.toolLoading = ENGINE_VALUES.toolLoading;
  if (!skip("followToolSet")) set.followToolSet = ENGINE_VALUES.followToolSet;
  if (!skip("verbatimPrompts")) set.verbatimPrompts = ENGINE_VALUES.verbatimPrompts;
  if (!skip("isolate")) set.isolate = ENGINE_VALUES.isolate;
  if (!skip("thinkingDisplay")) set.thinkingDisplay = ENGINE_VALUES.thinkingDisplay;
  return out;
}
