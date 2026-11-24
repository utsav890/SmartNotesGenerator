_model = None

MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_SIZE = 384


def get_embedding_model():
    global _model

    if _model is None:
        from sentence_transformers import SentenceTransformer
        print("Loading embedding model...")
        _model = SentenceTransformer(MODEL_NAME)

    return _model


def generate_embedding(text: str):
    model = get_embedding_model()

    embedding = model.encode(
        text,
        normalize_embeddings=True
    )

    return embedding.tolist()


def generate_embeddings(texts: list[str]):
    model = get_embedding_model()

    embeddings = model.encode(
        texts,
        normalize_embeddings=True
    )

    return embeddings.tolist()