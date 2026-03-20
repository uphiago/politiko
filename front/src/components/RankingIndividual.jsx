import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fmtBRL, fmtNum } from '../lib/fmt'
import './RankingIndividual.css'

export default function RankingIndividual() {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(10)

  useEffect(() => {
    supabase
      .from('mv_candidatos_ranking')
      .select('*')
      .order('total_recebido', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (data) setRows(data)
        setLoading(false)
      })
  }, [])

  const visible = rows.slice(0, visibleCount)
  const max = rows[0]?.total_recebido ? Number(rows[0].total_recebido) : 1

  return (
    <section className="rki-section">
      <div className="section-inner">
        <p className="section-eyebrow">Ranking individual</p>
        <h2 className="section-title">Quem mais recebeu dos partidos?</h2>
        <p className="section-desc">
          Candidatos e comitês que receberam os maiores repasses diretos dos partidos nacionais
          nas eleições municipais de 2024.
        </p>
        <hr className="section-rule" />

        {loading ? (
          <div className="rki-skeleton">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 58, borderRadius: 6, marginBottom: 4 }} />
            ))}
          </div>
        ) : (
          <>
            <div className="rki-list">
              {visible.map((r, i) => {
                const val  = Number(r.total_recebido || 0)
                const barW = (val / max) * 100

                return (
                  <div
                    key={r.id_key || i}
                    className="rki-row"
                    style={{ animationDelay: `${i * 25}ms` }}
                  >
                    <span className="rki-rank mono">#{i + 1}</span>

                    <div className="rki-main">
                      <div className="rki-head">
                        <span className="rki-nome">{r.candidato_nome || '—'}</span>
                        {r.num_partidos > 1 && (
                          <span className="rki-multi-badge mono">
                            {r.num_partidos} partidos
                          </span>
                        )}
                      </div>

                      <div className="rki-siglas">
                        {(r.siglas || []).map(s => (
                          <span key={s} className="rki-sigla mono">{s}</span>
                        ))}
                      </div>

                      <div className="bar-track rki-bar">
                        <div className="bar-fill" style={{ width: `${barW}%` }} />
                      </div>
                    </div>

                    <div className="rki-right">
                      <span className="rki-valor mono">{fmtBRL(val)}</span>
                      <span className="rki-trans mono">{fmtNum(r.num_transferencias)} transf.</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {visibleCount < rows.length && (
              <button className="rki-more" onClick={() => setVisibleCount(c => c + 10)}>
                ↓ mostrar mais 10 candidatos
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}
