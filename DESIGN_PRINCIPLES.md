# Design principles — slab-vscode

These are **hard rules**, not preferences. An agent proposing UI that violates them has misread this file.

## Visual language

- **Flat. No exceptions.** No soft shadows, no glassmorphism, no neumorphism, no gradients used as ambient decoration.
- **Sharp corners, or near-sharp.** Max border-radius is 2–4px (hairline). **No pill shapes, no rounded buttons, no rounded cards.** The default "friendly modern SaaS" look is rejected.
- **Real contrast.** High contrast between foreground and background. No faint grey-on-grey text. No low-contrast borders pretending to be structure.
- **Clear hierarchy through type and spacing**, not through drop-shadows and colored boxes.
- **Dense where data is dense.** Do not waste vertical space on oversized padding "for breathing room".

## Interaction

- **Primary actions are obvious.** Destructive actions are visually distinct, not just red text.
- **No animated transitions over ~150ms.** Instant feels better than smooth.
- **Keyboard-first where reasonable.** If the user can complete a task without reaching for the mouse, they should be able to.

## Two-persona test (borrowed from folkevalget)

Every UI decision should pass both:

- **Surface user** — can complete the most common task in ~10 seconds without reading documentation.
- **Depth user** — can filter, cross-reference, and inspect without being forced through a simplified wrapper.

If a design serves only one persona, it is wrong.

## Anti-patterns (do not propose)

- Rounded pill buttons.
- Cards with drop-shadows floating on a neutral background.
- Material Design's aggressive rounding.
- Loading skeletons that animate for longer than the content takes to load.
- Modals for actions that should be inline edits.
- Tooltips carrying load-bearing information.

## When you're about to deviate

Do not. Ask first. Reference the specific rule you want to break and the specific reason. "It looks nicer" is not a reason.
