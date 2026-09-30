import os
import uuid

from dotenv import load_dotenv

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    PayloadSchemaType
)

from app.embeddings import generate_embeddings


# --------------------------------------------------
# LOAD ENVIRONMENT VARIABLES
# --------------------------------------------------

load_dotenv()


# --------------------------------------------------
# QDRANT CONFIGURATION
# --------------------------------------------------

COLLECTION_NAME = "lecture_chunks"
VECTOR_SIZE = 384


# --------------------------------------------------
# QDRANT CLIENT
# --------------------------------------------------

def get_qdrant_client():

    url = os.getenv(
        "QDRANT_URL",
        "http://localhost:6333"
    )

    api_key = os.getenv(
        "QDRANT_API_KEY"
    )

    print("QDRANT URL:", url)

    if not api_key:
        print("WARNING: QDRANT_API_KEY is not set")

    if api_key:

        return QdrantClient(
            url=url,
            api_key=api_key
        )

    return QdrantClient(
        url=url
    )


# --------------------------------------------------
# ENSURE COLLECTION + PAYLOAD INDEX
# --------------------------------------------------

def ensure_collection():

    client = get_qdrant_client()

    # Get existing collections
    collections = client.get_collections()

    exists = any(
        collection.name == COLLECTION_NAME
        for collection in collections.collections
    )

    # --------------------------------------------------
    # CREATE COLLECTION IF IT DOES NOT EXIST
    # --------------------------------------------------

    if not exists:

        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=VECTOR_SIZE,
                distance=Distance.COSINE
            )
        )

        print(
            f"Created Qdrant collection: "
            f"{COLLECTION_NAME}"
        )

    # --------------------------------------------------
    # CREATE lecture_id PAYLOAD INDEX
    # --------------------------------------------------

    try:

        client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="lecture_id",
            field_schema=PayloadSchemaType.INTEGER
        )

        print(
            "lecture_id payload index ready"
        )

    except Exception as e:

        print(
            "lecture_id index already exists "
            "or could not be created:",
            e
        )

    return client


# --------------------------------------------------
# STORE CHUNKS
# --------------------------------------------------

def store_chunks(
    lecture_id: int,
    chunks: list[str]
):

    if not chunks:

        print(
            "No chunks to store"
        )

        return

    # Get Qdrant client
    client = ensure_collection()

    # --------------------------------------------------
    # GENERATE EMBEDDINGS
    # --------------------------------------------------

    print(
        f"Generating embeddings for "
        f"{len(chunks)} chunks..."
    )

    embeddings = generate_embeddings(
        chunks
    )

    # --------------------------------------------------
    # CREATE QDRANT POINTS
    # --------------------------------------------------

    points = []

    for index, (chunk, embedding) in enumerate(
        zip(chunks, embeddings)
    ):

        point_id = str(
            uuid.uuid4()
        )

        points.append(
            PointStruct(
                id=point_id,

                vector=embedding,

                payload={
                    "lecture_id": lecture_id,
                    "chunk_id": index,
                    "text": chunk
                }
            )
        )

    # --------------------------------------------------
    # UPLOAD TO QDRANT
    # --------------------------------------------------

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points
    )

    print(
        f"Stored {len(points)} chunks "
        f"for lecture {lecture_id}"
    )


# --------------------------------------------------
# SEARCH CHUNKS
# --------------------------------------------------

def search_chunks(
    lecture_id: int,
    query: str,
    limit: int = 5
):

    # Get Qdrant client
    client = ensure_collection()

    # --------------------------------------------------
    # GENERATE QUERY EMBEDDING
    # --------------------------------------------------

    query_embedding = generate_embeddings(
        [query]
    )[0]

    # --------------------------------------------------
    # SEARCH QDRANT
    # --------------------------------------------------

    results = client.query_points(

        collection_name=COLLECTION_NAME,

        query=query_embedding,

        query_filter=Filter(
            must=[
                FieldCondition(
                    key="lecture_id",

                    match=MatchValue(
                        value=lecture_id
                    )
                )
            ]
        ),

        limit=limit
    )

    # --------------------------------------------------
    # RETURN RESULTS
    # --------------------------------------------------

    print(
        f"Retrieved {len(results.points)} "
        f"chunks for lecture {lecture_id}"
    )

    return results.points