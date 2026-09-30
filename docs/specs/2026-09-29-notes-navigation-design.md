# Notes Navigation Design

## Goal

Make the sidebar's **Add Notes** and **My Notes** actions functional. Add Notes
starts a clean note-generation workspace. My Notes lists saved lectures and
opens a selected lecture in a focused reader view.

## Behavior

- `dashboard`: existing audio/transcript generation workspace.
- `my-notes`: fetches `GET /lectures` and displays saved lecture title and date.
- `note-reader`: fetches `GET /lectures/{id}/notes` and renders the existing
  structured note output.
- Add Notes clears draft input, generated notes, status, errors, and selected
  lecture, then returns to `dashboard`.
- My Notes has loading, error, and empty states. Empty state includes an Add
  Notes action.
- Reader has a Back to My Notes action and an explicit load error state.

## Data flow

The frontend reuses the existing FastAPI endpoints. Lecture list responses are
normalized defensively for title/date display. Note responses continue through
the existing `formatNotes` helper so generated and persisted notes render the
same way.

## Visual direction

Keep the existing NoteFlow indigo and white visual system, with an editorial
study-library feel: clear headings, compact metadata, generous whitespace,
visible focus states, and responsive stacking on narrow screens.

## Validation

- Verify Add Notes resets the workspace.
- Verify My Notes loads, handles empty/error states, and opens a selected note.
- Verify reader back navigation returns to the list.
- Run frontend lint and production build.
