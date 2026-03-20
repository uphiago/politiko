import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fmtBRL, fmtNum } from '../lib/fmt'
import './Destino.css'

const REPASSE_TIPOS = [
  'Doações financeiras a outros candidatos/partidos',
  'Doações de outros bens ou serviços a candidatos/partidos',
]

export default function Destino() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    supabase
      .from('mv_despesas_por_tipo')
      .select('*')
      .then(({ data }) => {
        if (data) setRows(data)
        setLoading(false)
      })
  }, [])

  const total = rows.reduce((s, r) => s + Number(r.total || 0), 0)
  const totalRepasse = rows
    .filter(r => REPASSE_TIPOS.includes(r.tipo_despesa))
    .reduce((s, r) => s + Number(r.total || 0), 0)
  const repasePct = total ? ((totalRepasse / total) * 100).toFixed(1).replace('.', ',') : '—'

  const visible = showAll ? rows : rows.slice(0, 8)

  return (
    <section className="destino-section">
      <div className="section-inner">
        <p className="section-eyebrow">Destino dos recursos</p>
        <h2 className="section-title">Para onde foi o dinheiro?</h2>
        <p className="section-desc">
          {repasePct}% de tudo que os partidos gastaram foram <strong>repasses diretos a candidatos e partidos estaduais/municipais</strong>.
          A função dos partidos nacionais é, na prática, redistribuir o fundo público.
        </p>
        <hr className="section-rule" />

        {loading ? (
          <div className="destino-skeleton">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 52, borderRadius: 6, marginBottom: 4 }} />
            ))}
          </div>
        ) : (
          <>
            <div className="destino-list">
              {visible.map((r, i) => {
                const val = Number(r.total || 0)
                const pct = total ? (val / total) * 100 : 0
                const isRepasse = REPASSE_TIPOS.includes(r.tipo_despesa)

                return (
                  <div key={r.tipo_despesa} className={`destino-row ${isRepasse ? 'repasse' : ''}`}>
                    <div className="destino-left">
                      <div className="destino-head">
                        <span className="destino-tipo">{r.tipo_despesa}</span>
                        {isRepasse && <span className="destino-badge mono">repasse</span>}
                        <span className="destino-count mono">{fmtNum(r.num_registros)} registros</span>
                      </div>
                      <div className="destino-bar-row">
                        <div className="bar-track destino-bar">
                          <div
                            className={`bar-fill ${isRepasse ? 'red' : 'amber'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="destino-pct mono">{pct.toFixed(1).replace('.', ',')}%</span>
                      </div>
                    </div>
                    <span className="destino-valor mono">{fmtBRL(val)}</span>
                  </div>
                )
              })}
            </div>

            {rows.length > 8 && (
              <button className="destino-more" onClick={() => setShowAll(v => !v)}>
                {showAll ? '↑ mostrar menos' : `↓ mostrar mais ${rows.length - 8} categorias`}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}
