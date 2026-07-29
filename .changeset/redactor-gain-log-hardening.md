---
"@studnicky/redactor": patch
---

Harden the gain-tracking log (`.redactor/gain.ndjson`). Entries read from disk are now validated against `GainEntryEntity` instead of a bare type assertion, so a truncated or corrupted line (e.g. from a killed process mid-write) is dropped instead of silently trusted. The log is also capped at 1000 entries, trimming the oldest once exceeded, so it no longer grows unbounded.
