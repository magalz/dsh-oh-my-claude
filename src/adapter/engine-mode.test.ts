// Engine mode per agent preset: only a session under a preset ticked in Settings gets the engine
// config, every option applies until skipped, and every other session keeps the plugin's own
// config object, untouched.
import { strict as assert } from "node:assert";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PluginContext } from "../dsh.js";
import { STATE_DIR } from "../state.js";
import { ClaudeCodeAdapter } from "./class.js";
import { Config } from "./config.js";
import {
  ENGINE_OPTIONS,
  engineOverlay,
  enginePresets,
  engineSendsDshPrompt,
  engineSkipKey,
  markListed,
  matchesEnginePreset,
  presetOfSession,
  registeredEnginePresets,
} from "./engine-mode.js";
import { engineDigest } from "./isolate.js";

const base = new Config({});
// The new key's default: nothing is in engine mode by configuration, so every rule below is the
// hints store's alone until a block names a list.
assert.deepEqual(base.enginePresets, []);
const on = { engineOn: true, "enginePreset:engine": true } as const;

// The master switch off: nothing applies, whatever is ticked under it.
assert.equal(engineOverlay(base, { "enginePreset:engine": true }, "engine"), base, "master off");
// Off for the session's preset, no preset, or none ticked: the very same object comes back.
assert.equal(engineOverlay(base, {}, "engine"), base);
assert.equal(engineOverlay(base, on, "standard"), base, "another preset keeps the config");
assert.equal(engineOverlay(base, on, null), base, "no preset recorded");
assert.equal(engineOverlay(base, on, undefined), base);

// On: the whole bundle, and the defaults of every other key untouched.
const engine = engineOverlay(base, on, "engine");
assert.notEqual(engine, base);
assert.deepEqual(
  {
    systemPrompt: engine.systemPrompt,
    builtinTools: engine.builtinTools,
    toolLoading: engine.toolLoading,
    followToolSet: engine.followToolSet,
    verbatimPrompts: engine.verbatimPrompts,
    isolate: engine.isolate,
    thinkingDisplay: engine.thinkingDisplay,
  },
  {
    systemPrompt: "dsh",
    builtinTools: ["ToolSearch"],
    toolLoading: "dsh",
    followToolSet: true,
    verbatimPrompts: true,
    isolate: true,
    thinkingDisplay: "summarized",
  },
);
assert.equal(engine.command, base.command, "keys engine mode does not own stay as configured");
assert.equal(base.isolate, false, "the plugin's own config is not edited");
assert.notEqual(engineDigest(engine), undefined, "so the process spec keys a new process");

// A skipped option keeps the config's own value.
const noIsolate = engineOverlay(base, { ...on, "engineSkip:engine:isolate": true }, "engine");
assert.equal(noIsolate.isolate, false);
assert.equal(noIsolate.systemPrompt, "dsh");
const allSkipped = Object.fromEntries(
  ENGINE_OPTIONS.map((o) => [engineSkipKey(o, "engine"), true]),
);
assert.deepEqual(
  engineOverlay(base, { ...on, ...allSkipped }, "engine").builtinTools,
  base.builtinTools,
);

// Each ticked mode has its own set: one mode's skip never reaches another.
{
  const hints = {
    engineOn: true,
    "enginePreset:engine": true,
    "enginePreset:assistant": true,
    [engineSkipKey("isolate", "assistant")]: true,
    [engineSkipKey("thinkingDisplay", "engine")]: true,
  };
  const engineMode = engineOverlay(base, hints, "engine");
  assert.equal(engineMode.isolate, true, "engine keeps isolate");
  assert.equal(engineMode.thinkingDisplay, base.thinkingDisplay, "engine's own skip applies");
  const assistant = engineOverlay(base, hints, "assistant");
  assert.equal(assistant.isolate, false, "assistant's own skip applies");
  assert.equal(assistant.thinkingDisplay, "summarized", "engine's skip does not reach it");
  assert.equal(engineSkipKey("isolate", "assistant"), "engineSkip:assistant:isolate");
}

