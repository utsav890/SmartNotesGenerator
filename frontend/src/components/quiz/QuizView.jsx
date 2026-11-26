import {
  ArrowLeft,
  Brain,
  LoaderCircle,
  RotateCcw,
  CircleCheck,
  CircleX,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from "lucide-react";
import LectureSelector from "../shared/LectureSelector";
import { isLectureReady } from "../../utils/lectureUtils";

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
    const goDashboard = () => {
      resetWorkspace?.();
      setView("dashboard");
    };

    return (
      <LectureSelector
        ariaLabel="Lecture Quiz Selection"
        sectionClassName="quiz-page"
        cardClassName="quiz-selector-card"
        icon={<Brain size={28} />}
        itemIcon={<Brain size={20} />}
        secondaryIcon
        title="Select a Lecture to Test Your Knowledge"
        description="Choose a synthesized lecture below. Our AI will automatically generate an active recall quiz to test your comprehension and retention."
        selectId="quiz-lecture-select"
        dropdownPlaceholder="Choose a synthesized lecture to quiz..."
        emptyMessage="No synthesized lectures available to quiz yet."
        actionLabel="Start Quiz"
        readyLectures={lectures.filter(isLectureReady)}
        onSelectLecture={(lec) => {
          if (generateAndOpenQuiz) generateAndOpenQuiz(lec);
          else if (openSavedNote) openSavedNote(lec);
        }}
        onBack={goDashboard}
        onGoDashboard={goDashboard}
      />
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
                      className={`quiz-review-status${correct ? " is-correct" : " is-incorrect"
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
              aria-label={`Question ${quizQuestionIndex + 1} of ${quizQuestions.length
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
                    className={`quiz-option${currentQuizAnswer === option ? " is-selected" : ""
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
