-- Belt-and-suspenders: explicitly deny all writes for anon and authenticated roles.
-- RLS with SELECT-only policies already blocks writes, but this adds a second layer
-- at the PostgreSQL GRANT level.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON partidos, prestacoes_contas, receitas, despesas, crawl_log
  FROM anon, authenticated;

-- crawl_log: also deny reads (no need for public access)
REVOKE SELECT ON crawl_log FROM anon, authenticated;
