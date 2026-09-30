# Saved Notes and Q&A Polish Design

## Goal

Improve the saved-notes library, saved-note reader, and lecture Q&A presentation
so saved material is easier to scan and the question-and-answer history is
clearer, without changing existing product behavior.

## User decisions

- Focus this follow-up on My Notes and asking questions about a saved lecture.
- Prefer stronger visual hierarchy and more polished cards.
- Make conversation turns and source details easier to read.
- Use a targeted presentation polish, not new Q&A functionality or a broader
  information-architecture change.

## Scope and visual direction

Continue the approved NoteFlow editorial study-desk direction: warm neutral
surfaces, paper-like cards, confident type hierarchy, and restrained indigo
accents. Update the saved library rows and reader shell to make lecture titles,
dates, navigation, and note content feel cohesive and readable. Improve
typographic rhythm and section separation in notes without changing their
content or order.

Present the Q&A area as a readable conversation, with clearly differentiated
learner questions and assistant answers, comfortable line lengths, and
confidence/source metadata visually grouped with its assistant answer. Keep the
question form clear, prominent, keyboard-usable, and comfortable on mobile.

## Behavior and state coverage

Preserve current library navigation, saved conversation loading and
persistence, question submission, retry and error behavior, confidence/source
data returned by the backend, and note deletion confirmation. Do not add
suggested questions, conversation controls, or API changes.

Maintain clear visual states for an empty library, library loading and failure,
note-reader loading and failure, an empty conversation, conversation-history
loading and retryable failure, question submission and failure, and note
deletion confirmation/progress/failure. At narrow viewport widths, prevent
horizontal overflow and keep the note content, Q&A composer, conversation,
and actions usable.

## Accessibility

Keep semantic headings and conversation labels. Maintain readable contrast,
visible keyboard focus, usable touch targets, clear disabled/loading feedback,
and reduced-motion behavior.

## Validation

- Run frontend lint and production build.
- Inspect My Notes, the saved-note reader, and Q&A on desktop and mobile.
- Exercise the library empty state, conversation empty state, form submission
  presentation, and delete confirmation using browser checks where available.
- Confirm no horizontal overflow and no changes to API or conversation behavior.
