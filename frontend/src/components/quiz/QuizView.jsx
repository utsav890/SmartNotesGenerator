import {
  ArrowLeft,
  Brain,
  LoaderCircle,
  RotateCcw,
  CircleCheck,
  CircleX,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight
} from "lucide-react";

export default function QuizView({
  quiz,
  quizLoading,
  quizError,
  quizSubmitted,
  quizQuestions,
  currentQuizQuestion,
  quizQuestionIndex,
  setQuizQuestionIndex,
  quizAnswers,
  selectQuizAnswer,
  advanceQuiz,
  getQuizScore,
  generateAndOpenQuiz,
  setView,
  readerTitle,
  quizQuestionHeadingRef,
  quizResultsHeadingRef,
  lectures = [],
  openSavedNote,
  resetWorkspace,
}) {
  const currentQuizAnswer = quizAnswers[quizQuestionIndex];

  if (!quizLoading && !quiz && !quizError) {
    const readyLectures = lectures.filter(
      (lec) => lec.has_notes || lec.status === "completed"
    );

    return (
      <section className="quiz-page" aria-label="Lecture Quiz Selection">
        <button
          type="button"
          className="back-btn"
          onClick={() => {
            if (resetWorkspace) resetWorkspace();
            setView("dashboard");
          }}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Dashboard
        </button>

        <div className="quiz-selector-card">
          <div className="selector-icon-badge">
            <Brain size={28} />
          </div>
          <h2>Select a Lecture to Test Your Knowledge</h2>
          <p>
            Choose a synthesized lecture below. Our AI will automatically generate an active recall quiz to test your comprehension and retention.
          </p>

          {readyLectures.length > 0 ? (
            <>
              <div className="selector-dropdown-row">
                <label htmlFor="quiz-lecture-select" className="selector-dropdown-label">
                  Quick Select Lecture:
                </label>
                <select
                  id="quiz-lecture-select"
                  className="selector-dropdown-input"
                  defaultValue=""
                  onChange={(e) => {
                    const selected = readyLectures.find((l) => String(l.id) === e.target.value);
                    if (selected && generateAndOpenQuiz) {
                      generateAndOpenQuiz(selected);
                    }
                  }}
                >
                  <option value="" disabled>Choose a synthesized lecture to quiz...</option>
                  {readyLectures.map((lec) => (
                    <option key={lec.id} value={lec.id}>
                      {lec.title} ({lec.audio_format || "Ready"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="lecture-selector-grid">
                {readyLectures.map((lec) => (
                  <button
                    key={lec.id}
                    type="button"
                    className="lecture-select-item"
                    onClick={() => {
                      if (generateAndOpenQuiz) {
                        generateAndOpenQuiz(lec);
                      } else if (openSavedNote) {
                        openSavedNote(lec);
                      }
                    }}
                  >
                    <div className="item-icon-wrapper secondary">
                      <Brain size={20} />
                    </div>
                    <div className="item-info">
                      <span className="item-title">{lec.title}</span>
                      <span className="item-meta">
                        {lec.audio_format || "Lecture Audio"} • {lec.created_at ? new Date(lec.created_at).toLocaleDateString() : "Ready"}
                      </span>
                    </div>
                    <div className="item-arrow-action">
                      <span>Start Quiz</span>
                      <ArrowRight size={16} />
                    </div>
                  </button>
                ))}
              </div>

              <div className="selector-footer-action">
                <button
                  type="button"
                  className="btn-secondary-link"
                  onClick={() => {
                    if (resetWorkspace) resetWorkspace();
                    setView("dashboard");
                  }}
                >
                  <Sparkles size={14} /> Or Ingest a New Lecture
                </button>
              </div>
            </>
          ) : (
            <div className="selector-empty-cta">
              <p>No synthesized lectures available to quiz yet.</p>
              <button
                type="button"
                className="stitch-primary-btn"
                onClick={() => {
                  if (resetWorkspace) resetWorkspace();
                  setView("dashboard");
                }}
              >
                <Sparkles size={16} /> Go to Ingestion Studio
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="quiz-page" aria-labelledby="quiz-title">
      <button
        type="button"
        className="back-btn"
        onClick={() => setView("note-reader")}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Lecture Notes
      </button>

      <header className="quiz-header">
        <div>
          <span className="preview-kicker">Active Recall Arena</span>
          <h1 id="quiz-title" tabIndex={-1}>
            {quiz?.title || "Lecture Quiz"}
          </h1>
          <p className="quiz-subtitle">{readerTitle}</p>
        </div>
        {quiz && (
          <span className="quiz-count">
            <Brain size={18} aria-hidden="true" />
            {quizQuestions.length}{" "}
            {quizQuestions.length === 1 ? "Question" : "Questions"}
          </span>
        )}
      </header>

      {quizLoading && (
        <div className="library-state" role="status">
          <LoaderCircle
            className="spin"
            size={32}
            color="var(--accent)"
            aria-hidden="true"
          />
          <h2>Synthesizing Active Recall Quiz</h2>
          <p>
            Groq AI is designing challenging comprehension and concept questions
            from your lecture…
          </p>
        </div>
      )}

      {!quizLoading && quizError && (
        <div className="library-state error-state" role="alert">
          <h2>Couldn’t prepare the quiz</h2>
          <p>{quizError}</p>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => generateAndOpenQuiz()}
            disabled={quizLoading}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Try Again
          </button>
        </div>
      )}

      {!quizLoading &&
        quiz &&
        !quizError &&
        (quizSubmitted ? (
          /* Quiz Score & Review View */
          <div className="quiz-results">
            <div className="quiz-score-card">
              <div className="quiz-score-icon" aria-hidden="true">
                <Brain size={34} />
              </div>
              <div>
                <span className="preview-kicker">Quiz Evaluation Complete</span>
                <h2
                  id="quiz-results-title"
                  ref={quizResultsHeadingRef}
                  tabIndex={-1}
                >
                  {getQuizScore()} <span>/ {quizQuestions.length}</span>
                </h2>
                <p className="quiz-score-desc">
                  {getQuizScore() === quizQuestions.length
                    ? "Outstanding mastery! You got every question correct."
                    : getQuizScore() >= Math.ceil(quizQuestions.length * 0.7)
                    ? "Great performance! Review the explanations below to solidify difficult areas."
                    : "Keep practicing! Review the detailed rationales below to master the concepts."}
                </p>
              </div>
            </div>

            <section
              className="quiz-review-list"
              aria-label="Quiz answer review"
            >
              {quizQuestions.map((item, index) => {
                const selectedAnswer = quizAnswers[index];
                const correct = selectedAnswer === item.correct_answer;
                const options = item.options || {};

                return (
                  <article
                    className="quiz-review-card"
                    key={`review-${index}`}
                  >
                    <div
                      className={`quiz-review-status${
                        correct ? " is-correct" : " is-incorrect"
                      }`}
                    >
                      {correct ? (
                        <CircleCheck size={16} aria-hidden="true" />
                      ) : (
                        <CircleX size={16} aria-hidden="true" />
                      )}
                      <span>
                        Question {index + 1} ·{" "}
                        {correct ? "Correct" : "Needs Review"}
                      </span>
                    </div>
                    <h2>{item.question}</h2>
                    <p className="quiz-correct-answer">
                      Correct answer:{" "}
                      <strong>
                        {item.correct_answer}. {options[item.correct_answer]}
                      </strong>
                    </p>
                    {!correct && (
                      <p className="quiz-selected-answer">
                        Your selection:{" "}
                        <span className="danger-text">
                          {selectedAnswer}. {options[selectedAnswer]}
                        </span>
                      </p>
                    )}
                    {item.explanation && (
                      <div className="quiz-explanation">
                        <strong>Explanation &amp; Concept Rationale:</strong>
                        <p>{item.explanation}</p>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>

            <div className="quiz-result-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setView("note-reader")}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back to Lecture Notes
              </button>
              <button
                type="button"
                className="generate-btn compact-btn"
                onClick={generateAndOpenQuiz}
                disabled={quizLoading}
              >
                <RotateCcw size={16} aria-hidden="true" />
                Try a Fresh Quiz
              </button>
            </div>
          </div>
        ) : currentQuizQuestion ? (
          /* Active Question View */
          <div className="quiz-active">
            <div
              className="quiz-progress-copy"
              id="quiz-progress-label"
              aria-live="polite"
            >
              <span>
                Question {quizQuestionIndex + 1} of {quizQuestions.length}
              </span>
              <span>
                {Math.round(
                  ((quizQuestionIndex + 1) / quizQuestions.length) * 100
                )}
                % Complete
              </span>
            </div>
            <progress
              className="quiz-progress"
              value={quizQuestionIndex + 1}
              max={quizQuestions.length}
              aria-label={`Question ${quizQuestionIndex + 1} of ${
                quizQuestions.length
              }`}
            />

            <article
              className="quiz-question-card"
              aria-labelledby={`quiz-question-${quizQuestionIndex}`}
            >
              <span className="quiz-question-kicker">
                Question {quizQuestionIndex + 1}
              </span>
              <h2
                id={`quiz-question-${quizQuestionIndex}`}
                ref={quizQuestionHeadingRef}
                tabIndex={-1}
              >
                {currentQuizQuestion.question}
              </h2>
              <fieldset
                className="quiz-options"
                aria-labelledby={`quiz-question-${quizQuestionIndex}`}
              >
                {["A", "B", "C", "D"].map((option) => (
                  <label
                    className={`quiz-option${
                      currentQuizAnswer === option ? " is-selected" : ""
                    }`}
                    key={option}
                  >
                    <input
                      type="radio"
                      name={`quiz-answer-${quizQuestionIndex}`}
                      value={option}
                      checked={currentQuizAnswer === option}
                      onChange={() => selectQuizAnswer(option)}
                    />
                    <span className="quiz-option-letter">{option}</span>
                    <span>
                      {currentQuizQuestion.options?.[option] ||
                        "Option unavailable"}
                    </span>
                  </label>
                ))}
              </fieldset>
            </article>

            <div className="quiz-navigation">
              <button
                type="button"
                className="secondary-btn quiz-nav-btn"
                onClick={() =>
                  setQuizQuestionIndex((current) => Math.max(0, current - 1))
                }
                disabled={quizQuestionIndex === 0}
              >
                <ChevronLeft size={18} aria-hidden="true" />
                Previous
              </button>

              <button
                type="button"
                className="generate-btn quiz-nav-btn"
                onClick={advanceQuiz}
                disabled={currentQuizAnswer === undefined}
                style={{ width: "auto" }}
              >
                {quizQuestionIndex === quizQuestions.length - 1
                  ? "Submit Quiz"
                  : "Next Question"}
                {quizQuestionIndex === quizQuestions.length - 1 ? (
                  <Sparkles size={17} aria-hidden="true" />
                ) : (
                  <ChevronRight size={18} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="library-state error-state" role="alert">
            <h2>This quiz has no questions</h2>
            <p>Try generating a fresh quiz from these lecture notes.</p>
            <button
              type="button"
              className="secondary-btn"
              onClick={generateAndOpenQuiz}
            >
              <RotateCcw size={16} aria-hidden="true" /> Generate another quiz
            </button>
          </div>
        ))}
    </section>
  );
}