// An exact id in the config puts that preset in engine mode with the master switch off and nothing
// ticked; a preset the list does not name keeps the plugin's own config.
{
  const exact = new Config({ enginePresets: ["crew-worker"] });
  const worker = engineOverlay(exact, {}, "crew-worker");
  assert.notEqual(worker, exact, "a listed preset is in engine mode");
  assert.equal(worker.systemPrompt, "dsh", "the whole bundle applies");
  assert.equal(worker.isolate, true);
  assert.equal(engineOverlay(exact, {}, "crew-scout"), exact, "another preset stays out");
  assert.equal(engineOverlay(exact, {}, null), exact, "no preset is never matched");
}

// One trailing star is a prefix: `crew-*` covers every crew- id and nothing else, so not
// `crewmate` (no dash), not another preset, and never the empty id.
{
  const crew = new Config({ enginePresets: ["crew-*"] });
  for (const id of ["crew-scout", "crew-implementer", "crew-reviewer", "crew-worker"])
    assert.equal(engineOverlay(crew, {}, id).systemPrompt, "dsh", `${id} is matched`);
  for (const other of ["crewmate", "claude-mode", ""])
    assert.equal(engineOverlay(crew, {}, other), crew, `${other || "the empty id"} is left out`);
  assert.equal(engineOverlay(crew, {}, undefined), crew);
  assert.equal(matchesEnginePreset(["crew-*"], "crew-scout"), true);
  assert.equal(matchesEnginePreset(["crew-*"], "crewmate"), false);
  assert.equal(matchesEnginePreset(["crew-*"], ""), false);
}

// No star is exact: `crew` is only `crew`, never a prefix. A star anywhere but the end is a literal
// character, so those entries match only that exact text.
{
  const bare = new Config({ enginePresets: ["crew"] });
  assert.equal(
    engineOverlay(bare, {}, "crew-scout"),
    bare,
    "an entry without a star does not prefix",
  );
  assert.equal(engineOverlay(bare, {}, "crew").systemPrompt, "dsh");
  const literal = new Config({ enginePresets: ["*crew", "crew-*x"] });
  assert.equal(engineOverlay(literal, {}, "crew-scout"), literal);
  assert.equal(engineOverlay(literal, {}, "crew-"), literal);
  assert.equal(
    engineOverlay(literal, {}, "*crew").systemPrompt,
    "dsh",
    "the exact text, star and all",
  );
  assert.equal(engineOverlay(literal, {}, "crew-*x").systemPrompt, "dsh");
}

// The card's list marks the rows the mount's config names: an exact id or a trailing-star prefix,
// and every other row comes back exactly as it was, with no `listed` key to read as false.
{
  const rows = [
    { id: "crew-worker", name: "Crew worker", kind: "worker" },
    { id: "engine", name: "Engine" },
  ];
  assert.deepEqual(markListed(rows, ["crew-*"]), [
    { id: "crew-worker", name: "Crew worker", kind: "worker", listed: true },
    { id: "engine", name: "Engine" },
  ]);
  assert.deepEqual(markListed(rows, ["engine"]), [
    { id: "crew-worker", name: "Crew worker", kind: "worker" },
    { id: "engine", name: "Engine", listed: true },
  ]);
  assert.deepEqual(markListed(rows, []), rows, "nothing listed leaves every row as it was");
}

// The per-option opt-outs are still the hints store's, keyed by preset id, and they apply to a
// config-listed preset exactly as they do to a ticked one.
{
  const crew = new Config({ enginePresets: ["crew-*"] });
  const skip = { [engineSkipKey("isolate", "crew-scout")]: true };
  const noIsolate = engineOverlay(crew, skip, "crew-scout");
  assert.equal(noIsolate.isolate, false, "a cleared box leaves its own option out");
  assert.equal(noIsolate.systemPrompt, "dsh", "the rest of the bundle still applies");
  assert.equal(
    engineOverlay(crew, skip, "crew-reviewer").isolate,
    true,
    "one mode's skip never reaches another",
  );
}

