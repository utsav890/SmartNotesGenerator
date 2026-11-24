import {
  FileAudio,
  FileText,
  Video,
  Upload,
  CircleX,
  LoaderCircle,
  Sparkles
} from "lucide-react";

export default function WorkspaceStudio({
  inputTab,
  setInputTab,
  file,
  setFile,
  transcript,
  setTranscript,
  youtubeUrl,
  setYoutubeUrl,
  isDragging,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  fileInputRef,
  loadSample,
  error,
  setError,
  loading,
  handleGenerate,
  setNotes,
  setStatus,
}) {
  return (
    <section className="stitch-workspace-wrapper">
      <div className="stitch-workspace-header">
        <div>
          <h2>Lecture Ingestion Studio</h2>
          <p>Select your ingestion method to generate a structured study sheet</p>
        </div>
        <div className="stitch-tab-pills" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={inputTab === "audio"}
            className={`stitch-tab-pill${inputTab === "audio" ? " active" : ""}`}
            onClick={() => setInputTab("audio")}
            disabled={loading}
          >
            <FileAudio size={16} />
            Upload Audio
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={inputTab === "transcript"}
            className={`stitch-tab-pill${inputTab === "transcript" ? " active" : ""}`}
            onClick={() => setInputTab("transcript")}
            disabled={loading}
          >
            <FileText size={16} />
            Paste Transcript
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={inputTab === "youtube"}
            className={`stitch-tab-pill${inputTab === "youtube" ? " active" : ""}`}
            onClick={() => setInputTab("youtube")}
            disabled={loading}
          >
            <Video size={16} />
            YouTube Link
          </button>
        </div>
      </div>

      {/* Tab 1: Audio Upload */}
      {inputTab === "audio" && (
        <div className="stitch-tab-content">
          <div
            className={`stitch-dropzone-box${file ? " has-file" : ""}${
              isDragging ? " is-dragging" : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a,.mp4,.ogg,.webm,.flac,.aac,audio/*,video/mp4"
              disabled={loading}
              aria-label="Choose lecture audio or video file"
              style={{ display: "none" }}
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setTranscript("");
                setError("");
                setNotes("");
                setStatus("");
              }}
            />

            {file ? (
              <div
                className="stitch-file-preview-card"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="preview-left">
                  <div className="file-icon-badge">
                    <FileAudio size={24} />
                  </div>
                  <div className="file-info">
                    <strong className="file-name">{file.name}</strong>
                    <span className="file-subtext">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready for Whisper transcription
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="stitch-remove-file-btn"
                  disabled={loading}
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="stitch-dropzone-idle">
                <div className="stitch-upload-icon-circle">
                  <Upload size={28} />
                </div>
                <h4>Drag &amp; drop your lecture recording here</h4>
                <p>Supports MP3, WAV, M4A, OGG, WEBM up to 50 MB</p>
                <span className="stitch-browse-btn">Browse files</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Paste Transcript */}
      {inputTab === "transcript" && (
        <div className="stitch-tab-content">
          <div className="stitch-transcript-box">
            <div className="transcript-box-header">
              <label htmlFor="stitch-transcript-input">
                Lecture Transcript Content
              </label>
              <div className="sample-chips">
                <span className="sample-label">Load sample:</span>
                <button
                  type="button"
                  className="sample-chip-btn"
                  onClick={() => loadSample("ml")}
                  disabled={loading}
                >
                  AI / Machine Learning
                </button>
                <button
                  type="button"
                  className="sample-chip-btn"
                  onClick={() => loadSample("bio")}
                  disabled={loading}
                >
                  Cell Biology
                </button>
              </div>
            </div>

            <textarea
              id="stitch-transcript-input"
              className="stitch-textarea"
              placeholder="Paste lecture transcription text, notes, or classroom dialogue here..."
              value={transcript}
              disabled={loading}
              onChange={(e) => {
                setTranscript(e.target.value);
                setFile(null);
                setError("");
                setNotes("");
                setStatus("");
              }}
            />

            <div className="stitch-textarea-footer">
              <span>
                {transcript.trim()
                  ? `${transcript.trim().split(/\s+/).length} words`
                  : "0 words"}
              </span>
              <span>{transcript.length} characters</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: YouTube Link */}
      {inputTab === "youtube" && (
        <div className="stitch-tab-content">
          <div className="stitch-youtube-box">
            <div className="youtube-header">
              <Video size={22} color="var(--stitch-primary)" />
              <div>
                <h4>Import Lecture from YouTube URL</h4>
                <p>
                  Paste a YouTube video link to extract audio &amp; generate study
                  notes
                </p>
              </div>
            </div>
            <div className="youtube-input-group">
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={loading}
                className="stitch-input"
              />
            </div>
            <div className="youtube-notice">
              <Sparkles size={14} />
              <span>
                Direct YouTube URL processing runs through Cloud Ingestion. For
                instant processing today, upload audio or paste video transcript
                above.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div role="alert" className="stitch-error-banner">
          <CircleX size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Generate Button Row */}
      <div className="stitch-workspace-actions">
        <button
          type="button"
          className="stitch-primary-btn"
          onClick={handleGenerate}
          disabled={
            loading ||
            (inputTab === "youtube"
              ? !youtubeUrl.trim()
              : !file && !transcript.trim())
          }
        >
          {loading ? (
            <>
              <LoaderCircle className="spin" size={18} />
              <span>Synthesizing Study Notes…</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>Generate Study Notes</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
