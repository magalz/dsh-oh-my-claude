// Claude Code's auto-memory index, which its own instruction-file loading takes with it: the switch
// applies only in the dsh instruction mode and only where nothing else supplies the prompt, the block
// names the index file, and an oversized index is cut at a line boundary with a notice.
import { strict as assert } from "node:assert";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tempDir } from "../test-tmp.js";
import {
  MEMORY_INDEX_MAX_BYTES,
  memoryIndexBlock,
  readMemoryIndex,
  usesMemoryIndex,
} from "./memory-index.js";

const dir = tempDir("omc-memory-index-");

// The switch needs all four: the key, the dsh instruction mode, a turn that may read memory, and a
// prompt the block has room in. Anything else either loads the index itself or must not see it.
{
  const on = { memoryIndex: true };
  assert.equal(usesMemoryIndex(on, true, false, undefined), true);
  assert.equal(usesMemoryIndex({ memoryIndex: false }, true, false, undefined), false);
  assert.equal(usesMemoryIndex(on, false, false, undefined), false);
  assert.equal(usesMemoryIndex(on, true, true, undefined), false);
  assert.equal(usesMemoryIndex(on, true, false, "dsh's prompt"), false);
}

// The block is a heading, one sentence naming the index file, then the text itself.
{
  const path = join(dir, "memory", "MEMORY.md");
  const text = "# Index\n- [Note](note.md) — one fact";
  const block = memoryIndexBlock(path, text);
  assert.ok(block.startsWith("# Auto-memory index\n\n"), "the heading comes first");
  assert.ok(block.includes(path), "the path is named");
  assert.ok(block.endsWith(text), "the index text comes last");
  assert.match(block, /persistent memory directory/, "the sentence says what the file is");
  assert.match(block, /when this process started/, "and when it was read");
}

// No index file, and one that is only whitespace, are the normal "no memory yet" case: nothing to
// append and nothing worth a log line. A path that is not a readable file is reported instead.
{
  const missing = join(dir, "missing");
  await mkdir(missing);
  const absent = await readMemoryIndex(missing);
  if (absent.ok) assert.fail("a missing MEMORY.md contributes nothing");
  assert.equal(absent.problem, undefined);

  const blank = join(dir, "blank");
  await mkdir(blank);
  await writeFile(join(blank, "MEMORY.md"), " \n\t\n", "utf8");
  const whitespace = await readMemoryIndex(blank);
  if (whitespace.ok) assert.fail("a whitespace-only MEMORY.md contributes nothing");
  assert.equal(whitespace.problem, undefined);

  const notAFile = join(dir, "not-a-file");
  await mkdir(join(notAFile, "MEMORY.md"), { recursive: true });
  const broken = await readMemoryIndex(notAFile);
  if (broken.ok) assert.fail("a directory named MEMORY.md is not an index");
  assert.ok(broken.problem !== undefined && broken.problem.length > 0, "the reason is reported");
}

// A small index comes back trimmed, ready for the block.
{
  const small = join(dir, "small");
  await mkdir(small);
  await writeFile(join(small, "MEMORY.md"), "\n  - [A](a.md) — one  \n\n", "utf8");
  const read = await readMemoryIndex(small);
  if (!read.ok) assert.fail(`the existing index should read: ${read.problem}`);
  assert.equal(read.text, "- [A](a.md) — one");
}

// An index over the limit keeps the longest run of whole lines that fits and ends with a notice;
// no line and no multi-byte character is cut in half.
{
  const big = join(dir, "big");
  await mkdir(big);
  const lines = Array.from(
    { length: 400 },
    (_, i) => `- [note-é-${i}](note-${i}.md) — memory ${i}`,
  );
  await writeFile(join(big, "MEMORY.md"), `${lines.join("\n")}\n`, "utf8");
  const read = await readMemoryIndex(big);
  if (!read.ok) assert.fail("an over-limit index is cut, not dropped");
  const parts = read.text.split("\n");
  const notice = parts.at(-1);
  assert.ok(notice !== undefined, "the notice is its own last line");
  assert.match(notice, new RegExp(`cut at ${MEMORY_INDEX_MAX_BYTES} bytes`), "the limit is named");
  assert.match(notice, /rest is in the file/, "and where the rest is");
  const body = parts.slice(0, -1);
  assert.ok(body.length > 0, "some whole lines fit");
  assert.deepEqual(body, lines.slice(0, body.length), "whole lines only, from the top");
  assert.match(body.at(-1) ?? "", /[^\x20-\x7E]/, "a multi-byte line sits next to the cut");
  assert.ok(
    Buffer.byteLength(body.join("\n"), "utf8") <= MEMORY_INDEX_MAX_BYTES,
    "the kept lines fit the limit",
  );
  const next = lines[body.length];
  assert.ok(next !== undefined, "the file goes on past the cut");
  assert.ok(
    Buffer.byteLength(`${body.join("\n")}\n${next}`, "utf8") > MEMORY_INDEX_MAX_BYTES,
    "and the next whole line does not fit",
  );
  assert.ok(
    Buffer.byteLength(read.text, "utf8") <=
      MEMORY_INDEX_MAX_BYTES + 1 + Buffer.byteLength(notice, "utf8"),
    "the notice adds only its own line",
  );
  assert.ok(!read.text.includes("\uFFFD"), "no character was broken at the cut");
}

// The limit is on what is sent: an index that fits once trimmed comes back whole and without a
// notice, however much blank space the file carries after it.
{
  const padded = join(dir, "padded");
  await mkdir(padded);
  const lines = Array.from(
    { length: 60 },
    (_, i) => `- [note-${i}](note-${i}.md) \u2014 ${"x".repeat(60)}`,
  );
  await writeFile(
    join(padded, "MEMORY.md"),
    `${lines.join("\n")}${"\n".repeat(MEMORY_INDEX_MAX_BYTES)}`,
    "utf8",
  );
  const read = await readMemoryIndex(padded);
  if (!read.ok) assert.fail("a padded index still reads");
  assert.equal(read.text, lines.join("\n"), "nothing was cut, so there is no notice");
}

// A first line that does not fit leaves only the notice: a line is never cut in half.
{
  const oneLine = join(dir, "one-line");
  await mkdir(oneLine);
  await writeFile(join(oneLine, "MEMORY.md"), "x".repeat(MEMORY_INDEX_MAX_BYTES + 1), "utf8");
  const read = await readMemoryIndex(oneLine);
  if (!read.ok) assert.fail("an index of one oversized line still answers");
  assert.match(read.text, /^\[auto-memory index cut at \d+ bytes; the rest is in the file\]$/);
}

console.log("memory-index: ok");
