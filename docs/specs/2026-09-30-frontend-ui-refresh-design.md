# Frontend UI Refresh Design

## Goal

Give NoteFlow a consistent, more intentional visual design across its existing
screens without changing the application's information architecture or
behavior. The refresh covers desktop and mobile layouts.

## User decisions

- Polish the whole app consistently.
- Use an editorial study-desk direction: warm paper neutrals, confident
  typography, and subtle indigo accents.
- Treat desktop and mobile as equally intentional targets.
- Prefer a cohesive visual refresh that preserves existing screens and
  workflows over either a minimal CSS touch-up or a larger component overhaul.

## Scope

Refresh the shared styles and existing dashboard, saved-notes library,
saved-note reader and Q&A, and delete-confirmation dialog. Improve consistency
in page spacing, surface treatments, typography hierarchy, controls, focus
states, and responsive behavior. Retain existing navigation, copy intent,
features, API interactions, and the indigo identity.

This is a frontend presentation task. It does not add product features, change
backend contracts, or replace the existing component structure.

## Visual direction

Use an editorial study-desk aesthetic: warm off-white surrounding surfaces,
paper-white cards, clear typographic hierarchy, restrained borders and
shadows, and indigo for primary actions and active states. Keep the interface
quiet and readable so lecture content remains the visual focus. Apply shared
design tokens and consistent spacing rather than isolated screen-specific
decoration.

## Responsive behavior

At wide widths, retain the sidebar and balanced dashboard workspace while
improving alignment and readable content widths. At narrow widths, prevent
horizontal overflow, adapt navigation and card layouts to the available
space, keep upload and notes actions easy to reach, and ensure reader content,
Q&A, and dialog actions fit and remain usable with touch input.

## Interaction and accessibility

Preserve current navigation, form behavior, loading and error handling, saved
conversation history, and delete confirmation. Provide visible keyboard focus,
readable contrast, clear labels, and touch-usable controls. Respect
`prefers-reduced-motion`; use motion only as restrained feedback and avoid
making transitions necessary to understand state changes.

## State coverage

The refreshed presentation must retain clear feedback for:

- An empty notes preview and an empty saved-notes library.
- Audio/transcript entry and notes-generation progress, success, and failure.
- Saved-note and conversation-history loading, empty conversation, and load
  failure with retry.
- Question submission, provider failure, and confidence/source metadata.
- Delete confirmation, progress, success navigation, and delete failure.

## Validation

- Run the frontend lint and production build.
- Inspect the dashboard, library, reader/Q&A, and delete dialog at desktop and
  narrow mobile viewport sizes in a browser when the local app can run.
- Check primary navigation and form interactions, visible keyboard focus,
  overflow, and representative empty/loading/error states.
- Avoid changes to unrelated files and verify existing behavior remains intact.
