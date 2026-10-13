# Security review — 2026-10-13

Scope: Workspace initialization, existing file detection, registry parsing and rollback snapshots.

P1: swallowed read/parse errors treated existing data as absent, permitting registry overwrite. Fail closed on malformed/unreadable existing content; use lstat to protect dangling symlinks and do not swallow rollback snapshot failures. Regression checks malformed registry preservation and dangling symlink rejection.

Validation: package type checks, existing automated tests, targeted regression tests for changes, and release build/package checks. The complete pre-change test/type-check baseline passed for all 17 owned libraries. Final release validation is recorded by the release workflow.

This is a focused P0/P1 review, not a guarantee that all vulnerabilities are absent. npm advisory severity alone is not evidence that a particular application path is exploitable.

Runtime metadata now requires Node.js 22+, matching the existing Scalar dependency requirement instead of claiming unsupported Node.js 18 compatibility. Browser entry points remain unchanged.
