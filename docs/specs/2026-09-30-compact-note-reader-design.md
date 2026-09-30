# Compact Note Reader Design

## Goal

Make the saved lecture reader more compact, polished, and readable while
preserving the existing NoteFlow identity and every current interaction.

## User decisions

- Keep the sidebar and overall cream, purple, editorial visual direction.
- Prioritize fitting more note content on screen.
- Use the compact editorial reader approach: retain a single main reading
  column, tighten vertical rhythm, improve title/action alignment, and make
  note sections denser and wider.
- Keep Q&A below the notes and preserve the current question shortcut,
  conversation, submission, and error behavior.
- Do not change API calls, routing, or backend logic.

## Layout and visual treatment

Keep the reader inside the existing main content region. Align the lecture
title and reader actions as one compact header, allowing the title to use
available width while keeping the Ask a question action visually primary and
Delete saved notes secondary. Reduce excess top and inter-section spacing.
For the reader heading only, normalize filename underscores and whitespace for
legibility without changing the stored lecture title or other data.

Use the reading canvas more effectively on desktop while retaining comfortable
line lengths for note paragraphs. Reduce card padding and gaps, strengthen the
section number/title hierarchy, and keep summary, key points, and revision
questions visually distinct but consistent. At narrow widths, stack controls,
preserve comfortable touch targets, and prevent title or content overflow.

Keep the Q&A panel below the study material. Use the same spacing and surface
system as the reader, while retaining clear user/assistant distinction and a
legible question composer.

## Behavior and state coverage

This is a presentation-only change. Preserve existing loading, load-error,
empty-conversation, question-submission, question-error, history-retry, delete
confirmation, and delete-progress behavior. Do not add or remove interactions.

## Accessibility

Preserve semantic headings, labels, live status/error announcements, keyboard
operation, visible focus, reduced-motion behavior, and accessible touch
targets. Maintain readable text contrast on cream and paper surfaces.

## Validation

- Run frontend lint and production build.
- Render the reader at desktop and mobile widths.
- Check title wrapping, action alignment, question shortcut reachability, and
  horizontal overflow.
- Verify that no API, navigation, or backend behavior changed.
