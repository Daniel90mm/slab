# Comms

Files written for an **LLM reader, not a human** — either your own future
session or an external model with no repo access. Both are self-contained
context dumps: lead with what the reader needs, drop human-friendly preamble.

Two kinds live here:

| Kind | Naming | Audience | Direction |
|------|--------|----------|-----------|
| **Handoff** | `HANDOFF_<YYYY-MM-DD_HHMM>.md` | the next session on *this* project | one-way (write at session end, read at next start) |
| **Consult** | `CONSULT_<topic>.md` + `CONSULT_<topic>_REPLY.md` | a *different* external model, for getting unstuck | round-trip (request, then pasted-back reply) |

See `CLAUDE.md` → Protocols for when to write each and the required contents.

- Resume a session: *"Resume from the latest HANDOFF in `comms/`."*
- The consult's "For the consultant" section is LLM-to-LLM — use whatever
  register gets the best answer (terse causal chains, raw constraints, no
  preamble). Writing the Problem section often resolves the consult before it
  is ever sent.
