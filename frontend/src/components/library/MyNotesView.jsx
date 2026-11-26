import { useState } from "react";
import {
  Plus,
  Search,
  X,
  CircleCheck,
  LoaderCircle,
  RotateCcw,
  FileText,
  Clock,
  ArrowUpRight,
  Trash2
} from "lucide-react";
import { isLectureReady } from "../../utils/lectureUtils";

export default function MyNotesView({
  lectures,
  filteredLectures,
  notesLoading,
  notesError,
  searchQuery,
  setSearchQuery,
  libraryNotice,
  resetWorkspace,
  openSavedNote,
  openMyNotes,
  handleRetryLecture,
  handleDeleteLecture,
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  return (
    <section className="library-card" aria-labelledby="my-notes-title">
      <div className="library-heading">
        <div>
          <span className="preview-kicker">Study Repository</span>
          <h1 id="my-notes-title" tabIndex={-1}>
            My Saved Notes
          </h1>
          <p>Browse through all saved lecture summaries and study sheets.</p>
        </div>

        <button type="button" className="secondary-btn" onClick={resetWorkspace}>
          <Plus size={17} aria-hidden="true" /> Add New Lecture
        </button>
      </div>

      {/* Instant Search Bar */}
      {!notesLoading && !notesError && lectures.length > 0 && (
        <div className="library-search-bar">
          <Search size={18} color="var(--text-muted)" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search saved lectures by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search lectures"
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Status Notice */}
      {libraryNotice && (
        <p className="library-notice" role="status">
          <CircleCheck size={16} aria-hidden="true" />
          <span>{libraryNotice}</span>
        </p>
      )}

      {/* Loading State */}
      {notesLoading && (
        <div className="library-state" role="status">
          <LoaderCircle
            className="spin"
            size={32}
            color="var(--accent)"
            aria-hidden="true"
          />
          <h2>Loading your study library</h2>
          <p>Connecting to backend and fetching your saved lectures…</p>
        </div>
      )}

      {/* Error State */}
      {!notesLoading && notesError && (
        <div className="library-state error-state" role="alert">
          <h2>Couldn’t load your notes</h2>
          <p>{notesError}</p>
          <button type="button" className="secondary-btn" onClick={openMyNotes}>
            <RotateCcw size={16} /> Try again
          </button>
        </div>
      )}

      {/* Empty Library State */}
      {!notesLoading && !notesError && lectures.length === 0 && (
        <div className="library-state">
          <div className="empty-icon" aria-hidden="true">
            <FileText size={32} />
          </div>
          <h2>No saved notes yet</h2>
          <p>
            Generate notes from an audio recording or transcript, and they’ll be
            automatically preserved here.
          </p>
          <button
            type="button"
            className="generate-btn compact-btn"
            onClick={resetWorkspace}
          >
            <Plus size={18} aria-hidden="true" /> Generate your first notes
          </button>
        </div>
      )}

      {/* Filtered Empty State */}
      {!notesLoading &&
        !notesError &&
        lectures.length > 0 &&
        filteredLectures.length === 0 && (
          <div className="library-state">
            <Search size={32} color="var(--text-muted)" />
            <h2>No lectures match &quot;{searchQuery}&quot;</h2>
            <p>Try searching for a different keyword or clear the search filter.</p>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setSearchQuery("")}
            >
              Clear search
            </button>
          </div>
        )}

      {/* Lecture Cards Grid */}
      {!notesLoading && !notesError && filteredLectures.length > 0 && (
        <div className="lecture-grid">
          {filteredLectures.map((lecture) => {
            const isReady = isLectureReady(lecture);
            const isFailed = lecture.status === "failed";
            const isProcessing = !isReady && !isFailed;
            const isConfirming = confirmDeleteId === lecture.id;
            const isDeleting = deletingId === lecture.id;

            return (
              <div
                role="button"
                tabIndex={0}
                className="lecture-card"
                key={lecture.id}
                onClick={() => openSavedNote(lecture)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openSavedNote(lecture);
                  }
                }}
              >
                <div className="lecture-card-header">
                  <div className="lecture-card-icon">
                    <FileText size={20} aria-hidden="true" />
                  </div>
                  <div className="lecture-card-header-right">
                    <span className="lecture-card-date">
                      <Clock size={13} aria-hidden="true" />
                      {lecture.created_at
                        ? new Date(lecture.created_at).toLocaleDateString()
                        : "Saved lecture"}
                    </span>
                    {handleDeleteLecture && (
                      <button
                        type="button"
                        className="lecture-card-delete-btn"
                        aria-label={`Delete ${lecture.title || "lecture"}`}
                        title="Delete lecture and notes"
                        disabled={isDeleting}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(
                            isConfirming ? null : lecture.id
                          );
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
                <h3>{lecture.title || "Untitled Lecture"}</h3>

                {isConfirming ? (
                  <div
                    className="lecture-card-footer lecture-card-confirm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="confirm-label">Delete permanently?</span>
                    <div className="confirm-btns">
                      <button
                        type="button"
                        className="stitch-table-btn retry-btn"
                        disabled={isDeleting}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setDeletingId(lecture.id);
                          try {
                            await handleDeleteLecture(lecture);
                          } finally {
                            setDeletingId(null);
                            setConfirmDeleteId(null);
                          }
                        }}
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                      <button
                        type="button"
                        className="stitch-table-btn"
                        disabled={isDeleting}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : isProcessing ? (
                  <div className="lecture-card-footer lecture-card-status is-processing">
                    <LoaderCircle size={14} className="spin" aria-hidden="true" />
                    <span>Synthesizing...</span>
                  </div>
                ) : isFailed ? (
                  <div className="lecture-card-footer lecture-card-status is-failed">
                    <span>Failed</span>
                    <button
                      type="button"
                      className="stitch-table-btn retry-btn compact-retry-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRetryLecture?.(lecture.id, e);
                      }}
                    >
                      <RotateCcw size={12} aria-hidden="true" /> Retry
                    </button>
                  </div>
                ) : (
                  <div className="lecture-card-footer">
                    <span>Open Study Sheet</span>
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
