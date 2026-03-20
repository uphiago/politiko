"""
Crawl: despesas por partido.
Endpoint retorna lista completa sem paginação (ex: 13.751 para Republicanos).
"""

import json
import logging

from crawlers.base import TSEClient
from storage.db import log_crawl, transaction

logger = logging.getLogger(__name__)

BASE = "https://divulgacandcontas.tse.jus.br/divulga/rest/v1/prestador/consulta/despesas"
BATCH = 500


async def crawl_despesas(
    client, conn, prestacao_id: int, eleicao_id: str, estado: str,
    partido_numero: int, id_prestador: str, id_ultima_entrega: str,
):
    target = f"despesas/{eleicao_id}/{estado}/{partido_numero}"

    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM despesas WHERE prestacao_id=%s", (prestacao_id,))
        count = cur.fetchone()[0]

    if count > 0:
        logger.info(f"Despesas partido {partido_numero} já existem ({count}) — pulando")
        return

    url = f"{BASE}/{eleicao_id}/{id_prestador}/{id_ultima_entrega}"
    try:
        data = await client.get(url)
    except Exception as e:
        log_crawl(conn, target, "error", str(e))
        logger.error(f"Erro despesas partido {partido_numero}: {e}")
        return

    rows = data if isinstance(data, list) else []
    registros = _parse(rows, prestacao_id, partido_numero, eleicao_id, estado)

    total = 0
    for i in range(0, len(registros), BATCH):
        batch = registros[i:i + BATCH]
        with transaction(conn):
            with conn.cursor() as cur:
                for r in batch:
                    cur.execute(
                        """
                        INSERT INTO despesas
                            (prestacao_id, partido_numero, eleicao_id, estado,
                             beneficiario_nome, beneficiario_cnpj, valor, data_despesa,
                             tipo_despesa, descricao_despesa, especie_recurso, raw_json)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        """,
                        r,
                    )
        total += len(batch)

    log_crawl(conn, target, "ok", f"{total} registros")
    logger.info(f"Despesas partido {partido_numero}: {total} registros salvos")


def _parse(rows, prestacao_id, partido_numero, eleicao_id, estado) -> list[tuple]:
    items = []
    for r in rows:
        valor = r.get("valor")
        items.append((
            prestacao_id, partido_numero, eleicao_id, estado,
            r.get("nomeFornecedor"),
            r.get("cpfCnpjFornecedor"),
            float(valor) if valor is not None else None,
            r.get("data"),
            r.get("tipoDespesa"),
            r.get("descricaoDespesa"),
            r.get("especieRecurso"),
            json.dumps(r, ensure_ascii=False),
        ))
    return items
