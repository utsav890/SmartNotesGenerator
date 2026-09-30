CREATE TABLE lecture_messages (
    id BIGINT NOT NULL AUTO_INCREMENT,
    lecture_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_lecture_messages_lecture_id_id (lecture_id, id),
    CONSTRAINT fk_lecture_messages_lecture_id
        FOREIGN KEY (lecture_id)
        REFERENCES lectures (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
