import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PartidoModal from './PartidoModal'
import './Partidos.css'

const fmtBRL = (v) =>
  v == null
    ? '—'
    : v >= 1e9
    ? 'R$ ' + (v / 1e9).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' bi'
    : 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' mi'

export default function Partidos() {
  const [partidos, setPartidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    supabase
      .from('partidos')
      .select(`
        numero, sigla, nome,
        prestacoes_contas ( total_receitas, total_despesas, id_prestador, id_ultima_entrega )
      `)
      .order('sigla')
      .then(({ data }) => {
        if (!data) return
        const rows = data.map((p) => ({
          ...p,
          pc: p.prestacoes_contas?.[0] ?? null,
        }))
        rows.sort((a, b) => (b.pc?.total_receitas ?? -1) - (a.pc?.total_receitas ?? -1))
        setPartidos(rows)
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <section className="partidos-section">
      <div className="section-inner">
        <div className="partidos-loading mono">carregando partidos…</div>
      </div>
    </section>
  )

  return (
    <section className="partidos-section">
      <div className="section-inner">
        <p className="section-label">Partidos</p>
        <h2 className="section-title">Quem <span>arrecadou</span> mais?</h2>
        <p className="section-desc">
          29 partidos com prestação de contas entregue ao TSE. Clique para ver
          receitas, despesas e maiores fornecedores.
        </p>
        <div className="partidos-grid">
          {partidos.map((p, i) => (
            <button key={p.numero} className="partido-card" onClick={() => setSelected(p)}>
              <div className="partido-card-rank mono">#{i + 1}</div>
              <div className="partido-card-sigla pixel">{p.sigla}</div>
              <div className="partido-card-nome">{p.nome}</div>
              <div className="partido-card-divider" />
              <div className="partido-card-stat">
                <span className="partido-card-stat-label">receitas</span>
                <span className="partido-card-stat-value mono">
                  {fmtBRL(p.pc?.total_receitas)}
                </span>
              </div>
              <div className="partido-card-stat">
                <span className="partido-card-stat-label">despesas</span>
                <span className="partido-card-stat-value mono">
                  {fmtBRL(p.pc?.total_despesas)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
      {selected && (
        <PartidoModal partido={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  )
}
