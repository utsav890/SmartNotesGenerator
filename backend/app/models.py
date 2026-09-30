from sqlalchemy import (
    Column,
    BigInteger,
    Integer,
    String,
    Text,
    ForeignKey,
    TIMESTAMP,
    DateTime,
    JSON,
    Index,
    func,
    text
)
from sqlalchemy.orm import relationship

from app.database import Base


class Lecture(Base):
    __tablename__ = "lectures"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, nullable=False, server_default="0")
    title = Column(String(255), nullable=False)
    audio_path = Column(Text, nullable=True)
    audio_format = Column(String(20), nullable=True)
    file_size = Column(BigInteger, nullable=True)
    status = Column(
        String(30),
        nullable=False,
        server_default="uploaded"
    )
    created_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP")
    )

    transcript = relationship(
        "Transcript",
        back_populates="lecture",
        uselist=False,
        cascade="all, delete-orphan"
    )

    notes = relationship(
        "Note",
        back_populates="lecture",
        cascade="all, delete-orphan"
    )

    messages = relationship(
        "LectureMessage",
        back_populates="lecture",
        cascade="all, delete-orphan"
    )

    quizzes = relationship(
        "Quiz",
        back_populates="lecture",
        cascade="all, delete-orphan"
    )


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lecture_id = Column(
        BigInteger,
        ForeignKey("lectures.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )
    transcript_text = Column(Text, nullable=False)
    language = Column(String(20), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    created_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP")
    )

    lecture = relationship(
        "Lecture",
        back_populates="transcript"
    )


class Note(Base):
    __tablename__ = "notes"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lecture_id = Column(
        BigInteger,
        ForeignKey("lectures.id", ondelete="CASCADE"),
        nullable=False
    )
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    content = Column(JSON, nullable=True)
    version = Column(Integer, nullable=False, server_default="1")
    created_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=text("CURRENT_TIMESTAMP")
    )

    lecture = relationship(
        "Lecture",
        back_populates="notes"
    )


class LectureMessage(Base):
    __tablename__ = "lecture_messages"
    __table_args__ = (
        Index(
            "ix_lecture_messages_lecture_id_id",
            "lecture_id",
            "id"
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lecture_id = Column(
        BigInteger,
        ForeignKey(
            "lectures.id",
            name="fk_lecture_messages_lecture_id",
            ondelete="CASCADE"
        ),
        nullable=False
    )
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP")
    )

    lecture = relationship(
        "Lecture",
        back_populates="messages"
    )


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    lecture_id = Column(
        BigInteger,
        ForeignKey(
            "lectures.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    title = Column(
        String(255),
        nullable=False
    )

    created_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP")
    )

    lecture = relationship(
        "Lecture",
        back_populates="quizzes"
    )

    questions = relationship(
        "QuizQuestion",
        back_populates="quiz",
        cascade="all, delete-orphan"
    )


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    quiz_id = Column(
        BigInteger,
        ForeignKey(
            "quizzes.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    question = Column(
        Text,
        nullable=False
    )

    option_a = Column(
        Text,
        nullable=False
    )

    option_b = Column(
        Text,
        nullable=False
    )

    option_c = Column(
        Text,
        nullable=False
    )

    option_d = Column(
        Text,
        nullable=False
    )

    correct_answer = Column(
        String(1),
        nullable=False
    )

    explanation = Column(
        Text,
        nullable=True
    )

    quiz = relationship(
        "Quiz",
        back_populates="questions"
    )