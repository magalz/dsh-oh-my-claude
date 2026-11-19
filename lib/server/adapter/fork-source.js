// Whether a session copies its parent's Claude transcript, and from which parent. The decision is
// kept out of the adapter so it can be tested without dsh or a file system; see the test beside it.
/**
 * The parent session whose Claude transcript this session copies, or undefined when it copies
 * none. An ordinary fork names its source in `parentSession` and has no `origin`. A subagent's
 * `parentSession` is its creator, not a fork source, so only a fork subagent copies: dsh records
 * one as `isSeeded`, a session that "contains a fork-inherited event prefix", and that prefix is
 * the parent conversation the copied transcript has to match. A fresh subagent starts its own
 * conversation and is seeded from dsh's log instead. A header with no parent id is never copied,
 * and neither is a missing header.
 */
export function forkSourceOf(header) {
    const parentId = header?.parentSession;
    if (!header || !parentId)
        return undefined;
    if (header.origin === "subagent" && header.isSeeded !== true)
        return undefined;
    return parentId;
}
//# sourceMappingURL=fork-source.js.map