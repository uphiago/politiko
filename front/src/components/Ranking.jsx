import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fmtBRL } from '../lib/fmt'
import { LOGOS } from '../lib/logos'
import PartidoModal from './PartidoModal'
import './Ranking.css'

function LogoPartido({ sigla, size = 'sm' }) {
  const [failed, setFailed] = useState(false)
  const src = LOGOS[sigla]
  if (!src || failed) {
    return <span className="rk-sigla pixel">{sigla}</span>
  }
  return (
    <span className={`rk-logo-wrap rk-logo-${size}`}>
      <img
        src={src}
        alt={sigla}
        className="rk-logo-img"
        onError={() => setFailed(true)}
      />
    </span>
  )
}

export default function Ranking() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    supabase
      .from('mv_ranking_partidos')
      .select('*')
      .then(({ data }) => {
        if (data) setRows(data)
        setLoading(false)
      })
  }, [])

  const total = rows.reduce((s, r) => s + Number(r.total_receitas || 0), 0)
  const max   = rows[0]?.total_receitas ? Number(rows[0].total_receitas) : 1

  return (
    <section className="ranking-section">
      <div className="section-inner">
        <p className="section-eyebrow">Ranking</p>
        <h2 className="section-title">Quem recebeu mais?</h2>
        <p className="section-desc">
          Total arrecadado por cada partido nas eleições municipais de 2024.
          Clique em um partido para ver receitas, despesas e repasses.
        </p>
        <hr className="section-rule" />

        {loading ? (
          <div className="ranking-skeleton">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 58, borderRadius: 6, marginBottom: 4 }} />
            ))}
          </div>
        ) : (
          <div className="ranking-list">
            {rows.map((r, i) => {
              const val     = Number(r.total_receitas || 0)
              const pct     = total ? (val / total) * 100 : 0
              const barW    = max ? (val / max) * 100 : 0
              const hasData = val > 0
              const valorStr = fmtBRL(r.total_receitas)

              return (
                <button
                  key={r.numero}
                  className={`ranking-row ${hasData ? 'clickable' : 'no-data'}`}
                  style={{ animationDelay: `${i * 35}ms` }}
                  onClick={() => hasData && setSelected(r)}
                  disabled={!hasData}
                >
                  <span className="rk-pos mono">#{i + 1}</span>

                  <LogoPartido sigla={r.sigla} size="sm" />

                  <div className="rk-center">
                    <div className="rk-top">
                      <span className="rk-nome">{r.nome}</span>
                      {hasData && <span className="rk-valor-mobile mono">{valorStr}</span>}
                      {hasData && <span className="rk-caret-mobile mono" aria-hidden>ver →</span>}
                    </div>
                    {hasData ? (
                      <div className="rk-bar-row">
                        <div className="bar-track rk-bar">
                          <div className="bar-fill" style={{ width: `${barW}%` }} />
                        </div>
                        <span className="rk-pct mono">{pct.toFixed(1).replace('.', ',')}%</span>
                      </div>
                    ) : (
                      <span className="rk-sem mono">sem prestação de contas</span>
                    )}
                  </div>

                  {hasData ? (
                    <div className="rk-values">
                      <span className="rk-valor mono">{valorStr}</span>
                      <span className="rk-desp mono">{fmtBRL(r.total_despesas_real)} gastos</span>
                      <span className="rk-caret mono" aria-hidden>ver →</span>
                    </div>
                  ) : (
                    <div />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selected && (
        <PartidoModal partido={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  )
}
