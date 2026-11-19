// `instructionFiles`: the default mode is today's arrangement (Claude Code loads its own CLAUDE.md
// files, dsh's instruction block follows the switches and loses the sections Claude already loaded),
// while `dsh` switches only Claude Code's own loading off for a local session and forwards dsh's
// block whole. A box and a side call keep the default, and `isolate` keeps its own environment.
import { strict as assert } from "node:assert";
import type { PluginContext } from "../dsh.js";
import { contextDrops } from "../context-sources.js";
import { childEnv, type ClaudeProcessSpec } from "../process.js";
import { ClaudeCodeAdapter } from "./class.js";
import { Config } from "./config.js";
import {
  instructionCopiesFor,
  instructionDropsFor,
  instructionEnvFor,
  usesDshInstructions,
} from "./instruction-files.js";
import { ISOLATED_ENV } from "./isolate.js";
import { specKey } from "./turn.js";

// The default mode is today's arrangement, for every hint combination: nothing added to the
// environment, dsh's CLAUDE.md sections left out because Claude Code loads its own, and the drops
// the switches have always made.
assert.equal(usesDshInstructions({ instructionFiles: "claude" }, undefined, undefined), false);
for (const [label, hints] of [
  ["master off", {}],
  ["master on", { dshContextOn: true }],
  ["instructions off", { dshContextOn: true, dshContextInstructionsOff: true }],
] as const) {
  assert.equal(instructionEnvFor(false, false), undefined, `no env: ${label}`);
  assert.deepEqual(
    instructionCopiesFor(false, false, false),
    { claudeMd: true, skills: true },
    `the CLI loads both: ${label}`,
  );
  assert.deepEqual(instructionDropsFor(hints, false), contextDrops(hints), `drops: ${label}`);
}
assert.deepEqual(
  instructionCopiesFor(false, false, true),
  { claudeMd: true, skills: false },
  "verbatim prompts keep dsh's skill body instead",
);

