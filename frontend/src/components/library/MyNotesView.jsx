import {
  Plus,
  Search,
  X,
  CircleCheck,
  LoaderCircle,
  RotateCcw,
  FileText,
  Clock,
  ArrowUpRight
} from "lucide-react";

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
}) {
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
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Status Notice */}
      {libraryNotice && (
        <p className="library-notice" role="status">
          <CircleCheck
            size={16}
            style={{ verticalAlign: "middle", marginRight: "6px" }}
          />
          {libraryNotice}
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
          {filteredLectures.map((lecture) => (
            <button
              type="button"
              className="lecture-card"
              key={lecture.id}
              onClick={() => openSavedNote(lecture)}
            >
              <div className="lecture-card-header">
                <div className="lecture-card-icon">
                  <FileText size={20} aria-hidden="true" />
                </div>
                <span className="lecture-card-date">
                  <Clock size={13} aria-hidden="true" />
                  {lecture.created_at
                    ? new Date(lecture.created_at).toLocaleDateString()
                    : "Saved lecture"}
                </span>
              </div>
              <h3>{lecture.title || "Untitled Lecture"}</h3>
              <div className="lecture-card-footer">
                <span>Open Study Sheet</span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
