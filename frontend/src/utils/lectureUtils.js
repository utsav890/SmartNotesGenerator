export const MAX_MEDIA_FILE_SIZE_BYTES = 300 * 1024 * 1024;
export const ALLOWED_MEDIA_EXTENSIONS = [".mp3", ".wav", ".m4a", ".mp4", ".ogg", ".webm", ".flac", ".aac"];

export function validateMediaFile(file) {
  if (!file) return "Please select an audio or MP4 file first.";
  const ext = `.${(file.name.split(".").pop() || "").toLowerCase()}`;
  if (!ALLOWED_MEDIA_EXTENSIONS.includes(ext)) {
    return "Unsupported format. Please upload MP3, WAV, M4A, MP4, OGG, WEBM, FLAC, or AAC.";
  }
  if (file.size === 0) return "The selected file is empty.";
  if (file.size > MAX_MEDIA_FILE_SIZE_BYTES) {
    return "File size must not exceed 300 MB.";
  }
  return "";
}

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : "http://127.0.0.1:8000";

export const SAMPLE_TRANSCRIPTS = {
  ml: {
    label: "AI & Neural Networks",
    title: "Introduction to Artificial Neural Networks and Backpropagation",
    text: `Welcome everyone to Lecture 4 on Neural Networks and Deep Learning. Today we are exploring the architecture of artificial neural networks inspired by biological neurons in the human brain.

An artificial neuron, or perceptron, receives multiple inputs x1, x2, up to xn. Each input is multiplied by an associated weight w1, w2, through wn. The weighted sum of all inputs is calculated, and a bias term b is added. Mathematically, z equals the summation of wi times xi plus b.

This linear combination is then passed through a non-linear activation function. Without non-linear activation functions like ReLU, Sigmoid, or GELU, a deep network of multiple layers would simply collapse into a single linear transformation, regardless of how many layers it contains. The Rectified Linear Unit, or ReLU, defined as f(x) = max(0, x), is particularly popular because it avoids the vanishing gradient problem during backpropagation and enables faster convergence.

Next, let's understand how a network learns: gradient descent and backpropagation. During the forward pass, predictions are generated, and a loss function measures the discrepancy between predicted output and true target labels. During the backward pass, the chain rule of calculus is applied backwards through every layer to compute the partial derivative of the loss with respect to each weight. These gradients are then used by optimizers such as Adam or Stochastic Gradient Descent to adjust the weights and minimize prediction error.`
  },
  bio: {
    label: "Cellular Biology",
    title: "Cellular Respiration and ATP Synthesis",
    text: `Good morning class. Today we will break down Cellular Respiration, the fundamental biochemical process through which eukaryotic cells convert glucose and oxygen into usable energy in the form of ATP.

Cellular respiration consists of three fundamental stages: Glycolysis, the Citric Acid Cycle (also known as the Krebs cycle), and Oxidative Phosphorylation.

Stage one is Glycolysis, which takes place in the cytoplasm of the cell and does not require oxygen. In glycolysis, a single six-carbon glucose molecule is broken down into two three-carbon molecules of pyruvate, yielding a net production of 2 ATP and 2 NADH molecules.

Stage two occurs inside the mitochondrial matrix: the Krebs cycle. Here, pyruvate is converted into Acetyl-CoA, which enters an enzymatic cycle that generates additional NADH and FADH2 high-energy electron carriers, along with 2 ATP molecules and releasing carbon dioxide as a metabolic byproduct.

Finally, the grand finale of energy production is Oxidative Phosphorylation along the inner mitochondrial membrane. The electron transport chain passes electrons down protein complexes, pumping protons across the membrane to create a steep electrochemical gradient. ATP Synthase, an extraordinary rotary molecular motor, harnesses this proton motive force to synthesize approximately 28 to 32 ATP molecules per glucose molecule.`
  }
};

export const PROCESSING_STAGES = [
  { id: 1, name: "Audio Uploaded" },
  { id: 2, name: "Gemini Audio Transcription" },
  { id: 3, name: "Transcript Cleaning" },
  { id: 4, name: "Topic Segmentation" },
  { id: 5, name: "Embedding Generation" },
  { id: 6, name: "Qdrant Storage" },
  { id: 7, name: "Gemini Notes Generation" },
  { id: 8, name: "Coverage Validation" },
  { id: 9, name: "Completed" }
];

const STAGE_RULES = [
  [["upload"], 1],
  [["audio", "transcrib"], 2],
  [["clean"], 3],
  [["segment"], 4],
  [["embed"], 5],
  [["qdrant", "vector"], 6],
  [["gemini", "generat"], 7],
  [["cover", "validat", "loading"], 8],
  [["ready", "success"], 9]
];

