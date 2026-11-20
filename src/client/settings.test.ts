// Offline checks for the settings pure helpers: precedence decides which file wins a key, a scope
// missing from the payload is skipped rather than shifting the order, unreadable text is quiet, and
// the two Settings cards read the server's config facts the way the adapter does.
import assert from "node:assert/strict";
import {
  claudeMdReason,
  memoryRowState,
  overrideNote,
  withListedPresets,
  type SettingsScopeInfo,
} from "./settings.js";

const scope = (name: SettingsScopeInfo["scope"], text: string): SettingsScopeInfo => ({
  scope: name,
  path: `/${name}/settings.json`,
  exists: true,
  text,
  readOnly: name === "managed",
});

// The highest-precedence file that also sets a key is the one named for it.
{
  const note = overrideNote(
    [
      scope("managed", `{"model":"opus"}`),
      scope("local", `{"model":"haiku","env":{}}`),
      scope("user", `{"model":"sonnet","env":{},"hooks":{}}`),
    ],
    "user",
  );
  assert.equal(note, "Overridden here: model by the managed file; env by settings.local.json.");
}

// Nothing above the top scope, and nothing shared, both read as no note.
{
  assert.equal(overrideNote([scope("managed", `{"model":"opus"}`)], "managed"), "");
  assert.equal(
    overrideNote([scope("local", `{"env":{}}`), scope("user", `{"model":"sonnet"}`)], "user"),
    "",
  );
}

// Without a directory the payload carries no project or local file; user still reads managed.
{
  const note = overrideNote(
    [scope("managed", `{"permissions":{}}`), scope("user", `{"permissions":{}}`)],
    "user",
  );
  assert.equal(note, "Overridden here: permissions by the managed file.");
}

// A file that is not JSON, and a scope the payload never carried, contribute nothing.
{
  assert.equal(
    overrideNote([scope("local", "not json"), scope("user", `{"model":"sonnet"}`)], "user"),
    "",
  );
  assert.equal(overrideNote([scope("user", `{"model":"sonnet"}`)], "project"), "");
}

// Three keys read as a sentence, not a bare list.
{
  const note = overrideNote(
    [scope("local", `{"a":1,"b":2,"c":3}`), scope("user", `{"a":1,"b":2,"c":3}`)],
    "user",
  );
  assert.equal(note, "Overridden here: a, b and c by settings.local.json.");
}

// The plugin's config decides the CLAUDE.md row ahead of any settings file: the dsh instruction
// mode loads none of these files whatever disabledBy says, and a plain loaded state names no reason.
{
  assert.equal(
    claudeMdReason({ files: 2, chars: 30, disabledBy: "env", instructionFiles: "dsh" }),
    "config",
  );
  assert.equal(claudeMdReason({ files: 2, chars: 30 }), undefined);
  assert.equal(claudeMdReason({ files: 2, chars: 30, disabledBy: "env" }), "env");
  assert.equal(claudeMdReason({ files: 2, chars: 30, disabledBy: "project" }), "project");
}

// The memory-index row is fixed where Claude Code loads the index itself or the config appends it,
// and follows this machine's hint only in between.
{
  assert.deepEqual(memoryRowState({ files: 0, chars: 0 }, true), {
    checked: true,
    locked: true,
    why: "native",
  });
  assert.deepEqual(memoryRowState({ files: 0, chars: 0 }, false), {
    checked: true,
    locked: true,
    why: "native",
  });
  const config = { files: 0, chars: 0, instructionFiles: "dsh", memoryIndex: true } as const;
  assert.deepEqual(memoryRowState(config, true), { checked: true, locked: true, why: "config" });
  assert.deepEqual(memoryRowState(config, false), { checked: true, locked: true, why: "config" });
  const bySwitch = { files: 0, chars: 0, instructionFiles: "dsh" } as const;
  assert.deepEqual(memoryRowState(bySwitch, true), {
    checked: true,
    locked: false,
    why: "switch",
  });
  assert.deepEqual(memoryRowState(bySwitch, false), {
    checked: false,
    locked: false,
    why: "switch",
  });
}

// The engine card counts a listed preset as ticked without a tick in the store: the listed ids come
// after the ticked ones in row order, and a preset that is both is named once.
{
  const rows = [
    { id: "standard" },
    { id: "crew", listed: true },
    { id: "engine", listed: true },
  ] as const;
  assert.deepEqual(withListedPresets(["standard"], rows), ["standard", "crew", "engine"]);
  assert.deepEqual(withListedPresets(["engine"], rows), ["engine", "crew"]);
  assert.deepEqual(withListedPresets(["crew"], rows), ["crew", "engine"]);
  assert.deepEqual(
    withListedPresets(["standard"], rows.map(({ id }) => ({ id }))),
    ["standard"],
    "nothing listed leaves the ticks as they were",
  );
}

console.log("settings-scopes ok");
