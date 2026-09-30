# Lecture Q&A and Note Deletion Design

## Goal

Add persistent, lecture-grounded question answering to the saved-note reader and
allow a learner to remove a lecture's saved notes without deleting the lecture
or its transcript.

## User decisions

- Questions are answered using both the saved transcript and the latest
  generated notes.
- Q&A appears inline in the saved-note reader.
- One persistent conversation is kept per lecture and loaded when the reader
  opens.
- Answers must stay grounded in the transcript and notes. If those sources do
  not contain an answer, the assistant says so rather than guessing.
- Deletion requires confirmation and removes every saved note version and the
  lecture's Q&A history. The lecture, transcript, and audio are retained.

## Architecture and data flow

Add a `LectureMessage` persistence model linked to a lecture with a cascading
foreign key. Store each user question and assistant answer as a separate
ordered row with a role, text, and creation timestamp. This keeps conversation
history queryable and makes deletion explicit without embedding growing JSON
in the lecture row. Add a MySQL migration for this table.

Add an endpoint to retrieve the ordered message history for a lecture and a
question endpoint that validates the lecture and its transcript, obtains the
latest saved note content, asks the configured LLM to answer strictly from
those sources and the most recent 20 conversation messages, then persists the
user/assistant exchange. Do not persist a partial exchange when generation
fails. Return actionable HTTP errors for missing or empty source content and
provider or persistence failures.

Add a note-deletion endpoint scoped to a lecture. In one database transaction,
delete all `Note` rows and Q&A messages for that lecture; do not delete the
`Lecture`, transcript, or audio file. Return a success response only after
commit. Update the saved-notes library query to list only lectures that still
have generated notes, so the deleted lecture disappears from My Notes without
removing its retained lecture or transcript data.

The frontend loads conversation history when a saved note opens. The inline
reader shows an empty state before the first question, ordered messages, a
question form, and explicit loading/error states. Submitting a question
disables duplicate submission until the response arrives; successful exchanges
are appended and the input is cleared. Delete Notes asks for confirmation,
shows progress/errors, and on success removes the lecture from the current
library and returns there. Failed deletes leave the reader and its data intact.

## API contract

- `GET /lectures/{lecture_id}/questions`: return the stored conversation in
  chronological order.
- `POST /lectures/{lecture_id}/questions`: accept a non-empty question and
  return the saved user question and grounded assistant answer.
- `DELETE /lectures/{lecture_id}/notes`: delete all generated note versions
  and Q&A messages for the lecture; preserve its lecture/transcript/audio.

## UX and visual direction

Use the existing NoteFlow indigo-and-white visual system and editorial study
library styling. Place Q&A below the note content in the reader. Present user
questions and assistant answers as distinct, clearly labeled messages. Provide
a labeled question field, keyboard-submittable form, visible focus state, and
an accessible confirmation dialog for destructive deletion.

Cover reader states for initial load, no prior questions, question submission,
provider failure with retry, empty/missing saved context, and history-load
failure. Cover deletion confirmation, in-progress, success, and failure states.
Keep the library's existing empty and error states functional after deletion.

## Boundaries and safeguards

- Only use the selected lecture's saved transcript and latest note content as
  answer context; do not answer from external knowledge.
- Keep provider secrets and prompt construction on the backend.
- Scope all message and deletion queries by the requested lecture ID.
- The application currently has no user authentication; this feature does not
  introduce cross-user authorization. Bind the backend to `127.0.0.1` and
  reject non-loopback client addresses. Do not expose it through a public
  interface or reverse proxy.
- Enforce a practical maximum question length and return a clear validation
  error for empty or oversized input.
- Do not silently accept malformed model output or report success if the
  database transaction fails.

## Validation

- Backend tests verify message ordering, source-grounded prompt construction,
  persistence only after a successful answer, missing-context errors, and
  deletion of all note versions plus messages while retaining the lecture and
  transcript.
- Frontend tests verify reader history, submission/loading/error states,
  accessible question form behavior, confirmation before deletion, and library
  refresh/navigation after deletion.
- Run the backend test suite and frontend lint/build checks.