// The chat's row mask: dsh's prompt goes out only for a ticked mode, with the switch on and the
// mode's system-prompt box left in.
assert.equal(engineSendsDshPrompt([], on, "engine"), true);
assert.equal(
  engineSendsDshPrompt([], { ...on, [engineSkipKey("systemPrompt", "engine")]: true }, "engine"),
  false,
  "the mode's own skip",
);
assert.equal(
  engineSendsDshPrompt([], { "enginePreset:engine": true }, "engine"),
  false,
  "master off",
);
assert.equal(engineSendsDshPrompt([], on, "standard"), false);
assert.equal(engineSendsDshPrompt([], on, null), false);
// The config alone answers yes: a listed preset sends dsh's prompt with the switch off and nothing
// ticked, and its own system-prompt box still removes it.
{
  const crew = new Config({ enginePresets: ["crew-*"] });
  assert.equal(engineSendsDshPrompt(crew.enginePresets, {}, "crew-scout"), true);
  assert.equal(engineSendsDshPrompt(crew.enginePresets, {}, "crewmate"), false, "not listed");
  assert.equal(engineSendsDshPrompt(crew.enginePresets, {}, null), false, "no preset");
  assert.equal(
    engineSendsDshPrompt(
      crew.enginePresets,
      { [engineSkipKey("systemPrompt", "crew-scout")]: true },
      "crew-scout",
    ),
    false,
    "the mode's own skip",
  );
  assert.equal(
    engineSendsDshPrompt(crew.enginePresets, on, "engine"),
    true,
    "a ticked mode still follows the hints",
  );
  assert.equal(
    engineSendsDshPrompt(crew.enginePresets, {}, "engine"),
    false,
    "and only when ticked",
  );
}
// A preset service that throws, or none, reads as no preset.
// SAFETY: partial fakes; presetOfSession reads sessions.get and the preset service only
assert.equal(
  presetOfSession(
    {
      sessions: { get: () => ({}) },
      get: () => ({
        presetForSession: () => {
          throw new Error("gone");
        },
      }),
    } as unknown as PluginContext,
    "s1",
  ),
  null,
);
assert.equal(presetOfSession(undefined, "s1"), null);
assert.equal(
  presetOfSession(
    {
      sessions: { get: (id: string) => (id === "s1" ? { id } : undefined) },
      get: () => ({ presetForSession: () => "engine" }),
    } as unknown as PluginContext,
    "s1",
  ),
  "engine",
  "a loaded session reads its preset",
);
assert.equal(
  presetOfSession(
    {
      sessions: { get: () => undefined },
      get: () => ({ presetForSession: () => "engine" }),
    } as unknown as PluginContext,
    "s1",
  ),
  null,
  "a session not loaded has none",
);

assert.deepEqual(enginePresets({ "enginePreset:a": true, "enginePreset:b": true, other: true }), [
  "a",
  "b",
]);