export function getActiveStep(statusMsg) {
  if (!statusMsg) return 1;
  const lower = statusMsg.toLowerCase();
  const match = STAGE_RULES.find(([keywords]) => keywords.some((k) => lower.includes(k)));
  return match ? match[1] : 7;
}

const SUBJECT_RULES = [
  [["dbms", "database", "sql", "concurrency"], "DBMS"],
  [["ai", "search", "a*", "intelligence"], "Artificial Intelligence"],
  [["coa", "architecture", "memory", "hierarchy"], "Computer Architecture"],
  [["os", "operating", "thread", "cpu", "scheduling"], "Operating Systems"],
  [["ml", "gradient", "machine learning", "descent"], "Machine Learning"],
  [["network", "tcp", "congestion", "cn"], "Computer Networks"],
  [["se", "agile", "scrum", "software"], "Software Engineering"],
  [["bio", "cell", "atp", "respiration"], "Cellular Biology"]
];

export function getSubject(lec) {
  const title = (lec?.title || "").toLowerCase();
  const match = SUBJECT_RULES.find(([keywords]) => keywords.some((k) => title.includes(k)));
  return match ? match[1] : "Computer Science";
}

export function isLectureReady(lecture) {
  return Boolean(lecture && (lecture.has_notes || lecture.status === "completed"));
}

export function isLectureProcessing(lecture) {
  return Boolean(
    lecture &&
      (lecture.status === "processing" ||
        lecture.status === "uploaded" ||
        lecture.status === "transcribed")
  );
}

export function formatDuration(sec) {
  if (sec === null || sec === undefined || sec === "" || isNaN(Number(sec)) || Number(sec) <= 0) {
    return "—";
  }
  const totalSec = Math.floor(Number(sec));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? "—"
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

export function buildNotesExportText(notes, { markdown = false } = {}) {
  if (!notes) return "";
  const sections = (notes.sections || []).flatMap((section, idx) => {
    const titleLine = markdown
      ? `### ${idx + 1}. ${section.heading || `Section ${idx + 1}`}`
      : `[${idx + 1}] ${section.heading || `Section ${idx + 1}`}`;
    const bulletLines =
      Array.isArray(section.bullets) && section.bullets.length > 0
        ? section.bullets.map((b) => {
            if (markdown) {
              return b.label ? `- **${b.label}:** ${b.detail}` : `- ${b.detail}`;
            }
            return b.label ? `• ${b.label}: ${b.detail}` : `• ${b.detail}`;
          })
        : [section.content || ""];
    const bodyLines = [...(section.intro ? [section.intro] : []), ...bulletLines];
    return markdown ? [titleLine, ...bodyLines, ""] : ["", titleLine, ...bodyLines];
  });
  const keyPoints = (notes.key_points || []).map((k) => `${markdown ? "-" : "•"} ${k}`);
  const revision = (notes.revision_questions || []).map((q, idx) => {
    const qText = typeof q === "object" ? q.question : q;
    const aText =
      typeof q === "object" && q.answer
        ? markdown
          ? `\n*Model Answer:* ${q.answer}`
          : `\nModel Answer: ${q.answer}`
        : "";
    return `${idx + 1}. ${qText}${aText}`;
  });

  if (markdown) {
    return [
      `# ${notes.title}`,
      "",
      `> ${notes.summary}`,
      "",
      "## Sections",
      ...sections,
      ...(keyPoints.length ? ["", "## Key Takeaways", ...keyPoints] : []),
      ...(revision.length ? ["", "## Revision Questions", ...revision] : [])
    ].join("\n");
  }

  return [
    notes.title,
    "=".repeat(notes.title.length),
    "",
    "EXECUTIVE SUMMARY",
    notes.summary,
    "",
    "STRUCTURED SECTIONS",
    ...sections,
    ...(keyPoints.length ? ["", "KEY TAKEAWAYS & CONCEPTS", ...keyPoints] : []),
    ...(revision.length ? ["", "CHECK YOUR UNDERSTANDING (REVISION QUESTIONS)", ...revision] : [])
  ].join("\n");
}

export async function apiRequest(url, options = {}) {
  const token = localStorage.getItem("smartnotes_token");
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
    credentials: "include"
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !url.includes("/api/auth/")) {
      localStorage.removeItem("smartnotes_token");
      const currentPath = window.location.pathname;
      if (currentPath !== "/login") {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    }
    throw new Error(data.detail || data.message || `Request failed with status ${response.status}`);
  }

  return data;
}