// `dsh` on a local session: one environment variable, and none of isolate's set, so memory, skills,
// checkpoints, telemetry and the rest stay native.
const dshLocal = usesDshInstructions({ instructionFiles: "dsh" }, undefined, undefined);
assert.equal(dshLocal, true);
const env = instructionEnvFor(dshLocal, false);
assert.ok(env !== undefined, "the mode adds an environment");
assert.deepEqual(env, { CLAUDE_CODE_DISABLE_CLAUDE_MDS: "1" });
for (const name of Object.keys(ISOLATED_ENV)) {
  if (name === "CLAUDE_CODE_DISABLE_CLAUDE_MDS") continue;
  assert.equal(env[name], undefined, `nothing else from isolate: ${name}`);
}
const child = childEnv({ CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1" }, env);
assert.equal(child.CLAUDE_CODE_DISABLE_CLAUDE_MDS, "1");
assert.equal(child.CLAUDE_CODE_DISABLE_AUTO_MEMORY, "1", "an inherited name is left alone");

// The same mode keeps dsh's CLAUDE.md sections (Claude Code adds none) while the skills copy still
// follows `verbatimPrompts`, and `instructions` is forwarded whatever the switches say.
assert.deepEqual(instructionCopiesFor(dshLocal, false, false), { claudeMd: false, skills: true });
assert.deepEqual(instructionCopiesFor(dshLocal, false, true), { claudeMd: false, skills: false });
for (const hints of [
  {},
  { dshContextOn: true },
  { dshContextOn: true, dshContextInstructionsOff: true },
  { dshContextOn: true, dshContextSkillsOff: true },
]) {
  const drops = instructionDropsFor(hints, dshLocal);
  assert.ok(!drops.has("instructions"), "dsh's instruction block is always forwarded");
  assert.equal(drops.has("skills"), contextDrops(hints).has("skills"), "skills follow the switches");
}

// A box's Claude Code cannot be handed the variable and keeps loading its own files, and a side
// call has no conversation to instruct: both keep exactly the default arrangement.
for (const [label, targetHost, purpose] of [
  ["remote box", "u@box", undefined],
  ["side call", undefined, "session-title"],
] as const) {
  const applies = usesDshInstructions({ instructionFiles: "dsh" }, targetHost, purpose);
  assert.equal(applies, false, label);
  assert.equal(instructionEnvFor(applies, false), undefined, label);
  assert.deepEqual(
    instructionCopiesFor(applies, false, false),
    { claudeMd: true, skills: true },
    label,
  );
  assert.deepEqual(
    instructionDropsFor({ dshContextOn: true }, applies),
    contextDrops({ dshContextOn: true }),
    label,
  );
}

// Under `isolate` the variable is already in ISOLATED_ENV, so the mode adds no environment of its
// own and the isolate environment is exactly what it was; all it adds is the forwarding above.
assert.equal(instructionEnvFor(dshLocal, true), undefined, "isolate already carries the variable");
assert.deepEqual(instructionCopiesFor(dshLocal, true, false), { claudeMd: false, skills: true });
for (const hints of [{}, { dshContextOn: true, dshContextInstructionsOff: true }]) {
  assert.ok(!instructionDropsFor(hints, true).has("instructions"));
}
const isolatedEnv = childEnv({}, ISOLATED_ENV);
assert.equal(isolatedEnv.CLAUDE_CODE_DISABLE_CLAUDE_MDS, "1");
assert.equal(isolatedEnv.CLAUDE_CODE_DISABLE_AUTO_MEMORY, "1");
assert.equal(isolatedEnv.MCP_TOOL_TIMEOUT, "2000000000");
assert.equal(isolatedEnv.CLAUDE_CODE_SIMPLE, undefined);

// Through the adapter: the spec's environment reaches the child, alone in the `dsh` mode, and
// isolate's whole environment is untouched when the mode rides along.
{
  // SAFETY: partial fake; localEnvOverride reads the config only
  const adapter = new ClaudeCodeAdapter({ on() {} } as unknown as PluginContext, Config({}));
  assert.equal(
    adapter.localEnvOverride(false)?.CLAUDE_CODE_DISABLE_CLAUDE_MDS,
    undefined,
    "default: absent",
  );
  const over = adapter.localEnvOverride(false, undefined, false, false, instructionEnvFor(dshLocal, false));
  assert.equal(over?.CLAUDE_CODE_DISABLE_CLAUDE_MDS, "1");
  assert.equal(over?.CLAUDE_CODE_DISABLE_AUTO_MEMORY, undefined, "nothing else from isolate");
  const isolatedOver = adapter.localEnvOverride(
    false,
    undefined,
    false,
    true,
    instructionEnvFor(dshLocal, true),
  );
  assert.equal(isolatedOver?.CLAUDE_CODE_DISABLE_CLAUDE_MDS, "1", "isolate's own variable stays");
  assert.equal(isolatedOver?.CLAUDE_CODE_DISABLE_AUTO_MEMORY, "1");
  assert.equal(isolatedOver?.MCP_TOOL_TIMEOUT, "2000000000");
}

// The environment rides on the process spec as isolate's flag does, so switching the mode keys a new
// process on the session's next turn; the default mode adds no field, so its key is unchanged.
const base: ClaudeProcessSpec = {
  cwd: "/w",
  model: undefined,
  effort: null,
  mode: "default",
  sessionId: null,
  temporary: false,
};
const today = specKey(base);
const withDsh = { ...base };
const dshEnv = instructionEnvFor(dshLocal, false);
if (dshEnv !== undefined) withDsh.instructionEnv = dshEnv;
assert.notEqual(specKey(withDsh), today, "the mode starts a new process");
const withClaude = { ...base };
const claudeEnv = instructionEnvFor(false, false);
if (claudeEnv !== undefined) withClaude.instructionEnv = claudeEnv;
assert.equal(specKey(withClaude), today, "the default mode keys exactly as before");

console.log("instruction-files: ok");
