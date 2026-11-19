// Per-preset guidance for Claude's system prompt: the reader returns a file's trimmed text and
// nothing (with the reason) for a missing, unreadable, empty or oversized one, and the process key
// changes with the text while a turn without guidance keys exactly as it did before.
import { strict as assert } from "node:assert";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tempDir } from "../test-tmp.js";
import {
  PRESET_GUIDANCE_MAX_BYTES,
  guidancePathFor,
  readGuidanceFile,
  systemPromptDigest,
} from "./preset-guidance.js";

const dir = tempDir("omc-preset-guidance-");

// The config resolves a preset to its file; no preset, an unlisted one, and a name inherited from
// Object.prototype all resolve to nothing, which is the normal case and adds no prompt text.
{
  const lead = join(dir, "lead.md");
  const config = { presetGuidance: { lead } };
  assert.equal(guidancePathFor(config, "lead"), lead);
  assert.equal(guidancePathFor(config, "other"), undefined);
  assert.equal(guidancePathFor(config, null), undefined);
  assert.equal(guidancePathFor({ presetGuidance: {} }, "toString"), undefined);
}

// A file's trimmed text is the guidance; the reason it cannot be used travels back for the log.
{
  const file = join(dir, "normal.md");
  await writeFile(file, "\n  Lead the turn from the north star.  \n\n", "utf8");
  const read = await readGuidanceFile(file);
  if (!read.ok) assert.fail(`the existing file should read: ${read.problem}`);
  assert.equal(read.text, "Lead the turn from the north star.");
}

// Exactly the limit is allowed: only larger files contribute nothing.
{
  const file = join(dir, "at-the-limit.md");
  await writeFile(file, "y".repeat(PRESET_GUIDANCE_MAX_BYTES), "utf8");
  const read = await readGuidanceFile(file);
  if (!read.ok) assert.fail(`a 32 KiB file should read: ${read.problem}`);
  assert.equal(read.text.length, PRESET_GUIDANCE_MAX_BYTES);
}

// Nothing to append: a missing file, a directory (not readable as a file), an empty file and one
// over the limit all report why, and the turn goes on without them.
{
  const missing = await readGuidanceFile(join(dir, "missing.md"));
  if (missing.ok) assert.fail("a missing file contributes nothing");
  assert.ok(missing.problem.length > 0);

  const directory = join(dir, "a-directory");
  await mkdir(directory);
  const unreadable = await readGuidanceFile(directory);
  if (unreadable.ok) assert.fail("a directory is not a text file");

  const empty = join(dir, "empty.md");
  await writeFile(empty, " \n\t\n", "utf8");
  const blank = await readGuidanceFile(empty);
  if (blank.ok) assert.fail("an empty file contributes nothing");

  const big = join(dir, "big.md");
  await writeFile(big, "x".repeat(PRESET_GUIDANCE_MAX_BYTES + 1), "utf8");
  const oversized = await readGuidanceFile(big);
  if (oversized.ok) assert.fail("a file over 32 KiB contributes nothing");
}

// The process key: two texts key different processes, the same text keys the same one, no
// guidance keys nothing (as before, so today's sessions do not respawn), and the digest of dsh's
// prompt is byte-for-byte what spec.system held before guidance existed.
assert.equal(systemPromptDigest(undefined, undefined), undefined);
assert.equal(systemPromptDigest(undefined, "same"), systemPromptDigest(undefined, "same"));
assert.notEqual(systemPromptDigest(undefined, "one"), systemPromptDigest(undefined, "two"));
assert.equal(
  systemPromptDigest("You are Sakina.", undefined),
  "76f7090ca1fd50fa",
  "dsh's prompt digests exactly as it did before the guidance key",
);

console.log("preset-guidance: ok");
