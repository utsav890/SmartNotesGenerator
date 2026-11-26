
import json
import logging
import os
import threading
import time
import traceback
from contextlib import asynccontextmanager
from ipaddress import ip_address
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import (
    FastAPI,
    Depends,
    Request,
    UploadFile,
    File,
    HTTPException,
    status,
    BackgroundTasks
)
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware


from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.flashcard import generate_flashcards
from app.database import Base, engine, SessionLocal, get_db
from app.quiz import generate_quiz
from app.transcription import transcribe_audio
from app.notes_generator import answer_question, generate_notes
from app.pipeline import process_transcript
from app.rag import retrieve_context
from app.qdrant_service import delete_lecture_chunks
from app.models import (
    User,
    Lecture,
    Transcript,
    Note,
    LectureMessage,
    Quiz,
    QuizQuestion,
)
from app.auth import (
    router as auth_router,
    get_current_user,
    get_current_user_optional,
    hash_password,
    check_rate_limit,
    require_admin,
    get_and_validate_jwt_secret
)
from app.admin import router as admin_router


logger = logging.getLogger(__name__)

# --------------------------------------------------
# FASTAPI APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="Smart Notes Generator",
    description="Generate and save structured lecture notes",
    version="1.0.0"
)


def seed_demo_lectures_if_needed(db: Session, student_user: User):
    """Seed comprehensive starter lectures and study notes for the demo student user."""
    has_lecture = db.query(Lecture.id).filter(Lecture.user_id == student_user.id).first()
    if has_lecture:
        return

    # Seed Lecture 1: Artificial Neural Networks
    lec1 = Lecture(
        user_id=student_user.id,
        title="Introduction to Artificial Neural Networks and Backpropagation",
        status="completed",
        audio_format="Audio MP3",
        file_size=42400000
    )
    db.add(lec1)
    db.flush()

    note1_content = {
        "title": "Introduction to Artificial Neural Networks and Backpropagation",
        "summary": "This foundational lecture explores the architecture, mathematical formulations, and training dynamics of artificial neural networks. It covers perceptron mathematics, the necessity of non-linear activation functions (such as ReLU and Sigmoid) to prevent architectural collapse, and the mechanics of gradient descent optimized via backpropagation.",
        "sections": [
            {
                "heading": "Architectural Foundation of Artificial Perceptrons",
                "content": "An artificial neuron operates by calculating the weighted sum of its inputs: z = sum(w_i * x_i) + b. Each synaptic weight adjusts the relative influence of input features, while the bias parameter shifts the activation threshold independently of inputs. This mimics biological dendritic inputs and axonal firing in neuroscience."
            },
            {
                "heading": "Role of Non-Linear Activation Functions & ReLU",
                "content": "Without non-linear activations, multi-layer networks collapse mathematically into a single linear matrix multiplication regardless of depth. Modern architectures favor the Rectified Linear Unit (ReLU), f(x) = max(0, x), which computes efficiently and maintains non-saturating positive gradients, effectively preventing vanishing gradients during training."
            },
            {
                "heading": "Optimization via Gradient Descent & Backpropagation",
                "content": "Learning occurs iteratively through forward passes and backward error propagation. By applying the multivariate chain rule backwards through computational graphs, optimizers such as Adam and SGD compute partial derivatives of loss with respect to each weight, incrementally adjusting parameters to minimize objective loss."
            }
        ],
        "key_points": [
            "Perceptrons compute linear combinations (z = sum(w*x) + b) before applying non-linear activation.",
            "Non-linear activations prevent deep architectures from collapsing into trivial single-layer linear models.",
            "ReLU (f(x) = max(0, x)) preserves gradient flow and mitigates vanishing gradient problems.",
            "Backpropagation utilizes the calculus chain rule to systematically compute loss gradients across all layers.",
            "Gradient descent iteratively updates parameters in the opposite direction of the gradient vector."
        ],
        "glossary": [
            {"term": "Perceptron", "definition": "The fundamental mathematical building block of artificial neural networks that computes weighted input sums and applies an activation function."},
            {"term": "ReLU", "definition": "Rectified Linear Unit; an activation function defined as f(x) = max(0, x), widely used for efficient training and gradient propagation."},
            {"term": "Backpropagation", "definition": "Algorithm computing loss gradients with respect to every model parameter by backward application of the chain rule."},
            {"term": "Vanishing Gradient", "definition": "Pathology in deep networks where gradient signals shrink exponentially when backpropagating through saturating non-linearities."}
        ],
        "revision_questions": [
            {
                "question": "Why do deep neural networks require non-linear activation functions?",
                "answer": "Without non-linear activation functions, consecutive layers merely compute linear combinations of previous layers (matrix multiplications). Since the composition of linear functions is always linear, an N-layer linear network is mathematically equivalent to a single-layer model, completely losing the ability to approximate complex non-linear functions."
            },
            {
                "question": "How does the Rectified Linear Unit (ReLU) help resolve the vanishing gradient problem?",
                "answer": "Sigmoid and Tanh activations saturate at extreme values, causing their derivatives to approach zero and resulting in tiny gradient updates in earlier layers. In contrast, ReLU has a constant derivative of 1 for all positive inputs, allowing gradient signals to flow unimpeded through dozens of layers during backpropagation."
            },
            {
                "question": "What is the role of the bias parameter in an artificial neuron?",
                "answer": "The bias term 'b' allows the activation function to shift horizontally along the axis, decoupling the neuron's activation threshold from the zero-origin. Without a bias, every activation curve would be anchored at the origin when inputs are zero, severely restricting function fitting flexibility."
            },
            {
                "question": "Explain how the chain rule of calculus is utilized in backpropagation.",
                "answer": "Backpropagation uses the chain rule to decompose the derivative of the global loss with respect to intermediate weights into localized products of partial derivatives across each layer. This allows errors computed at the output to be sequentially propagated back through computational graph nodes."
            },
            {
                "question": "What differentiates forward propagation from backward propagation?",
                "answer": "Forward propagation feeds raw feature inputs through sequential layers and activations to generate a model prediction and evaluate loss. Backward propagation reverses the direction: it uses the calculated loss to compute analytical gradients with respect to all internal parameters to guide weight updates."
            }
        ]
    }

    db.add(Note(
        lecture_id=lec1.id,
        title=lec1.title,
        summary=note1_content["summary"],
        content=note1_content,
        version=1
    ))

    # Seed Lecture 2: Cellular Respiration
    lec2 = Lecture(
        user_id=student_user.id,
        title="Cellular Respiration and ATP Synthesis",
        status="completed",
        audio_format="Audio MP3",
        file_size=38200000
    )
    db.add(lec2)
    db.flush()

    note2_content = {
        "title": "Cellular Respiration and ATP Synthesis",
        "summary": "This lecture provides a comprehensive biochemical analysis of cellular respiration in eukaryotic cells. It details the step-by-step conversion of glucose and oxygen into usable metabolic energy across Glycolysis, the Citric Acid (Krebs) Cycle, and Oxidative Phosphorylation powered by the mitochondrial electron transport chain.",
        "sections": [
            {
                "heading": "Glycolysis: Cytoplasmic Anaerobic Breakdown",
                "content": "Glycolysis takes place in the cytoplasm and requires no oxygen. A single 6-carbon glucose molecule is enzymatically cleaved into two 3-carbon pyruvate molecules. This investment and payoff phase yields a net production of 2 ATP (via substrate-level phosphorylation) and 2 high-energy NADH electron carriers."
            },
            {
                "heading": "The Citric Acid Cycle: Mitochondrial Matrix Decarboxylation",
                "content": "Pyruvate enters the mitochondrial matrix and undergoes oxidative decarboxylation to form Acetyl-CoA. Acetyl-CoA enters the Citric Acid Cycle, cycling through citrate, ketoglutarate, and oxaloacetate, producing 2 ATP, 6 NADH, 2 FADH2, and releasing carbon dioxide as a metabolic byproduct."
            },
            {
                "heading": "Oxidative Phosphorylation & ATP Synthase",
                "content": "Electrons from NADH and FADH2 traverse protein complexes I through IV in the inner mitochondrial membrane, pumping protons into the intermembrane space to generate a powerful electrochemical proton motive force. The rotary motor protein ATP Synthase channels these protons back into the matrix, generating 28 to 32 ATP molecules per glucose molecule."
            }
        ],
        "key_points": [
            "Cellular respiration converts glucose into ATP through three interconnected metabolic stages.",
            "Glycolysis occurs in the cytoplasm anaerobically, producing 2 net ATP and 2 NADH.",
            "The Krebs Cycle operates in the mitochondrial matrix, oxidizing Acetyl-CoA and releasing CO2.",
            "Oxidative Phosphorylation leverages the electron transport chain to establish a proton motive force.",
            "ATP Synthase functions as a molecular rotary generator, synthesizing up to 32 ATP per glucose."
        ],
        "glossary": [
            {"term": "ATP", "definition": "Adenosine Triphosphate; the universal molecular currency of intracellular energy transfer."},
            {"term": "Glycolysis", "definition": "The anaerobic enzymatic breakdown of glucose into pyruvate in the cellular cytoplasm."},
            {"term": "Krebs Cycle", "definition": "A series of chemical reactions in mitochondria that harvest high-energy electrons via NADH and FADH2."},
            {"term": "ATP Synthase", "definition": "A rotary enzyme embedded in the inner mitochondrial membrane that synthesizes ATP from ADP and inorganic phosphate."}
        ],
        "revision_questions": [
            {
                "question": "What is the net yield of ATP and electron carriers from glycolysis alone?",
                "answer": "Glycolysis uses 2 ATP during its energy investment phase and produces 4 ATP in its payoff phase, resulting in a net yield of 2 ATP (via substrate-level phosphorylation) and 2 NADH molecules per molecule of glucose."
            },
            {
                "question": "Where do each of the three major stages of cellular respiration take place in eukaryotic cells?",
                "answer": "Glycolysis takes place in the cellular cytoplasm. The Citric Acid (Krebs) Cycle occurs inside the mitochondrial matrix. Oxidative Phosphorylation (the electron transport chain and ATP Synthase) is situated on the inner mitochondrial membrane."
            },
            {
                "question": "How does the electron transport chain create the proton motive force?",
                "answer": "As high-energy electrons from NADH and FADH2 pass sequentially through complexes I, III, and IV, the energy released from these redox reactions is used to pump hydrogen ions (protons) out of the mitochondrial matrix into the intermembrane space, creating a steep chemical and electrical gradient."
            },
            {
                "question": "Why is oxygen required as the final electron acceptor in aerobic respiration?",
                "answer": "Oxygen has high electronegativity and sits at the terminus of the electron transport chain. It binds free electrons and protons to form water (H2O). Without oxygen, electron carriers back up, proton pumping ceases, and the cell is forced into anaerobic fermentation with vastly lower ATP yield."
            },
            {
                "question": "What role does ATP Synthase play during oxidative phosphorylation?",
                "answer": "ATP Synthase acts as a molecular turbine. As protons naturally flow down their concentration gradient from the intermembrane space back into the matrix through ATP Synthase, the mechanical rotation drives the catalytic phosphorylation of ADP and inorganic phosphate into ATP."
            }
        ]
    }

    db.add(Note(
        lecture_id=lec2.id,
        title=lec2.title,
        summary=note2_content["summary"],
        content=note2_content,
        version=1
    ))


