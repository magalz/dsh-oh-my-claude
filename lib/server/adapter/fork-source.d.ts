/** The session-header fields the fork-copy decision reads. A real dsh `SessionHeader` satisfies
 *  this; the fields are plain strings because the decision only compares and returns them. */
export interface ForkSourceHeader {
    /** The session that created this one: a fork's source, or a subagent's creator. */
    readonly parentSession?: string;
    /** `"subagent"` for a session the subagent runtime created; absent for an ordinary fork. */
    readonly origin?: "subagent";
    /** Whether dsh inherited a prefix of the parent's completed turns into this session: true for a
     *  fork, subagent or not; false for a fresh subagent. */
    readonly isSeeded?: boolean;
}
/**
 * The parent session whose Claude transcript this session copies, or undefined when it copies
 * none. An ordinary fork names its source in `parentSession` and has no `origin`. A subagent's
 * `parentSession` is its creator, not a fork source, so only a fork subagent copies: dsh records
 * one as `isSeeded`, a session that "contains a fork-inherited event prefix", and that prefix is
 * the parent conversation the copied transcript has to match. A fresh subagent starts its own
 * conversation and is seeded from dsh's log instead. A header with no parent id is never copied,
 * and neither is a missing header.
 */
export declare function forkSourceOf(header: ForkSourceHeader | undefined): string | undefined;
