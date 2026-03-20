# Supabase — Guia Operacional

Projeto: `gevgknnlvepsulkvnewt` · Região: `sa-east-1` (São Paulo) · Free tier

---

## Conexão

### Via psycopg2 (scripts/migrations)

```bash
source .venv/bin/activate
python - <<'EOF'
import os, psycopg2
from dotenv import load_dotenv
load_dotenv()
dsn = os.environ.get("DATABASE_URL_POOLER") or os.environ.get("DATABASE_URL")
conn = psycopg2.connect(dsn, connect_timeout=15)
conn.autocommit = True
# ...
conn.close()
EOF
```

> **WSL2:** usar sempre `DATABASE_URL_POOLER` (IPv4). A conexão direta usa IPv6 e não funciona no WSL2.

### Via Supabase JS (frontend)

```js
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
```

---

## Variáveis de ambiente

### `.env` (backend / migrations)

```env
SUPABASE_URL=https://gevgknnlvepsulkvnewt.supabase.co
SUPABASE_ANON_KEY=eyJ...
DATABASE_URL=postgresql://postgres:<pw>@db.gevgknnlvepsulkvnewt.supabase.co:5432/postgres
DATABASE_URL_POOLER=postgresql://postgres.gevgknnlvepsulkvnewt:<pw>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
DB_PASSWORD=<pw>
```

### Vercel (frontend)

```
VITE_SUPABASE_URL=https://gevgknnlvepsulkvnewt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Configurar em: Vercel → Project → Settings → Environment Variables

---

## Como rodar uma migration

```bash
source .venv/bin/activate
python - <<'EOF'
import os, psycopg2
from dotenv import load_dotenv
load_dotenv()
dsn = os.environ.get("DATABASE_URL_POOLER")
conn = psycopg2.connect(dsn, connect_timeout=15)
conn.autocommit = True
with open("supabase/migrations/<arquivo>.sql") as f:
    sql = f.read()
with conn.cursor() as cur:
    cur.execute(sql)
print("OK")
conn.close()
EOF
```

---

## Segurança (RLS)

Duas camadas de proteção para o role `anon` (chave pública do frontend):

### Camada 1 — Row Level Security

```sql
-- Habilitar RLS (impede acesso por padrão)
ALTER TABLE <tabela> ENABLE ROW LEVEL SECURITY;

-- Liberar somente leitura para anon
CREATE POLICY anon_read ON <tabela> FOR SELECT TO anon USING (true);
```

Tabelas com RLS ativado: `partidos`, `prestacoes_contas`, `receitas`, `despesas`, `crawl_log`
Tabelas com policy SELECT: `partidos`, `prestacoes_contas`, `receitas`, `despesas`
`crawl_log` tem RLS mas **sem** policy → bloqueio total

### Camada 2 — REVOKE de escrita

```sql
-- Belt-and-suspenders: retirar grants de escrita
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON partidos, prestacoes_contas, receitas, despesas, crawl_log
  FROM anon, authenticated;

REVOKE SELECT ON crawl_log FROM anon, authenticated;
```

### O que o anon (frontend) consegue fazer

- ✅ SELECT em `partidos`, `prestacoes_contas`, `receitas`, `despesas`
- ✅ SELECT em todas as materialized views (via GRANT)
- ❌ INSERT / UPDATE / DELETE em qualquer tabela
- ❌ Acesso a `crawl_log`

### Verificar estado atual

```sql
-- Checar RLS nas tabelas
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public';

-- Checar policies
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public';
```

---

## Materialized Views

Todas as views precisam de `REFRESH` manual se os dados subjacentes mudarem.

```sql
-- Atualizar uma view específica
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ranking_partidos;

-- Atualizar todas de uma vez
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ranking_partidos;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_despesas_por_tipo;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_beneficiarios;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_candidatos_ranking;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_empresas_multiplos;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_despesas_tipo_partido;
```

> `CONCURRENTLY` permite leitura durante o refresh, mas requer um índice UNIQUE na view.

### Inventário de views

| View | Arquivo de migration | Usado por |
|------|---------------------|-----------|
| `mv_ranking_partidos` | `20260320_mv_core_views.sql` | Banner, Ranking, PartidoModal |
| `mv_despesas_por_tipo` | `20260320_mv_core_views.sql` | Destino |
| `mv_top_beneficiarios` | `20260320_mv_core_views.sql` | Beneficiarios |
| `mv_candidatos_ranking` | `20260320_mv_candidatos_ranking.sql` | RankingIndividual |
| `mv_empresas_multiplos` | `20260320_mv_empresas_gastos_tipo.sql` | Empresas |
| `mv_despesas_tipo_partido` | `20260320_mv_empresas_gastos_tipo.sql` | (removido do frontend) |

### Recriar do zero (disaster recovery)

```bash
# Rodar todas as migrations em ordem
source .venv/bin/activate
for f in supabase/migrations/*.sql; do
  echo "==> $f"
  python - <<EOF
import os, psycopg2
from dotenv import load_dotenv
load_dotenv()
conn = psycopg2.connect(os.environ["DATABASE_URL_POOLER"], connect_timeout=15)
conn.autocommit = True
with open("$f") as sql_file:
    conn.cursor().execute(sql_file.read())
conn.close()
print("OK")
EOF
done
```

---

## Queries de diagnóstico

```sql
-- Contagem por tabela
SELECT
  'partidos' AS t, COUNT(*) FROM partidos UNION ALL
  SELECT 'prestacoes_contas', COUNT(*) FROM prestacoes_contas UNION ALL
  SELECT 'receitas', COUNT(*) FROM receitas UNION ALL
  SELECT 'despesas', COUNT(*) FROM despesas;

-- Últimas entradas no crawl_log
SELECT * FROM crawl_log ORDER BY ts DESC LIMIT 20;

-- Total geral arrecadado e gasto
SELECT
  SUM(total_receitas) AS receitas,
  SUM(total_despesas_real) AS despesas
FROM mv_ranking_partidos;

-- Checar tamanho das views
SELECT
  relname AS view,
  pg_size_pretty(pg_total_relation_size(oid)) AS size
FROM pg_class
WHERE relname LIKE 'mv_%'
ORDER BY pg_total_relation_size(oid) DESC;
```
