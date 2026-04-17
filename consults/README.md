# Consults

"Call-a-friend" files. An agent that is stuck asks the user for permission to write one. The user then pastes the contents into another LLM and saves the reply alongside.

Naming:
- Request: `CONSULT_<topic>.md`
- Reply:   `CONSULT_<topic>_REPLY.md`

See `CLAUDE.md` → Protocols → Consult for structure.

The "For the consultant" section is LLM-to-LLM. Human readability is not required — use whatever register gets the best answer (terse causal chains, raw constraints, no preamble).
