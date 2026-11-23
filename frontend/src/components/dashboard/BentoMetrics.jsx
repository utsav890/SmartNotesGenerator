import { BookOpen, FileText, Clock, TrendingUp, Sparkles, Activity } from "lucide-react";

export default function BentoMetrics({
  totalLecturesCount,
  readyCount,
  readyPct,
  totalHoursText,
  stats,
}) {
  return (
    <section className="stitch-bento" aria-label="Study Metrics">
      <div className="stitch-bento-card">
        <div className="card-top">
          <span className="label">Total Lectures</span>
          <div className="icon-wrapper primary">
            <BookOpen size={18} />
          </div>
        </div>
        <div className="val">{totalLecturesCount}</div>
        <div className="trend">
          <TrendingUp size={14} />
          <span>{readyCount} processed successfully</span>
        </div>
      </div>

      <div className="stitch-bento-card">
        <div className="card-top">
          <span className="label">Notes Generated</span>
          <div className="icon-wrapper secondary">
            <FileText size={18} />
          </div>
        </div>
        <div className="val">{readyCount}</div>
        <div className="trend">
          <Sparkles size={14} />
          <span>{readyPct}% completion rate</span>
        </div>
      </div>

      <div className="stitch-bento-card">
        <div className="card-top">
          <span className="label">Study Time Indexed</span>
          <div className="icon-wrapper accent">
            <Clock size={18} />
          </div>
        </div>
        <div className="val">{totalHoursText}</div>
        <div className="trend">
          <Activity size={14} />
          <span>
            {stats?.total_words_indexed
              ? `${stats.total_words_indexed.toLocaleString()} words indexed`
              : "Audio & text indexed"}
          </span>
        </div>
      </div>
    </section>
  );
}
