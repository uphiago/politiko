import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fmtBRL, fmtPct } from '../lib/fmt'
import './Origem.css'

const COLORS = ['red', 'amber', 'blue', 'green']

export default function Origem() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('mv_receitas_por_tipo')
      .select('*')
      .then(({ data }) => {
        if (data) setRows(data)
        setLoading(false)
      })
  }, [])

  const total = rows.reduce((s, r) => s + Number(r.total || 0), 0)

  return (
    <section className="origem-section">
      <div className="section-inner">
        <p className="section-eyebrow">Origem dos recursos</p>
        <h2 className="section-title">De onde vem o dinheiro?</h2>
        <p className="section-desc">
          Quase a totalidade dos recursos é proveniente de fundos públicos federais —
          o FEFC (Fundo Especial de Financiamento de Campanha) e o Fundo Partidário,
          ambos custeados pelo orçamento da União.
        </p>
        <hr className="section-rule" />

        {loading ? (
          <div className="origem-skeleton">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 72, borderRadius: 8, marginBottom: 8 }} />
            ))}
          </div>
        ) : (
          <div className="origem-list">
            {rows.map((r, i) => {
              const val = Number(r.total || 0)
              const pct = total ? (val / total) * 100 : 0
              const color = COLORS[i] || 'blue'
              const isPublico = r.tipo_receita.includes('Fundo')

              return (
                <div key={r.tipo_receita} className="origem-row">
                  <div className="origem-info">
                    <div className="origem-name-row">
                      <span className={`origem-tipo ${isPublico ? 'publico' : ''}`}>
                        {r.tipo_receita}
                      </span>
                      {isPublico && (
                        <span className="origem-badge mono">dinheiro público</span>
                      )}
                    </div>
                    <div className="bar-track origem-bar">
                      <div className={`bar-fill ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="origem-nums">
                    <span className="origem-valor mono">{fmtBRL(val)}</span>
                    <span className="origem-pct mono">{fmtPct(val, total)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="origem-nota">
          * O FEFC é rateado pelo TSE entre os partidos com representação no Congresso.
          Em 2024, foram R$ 4,97 bilhões de recursos públicos diretos para campanhas.
        </p>
      </div>
    </section>
  )
}
