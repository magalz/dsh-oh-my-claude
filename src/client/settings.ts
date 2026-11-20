// The settings scopes the editor in index.tsx switches between, the note it shows when a
// higher-precedence file overrides what you are looking at, and the decisions the two Settings cards
// draw from the server's answers. Pure: no fetch, no DOM.
import { t } from "./i18n.js";
import type { ClaudeMdState } from "../switches.js";

/** The settings files the CLI merges, highest precedence first. */
/**
 * The four files Claude Code merges for one session, highest precedence first. Duplicated in
 * `src/sessions.ts`: the browser half cannot import server code, and the order is the
 * CLI's, not this plugin's, so both copies have to say the same thing.
 */
export const SETTINGS_SCOPES = ["managed", "local", "project", "user"] as const;

/** One of the four settings files, named as the CLI's own layers are. */
export type SettingsScope = (typeof SETTINGS_SCOPES)[number];

/** One scope's file, as `GET /settings/scopes` reports it. */
export interface SettingsScopeInfo {
  scope: SettingsScope;
  path: string;
  exists: boolean;
  text: string;
  mtime?: number;
  readOnly: boolean;
}

/** How each scope is named in the editor's own prose, in the active language. Getters, so a read
 *  after a language switch answers in the new one. */
export const SCOPE_LABELS = {
  get managed() {
    return t("settings.scope.managed");
  },
  get local() {
    return "settings.local.json";
  },
  get project() {
    return t("settings.scope.project");
  },
  get user() {
    return "~/.claude/settings.json";
  },
} satisfies { [K in SettingsScope]: string };

/** The top-level keys of a settings document, or an empty array when the text is invalid JSON or
 *  not an object, so a hand-edited file contributes no keys instead of throwing. */
const topLevelKeys = (text: string): string[] => {
  try {
    const value: unknown = JSON.parse(text);
    return value instanceof Object && !Array.isArray(value) ? Object.keys(value) : [];
  } catch {
    return [];
  }
};

/** Lists the words in the active language, joined with its own separator and a final `and`, so one
 *  word returns itself and an empty list returns an empty string. */
const listed = (words: readonly string[]): string =>
  words.length < 2
    ? (words[0] ?? "")
    : t("settings.list", {
        rest: words.slice(0, -1).join(t("settings.listSep")),
        last: words.at(-1) ?? "",
      });

/**
 * What the editor says under a scope some higher-precedence file also sets keys in: the CLI reads
 * that file's value, not the one on screen. Empty when nothing here is overridden. A file that is
 * not valid JSON contributes no keys rather than throwing, since the editor shows unsaved and
 * hand-edited text.
 */
export function overrideNote(scopes: readonly SettingsScopeInfo[], scope: SettingsScope): string {
  const mine = scopes.find((s) => s.scope === scope);
  if (!mine) return "";
  const rank = SETTINGS_SCOPES.indexOf(scope);
  const keys = new Set(topLevelKeys(mine.text));
  const clauses: string[] = [];
  for (const higher of SETTINGS_SCOPES.slice(0, rank)) {
    const file = scopes.find((s) => s.scope === higher);
    if (!file) continue;
    const taken = topLevelKeys(file.text).filter((k) => keys.has(k));
    if (taken.length === 0) continue;
    for (const key of taken) keys.delete(key);
    clauses.push(t("settings.overriddenBy", { keys: listed(taken), file: SCOPE_LABELS[higher] }));
  }
  return clauses.length === 0
    ? ""
    : t("settings.overridden", { clauses: clauses.join(t("settings.clauseSep")) });
}

/** The provider id the server mounts by default (`DEFAULT_PROVIDER` in `src/sessions.ts`). A card
 *  with no open Claude session names it so the routes still read that mount's config facts. */
export const DEFAULT_PROVIDER_ID = "claude-code";

/** Why Claude Code's own CLAUDE.md files reach a session or not: the plugin's config in the dsh
 *  instruction mode, `"env"` for dsh's own environment, a settings scope that sets the disable
 *  variable, or undefined when the files load. */
export type ClaudeMdReason = "config" | "env" | SettingsScope;

/** The reason the CLAUDE.md row states for `state`. The plugin's config comes first: in the dsh
 *  instruction mode Claude Code loads none of these files whatever a settings file says, and the row
 *  would otherwise credit the environment or a scope for a decision the config made. */
export function claudeMdReason(
  state: ClaudeMdState | null | undefined,
): ClaudeMdReason | undefined {
  if (state?.instructionFiles === "dsh") return "config";
  const by = state?.disabledBy;
  if (by === undefined) return undefined;
  const scope = SETTINGS_SCOPES.find((s) => s === by);
  return scope === undefined ? "env" : scope;
}

/** Characters the dsh context switch can keep out of a turn: both switchable blocks when it can
 *  drop them, and only the skill catalog in the dsh instruction mode, where the adapter forwards
 *  the instructions block whatever the switch says. Undefined when neither countable block was
 *  measured, so the card shows no saving rather than a zero it cannot stand behind. */
export function savableChars(
  sizes: { instructions?: number; skills?: number } | null | undefined,
  dshInstructions: boolean,
): number | undefined {
  const instructions = dshInstructions ? undefined : sizes?.instructions;
  const skills = sizes?.skills;
  if (instructions === undefined && skills === undefined) return undefined;
  return (instructions ?? 0) + (skills ?? 0);
}

/** The memory-index row's states: fixed on because Claude Code loads the index itself, fixed off
 *  because nothing does, fixed on because the plugin's config appends it, fixed off because dsh's
 *  own system prompt is sent, or a switch-backed box. */
export interface MemoryRowState {
  checked: boolean;
  locked: boolean;
  why: "native" | "config" | "switch" | "off" | "dshPrompt";
}

/** What the memory-index row shows for `state` and this machine's `memoryIndexOn` hint. Outside
 *  the dsh instruction mode Claude Code loads the index unless a settings scope or dsh's own
 *  environment switched its loading off, in which case nothing loads it: the plugin appends it only
 *  in that mode. In the mode, dsh's own system prompt leaves the plugin no room to append it; the
 *  config's `memoryIndex` and then this machine's hint decide the rest. */
export function memoryRowState(
  state: ClaudeMdState | null | undefined,
  hintOn: boolean,
): MemoryRowState {
  if (state?.instructionFiles !== "dsh") {
    return state?.disabledBy === undefined
      ? { checked: true, locked: true, why: "native" }
      : { checked: false, locked: true, why: "off" };
  }
  if (state.systemPrompt === "dsh") return { checked: false, locked: true, why: "dshPrompt" };
  if (state.memoryIndex === true) return { checked: true, locked: true, why: "config" };
  return { checked: hintOn, locked: false, why: "switch" };
}

/** The preset ids ticked in the hints store plus the presets the plugin's config lists, the listed
 *  ones in `rows` order after the ticked ones and every id once. A listed preset runs in engine mode
 *  whether or not it was ticked, so the card counts it like a tick. */
export function withListedPresets(
  ticked: readonly string[],
  rows: readonly { id: string; listed?: true }[],
): string[] {
  const ids = [...new Set(ticked)];
  const seen = new Set(ids);
  for (const row of rows) {
    if (row.listed !== true || seen.has(row.id)) continue;
    seen.add(row.id);
    ids.push(row.id);
  }
  return ids;
}
