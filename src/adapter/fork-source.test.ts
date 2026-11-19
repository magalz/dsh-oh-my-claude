// A fork copies the parent's Claude transcript, so the child Claude process resumes the parent's
// conversation instead of paying for the inherited context again. A subagent only does when dsh
// gave it a fork-inherited prefix (a fork subagent); an ordinary subagent starts fresh and is
// seeded from dsh's log instead. The header alone decides: nothing here starts a process or reads
// a file.
import { strict as assert } from "node:assert";
import { forkSourceOf } from "./fork-source.js";

{
  // An ordinary fork names the session to copy from in parentSession and has no origin.
  assert.equal(
    forkSourceOf({ parentSession: "parent", isSeeded: false }),
    "parent",
    "an ordinary fork copies its parent's transcript",
  );
}
{
  // A fresh subagent: origin says subagent and nothing was inherited, so no transcript is copied.
  assert.equal(
    forkSourceOf({ parentSession: "parent", origin: "subagent", isSeeded: false }),
    undefined,
    "a subagent without the inherited prefix copies nothing",
  );
}
{
  // A fork subagent: origin still says subagent, but the inherited prefix makes it a fork of the
  // parent's conversation, so the same copy applies.
  assert.equal(
    forkSourceOf({ parentSession: "parent", origin: "subagent", isSeeded: true }),
    "parent",
    "a fork subagent copies its parent's transcript",
  );
}
{
  // A parent id is the one thing a copy needs: without it nothing is copied, whatever the rest says.
  assert.equal(forkSourceOf({ isSeeded: false }), undefined, "no parent id copies nothing");
  assert.equal(
    forkSourceOf({ isSeeded: true }),
    undefined,
    "a seeded session with no parent id copies nothing",
  );
  assert.equal(
    forkSourceOf({ origin: "subagent", isSeeded: false }),
    undefined,
    "a subagent with no parent id copies nothing",
  );
  assert.equal(
    forkSourceOf({ origin: "subagent", isSeeded: true }),
    undefined,
    "a fork subagent with no parent id copies nothing",
  );
  assert.equal(
    forkSourceOf({ parentSession: "", origin: "subagent", isSeeded: true }),
    undefined,
    "an empty parent id is no parent",
  );
}
{
  // A session dsh cannot name is not a fork of anything.
  assert.equal(forkSourceOf(undefined), undefined, "a missing header copies nothing");
}