def ensure_lecture_schema_columns(target_engine):
    """Ensure error_message and updated_at columns exist on lectures table."""
    try:
        from sqlalchemy import inspect
        inspector = inspect(target_engine)
        if "lectures" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("lectures")]
            with target_engine.connect() as conn:
                if "error_message" not in columns:
                    conn.execute(text("ALTER TABLE lectures ADD COLUMN error_message TEXT"))
                    conn.commit()
                    logger.info("Added error_message column to lectures table.")
                if "updated_at" not in columns:
                    conn.execute(text("ALTER TABLE lectures ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                    conn.commit()
                    logger.info("Added updated_at column to lectures table.")
    except Exception as col_err:
        logger.warning(f"Lecture schema column check notice: {col_err}")


def recover_stale_processing_lectures(db: Session, max_age_minutes: int = 2):
    """Mark any stale in-progress lectures older than max_age_minutes as failed."""
    try:
        from datetime import datetime, timedelta
        cutoff = datetime.utcnow() - timedelta(minutes=max_age_minutes)
        stale_lectures = db.query(Lecture).filter(
            Lecture.status.in_(["processing", "uploaded", "transcribed"]),
            Lecture.created_at <= cutoff
        ).all()
        for lec in stale_lectures:
            # Never mark failed if a Note was already persisted
            has_note = db.query(Note.id).filter(Note.lecture_id == lec.id).first() is not None
            if has_note:
                setattr(lec, "status", "completed")
                setattr(lec, "error_message", None)
            else:
                setattr(lec, "status", "failed")
                setattr(lec, "error_message", "Processing timed out or server restarted. Click Retry to run again.")
        if stale_lectures:
            db.commit()
            logger.info("Recovered %d stale lecture(s).", len(stale_lectures))
    except Exception as err:
        logger.warning(f"Stale lecture recovery check notice: {err}")


def _run_background_database_init():
    """Ensure database schema is created and guard account seeding in a non-blocking thread."""
    try:
        logger.info("Initializing database schema...")
        Base.metadata.create_all(bind=engine)
        ensure_lecture_schema_columns(engine)

        with SessionLocal() as recovery_db:
            recover_stale_processing_lectures(recovery_db)

        seed_demo = os.getenv("ENABLE_DEMO_SEEDING", "true").lower() == "true"

        # Seed default accounts for instant evaluation and demo access
        if seed_demo:
            with SessionLocal() as db:
                if not db.query(User).filter(User.email == "admin.super@smartnotes.ai").first():
                    admin_user = User(
                        full_name="Super Admin",
                        email="admin.super@smartnotes.ai",
                        password_hash=hash_password("Admin#P@ssword2026!"),
                        role="admin",
                        is_verified=True,
                        is_active=True
                    )
                    db.add(admin_user)
                student_user = db.query(User).filter(User.email == "regular.student@university.edu").first()
                if not student_user:
                    student_user = User(
                        full_name="Regular Student",
                        email="regular.student@university.edu",
                        password_hash=hash_password("Std#P@ssword2026!"),
                        role="user",
                        is_verified=True,
                        is_active=True
                    )
                    db.add(student_user)
                    db.flush()
                try:
                    seed_demo_lectures_if_needed(db, student_user)
                    db.commit()
                    logger.info("Verified / initialized default demo accounts and starter notes.")
                except Exception as seed_err:
                    logger.warning(f"Demo lecture seeding notice: {seed_err}")
                    db.rollback()
    except Exception as exc:
        logger.warning(f"Database background init notice: {exc}")


def on_startup():
    """Validate security secrets immediately and launch background database schema initialization."""
    get_and_validate_jwt_secret()

    # Offload blocking database operations to background daemon thread so Uvicorn binds port immediately
    init_thread = threading.Thread(target=_run_background_database_init, daemon=True)
    init_thread.start()


@asynccontextmanager
async def lifespan(app: FastAPI):
    on_startup()
    yield


app.router.lifespan_context = lifespan

# --------------------------------------------------
# CORS CONFIGURATION
# --------------------------------------------------
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# INCLUDE AUTHENTICATION & ADMIN ROUTERS
# --------------------------------------------------
app.include_router(auth_router)
app.include_router(admin_router)

@app.middleware("http")
async def apply_owasp_security_headers(request: Request, call_next):
    """Enforce defense-in-depth OWASP HTTP security response headers."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if os.getenv("ENVIRONMENT", "development").lower() == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


if os.getenv("ENVIRONMENT", "development") == "development":

    @app.middleware("http")
    async def restrict_to_loopback(request: Request, call_next):
        client_host = request.client.host if request.client else ""

        if client_host in ("testclient", "localhost", "127.0.0.1", "::1"):
            is_local_client = True
        else:
            try:
                is_local_client = ip_address(client_host).is_loopback
            except ValueError:
                is_local_client = False

        if not is_local_client:
            return JSONResponse(
                status_code=403,
                content={
                    "detail": "This API is available from this computer only."
                }
            )

        return await call_next(request)


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

# Resolve static directory candidates for frontend SPA serving
_static_candidates = [
    BASE_DIR / "static",
    BASE_DIR.parent / "frontend" / "dist",
    BASE_DIR / "frontend" / "dist",
    Path("/app/static"),
    BASE_DIR / "dist",
]
STATIC_DIR = next((p for p in _static_candidates if p.is_dir() and (p / "index.html").is_file()), None)

# Mount /assets if static build exists
if STATIC_DIR:
    _assets_dir = STATIC_DIR / "assets"
    if _assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")

UPLOAD_DIR = BASE_DIR / "data"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {
    ".mp3",
    ".wav",
    ".m4a",
    ".mp4",
    ".ogg",
    ".webm",
    ".flac",
    ".aac",
}

MAX_FILE_SIZE = 50 * 1024 * 1024


def validate_audio_magic_bytes(contents: bytes, extension: str) -> bool:
    """Validate file binary signature against declared audio format to block disguised files."""
    if len(contents) < 4:
        return False
    ext = extension.lower()
    if ext == ".mp3":
        # ID3 tag or MPEG sync header
        return contents[:3] == b"ID3" or (contents[0] == 0xFF and (contents[1] & 0xE0) == 0xE0)
    elif ext == ".wav":
        # RIFF....WAVE
        return len(contents) >= 12 and contents[:4] == b"RIFF" and contents[8:12] == b"WAVE"
    elif ext in (".m4a", ".mp4"):
        return len(contents) >= 8 and (b"ftyp" in contents[:32] or contents[4:8] in (b"ftyp", b"moov", b"mdat", b"wide"))
    elif ext in (".ogg", ".opus"):
        return contents[:4] == b"OggS"
    elif ext == ".webm":
        return contents[:4] == b"\x1a\x45\xdf\xa3"
    elif ext == ".flac":
        return contents[:4] == b"fLaC"
    elif ext == ".aac":
        return contents[:2] == b"\xff\xf1" or contents[:2] == b"\xff\xf9"
    return False


# Request Models
class LectureRequest(BaseModel):
    title: str


class NotesRequest(BaseModel):
    transcript: str


class LectureQuestionRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)


def get_user_lecture(lecture_id: int, user: User, db: Session) -> Lecture:
    """Validate that lecture exists and belongs to the authenticated user."""
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lecture not found")
    if lecture.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this lecture."
        )
    return lecture


def _get_latest_note(db: Session, lecture_id: int) -> Optional[Note]:
    return (
        db.query(Note)
        .filter(Note.lecture_id == lecture_id)
        .order_by(Note.version.desc(), Note.id.desc())
        .first()
    )


def _mark_lecture_failed(lecture_id: int, error_message: str) -> None:
    """Persist failed lecture status in an isolated session after rollback."""
    try:
        with SessionLocal() as err_db:
            lec = err_db.query(Lecture).filter(Lecture.id == lecture_id).first()
            if lec:
                lec.status = "failed"
                lec.error_message = error_message
                err_db.commit()
    except Exception as update_err:
        logger.error("Could not record failed status for lecture %d: %s", lecture_id, update_err)


def _combine_segment_notes(title: str, pipeline_result: dict) -> dict:
    """Merge multi-segment P_119 note outputs while deduplicating glossary terms and questions."""
    generated = {
        "title": title,
        "summary": "",
        "sections": [],
        "key_points": [],
        "glossary": [],
        "revision_questions": [],
        "pipeline": {
            "segments": pipeline_result.get("segments", []),
            "coverage": pipeline_result.get("coverage", {}),
        },
    }
    seen_glossary_terms: set[str] = set()
    seen_questions: set[str] = set()

    for item in pipeline_result.get("notes", []):
        notes = item.get("notes", {})
        if not isinstance(notes, dict):
            continue
        if not generated["summary"]:
            generated["summary"] = notes.get("summary", "")
        if isinstance(notes.get("sections"), list):
            generated["sections"].extend(notes["sections"])
        if isinstance(notes.get("key_points"), list):
            generated["key_points"].extend(notes["key_points"])

        for glossary_item in notes.get("glossary", []) if isinstance(notes.get("glossary"), list) else []:
            if not isinstance(glossary_item, dict):
                continue
            term = str(glossary_item.get("term", "")).strip()
            if term and term.lower() not in seen_glossary_terms:
                generated["glossary"].append(glossary_item)
                seen_glossary_terms.add(term.lower())

        for q_item in notes.get("revision_questions", []) if isinstance(notes.get("revision_questions"), list) else []:
            if isinstance(q_item, dict):
                qt = str(q_item.get("question", "")).strip()
                if qt and qt.lower() not in seen_questions:
                    generated["revision_questions"].append(q_item)
                    seen_questions.add(qt.lower())
            else:
                qt = str(q_item).strip()
                if qt and qt.lower() not in seen_questions:
                    generated["revision_questions"].append({
                        "question": qt,
                        "answer": "Refer to the comprehensive lecture notes above for the detailed explanation and analysis.",
                    })
                    seen_questions.add(qt.lower())

    return generated


def _save_generated_notes(db: Session, lecture: Lecture, transcript_text: str) -> tuple[dict, Note]:
    """Run P_119 synthesis on transcript_text and persist a versioned Note record."""
    result = process_transcript(transcript_text, lecture_id=lecture.id)
    generated = _combine_segment_notes(lecture.title, result)
    latest_note = _get_latest_note(db, lecture.id)
    note = Note(
        lecture_id=lecture.id,
        title=generated["title"],
        summary=generated["summary"],
        content=generated,
        version=(latest_note.version + 1) if latest_note else 1,
    )
    db.add(note)
    setattr(lecture, "status", "completed")
    setattr(lecture, "error_message", None)
    db.commit()
    db.refresh(note)
    return generated, note


# Root, Health & Monitoring Endpoints
@app.get("/", include_in_schema=False)
def home():
    if STATIC_DIR and (STATIC_DIR / "index.html").is_file():
        return FileResponse(STATIC_DIR / "index.html")
    return {"message": "Smart Notes Generator API is running"}


@app.get("/health")
@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """Minimal health check endpoint verifying database connectivity without leaking schemas or credentials."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "service": "smartnotes-api"}
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable")


@app.get("/db-test")
def test_database(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Protected administrator database connection probe."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "connected"}
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database connection failure")


# Lectures, Audio Upload & Transcription
@app.post("/lectures")
def create_lecture(
    request: LectureRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not request.title.strip():
        raise HTTPException(status_code=400, detail="Lecture title cannot be empty")

    lecture = Lecture(
        user_id=current_user.id,
        title=request.title.strip(),
        audio_path="",
        audio_format="",
        file_size=0,
        status="uploaded"
    )
    try:
        db.add(lecture)
        db.commit()
        db.refresh(lecture)
        return {"message": "Lecture created successfully", "lecture_id": lecture.id, "title": lecture.title}
    except Exception as error:
        db.rollback()
        logger.exception("Lecture creation error: %s", error)
        raise HTTPException(status_code=500, detail="Failed to create lecture")


@app.post("/upload-audio")
async def upload_audio(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_rate_limit(request)
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    original_name = Path(file.filename).name
    extension = Path(original_name).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported audio format")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="The uploaded file is empty")
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File size must not exceed 50 MB")
    if not validate_audio_magic_bytes(contents, extension):
        raise HTTPException(
            status_code=400,
            detail="File content does not match the audio format extension. Disguised files are rejected."
        )

    saved_filename = f"{uuid4().hex}{extension}"
    file_path = UPLOAD_DIR / saved_filename

    try:
        file_path.write_bytes(contents)
        lecture = Lecture(
            user_id=current_user.id,
            title=Path(original_name).stem,
            audio_path=str(file_path),
            audio_format=extension.lstrip("."),
            file_size=len(contents),
            status="uploaded"
        )
        db.add(lecture)
        db.commit()
        db.refresh(lecture)
        return {
            "message": "Audio uploaded successfully",
            "lecture_id": lecture.id,
            "original_filename": original_name,
            "saved_filename": saved_filename,
            "file_size_bytes": len(contents),
            "status": lecture.status
        }
    except Exception as error:
        db.rollback()
        if file_path.exists():
            file_path.unlink()
        logger.exception("Upload error: %s", error)
        raise HTTPException(status_code=500, detail="Failed to upload and save lecture")
    finally:
        await file.close()


@app.post("/transcribe/{filename}")
def transcribe_lecture(
    filename: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_rate_limit(request)
    request_started_at = time.perf_counter()

    if Path(filename).name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    file_path = UPLOAD_DIR / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Audio file not found")

    lecture = db.query(Lecture).filter(Lecture.audio_path == str(file_path)).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture record not found")
    if lecture.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this lecture.")

    setattr(lecture, "status", "processing")
    setattr(lecture, "error_message", None)
    db.commit()

    try:
        result = transcribe_audio(str(file_path))
        transcript_text = result["transcript"]
        language = result.get("language")
        if not transcript_text.strip():
            raise HTTPException(status_code=422, detail="No speech detected in audio")

        transcript_record = db.query(Transcript).filter(Transcript.lecture_id == lecture.id).first()
        if transcript_record:
            transcript_record.transcript_text = transcript_text
            setattr(transcript_record, "language", language)
        else:
            db.add(Transcript(lecture_id=lecture.id, transcript_text=transcript_text, language=language))

        setattr(lecture, "status", "transcribed")
        setattr(lecture, "error_message", None)
        db.commit()

        logger.info("Transcription request completed for lecture_id=%s in %.2f seconds", lecture.id, time.perf_counter() - request_started_at)
        return {
            "message": "Transcription completed and saved",
            "lecture_id": lecture.id,
            "language": language,
            "transcript": transcript_text
        }
    except HTTPException as http_exc:
        db.rollback()
        _mark_lecture_failed(lecture.id, str(http_exc.detail))
        raise
    except Exception as error:
        db.rollback()
        _mark_lecture_failed(lecture.id, str(error))
        logger.error(
            "Transcription request failed for lecture_id=%s after %.2f seconds: %s\n%s",
            lecture.id,
            time.perf_counter() - request_started_at,
            error,
            traceback.format_exc()
        )
        raise HTTPException(status_code=500, detail=f"Transcription failed: {error}")


@app.post("/generate-notes")
def create_notes(
    notes_request: NotesRequest,
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    check_rate_limit(request)
    if not notes_request.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript cannot be empty")

    try:
        notes = generate_notes(notes_request.transcript)
        lecture_id = None
        note_id = None

        if current_user:
            try:
                raw_title = notes.get("title", "Lecture Notes")
                title = str(raw_title).strip()[:255] if raw_title and str(raw_title).strip() else "Pasted Lecture Notes"
                lecture = Lecture(user_id=current_user.id, title=title, status="completed")
                db.add(lecture)
                db.flush()
                db.add(Transcript(lecture_id=lecture.id, transcript_text=notes_request.transcript))
                note = Note(lecture_id=lecture.id, title=title, summary=notes.get("summary", ""), content=notes, version=1)
                db.add(note)
                db.commit()
                db.refresh(lecture)
                db.refresh(note)
                lecture_id, note_id = lecture.id, note.id
            except Exception as save_err:
                db.rollback()
                logger.warning(f"Could not persist pasted notes to database: {save_err}")

        return {"message": "Notes generated successfully", "notes": notes, "lecture_id": lecture_id, "note_id": note_id}
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        logger.exception("AI note generation error: %s", error)
        raise HTTPException(status_code=502, detail="AI note generation failed. Check backend terminal.")


def run_lecture_synthesis(lecture_id: int, user_id: int):
    """Unified background synthesis worker: transcription -> note generation -> Qdrant indexing -> DB persistence."""
    logger.info("Beginning synthesis worker for lecture_id=%d (user_id=%d)...", lecture_id, user_id)
    with SessionLocal() as db:
        lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
        if not lecture:
            logger.error("Lecture %d not found for synthesis worker.", lecture_id)
            return

        setattr(lecture, "status", "processing")
        setattr(lecture, "error_message", None)
        db.commit()

        try:
            transcript_record = db.query(Transcript).filter(Transcript.lecture_id == lecture_id).first()
            if not transcript_record or not transcript_record.transcript_text or not str(transcript_record.transcript_text).strip():
                if not lecture.audio_path or not Path(lecture.audio_path).is_file():
                    raise ValueError("No transcript or audio recording available to synthesize.")

                logger.info("Stage 1/3: Transcribing audio (%s) with Whisper...", lecture.audio_path)
                trans_result = transcribe_audio(lecture.audio_path)
                transcript_text = trans_result.get("transcript", "").strip()
                if not transcript_text:
                    raise ValueError("No speech detected in audio file.")

                if not transcript_record:
                    transcript_record = Transcript(lecture_id=lecture_id, transcript_text=transcript_text, language=trans_result.get("language"))
                    db.add(transcript_record)
                else:
                    transcript_record.transcript_text = transcript_text
                    transcript_record.language = trans_result.get("language")
                db.commit()

            logger.info("Stage 2/3: Running structured note generation and Qdrant indexing...")
            _save_generated_notes(db, lecture, str(transcript_record.transcript_text))
            logger.info("Successfully completed synthesis pipeline for lecture %d.", lecture_id)
        except Exception as exc:
            db.rollback()
            logger.error("Synthesis pipeline failed for lecture %d: %s\n%s", lecture_id, exc, traceback.format_exc())
            _mark_lecture_failed(lecture_id, str(exc))


@app.post("/lectures/{lecture_id}/generate-notes")
def create_and_save_notes(
    lecture_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_rate_limit(request)
    lecture = get_user_lecture(lecture_id, current_user, db)

    setattr(lecture, "status", "processing")
    setattr(lecture, "error_message", None)
    db.commit()

    transcript_record = db.query(Transcript).filter(Transcript.lecture_id == lecture_id).first()
    if not transcript_record:
        msg = "Transcript not found. Transcribe lecture first."
        setattr(lecture, "status", "failed")
        setattr(lecture, "error_message", msg)
        db.commit()
        raise HTTPException(status_code=404, detail=msg)

    try:
        generated, note = _save_generated_notes(db, lecture, str(transcript_record.transcript_text))
        return {
            "message": "Notes generated and saved successfully",
            "lecture_id": lecture_id,
            "note_id": note.id,
            "notes": generated
        }
    except Exception as error:
        db.rollback()
        _mark_lecture_failed(lecture_id, str(error))
        logger.error("Note generation error for lecture_id=%d: %s\n%s", lecture_id, error, traceback.format_exc())
        raise HTTPException(status_code=502, detail=f"Note generation failed: {error}")


# --------------------------------------------------
# RETRY FAILED OR STUCK LECTURE SYNTHESIS
# --------------------------------------------------

@app.post("/lectures/{lecture_id}/retry")
@app.post("/api/lectures/{lecture_id}/retry")
def retry_lecture_synthesis(
    lecture_id: int,
    background_tasks: BackgroundTasks,
    sync: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Re-run synthesis on a failed or stuck lecture."""
    lecture = get_user_lecture(lecture_id, current_user, db)
    setattr(lecture, "status", "processing")
    setattr(lecture, "error_message", None)
    db.commit()

    if sync:
        run_lecture_synthesis(lecture_id, current_user.id)
        db.refresh(lecture)
        return {
            "message": "Synthesis retry completed",
            "lecture_id": lecture.id,
            "status": lecture.status,
            "error_message": getattr(lecture, "error_message", None)
        }

    background_tasks.add_task(run_lecture_synthesis, lecture_id, current_user.id)
    return {
        "message": "Synthesis retry initiated",
        "lecture_id": lecture.id,
        "status": "processing"
    }
# --------------------------------------------------
# RETRIEVE SAVED NOTES
# --------------------------------------------------

@app.get("/lectures/{lecture_id}/notes")
def get_lecture_notes(
    lecture_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lecture = get_user_lecture(lecture_id, current_user, db)

    notes = db.query(Note).filter(
        Note.lecture_id == lecture_id
    ).order_by(
        Note.id.desc()
    ).all()

    return {
        "lecture_id": lecture.id,
        "lecture_title": lecture.title,
        "notes": [
            {
                "id": note.id,
                "title": note.title,
                "summary": note.summary,
                "content": note.content,
                "version": note.version
            }
            for note in notes
        ]
    }


# --------------------------------------------------
# RETRIEVE ALL LECTURES (USER-SCOPED)
# --------------------------------------------------

@app.get("/lectures")
@app.get("/api/lectures")
def get_all_lectures(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Direct browser address-bar page load/refresh fallback to React SPA
    is_browser_nav = (
        request.headers.get("sec-fetch-dest") == "document" or
        (
            "text/html" in request.headers.get("accept", "") and
            "application/json" not in request.headers.get("accept", "") and
            "authorization" not in request.headers
        )
    )
    if is_browser_nav and STATIC_DIR and (STATIC_DIR / "index.html").is_file():
        return FileResponse(STATIC_DIR / "index.html")

    recover_stale_processing_lectures(db, max_age_minutes=4)

    all_lectures = db.query(Lecture).filter(
        Lecture.user_id == current_user.id
    ).order_by(
        Lecture.id.desc()
    ).all()

    lectures_data = []
    total_duration_seconds = 0
    total_words = 0
    notes_ready_count = 0

    for lecture in all_lectures:
        latest_note = db.query(Note).filter(
            Note.lecture_id == lecture.id
        ).order_by(Note.version.desc()).first()

        has_notes = latest_note is not None
        if has_notes:
            notes_ready_count += 1

        has_quiz = db.query(Quiz.id).filter(Quiz.lecture_id == lecture.id).first() is not None
        summary = latest_note.summary if (latest_note and latest_note.summary) else ""
        sections_count = 0
        if latest_note and isinstance(latest_note.content, dict):
            sections_count = len(latest_note.content.get("sections", []))

        duration = lecture.transcript.duration_seconds if (lecture.transcript and lecture.transcript.duration_seconds) else 0
        total_duration_seconds += duration

        word_count = 0
        if lecture.transcript and lecture.transcript.transcript_text:
            word_count = len(lecture.transcript.transcript_text.split())
            total_words += word_count
        elif summary:
            word_count = len(summary.split())
            total_words += word_count

        lectures_data.append({
            "id": lecture.id,
            "title": lecture.title,
            "status": "completed" if has_notes else (lecture.status or "uploaded"),
            "created_at": lecture.created_at,
            "audio_format": lecture.audio_format or "Audio",
            "file_size": lecture.file_size,
            "duration_seconds": duration,
            "summary": summary,
            "sections_count": sections_count,
            "has_notes": has_notes,
            "has_quiz": has_quiz,
            "word_count": word_count,
            "error_message": getattr(lecture, "error_message", None)
        })

    stats = {
        "total_lectures": len(all_lectures),
        "notes_ready": notes_ready_count,
        "total_duration_seconds": total_duration_seconds,
        "total_words_indexed": total_words
    }

    return {
        "stats": stats,
        "lectures": lectures_data
    }


# --------------------------------------------------
# RETRIEVE SINGLE LECTURE (WITH OWNERSHIP CHECK)
# --------------------------------------------------

@app.get("/lectures/{lecture_id}")
@app.get("/api/lectures/{lecture_id}")
def get_lecture_detail(
    lecture_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lecture = get_user_lecture(lecture_id, current_user, db)
    latest_note = db.query(Note).filter(Note.lecture_id == lecture.id).first()
    effective_status = "completed" if latest_note else (lecture.status or "uploaded")
    return {
        "id": lecture.id,
        "title": lecture.title,
        "status": effective_status,
        "created_at": lecture.created_at,
        "audio_format": lecture.audio_format,
        "file_size": lecture.file_size,
        "has_notes": latest_note is not None,
        "error_message": getattr(lecture, "error_message", None)
    }


# --------------------------------------------------
# SAVED LECTURE Q&A
# --------------------------------------------------

@app.get("/lectures/{lecture_id}/questions")
@app.get("/api/lectures/{lecture_id}/questions")
def get_lecture_questions(
    lecture_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lecture = get_user_lecture(lecture_id, current_user, db)

    messages = db.query(LectureMessage).filter(
        LectureMessage.lecture_id == lecture_id
    ).order_by(
        LectureMessage.id.asc()
    ).all()

    return {
        "lecture_id": lecture_id,
        "messages": [
            {
                "id": message.id,
                "role": message.role,
                "content": message.content,
                "created_at": message.created_at
            }
            for message in messages
        ]
    }


@app.post("/lectures/{lecture_id}/questions")
@app.post("/api/lectures/{lecture_id}/questions")
def ask_lecture_question(
    lecture_id: int,
    request: LectureQuestionRequest,
    http_request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_rate_limit(http_request)
    get_user_lecture(lecture_id, current_user, db)

    transcript = db.query(Transcript).filter(Transcript.lecture_id == lecture_id).first()
    if not transcript:
        raise HTTPException(status_code=404, detail="No saved transcript is available for this lecture.")

    transcript_text = str(transcript.transcript_text or "").strip()
    if not transcript_text:
        raise HTTPException(status_code=422, detail="The saved transcript is empty.")

    latest_note = _get_latest_note(db, lecture_id)
    if not latest_note:
        raise HTTPException(status_code=404, detail="Generate saved notes for this lecture before asking questions.")

    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=422, detail="Enter a question about this lecture.")

    stored_history = (
        db.query(LectureMessage)
        .filter(LectureMessage.lecture_id == lecture_id)
        .order_by(LectureMessage.id.asc())
        .all()
    )
    history = [
        {"role": str(m.role), "content": str(m.content)}
        for m in stored_history
        if m.role in {"user", "assistant"}
    ]

    note_content = (
        latest_note.content.strip()
        if isinstance(latest_note.content, str)
        else json.dumps(latest_note.content, ensure_ascii=False)
    )
    if not note_content or note_content == "null":
        raise HTTPException(status_code=422, detail="The saved notes are empty.")

    try:
        retrieved_chunks = []
        try:
            retrieved_chunks = retrieve_context(lecture_id=lecture_id, query=question, limit=5)
        except Exception as qdrant_err:
            logger.warning("Qdrant retrieval skipped for lecture %s: %s", lecture_id, qdrant_err)

        context = "\n\n".join(item["text"] for item in retrieved_chunks if item.get("text"))
        if not context.strip():
            context = transcript_text

        result = answer_question(question=question, context=context, notes_context=note_content, history=history)
    except Exception as error:
        logger.exception("Question generation failed for lecture %s", lecture_id)
        raise HTTPException(status_code=502, detail="Could not generate an answer. Please try again.") from error

    answer_text = result.get("answer", "")
    sources = result.get("sources", [])
    confidence = result.get("confidence", "medium")
    if not answer_text:
        raise HTTPException(status_code=502, detail="The AI returned an empty answer.")

    question_message = LectureMessage(lecture_id=lecture_id, role="user", content=question)
    answer_message = LectureMessage(lecture_id=lecture_id, role="assistant", content=answer_text)

    try:
        db.add_all([question_message, answer_message])
        db.commit()
        db.refresh(question_message)
        db.refresh(answer_message)
    except SQLAlchemyError as error:
        db.rollback()
        logger.exception("Could not save question history for lecture %s", lecture_id)
        raise HTTPException(status_code=500, detail="The answer was generated but could not be saved.") from error

    return {
        "lecture_id": lecture_id,
        "question": question,
        "answer": answer_text,
        "sources": sources,
        "confidence": confidence,
        "retrieved_chunks": [
            {"text": item.get("text", ""), "score": item.get("score")}
            for item in retrieved_chunks
        ],
        "messages": [
            {"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at}
            for m in (question_message, answer_message)
        ]
    }
    


@app.delete("/lectures/{lecture_id}")
@app.delete("/api/lectures/{lecture_id}")
def delete_lecture(
    lecture_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permanently delete a lecture, its notes, quizzes, Q&A messages, transcripts, audio file, and Qdrant vectors."""
    lecture = get_user_lecture(lecture_id, current_user, db)

    try:
        # Clean up Qdrant vector chunks (non-blocking if vector DB unreachable)
        delete_lecture_chunks(lecture_id)

        # Clean up child database records cleanly
        quiz_ids = [
            q.id for q in db.query(Quiz.id).filter(Quiz.lecture_id == lecture_id).all()
        ]
        if quiz_ids:
            db.query(QuizQuestion).filter(
                QuizQuestion.quiz_id.in_(quiz_ids)
            ).delete(synchronize_session=False)
            db.query(Quiz).filter(
                Quiz.lecture_id == lecture_id
            ).delete(synchronize_session=False)

        db.query(LectureMessage).filter(
            LectureMessage.lecture_id == lecture_id
        ).delete(synchronize_session=False)
        db.query(Note).filter(
            Note.lecture_id == lecture_id
        ).delete(synchronize_session=False)
        db.query(Transcript).filter(
            Transcript.lecture_id == lecture_id
        ).delete(synchronize_session=False)

        audio_path = getattr(lecture, "audio_path", None)
        db.delete(lecture)
        db.commit()

        if audio_path:
            try:
                p = Path(audio_path)
                if p.is_file():
                    p.unlink()
            except Exception as fs_err:
                logger.warning("Could not delete audio file %s: %s", audio_path, fs_err)

    except SQLAlchemyError as error:
        db.rollback()
        logger.exception("Could not delete lecture %s", lecture_id)
        raise HTTPException(
            status_code=500,
            detail="Could not delete this lecture. Please try again."
        ) from error

    return {
        "message": "Lecture, notes, quizzes, and vector memory permanently deleted.",
        "lecture_id": lecture_id
    }


@app.delete("/lectures/{lecture_id}/notes")
@app.delete("/api/lectures/{lecture_id}/notes")
def delete_lecture_notes(
    lecture_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lecture = get_user_lecture(lecture_id, current_user, db)

    try:
        deleted_notes = db.query(Note).filter(
            Note.lecture_id == lecture_id
        ).delete(synchronize_session=False)
        db.query(LectureMessage).filter(
            LectureMessage.lecture_id == lecture_id
        ).delete(synchronize_session=False)

        # Reset lecture status so it no longer shows as Notes Ready
        has_transcript = db.query(Transcript.id).filter(Transcript.lecture_id == lecture_id).first() is not None
        setattr(lecture, "status", "transcribed" if has_transcript else "uploaded")
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        logger.exception("Could not delete notes for lecture %s", lecture_id)
        raise HTTPException(
            status_code=500,
            detail="Could not delete the saved notes. Please try again."
        ) from error

    return {
        "message": "Saved notes and Q&A history deleted.",
        "lecture_id": lecture_id,
        "deleted_notes": deleted_notes
    }


@app.post("/lectures/{lecture_id}/flashcards")
def create_flashcards(
    lecture_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_rate_limit(request)
    get_user_lecture(lecture_id, current_user, db)
    latest_note = _get_latest_note(db, lecture_id)
    if not latest_note:
        raise HTTPException(status_code=404, detail="Generate notes before creating flashcards")

    try:
        note_content = (
            latest_note.content
            if isinstance(latest_note.content, str)
            else json.dumps(latest_note.content, ensure_ascii=False)
        )
        flashcards = generate_flashcards(note_content, count=10).get("flashcards", [])
        for card in flashcards:
            db.execute(
                text("INSERT INTO flashcards (lecture_id, question, answer) VALUES (:lecture_id, :question, :answer)"),
                {"lecture_id": lecture_id, "question": card["question"], "answer": card["answer"]}
            )
        db.commit()
        return {"lecture_id": lecture_id, "flashcards": flashcards}
    except Exception as error:
        db.rollback()
        logger.exception("Flashcard generation error for lecture %s: %s", lecture_id, error)
        raise HTTPException(status_code=502, detail="Could not generate flashcards")


@app.post("/lectures/{lecture_id}/quiz")
@app.post("/api/lectures/{lecture_id}/quiz")
def create_quiz(
    lecture_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_rate_limit(request)
    get_user_lecture(lecture_id, current_user, db)
    latest_note = _get_latest_note(db, lecture_id)

    quiz_context = ""
    if latest_note and latest_note.content:
        quiz_context = (
            latest_note.content
            if isinstance(latest_note.content, str)
            else json.dumps(latest_note.content, ensure_ascii=False)
        )
    elif latest_note and latest_note.summary:
        quiz_context = str(latest_note.summary)

    if not quiz_context.strip():
        transcript_record = db.query(Transcript).filter(Transcript.lecture_id == lecture_id).first()
        if transcript_record and transcript_record.transcript_text:
            quiz_context = str(transcript_record.transcript_text).strip()

    if not quiz_context.strip():
        raise HTTPException(
            status_code=400,
            detail="This lecture does not have generated notes or a transcript yet. Generate notes first."
        )

    try:
        questions = generate_quiz(quiz_context, count=10).get("questions", [])
        quiz = Quiz(lecture_id=lecture_id, title="Lecture Quiz")
        db.add(quiz)
        db.flush()

        for item in questions:
            options = item.get("options", {})
            db.add(QuizQuestion(
                quiz_id=quiz.id,
                question=item.get("question", ""),
                option_a=options.get("A", ""),
                option_b=options.get("B", ""),
                option_c=options.get("C", ""),
                option_d=options.get("D", ""),
                correct_answer=item.get("correct_answer", ""),
                explanation=item.get("explanation", "")
            ))

        db.commit()
        return {"quiz_id": quiz.id, "lecture_id": lecture_id, "title": quiz.title, "questions": questions}
    except Exception:
        db.rollback()
        logger.exception("Quiz generation failed for lecture %s", lecture_id)
        raise HTTPException(status_code=502, detail="Could not generate quiz")


@app.get("/lectures/{lecture_id}/quiz")
@app.get("/api/lectures/{lecture_id}/quiz")
def get_quiz(
    lecture_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_lecture(lecture_id, current_user, db)
    quiz = db.query(Quiz).filter(Quiz.lecture_id == lecture_id).order_by(Quiz.id.desc()).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).order_by(QuizQuestion.id.asc()).all()
    return {
        "quiz_id": quiz.id,
        "lecture_id": lecture_id,
        "title": quiz.title,
        "questions": [
            {
                "id": q.id,
                "question": q.question,
                "options": {"A": q.option_a, "B": q.option_b, "C": q.option_c, "D": q.option_d},
                "correct_answer": q.correct_answer,
                "explanation": q.explanation
            }
            for q in questions
        ]
    }


# --------------------------------------------------
# STATIC SPA FRONTEND SERVING (For Unified Cloud Run)
# --------------------------------------------------

RESERVED_API_PREFIXES = (
    "api/",
    "api",
    "health",
    "db-test",
    "docs",
    "redoc",
    "openapi.json",
    "upload-audio",
    "transcribe",
    "generate-notes",
)


if STATIC_DIR:
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend_spa(full_path: str):
        # 1. Never intercept backend API, monitoring, or documentation routes
        trimmed = full_path.strip("/")
        if trimmed in RESERVED_API_PREFIXES or any(trimmed.startswith(p) for p in ("api/", "docs/", "redoc/")):
            raise HTTPException(status_code=404, detail="API route not found")

        # 2. Check if the path points to an actual static asset in STATIC_DIR (e.g. favicon.svg, icons.svg)
        try:
            target = (STATIC_DIR / full_path).resolve()
            if target.is_file() and str(target).startswith(str(STATIC_DIR.resolve())):
                return FileResponse(target)
        except Exception:
            pass

        # 3. If the path looks like a static asset file request with an extension, return 404 instead of HTML
        path_obj = Path(full_path)
        if path_obj.suffix and path_obj.suffix.lower() in {
            ".js", ".css", ".map", ".json", ".png", ".jpg", ".jpeg",
            ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".webp"
        }:
            raise HTTPException(status_code=404, detail="Static asset not found")

        # 4. For all client-side SPA routes (e.g. /dashboard, /login, /lecture/1, /notes), serve index.html
        index_file = STATIC_DIR / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)

        raise HTTPException(status_code=404, detail="Page not found")
