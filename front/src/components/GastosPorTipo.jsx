import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { fmtBRL } from '../lib/fmt'
import './GastosPorTipo.css'

export default function GastosPorTipo() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    supabase
      .from('mv_despesas_tipo_partido')
      .select('*')
      .then(({ data: rows }) => {
        if (rows) setData(rows)
        setLoading(false)
      })
  }, [])

  // Partidos únicos ordenados por total de gastos
  const partidos = useMemo(() => {
    const map = {}
    for (const r of data) {
      if (!map[r.partido_numero]) map[r.partido_numero] = { numero: r.partido_numero, sigla: r.sigla, total: 0 }
      map[r.partido_numero].total += Number(r.total || 0)
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [data])

  // Seleciona o primeiro partido ao carregar
  useEffect(() => {
    if (partidos.length && !selected) setSelected(partidos[0].numero)
  }, [partidos])

  // Tipos do partido selecionado
  const tipos = useMemo(() => {
    const rows = data.filter(r => r.partido_numero === selected)
    const max = rows[0] ? Number(rows[0].total) : 1
    return rows.map(r => ({ ...r, barW: (Number(r.total) / max) * 100 }))
  }, [data, selected])

  return (
    <section className="gastos-section">
      <div className="section-inner">
        <p className="section-eyebrow">Prioridades de gasto</p>
        <h2 className="section-title">O que cada partido priorizou?</h2>
        <p className="section-desc">
          Breakdown das despesas operacionais por categoria — excluindo repasses a candidatos.
          Selecione um partido para ver onde o dinheiro foi.
        </p>
        <hr className="section-rule" />

        {loading ? (
          <div className="gastos-skeleton">
            <div className="skeleton" style={{ height: 48, borderRadius: 8, marginBottom: 16 }} />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 44, borderRadius: 6, marginBottom: 4 }} />
            ))}
          </div>
        ) : (
          <>
            <div className="gastos-selector">
              {partidos.map(p => (
                <button
                  key={p.numero}
                  className={`gastos-btn mono ${selected === p.numero ? 'active' : ''}`}
                  onClick={() => setSelected(p.numero)}
                >
                  {p.sigla}
                </button>
              ))}
            </div>

            <div className="gastos-list">
              {tipos.map((r, i) => (
                <div
                  key={r.tipo_despesa}
                  className="gastos-row"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="gastos-left">
                    <span className="gastos-tipo">{r.tipo_despesa}</span>
                    <div className="bar-track gastos-bar">
                      <div className="bar-fill" style={{ width: `${r.barW}%` }} />
                    </div>
                  </div>
                  <span className="gastos-valor mono">{fmtBRL(r.total)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
