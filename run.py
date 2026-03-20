"""
Crawler TSE → Supabase (PostgreSQL).

Uso:
    python run.py                    # crawla tudo (29 partidos)
    python run.py --partido 10       # testa com um partido
    python run.py --step partidos    # só lista de partidos
    python run.py --step receitas
    python run.py --step despesas
"""

import asyncio
import logging
import tomllib
import argparse

from rich.logging import RichHandler
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, MofNCompleteColumn

from storage.db import connect, init_schema
from crawlers.base import TSEClient
from crawlers.partidos import crawl_lista_partidos, crawl_prestacao_contas
from crawlers.receitas import crawl_receitas
from crawlers.despesas import crawl_despesas

logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[RichHandler(rich_tracebacks=True)],
)
logger = logging.getLogger(__name__)

with open("config.toml", "rb") as f:
    cfg = tomllib.load(f)

ELEICAO_ID    = cfg["crawl"]["eleicao_id"]
ANO           = cfg["crawl"]["ano"]
ESTADO        = cfg["crawl"]["estado"]
CODIGO_ORGAO  = "2"
PARTIDO_NUMEROS = cfg["targets"]["partidos"]


async def run(step: str = "all", partido_filter: int | None = None):
    conn = connect()
    init_schema(conn)

    numeros = [partido_filter] if partido_filter else PARTIDO_NUMEROS

    async with TSEClient() as client:

        if step in ("all", "partidos"):
            logger.info("=== Crawlando lista de partidos ===")
            await crawl_lista_partidos(client, conn, ELEICAO_ID, ESTADO)

        if step not in ("all", "prestacao", "receitas", "despesas"):
            return

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            MofNCompleteColumn(),
        ) as progress:
            task = progress.add_task("Partidos", total=len(numeros))

            for num in numeros:
                progress.update(task, description=f"Partido {num:>3}")

                result = await crawl_prestacao_contas(
                    client, conn, ELEICAO_ID, ANO, ESTADO, CODIGO_ORGAO, num
                )

                if result is None:
                    logger.warning(f"Partido {num}: sem prestação, pulando")
                    progress.advance(task)
                    continue

                prestacao_id      = result["prestacao_id"]
                id_prestador      = result["idPrestador"]
                id_ultima_entrega = result["idUltimaEntrega"]

                if step in ("all", "receitas"):
                    await crawl_receitas(
                        client, conn, prestacao_id, ELEICAO_ID, ESTADO, num,
                        id_prestador, id_ultima_entrega,
                    )

                if step in ("all", "despesas"):
                    await crawl_despesas(
                        client, conn, prestacao_id, ELEICAO_ID, ESTADO, num,
                        id_prestador, id_ultima_entrega,
                    )

                progress.advance(task)

    logger.info("✓ Crawl concluído.")
    _print_summary(conn)
    conn.close()


def _print_summary(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM partidos");      p  = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM receitas");      r  = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM despesas");      d  = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM crawl_log WHERE status='error'"); e = cur.fetchone()[0]
    logger.info(f"Resumo → partidos: {p} | receitas: {r} | despesas: {d} | erros: {e}")


def main():
    parser = argparse.ArgumentParser(description="Crawler TSE → Supabase")
    parser.add_argument("--step", default="all",
                        choices=["all", "partidos", "prestacao", "receitas", "despesas"])
    parser.add_argument("--partido", type=int, default=None)
    args = parser.parse_args()
    asyncio.run(run(step=args.step, partido_filter=args.partido))


if __name__ == "__main__":
    main()
