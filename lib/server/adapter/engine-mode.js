// Engine mode per agent preset: sessions started under a preset the plugin config's
// `enginePresets` lists, or one the owner ticked in Settings, run Claude Code as dsh's model engine
// (dsh's prompt and tools, none of the user's Claude settings), and every other session keeps the
// plugin's config as it is. The ticks are box-wide state in the hints store, read each turn; the
// config's list is fixed for the mount's life. dsh fixes a session's preset once it has a message,
// so a session moves in or out of engine mode only when its preset starts or stops matching, at its
// next turn. From @soffits's engine options (#286, #287).
import { asSessionId } from "../dsh.js";
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
export const engineSkipKey = (option, preset) => `${ENGINE_SKIP_PREFIX}${preset}:${option}`;
/**
 * Whether `preset` matches an entry in `entries`: an exact preset id, or an entry ending in one `*`
 * that matches every id starting with the text before it (`crew-*` covers `crew-scout`). No other
 * pattern syntax: `crew` is only `crew`, and a `*` anywhere but the end is a literal character.
 * Null, undefined and the empty id never match, so a session with no preset never runs in engine
 * mode however the list is written.
 */
export function matchesEnginePreset(entries, preset) {
    if (!preset)
        return false;
    return entries.some((entry) => entry.endsWith("*") ? preset.startsWith(entry.slice(0, -1)) : entry === preset);
}
/**
 * `rows` with `listed: true` added to every row whose id the config's list names, matched the way
 * engine mode matches a preset: an exact id or a trailing-star prefix. Every other row comes back
 * untouched, with no `listed` key, so a card reads the key's presence and never a false value.
 */
export function markListed(rows, listed) {
    return rows.map((row) => (matchesEnginePreset(listed, row.id) ? { ...row, listed: true } : row));
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
];
/** What each option is set to in engine mode. `builtinTools: ["ToolSearch"]` leaves Claude Code
 *  none of its own file or shell tools, so dsh's are served over the bridge in their place. */
const ENGINE_VALUES = {
    systemPrompt: "dsh",
    builtinTools: ["ToolSearch"],
    toolLoading: "dsh",
    followToolSet: true,
    verbatimPrompts: true,
    isolate: true,
    thinkingDisplay: "summarized",
};
/** Whether engine mode is on for a session under `preset`: listed in the config's `enginePresets`,
 *  or the master switch and that preset's tick both set. The config only adds, so a listed preset
 *  is on with the switch off and nothing ticked, and no hint takes it back out. False for no
 *  preset, so a dsh without the preset service never runs engine mode. */
function engineOn(listed, hints, preset) {
    if (!preset)
        return false;
    if (matchesEnginePreset(listed, preset))
        return true;
    return hints[ENGINE_ON_KEY] === true && hints[ENGINE_PRESET_PREFIX + preset] === true;
}
/** Whether engine mode sends dsh's system prompt for a session under `preset`, given the
 *  `enginePresets` list its mount's config names: on for the preset (listed there, or ticked in
 *  the hints store with the master switch on), and its `systemPrompt` box not cleared. The chat's
 *  row mask asks this, beside the mount's own `systemPrompt`, to tell whether dsh's "System
 *  prompt" row reached Claude. */
export function engineSendsDshPrompt(listed, hints, preset) {
    return engineOn(listed, hints, preset) && hints[engineSkipKey("systemPrompt", preset)] !== true;
}
/** The agent preset `sessionId` runs under, from dsh's preset service; null when the session is not
 *  loaded, this dsh mounts no preset service, or the lookup throws. */
export function presetOfSession(ctx, sessionId) {
    try {
        const session = ctx?.sessions?.get?.(asSessionId(sessionId));
        return session ? (ctx?.get?.("agentPresets")?.presetForSession(session) ?? null) : null;
    }
    catch {
        return null;
    }
}
/** The preset ids engine mode is on for, read off the hints store's `enginePreset:` keys. */
export function enginePresets(hints) {
    return Object.keys(hints)
        .filter((k) => k.startsWith(ENGINE_PRESET_PREFIX) && hints[k] === true)
        .map((k) => k.slice(ENGINE_PRESET_PREFIX.length));
}
/** The `enginePresets` list each mounted provider's config names, keyed by provider id. A turn's
 *  answer comes from the adapter's own config; the status route has no config object, so the
 *  adapter registers its list here as it is constructed and the route reads it back. A config edit
 *  re-mounts the plugin, so the list is the one the config held when the mount loaded. */
const configPresets = new Map();
/** Record the `enginePresets` list `providerId`'s config names; the adapter calls this once, from
 *  its constructor. The list is copied, so a later edit to the config object cannot change what the
 *  route answers. */
export function registerEnginePresets(providerId, presets) {
    configPresets.set(providerId, [...presets]);
}
/** The `enginePresets` list `providerId`'s config named: what the status route hands to
 *  `engineSendsDshPrompt`. Empty for a provider this process has not mounted, so a request naming
 *  an unknown provider reads as no config-listed presets rather than failing. */
export function registeredEnginePresets(providerId) {
    if (providerId === null || providerId === undefined)
        return [];
    return configPresets.get(providerId) ?? [];
}
/**
 * The config a session under `preset` runs on: the plugin's own `config` when the preset is neither
 * listed in the config's `enginePresets` nor ticked in the hints store (or the session has none, or
 * the preset service is missing); else a copy with every option the preset's own skips leave in set
 * to its engine value. The same object comes back when nothing applies, so a caller can tell the
 * two apart by identity.
 */
export function engineOverlay(config, hints, preset) {
    if (!engineOn(config.enginePresets, hints, preset))
        return config;
    const skip = (k) => hints[engineSkipKey(k, preset)] === true;
    const out = { ...config };
    // Written through the engine-keys view of the copy: the copy is a T, and T's own key types may be
    // narrower than the values engine mode sets.
    const set = out;
    if (!skip("systemPrompt"))
        set.systemPrompt = ENGINE_VALUES.systemPrompt;
    if (!skip("builtinTools"))
        set.builtinTools = [...ENGINE_VALUES.builtinTools];
    if (!skip("toolLoading"))
        set.toolLoading = ENGINE_VALUES.toolLoading;
    if (!skip("followToolSet"))
        set.followToolSet = ENGINE_VALUES.followToolSet;
    if (!skip("verbatimPrompts"))
        set.verbatimPrompts = ENGINE_VALUES.verbatimPrompts;
    if (!skip("isolate"))
        set.isolate = ENGINE_VALUES.isolate;
    if (!skip("thinkingDisplay"))
        set.thinkingDisplay = ENGINE_VALUES.thinkingDisplay;
    return out;
}
//# sourceMappingURL=engine-mode.js.map