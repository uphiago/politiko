# politiko

Crawler de prestação de contas de partidos políticos nas **Eleições Municipais 2024** (TSE), com carga direta no Supabase (PostgreSQL).

> Dados coletados em março/2026. O site do TSE não atualiza mais esses dados — a coleta é one-shot.

---

## O que contém

Dados públicos do [Divulgação de Candidaturas e Contas Eleitorais](https://divulgacandcontas.tse.jus.br/divulga/) do TSE, eleição `2045202024` (Municipais 2024), escopo nacional (BR), diretórios nacionais dos partidos.

| Tabela | Registros | Descrição |
|--------|----------:|-----------|
| `partidos` | 29 | Número, sigla, nome |
| `prestacoes_contas` | 29 | Sumário financeiro + raw JSONB por partido |
| `receitas` | 1.303 | Doações individuais (lista) + agrupadas por doador (rank) |
| `despesas` | 155.188 | Despesas detalhadas — fornecedor, valor, tipo, data |
| `crawl_log` | — | Log de execução por etapa |

---

## Banco de dados

**Supabase:** `https://gevgknnlvepsulkvnewt.supabase.co`
Região: `sa-east-1` (São Paulo) — Free tier

### Schema

```sql
partidos (
  numero        INTEGER PRIMARY KEY,   -- ex: 10
  sigla         TEXT,                  -- ex: "REPUBLICANOS"
  nome          TEXT,
  cnpj          TEXT,
  eleicao_id    TEXT,                  -- "2045202024"
  estado        TEXT,                  -- "BR"
  crawled_at    TIMESTAMPTZ
)

prestacoes_contas (
  id                  SERIAL PRIMARY KEY,
  partido_numero      INTEGER REFERENCES partidos,
  eleicao_id          TEXT,
  estado              TEXT,
  numero_processo     TEXT,            -- ex: "P10000200000BR0697430"
  data_atualizacao    TEXT,
  id_prestador        TEXT,            -- chave interna TSE
  id_ultima_entrega   TEXT,            -- chave interna TSE
  cnpj                TEXT,
  total_receitas      NUMERIC(15,2),
  total_pf            NUMERIC(15,2),   -- doações de pessoas físicas
  total_partidos      NUMERIC(15,2),   -- repasses entre partidos
  total_proprios      NUMERIC(15,2),
  raw_json            JSONB,           -- resposta completa da API TSE
  UNIQUE(partido_numero, eleicao_id, estado)
)

receitas (
  id               SERIAL PRIMARY KEY,
  prestacao_id     INTEGER REFERENCES prestacoes_contas,
  partido_numero   INTEGER,
  doador_nome      TEXT,
  doador_documento TEXT,               -- CPF ou CNPJ
  valor            NUMERIC(15,2),
  percentual       NUMERIC(8,4),
  quantidade       INTEGER,
  tipo_consulta    TEXT,               -- 'lista' | 'rank'
  tipo_receita     TEXT,               -- ex: "Fundo Especial", "Doação PF"
  data_receita     TEXT,
  raw_json         JSONB
)

despesas (
  id                SERIAL PRIMARY KEY,
  prestacao_id      INTEGER REFERENCES prestacoes_contas,
  partido_numero    INTEGER,
  beneficiario_nome TEXT,
  beneficiario_cnpj TEXT,
  valor             NUMERIC(15,2),
  data_despesa      TEXT,
  tipo_despesa      TEXT,              -- ex: "Doações financeiras a outros candidatos/partidos"
  descricao_despesa TEXT,
  especie_recurso   TEXT,              -- "Financeiro" | "Estimável"
  raw_json          JSONB
)
```

**Índices:** `partido_numero`, `beneficiario_cnpj`, `tipo_despesa`, `doador_documento`.

### Queries úteis

```sql
-- Total gasto por partido (ranking)
SELECT p.sigla, SUM(d.valor) AS total
FROM despesas d
JOIN partidos p ON p.numero = d.partido_numero
GROUP BY p.sigla
ORDER BY total DESC;

-- Maiores fornecedores (todos os partidos)
SELECT beneficiario_nome, beneficiario_cnpj,
       COUNT(*) AS qtd, SUM(valor) AS total
FROM despesas
WHERE beneficiario_cnpj IS NOT NULL
GROUP BY beneficiario_nome, beneficiario_cnpj
ORDER BY total DESC
LIMIT 20;

-- Tipos de despesa mais comuns
SELECT tipo_despesa, COUNT(*) AS qtd, SUM(valor) AS total
FROM despesas
GROUP BY tipo_despesa
ORDER BY total DESC;

-- Maiores doadores (pessoas físicas)
SELECT doador_nome, doador_documento, SUM(valor) AS total
FROM receitas
WHERE tipo_consulta = 'rank'
  AND doador_documento NOT LIKE '%/%'  -- exclui CNPJs
GROUP BY doador_nome, doador_documento
ORDER BY total DESC
LIMIT 20;

-- Despesas de um partido específico
SELECT * FROM despesas
WHERE partido_numero = 13  -- PT
ORDER BY valor DESC
LIMIT 100;
```

---

## Setup local

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # preencher com credenciais
```

### Variáveis de ambiente (`.env`)

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJ...
DATABASE_URL=postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres
DATABASE_URL_POOLER=postgresql://postgres.<ref>:<pw>@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
DB_PASSWORD=
```

> **Nota WSL2:** a conexão direta usa IPv6 (não suportado no WSL2). O pooler (`DATABASE_URL_POOLER`) é IPv4 e funciona corretamente.

---

## Uso

```bash
# Coleta completa (todos os 29 partidos)
python3 run.py

# Teste com um partido
python3 run.py --partido 10

# Etapas individuais
python3 run.py --step partidos    # só lista
python3 run.py --step receitas    # só receitas
python3 run.py --step despesas    # só despesas
```

O crawl é **idempotente** — pode ser reexecutado sem duplicar dados (upsert por chave única).

---

## Estrutura

```
politiko/
├── run.py                  # entrypoint CLI
├── config.toml             # parâmetros: eleição, delays, partidos
├── .env                    # credenciais (não vai pro git)
├── .env.example            # template
├── requirements.txt
├── crawlers/
│   ├── base.py             # cliente HTTP: rate limit, retry, headers TSE
│   ├── partidos.py         # lista de partidos + prestação de contas
│   ├── receitas.py         # receitas por partido (lista + rank)
│   └── despesas.py         # despesas por partido (bulk, sem paginação)
└── storage/
    └── db.py               # conexão PostgreSQL, schema, helpers
```

---

## Endpoints TSE descobertos

API base: `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/`

Descoberta via engenharia reversa do bundle Angular (`main.*.js` + chunk `989.*.js`).

| Dado | Método | Endpoint |
|------|--------|----------|
| Lista de partidos | GET | `/prestador/campanha/partidos/{sqEleicao}` |
| Prestação de contas | GET | `/prestador/consulta/partido/{sqEleicao}/{ano}/{uf}/{orgao}/{numero}` |
| Receitas (individual) | GET | `/prestador/consulta/receitas/{sqEleicao}/{idPrestador}/{idUltimaEntrega}/lista` |
| Receitas (ranking) | GET | `/prestador/consulta/receitas/{sqEleicao}/{idPrestador}/{idUltimaEntrega}/rank` |
| Despesas | GET | `/prestador/consulta/despesas/{sqEleicao}/{idPrestador}/{idUltimaEntrega}` |

Parâmetros:
- `sqEleicao` → `2045202024`
- `idPrestador` e `idUltimaEntrega` → obtidos via endpoint de prestação de contas
- `codigoOrgao` → `2` (Diretório Nacional)

Não requer autenticação, mas exige headers de browser (`User-Agent`, `Referer`, `Origin`).

---

## Frontend

Site em produção no Vercel com deploy automático via GitHub push.

Seções: Hero stats → Ranking individual (candidatos) → Ranking partidos → Destino dos recursos → Fornecedores multi-partido → Maiores beneficiários

Stack: React 19 + Vite · Supabase JS (queries diretas, sem API própria) · Geist fonts self-hosted

Docs: [`docs/frontend.md`](docs/frontend.md) · [`docs/vercel.md`](docs/vercel.md) · [`docs/supabase.md`](docs/supabase.md)

---

## Status

- [x] Endpoints TSE descobertos (engenharia reversa do Angular bundle)
- [x] Schema PostgreSQL criado no Supabase
- [x] Crawl completo executado — 155.188 despesas, 1.303 receitas, 0 erros
- [x] Materialized views criadas (6 views, todas em `supabase/migrations/`)
- [x] RLS + REVOKE configurados (anon: somente leitura em tabelas/views públicas)
- [x] Frontend React construído e em produção no Vercel
- [x] Vercel Analytics + Umami configurados
