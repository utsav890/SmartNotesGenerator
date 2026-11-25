import { FileText, Filter, LoaderCircle, RotateCcw } from "lucide-react";

export default function RecentLecturesTable({
  lectures,
  filteredRecentLectures,
  statusFilter,
  setStatusFilter,
  subjectFilter,
  setSubjectFilter,
  readyCount,
  processingCount,
  failedCount,
  notesLoading,
  openSavedNote,
  formatDuration,
  formatDate,
  getSubject,
  recentLecturesSearch,
  handleRetryLecture,
}) {
  return (
    <section className="stitch-recent-section" aria-label="Recent Lectures">
      <div className="stitch-table-header-row">
        <div>
          <h3>Recent Lectures</h3>
          <p>Real-time lecture repository synced with your persistent database</p>
        </div>

        <div className="stitch-table-filters">
          <div className="stitch-filter-tabs">
            <button
              type="button"
              className={`stitch-filter-pill${statusFilter === "all" ? " active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All ({lectures.length})
            </button>
            <button
              type="button"
              className={`stitch-filter-pill${statusFilter === "ready" ? " active" : ""}`}
              onClick={() => setStatusFilter("ready")}
            >
              Notes Ready ({readyCount})
            </button>
            <button
              type="button"
              className={`stitch-filter-pill${statusFilter === "processing" ? " active" : ""}`}
              onClick={() => setStatusFilter("processing")}
            >
              Processing ({processingCount})
            </button>
            {failedCount > 0 && (
              <button
                type="button"
                className={`stitch-filter-pill${statusFilter === "failed" ? " active" : ""}`}
                onClick={() => setStatusFilter("failed")}
              >
                Failed ({failedCount})
              </button>
            )}
          </div>

          <div className="stitch-subject-dropdown-wrapper">
            <Filter size={14} />
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="stitch-select"
              aria-label="Filter by subject"
            >
              <option value="all">All Subjects</option>
              {Array.from(new Set(lectures.map((lec) => getSubject(lec))))
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b))
                .map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="stitch-table-card">
        {notesLoading ? (
          <div className="stitch-table-empty">
            <LoaderCircle className="spin" size={24} />
            <p>Loading lectures from database...</p>
          </div>
        ) : filteredRecentLectures.length === 0 ? (
          <div className="stitch-table-empty">
            <FileText size={32} color="var(--text-muted)" />
            <h4>No lectures found</h4>
            <p>
              {recentLecturesSearch || statusFilter !== "all" || subjectFilter !== "all"
                ? "No lectures match your current filters. Try resetting them."
                : "Upload audio or paste a transcript to generate your first study sheet."}
            </p>
          </div>
        ) : (
          <div className="stitch-table-scroll">
            <table className="stitch-table">
              <thead>
                <tr>
                  <th>Lecture Title</th>
                  <th>Subject</th>
                  <th>Duration</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecentLectures.map((lec) => {
                  const isReady = lec.has_notes || lec.notes || lec.status === "completed";
                  const isFailed = lec.status === "failed";
                  const subj = getSubject(lec);

                  return (
                    <tr key={lec.id}>
                      <td>
                        <div className="table-title-cell">
                          <div className="title-icon">
                            <FileText size={16} />
                          </div>
                          <span
                            className="title-text"
                            title={lec.title || "Untitled Lecture"}
                          >
                            {lec.title || "Untitled Lecture"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="stitch-subject-tag">{subj}</span>
                      </td>
                      <td className="stitch-mono-cell">
                        {formatDuration(lec.duration_seconds)}
                      </td>
                      <td>
                        <span className="stitch-date-cell">
                          {formatDate(lec.created_at)}
                        </span>
                      </td>
                      <td>
                        {isReady ? (
                          <span className="stitch-status-pill status-ready">
                            <span className="dot" />
                            Notes Ready
                          </span>
                        ) : isFailed ? (
                          <span className="stitch-status-pill status-failed">
                            <span className="dot" />
                            Failed
                          </span>
                        ) : (
                          <span className="stitch-status-pill status-processing">
                            <LoaderCircle size={12} className="spin" style={{ marginRight: 4 }} />
                            Synthesizing...
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="table-actions-cell">
                          {isReady ? (
                            <button
                              type="button"
                              className="stitch-table-btn"
                              onClick={() => openSavedNote(lec)}
                            >
                              View Notes
                            </button>
                          ) : isFailed ? (
                            <button
                              type="button"
                              className="stitch-table-btn retry-btn"
                              onClick={(e) => handleRetryLecture && handleRetryLecture(lec.id, e)}
                            >
                              <RotateCcw size={12} style={{ marginRight: 4 }} />
                              Retry
                            </button>
                          ) : (
                            <span
                              className="table-pending-text"
                              style={{
                                fontSize: "0.82rem",
                                color: "var(--text-muted)",
                                fontStyle: "italic",
                                whiteSpace: "nowrap"
                              }}
                            >
                              Synthesizing...
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