// Through the adapter: the session's preset comes from dsh's preset service and the ticks from the
// hints store; a session in another mode keeps the plugin's own config, and the bridge's per-session
// reads (`configFor`) follow what the last turn worked out.
{
  await writeFile(
    join(STATE_DIR, "hints.json"),
    JSON.stringify({ engineOn: true, "enginePreset:engine": true }),
  );
  const presets: Record<string, string> = { s1: "engine", s2: "standard" };
  // SAFETY: partial fake; sessionConfigOf reads sessions.get and the preset service only
  const ctx = {
    on() {},
    sessions: { get: (id: string) => ({ id }) },
    get: (name: string) =>
      name === "agentPresets"
        ? { presetForSession: (s: { id: string }) => presets[s.id] ?? null }
        : undefined,
  } as unknown as PluginContext;
  const a = new ClaudeCodeAdapter(ctx, Config({}));
  const s1 = await a.sessionConfigOf("s1");
  assert.equal(s1.isolate, true, "the engine preset's session runs in engine mode");
  assert.deepEqual(a.configFor("s1").builtinTools, ["ToolSearch"]);
  const s2 = await a.sessionConfigOf("s2");
  assert.equal(s2, a.config, "a session in another mode keeps the plugin's own config");
  assert.equal(a.configFor("s2"), a.config);
  assert.equal(a.configFor("never-seen"), a.config, "before a first turn: the plugin's own");
  // Unticked again: the next turn drops the session back to the plugin's config.
  await writeFile(join(STATE_DIR, "hints.json"), "{}");
  assert.equal(await a.sessionConfigOf("s1"), a.config);
  assert.equal(a.configFor("s1"), a.config);
  // A dsh with no preset service is engine mode off.
  // SAFETY: partial fake, as above
  const bare = new ClaudeCodeAdapter(
    { on() {}, sessions: { get: () => ({}) }, get: () => undefined } as unknown as PluginContext,
    Config({}),
  );
  await writeFile(
    join(STATE_DIR, "hints.json"),
    JSON.stringify({ engineOn: true, "enginePreset:engine": true }),
  );
  assert.equal(await bare.sessionConfigOf("s1"), bare.config);
}

// The environment follows the process, not the plugin's config: isolate's env goes only to a
// process whose spec says isolate, so a normal session started beside an engine one gets none.
{
  // SAFETY: partial fake; localEnvOverride reads the config only
  const a = new ClaudeCodeAdapter({ on() {} } as unknown as PluginContext, Config({}));
  assert.equal(a.localEnvOverride(false, undefined, false, true)?.MCP_TOOL_TIMEOUT, "2000000000");
  assert.equal(a.localEnvOverride(false, undefined, false, false)?.MCP_TOOL_TIMEOUT, undefined);
  assert.equal(a.localEnvOverride(false)?.MCP_TOOL_TIMEOUT, undefined, "default: the config's off");
}

// Through the adapter: the config's list reaches the turn with an empty hints store, and the mount
// registers the same list for the status route's "dsh's prompt was sent" answer.
{
  await writeFile(join(STATE_DIR, "hints.json"), "{}");
  const presets: Record<string, string> = { s1: "crew-scout", s2: "crewmate" };
  // SAFETY: partial fake; sessionConfigOf reads sessions.get and the preset service only
  const ctx = {
    on() {},
    sessions: { get: (id: string) => ({ id }) },
    get: (name: string) =>
      name === "agentPresets"
        ? { presetForSession: (s: { id: string }) => presets[s.id] ?? null }
        : undefined,
  } as unknown as PluginContext;
  const a = new ClaudeCodeAdapter(ctx, Config({ enginePresets: ["crew-*"] }));
  assert.equal(
    (await a.sessionConfigOf("s1")).isolate,
    true,
    "a listed preset runs in engine mode",
  );
  assert.equal(a.configFor("s1").systemPrompt, "dsh");
  assert.equal(
    await a.sessionConfigOf("s2"),
    a.config,
    "an unlisted preset keeps the plugin's config",
  );
  assert.deepEqual(
    registeredEnginePresets("claude-code"),
    ["crew-*"],
    "the mount registered its list",
  );
}

// The key's default is an empty list, and an empty list adds nothing: the expectations written
// before the key existed all still hold, and the hints store alone still turns engine mode on.
{
  const empty = new Config({ enginePresets: [] });
  assert.deepEqual(empty.enginePresets, []);
  assert.equal(engineOverlay(empty, {}, "engine"), empty, "nothing listed, nothing ticked");
  assert.equal(engineOverlay(empty, on, "engine").systemPrompt, "dsh", "the hints store alone");
  assert.equal(engineSendsDshPrompt(empty.enginePresets, on, "engine"), true);
  assert.equal(engineSendsDshPrompt(empty.enginePresets, {}, "engine"), false);
}

console.log("engine-mode: ok");
