"""
Conexão e schema PostgreSQL (Supabase).
Lê DATABASE_URL do .env — tenta conexão direta, cai no pooler se falhar.
"""

import os
import logging
from contextlib import contextmanager

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


def connect() -> psycopg2.extensions.connection:
    url = os.environ.get("DATABASE_URL")
    pooler = os.environ.get("DATABASE_URL_POOLER")

    for label, dsn in [("direct", url), ("pooler", pooler)]:
        if not dsn:
            continue
        try:
            conn = psycopg2.connect(dsn, connect_timeout=10)
            conn.autocommit = False
            logger.info(f"PostgreSQL conectado via {label}")
            return conn
        except Exception as e:
            logger.warning(f"Conexão {label} falhou: {e}")

    raise RuntimeError("Não foi possível conectar ao banco. Verifique .env")


def init_schema(conn: psycopg2.extensions.connection):
    with conn.cursor() as cur:
        cur.execute("""
        CREATE TABLE IF NOT EXISTS partidos (
            numero          INTEGER PRIMARY KEY,
            sigla           TEXT NOT NULL,
            nome            TEXT NOT NULL,
            cnpj            TEXT,
            eleicao_id      TEXT NOT NULL,
            estado          TEXT NOT NULL,
            crawled_at      TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS prestacoes_contas (
            id                  SERIAL PRIMARY KEY,
            partido_numero      INTEGER NOT NULL REFERENCES partidos(numero),
            eleicao_id          TEXT NOT NULL,
            estado              TEXT NOT NULL,
            numero_processo     TEXT,
            data_atualizacao    TEXT,
            id_prestador        TEXT,
            id_ultima_entrega   TEXT,
            cnpj                TEXT,
            total_receitas      NUMERIC(15,2),
            total_despesas      NUMERIC(15,2),
            total_pf            NUMERIC(15,2),
            total_partidos      NUMERIC(15,2),
            total_proprios      NUMERIC(15,2),
            raw_json            JSONB,
            crawled_at          TIMESTAMPTZ DEFAULT now(),
            UNIQUE(partido_numero, eleicao_id, estado)
        );

        CREATE TABLE IF NOT EXISTS receitas (
            id                  SERIAL PRIMARY KEY,
            prestacao_id        INTEGER NOT NULL REFERENCES prestacoes_contas(id),
            partido_numero      INTEGER NOT NULL,
            eleicao_id          TEXT NOT NULL,
            estado              TEXT NOT NULL,
            doador_nome         TEXT,
            doador_documento    TEXT,
            valor               NUMERIC(15,2),
            percentual          NUMERIC(8,4),
            quantidade          INTEGER,
            tipo_consulta       TEXT,
            tipo_receita        TEXT,
            data_receita        TEXT,
            raw_json            JSONB
        );

        CREATE INDEX IF NOT EXISTS idx_receitas_partido    ON receitas(partido_numero);
        CREATE INDEX IF NOT EXISTS idx_receitas_documento  ON receitas(doador_documento);
        CREATE INDEX IF NOT EXISTS idx_receitas_tipo       ON receitas(tipo_consulta);

        CREATE TABLE IF NOT EXISTS despesas (
            id                  SERIAL PRIMARY KEY,
            prestacao_id        INTEGER NOT NULL REFERENCES prestacoes_contas(id),
            partido_numero      INTEGER NOT NULL,
            eleicao_id          TEXT NOT NULL,
            estado              TEXT NOT NULL,
            beneficiario_nome   TEXT,
            beneficiario_cnpj   TEXT,
            valor               NUMERIC(15,2),
            data_despesa        TEXT,
            tipo_despesa        TEXT,
            descricao_despesa   TEXT,
            especie_recurso     TEXT,
            raw_json            JSONB
        );

        CREATE INDEX IF NOT EXISTS idx_despesas_partido    ON despesas(partido_numero);
        CREATE INDEX IF NOT EXISTS idx_despesas_cnpj       ON despesas(beneficiario_cnpj);
        CREATE INDEX IF NOT EXISTS idx_despesas_tipo       ON despesas(tipo_despesa);

        CREATE TABLE IF NOT EXISTS crawl_log (
            id          SERIAL PRIMARY KEY,
            target      TEXT NOT NULL,
            status      TEXT NOT NULL,
            message     TEXT,
            ts          TIMESTAMPTZ DEFAULT now()
        );
        """)
    conn.commit()
    logger.info("Schema inicializado")


@contextmanager
def transaction(conn: psycopg2.extensions.connection):
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def log_crawl(conn, target: str, status: str, message: str = ""):
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO crawl_log (target, status, message) VALUES (%s, %s, %s)",
            (target, status, message),
        )
    conn.commit()
