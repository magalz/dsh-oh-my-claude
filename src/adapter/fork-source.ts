// Whether a session copies its parent's Claude transcript, and from which parent. The decision is
// kept out of the adapter so it can be tested without dsh or a file system; see the test beside it.

/** The session-header fields the fork-copy decision reads. A real dsh `SessionHeader` satisfies
 *  this; the fields are plain strings because the decision only compares and returns them. */
export interface ForkSourceHeader {
  /** The session that created this one: a fork's source, or a subagent's creator. */
  readonly parentSession?: string;
  /** `"subagent"` for a session the subagent runtime created; absent for an ordinary fork. */
  readonly origin?: "subagent";
  /** Whether dsh inherited a prefix of the parent's completed turns into this session (dsh's
   *  fork subagent); false for a fresh subagent and for an ordinary fork. */
  readonly isSeeded?: boolean;
}

/** The parent session whose Claude transcript this fork copies, or undefined when it copies none.
 *  Stub for the test-first commit: it answers "none" for every header until the decision is
 *  implemented. */
export function forkSourceOf(header: ForkSourceHeader | undefined): string | undefined {
  void header;
  return undefined;
}
