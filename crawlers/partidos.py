"""
Crawl: lista de partidos + prestação de contas (sumário).
"""

import json
import logging
from datetime import datetime

import psycopg2

from crawlers.base import TSEClient
from storage.db import log_crawl, transaction

logger = logging.getLogger(__name__)

BASE = "https://divulgacandcontas.tse.jus.br/divulga/rest/v1"


async def crawl_lista_partidos(client, conn, eleicao_id: str, estado: str) -> list[dict]:
    url = f"{BASE}/prestador/campanha/partidos/{eleicao_id}"
    target = f"partidos/{eleicao_id}"

    try:
        data = await client.get(url)
    except Exception as e:
        log_crawl(conn, target, "error", str(e))
        logger.error(f"Erro lista partidos: {e}")
        return []

    partidos = [
        {"numero": p["numero"], "sigla": p.get("sigla", ""), "nome": p.get("nome", "")}
        for p in data
    ]

    with transaction(conn):
        with conn.cursor() as cur:
            for p in partidos:
                cur.execute(
                    """
                    INSERT INTO partidos (numero, sigla, nome, eleicao_id, estado)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT(numero) DO UPDATE SET
                        sigla=EXCLUDED.sigla, nome=EXCLUDED.nome
                    """,
                    (p["numero"], p["sigla"], p["nome"], eleicao_id, estado),
                )

    log_crawl(conn, target, "ok", f"{len(partidos)} partidos")
    logger.info(f"Lista de partidos: {len(partidos)} registros")
    return partidos


async def crawl_prestacao_contas(
    client, conn, eleicao_id: str, ano_referencia: str,
    estado: str, codigo_orgao: str, partido_numero: int,
) -> dict | None:
    url = f"{BASE}/prestador/consulta/partido/{eleicao_id}/{ano_referencia}/{estado}/{codigo_orgao}/{partido_numero}"
    target = f"prestacao/{eleicao_id}/{estado}/{partido_numero}"

    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT id, id_prestador, id_ultima_entrega FROM prestacoes_contas WHERE partido_numero=%s AND eleicao_id=%s AND estado=%s",
            (partido_numero, eleicao_id, estado),
        )
        row = cur.fetchone()

    if row:
        logger.info(f"Partido {partido_numero} já tem prestação — reusando")
        return {"prestacao_id": row["id"], "idPrestador": row["id_prestador"], "idUltimaEntrega": row["id_ultima_entrega"]}

    try:
        data = await client.get(url)
    except Exception as e:
        log_crawl(conn, target, "error", str(e))
        logger.error(f"Erro prestação partido {partido_numero}: {e}")
        return None

    dc = data.get("dadosConsolidados") or {}

    with transaction(conn):
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO prestacoes_contas
                    (partido_numero, eleicao_id, estado, numero_processo, data_atualizacao,
                     id_prestador, id_ultima_entrega, cnpj,
                     total_receitas, total_pf, total_partidos, total_proprios, raw_json)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT(partido_numero, eleicao_id, estado) DO UPDATE SET
                    id_prestador=EXCLUDED.id_prestador,
                    id_ultima_entrega=EXCLUDED.id_ultima_entrega,
                    raw_json=EXCLUDED.raw_json
                RETURNING id
                """,
                (
                    partido_numero, eleicao_id, estado,
                    data.get("numeroDeControleEntrega"),
                    data.get("dataUltimaAtualizacaoContas"),
                    data.get("idPrestador"),
                    data.get("idUltimaEntrega"),
                    data.get("cnpj"),
                    dc.get("totalRecebido"),
                    dc.get("totalReceitaPF"),
                    dc.get("totalPartidos"),
                    dc.get("totalProprios"),
                    json.dumps(data, ensure_ascii=False),
                ),
            )
            prestacao_id = cur.fetchone()[0]

    log_crawl(conn, target, "ok")
    return {
        "prestacao_id": prestacao_id,
        "idPrestador": data.get("idPrestador"),
        "idUltimaEntrega": data.get("idUltimaEntrega"),
    }
