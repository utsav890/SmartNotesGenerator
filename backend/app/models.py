from sqlalchemy import (
    Column,
    BigInteger,
    Integer,
    String,
    Text,
    Boolean,
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

ID_TYPE = BigInteger().with_variant(Integer, "sqlite")


class User(Base):
    __tablename__ = "users"

    id = Column(ID_TYPE, primary_key=True, autoincrement=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    is_verified = Column(Boolean, nullable=False, server_default=text("0"))
    created_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=text("CURRENT_TIMESTAMP")
    )
    role = Column(String(20), nullable=False, server_default=text("'user'"))
    is_active = Column(Boolean, nullable=False, server_default=text("1"))
    last_login = Column(TIMESTAMP, nullable=True)

    lectures = relationship(
        "Lecture",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    sessions = relationship(
        "UserSession",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    verification_tokens = relationship(
        "EmailVerificationToken",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    reset_tokens = relationship(
        "PasswordResetToken",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    login_activities = relationship(
        "LoginActivity",
        back_populates="user"
    )


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String(64), primary_key=True)
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    device_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, nullable=False, server_default=text("1"))
    expires_at = Column(TIMESTAMP, nullable=False)
    created_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP")
    )
    last_active_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=text("CURRENT_TIMESTAMP")
    )

    user = relationship("User", back_populates="sessions")


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id = Column(ID_TYPE, primary_key=True, autoincrement=True)
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(TIMESTAMP, nullable=False)
    used_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP")
    )

    user = relationship("User", back_populates="verification_tokens")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(ID_TYPE, primary_key=True, autoincrement=True)
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(TIMESTAMP, nullable=False)
    used_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP")
    )

    user = relationship("User", back_populates="reset_tokens")


class LoginActivity(Base):
    __tablename__ = "login_activities"

    id = Column(ID_TYPE, primary_key=True, autoincrement=True)
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    email = Column(String(255), nullable=False, index=True)
    status = Column(String(20), nullable=False)  # "success", "failed"
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP")
    )

    user = relationship("User", back_populates="login_activities")


class Lecture(Base):
    __tablename__ = "lectures"

    id = Column(ID_TYPE, primary_key=True, index=True, autoincrement=True)
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        server_default="0"
    )
    title = Column(String(255), nullable=False)
    audio_path = Column(Text, nullable=True)
    audio_format = Column(String(20), nullable=True)
    file_size = Column(BigInteger, nullable=True)
    status = Column(
        String(30),
        nullable=False,
        server_default="uploaded"
    )
    error_message = Column(Text, nullable=True)
    created_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=text("CURRENT_TIMESTAMP")
    )

    user = relationship(
        "User",
        back_populates="lectures"
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

    id = Column(ID_TYPE, primary_key=True, autoincrement=True)
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

    id = Column(ID_TYPE, primary_key=True, autoincrement=True)
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

    id = Column(ID_TYPE, primary_key=True, autoincrement=True)
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
        ID_TYPE,
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
        ID_TYPE,
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