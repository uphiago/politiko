# Frontend — Guia de componentes e dados

Stack: React 19 + Vite · Supabase JS · Geist fonts (self-hosted)

---

## Estrutura de componentes

```
App.jsx
├── Header              (estático)
├── Banner              → mv_ranking_partidos
├── RankingIndividual   → mv_candidatos_ranking
├── Ranking             → mv_ranking_partidos + PartidoModal
│   └── PartidoModal    → receitas, despesas (queries diretas)
├── Destino             → mv_despesas_por_tipo
├── Empresas            → mv_empresas_multiplos
├── Beneficiarios       → mv_top_beneficiarios
└── Footer              (estático)
```

---

## Mapa de componentes × views

| Componente | View/Tabela | Campos usados |
|------------|-------------|---------------|
| **Banner** | `mv_ranking_partidos` | `total_receitas`, `total_despesas_real`, `num_despesas` |
| **RankingIndividual** | `mv_candidatos_ranking` | `id_key`, `candidato_nome`, `candidato_doc`, `num_partidos`, `siglas`, `total_recebido`, `num_transferencias` |
| **Ranking** | `mv_ranking_partidos` | `numero`, `sigla`, `nome`, `total_receitas`, `total_despesas_real`, `num_despesas` |
| **PartidoModal / Receitas** | `receitas` | `doador_nome`, `doador_documento`, `valor`, `tipo_receita` (filter: `tipo_consulta='lista'`) |
| **PartidoModal / Despesas** | `despesas` | `beneficiario_nome`, `beneficiario_cnpj`, `valor`, `tipo_despesa`, `data_despesa` (exclui repasses) |
| **PartidoModal / Repasses** | `despesas` | mesmo, filter: `tipo_despesa IN (repasse types)` |
| **Destino** | `mv_despesas_por_tipo` | `tipo_despesa`, `total`, `num_registros` |
| **Empresas** | `mv_empresas_multiplos` | `beneficiario_nome`, `beneficiario_cnpj`, `num_partidos`, `total`, `num_registros`, `siglas` |
| **Beneficiarios** | `mv_top_beneficiarios` | `beneficiario_nome`, `beneficiario_cnpj`, `total`, `num_pagamentos` |

---

## Formatadores (`front/src/lib/fmt.js`)

| Função | Uso | Exemplo |
|--------|-----|---------|
| `fmtBRL(v)` | Valores compactos em listas | `R$ 1,2 mi`, `R$ 5,2 bi` |
| `fmtBRLLong(v)` | Títulos e destaques | `R$ 5,19 bilhões` |
| `fmtBRLFull(v)` | Tabelas com valor exato | `R$ 1.234.567,89` |
| `fmtPct(v, total)` | Percentual relativo | `23,4%` |
| `fmtNum(v)` | Contagens | `155.188` |

---

## Logos dos partidos (`front/src/lib/logos.js`)

Mapa `{ sigla: url }` com ~35 partidos. Fontes:
- CMC Curitiba: `https://www.cmc.pr.gov.br/...`
- GitHub TheBlackwing21: `https://raw.githubusercontent.com/TheBlackwing21/Logos-Partidos/main/...`

Aliases: `'PC do B'` → mesma URL que `PCdoB`, `PODE` → PODEMOS.

Fallback: se logo não existir ou falhar load, mostra sigla em texto (`GeistPixel`).

---

## Sistema visual (`front/src/index.css`)

### Variáveis de cor

```css
--bg:           #080808   /* fundo global */
--surface:      #171717   /* cards, rows com hover */
--surface-2:    #212121   /* hover state, modal header */
--border:       rgba(255,255,255,0.11)
--border-hover: rgba(255,255,255,0.24)
--text:         #f2f2f2
--text-muted:   rgba(255,255,255,0.62)  /* textos secundários */
--text-faint:   rgba(255,255,255,0.40)  /* rank, cnpj, datas */
--red:          #e63946
--red-dim:      rgba(230,57,70,0.14)    /* badge background */
--red-mid:      rgba(230,57,70,0.40)    /* badge border */
--green:        #2ecc71
--amber:        #f4a261
--blue:         #4895ef
```

### Componentes globais

- `.bar-track` / `.bar-fill` — barra de progresso (8px altura)
- `.skeleton` — shimmer de loading
- `.section-eyebrow` — label vermelho uppercase acima do título
- `.section-title` — título GeistPixel (44px desktop)
- `.section-desc` — descrição muted (max 580px)
- `.section-rule` — `<hr>` separador
- `.pixel` / `.mono` — classes de fonte utilitárias

### Separação visual entre seções

```css
section:nth-child(even) { background: var(--surface); }
```

---

## Padrão de novo componente

Para adicionar uma nova seção:

1. Criar `front/src/components/MinhaSecao.jsx` e `MinhaSecao.css`
2. Seguir estrutura:
```jsx
export default function MinhaSecao() {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(10)

  useEffect(() => {
    supabase.from('mv_minha_view').select('*').then(({ data }) => {
      if (data) setRows(data)
      setLoading(false)
    })
  }, [])

  const visible = rows.slice(0, visibleCount)

  return (
    <section className="minha-section">
      <div className="section-inner">
        <p className="section-eyebrow">Label</p>
        <h2 className="section-title">Título</h2>
        <p className="section-desc">Descrição</p>
        <hr className="section-rule" />

        {loading ? (
          <SkeletonPlaceholder />
        ) : (
          <>
            {visible.map((r, i) => (
              <div key={r.id} className="minha-row" style={{ animationDelay: `${i * 25}ms` }}>
                ...
              </div>
            ))}
            {visibleCount < rows.length && (
              <button className="minha-more" onClick={() => setVisibleCount(c => c + 10)}>
                ↓ mostrar mais 10
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}
```

3. Importar e adicionar em `App.jsx` na posição certa
4. Criar a materialized view correspondente em `supabase/migrations/`
5. Rodar a migration via psycopg2 (ver `docs/supabase.md`)

---

## Animações

- **Scroll reveal:** `IntersectionObserver` em `App.jsx` adiciona `.visible` nas sections → fade + translateY
- **Fallback:** `@keyframes section-fallback` garante visibilidade após 2s caso o observer não dispare
- **Row stagger:** `animationDelay: ${i * 25}ms` inline em cada row
- **Modal open/close:** estado `closing` + setTimeout(210ms) para animar saída antes de desmontar
- **Scroll arrow:** `@keyframes arrow-bounce` no Banner

---

## Env vars (frontend)

Devem ter prefixo `VITE_` para serem expostas ao bundle:

```
VITE_SUPABASE_URL=https://gevgknnlvepsulkvnewt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Local: arquivo `front/.env.local` (não commitar)
Produção: Vercel → Settings → Environment Variables
