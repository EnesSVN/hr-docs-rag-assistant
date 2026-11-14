-- Initial schema for documents and their embedded chunks.
-- Safe to run more than once.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id          bigserial PRIMARY KEY,
  filename    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
  id           bigserial PRIMARY KEY,
  document_id  bigint NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  chunk_index  integer NOT NULL CHECK (chunk_index >= 0),
  content      text NOT NULL,
  -- 384 dimensions = output size of multilingual-e5-small.
  embedding    vector(384) NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);
