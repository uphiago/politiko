"""
Crawl: receitas por partido.
  - /lista  → cada transação individual
  - /rank   → agrupado por doador
"""

import json
import logging

from crawlers.base import TSEClient
from storage.db import log_crawl, transaction

logger = logging.getLogger(__name__)

BASE = "https://divulgacandcontas.tse.jus.br/divulga/rest/v1/prestador/consulta"


async def crawl_receitas(
    client, conn, prestacao_id: int, eleicao_id: str, estado: str,
    partido_numero: int, id_prestador: str, id_ultima_entrega: str,
):
    target = f"receitas/{eleicao_id}/{estado}/{partido_numero}"

    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM receitas WHERE prestacao_id=%s", (prestacao_id,))
        count = cur.fetchone()[0]

    if count > 0:
        logger.info(f"Receitas partido {partido_numero} já existem ({count}) — pulando")
        return

    for tipo in ("lista", "rank"):
        url = f"{BASE}/receitas/{eleicao_id}/{id_prestador}/{id_ultima_entrega}/{tipo}?pagina=1"
        try:
            data = await client.get(url)
        except Exception as e:
            log_crawl(conn, target, "error", f"tipo={tipo} {e}")
            logger.error(f"Erro receitas partido {partido_numero} [{tipo}]: {e}")
            continue

        rows = data if isinstance(data, list) else []
        registros = _parse(rows, prestacao_id, partido_numero, eleicao_id, estado, tipo)

        with transaction(conn):
            with conn.cursor() as cur:
                for r in registros:
                    cur.execute(
                        """
                        INSERT INTO receitas
                            (prestacao_id, partido_numero, eleicao_id, estado,
                             doador_nome, doador_documento, valor, percentual, quantidade,
                             tipo_consulta, tipo_receita, data_receita, raw_json)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        """,
                        r,
                    )

        log_crawl(conn, target, "ok", f"tipo={tipo} {len(registros)} registros")
        logger.info(f"Receitas partido {partido_numero} [{tipo}]: {len(registros)} registros")


def _parse(rows, prestacao_id, partido_numero, eleicao_id, estado, tipo) -> list[tuple]:
    items = []
    for r in rows:
        nome = r.get("nomeDoador") or r.get("nomeFornecedor")
        doc = r.get("cpfCnpjDoador") or r.get("cpfCnpj")
        valor = r.get("valorReceita") or r.get("totalRecebido")
        percentual = r.get("percentualTotal")
        qtd = r.get("quantidade")
        tipo_receita = r.get("fonteOrigem") or r.get("dsReceita")
        data_receita = r.get("dtReceita")

        items.append((
            prestacao_id, partido_numero, eleicao_id, estado,
            nome, doc,
            float(valor) if valor is not None else None,
            float(percentual) if percentual is not None else None,
            int(qtd) if qtd is not None else None,
            tipo, tipo_receita, data_receita,
            json.dumps(r, ensure_ascii=False),
        ))
    return items
