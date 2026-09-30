# Lecture Quiz UI Design

## Goal

Let a learner practice active recall on a saved lecture with a focused,
accessible quiz experience. Preserve the existing NoteFlow shell and leave the
reader, Q&A, API routing, and backend behavior intact.

## User decisions

- Add a Take Quiz action to the saved Note Reader.
- Generate a fresh quiz every time the learner selects Take Quiz.
- Present one question at a time with visible progress.
- Allow learners to go back, move forward, and change selected answers before
  submission.
- Reveal the score and answer explanations only after submitting the final
  answer.
- Keep the existing Q&A experience unchanged.

## Architecture and data flow

Add a frontend Quiz view to the existing `view` state. Use the existing
`POST /lectures/{lecture_id}/quiz` endpoint when the learner starts a quiz.
Use its response shape (`quiz_id`, `lecture_id`, `title`, `questions`) and
calculate the score in the frontend after final submission. Do not add API
calls, endpoints, backend behavior, routing, or persisted attempt history.

Use the array index as the stable in-attempt question key because generated
questions in the POST response may not include database IDs. Store selected
answers by index. Each new quiz clears prior answers, progress, results, and
error state before loading.

## Interaction and visual design

Retain the existing sidebar, cream background, purple accent, and editorial
typography. The reader header gains a Take Quiz action alongside Ask a
question and Delete saved notes. The quiz view includes a back-to-lecture
action, lecture/quiz heading, question count, progress indicator, question
card, answer choices, and Previous / Next controls. On the final question,
Next becomes Submit quiz. After submission, display the score and each
question’s correct answer and explanation; provide a way back to the lecture
and a way to generate another fresh quiz.

Keep controls keyboard-operable and labeled. Choices expose selection state,
progress is announced accessibly, and changing questions does not reveal
correctness before submission. On narrow screens, keep the question and
choices in one readable column, preserve comfortable touch targets, and avoid
horizontal overflow.

## States and recovery

- **Loading:** show a preparing-quiz status while the POST request is pending.
- **Generation error:** show the API error and a retry action that generates a
  new quiz.
- **Answer missing:** keep Next/Submit unavailable until the current question
  has a selected answer and explain the requirement.
- **In progress:** allow backward navigation and answer edits; preserve
  answers when navigating between questions.
- **Completed:** show score, correct answers, and explanations.
- **No questions returned:** show a clear recoverable error rather than an
  empty quiz surface.

## Assessment boundary

This is a self-study tool, not a high-stakes assessment. The existing backend
returns correct answers in the quiz-generation response, so a user could
inspect them before submission. This design accepts that existing API
contract; server-scored grading and answer withholding are explicitly out of
scope.

## Validation

- Run frontend lint and production build.
- Exercise Take Quiz, loading, error/retry, answer selection, previous/next,
  final submission, results, and fresh quiz generation.
- Confirm Q&A and reader navigation remain unchanged.
- Check keyboard operation, selected-answer announcement, reduced-motion
  behavior, and responsive layouts at desktop and mobile widths.
- Do not change backend code or API contracts.
