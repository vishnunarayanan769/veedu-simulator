# Restoration Notes

## Preserved

- Minimal home screen with the separate Info modal.
- Name entry, skip-to-generate Kerala house names, and existing stored names.
- Local records and backward-compatible `VD1` friends score codes.
- 100 score-gated activity unlocks, eight starter activities, and five inventory capacity milestones.
- The existing 128px material textures, detailed sprites, raycaster, visitors, festival lamps, audio and weather events.

## Repaired

- Naming no longer recreates the game engine through changing React callback dependencies.
- A completed station is cleared before level rewards queue new work. Multiple unlocks are retained, not overwritten.
- Activity instructions, UI, story, events, questions, answers and explanations are in Malayalam.
- Tool use has three stages, with repeated presses for strokes/turns and holds for pouring/heating. Partial work persists.
- Tools match the activity: cloth for polishing, brush for grooming, shears for pruning and rope for tying. Tools are reusable.
- Swept leaf piles shrink and disappear; repaired taps stop dripping; lamp wicks light after the lighting step. Hand/tool animations accompany work.
- Trivia appears 1.5-2.7 seconds after a random 8-10 completed tasks. The clock and events pause; results remain until Continue. Duplicate answer submissions cannot award duplicate points.
- The question bank has 100 authored Kerala/safety questions and 900 household arithmetic scenarios, all in Malayalam, rather than rephrased copies of 100 English questions.
- Dropped items remain on the floor and require moving away before automatic pickup, or a deliberate pickup action.
- Touch movement direction, pointer cancellation, blur/visibility pauses and control resets are handled consistently.

## Checks

`scripts/check-restoration.mjs` exercises content and real gameplay state with only graphics and audio mocked. Run it with Node from the project root. It uses the already-installed TypeScript package; no test dependency is required.

Content counts also have TypeScript literal-size assertions: 100 level activities, 100 Malayalam notes, 100 knowledge questions and 30 sets of 30 arithmetic questions.

Manual browser checks are still important for pointer lock, touch gestures, audio permission, Malayalam font loading, and mobile layout. The headless checks do not assert visual fidelity or frame rate.

No cloud save, server-verified score system, or live network rooms are claimed by this restoration. The existing friends feature remains an explicitly local share-code board.