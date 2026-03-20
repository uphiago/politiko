import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fmtBRL, fmtNum } from '../lib/fmt'
import './Empresas.css'

export default function Empresas() {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(10)

  useEffect(() => {
    supabase
      .from('mv_empresas_multiplos')
      .select('*')
      .order('num_partidos', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        if (data) setRows(data)
        setLoading(false)
      })
  }, [])

  const visible = rows.slice(0, visibleCount)

  return (
    <section className="empresas-section">
      <div className="section-inner">
        <p className="section-eyebrow">Fornecedores do sistema</p>
        <h2 className="section-title">Quem serve a todos os partidos?</h2>
        <p className="section-desc">
          Empresas e prestadores que receberam dinheiro de múltiplos partidos simultaneamente.
          São os fornecedores do sistema eleitoral — independente de ideologia.
        </p>
        <hr className="section-rule" />

        {loading ? (
          <div className="empresas-skeleton">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 64, borderRadius: 8, marginBottom: 6 }} />
            ))}
          </div>
        ) : (
          <>
            <div className="empresas-list">
              {visible.map((r, i) => (
                <div
                  key={r.beneficiario_cnpj}
                  className="empresa-row"
                  style={{ animationDelay: `${i * 25}ms` }}
                >
                  <span className="empresa-rank mono">#{i + 1}</span>

                  <div className="empresa-main">
                    <div className="empresa-head">
                      <span className="empresa-nome">{r.beneficiario_nome || '—'}</span>
                      <span className="empresa-partidos-badge mono">
                        {r.num_partidos} partido{r.num_partidos > 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="empresa-cnpj mono">{r.beneficiario_cnpj}</span>
                    <div className="empresa-siglas">
                      {(r.siglas || []).map(s => (
                        <span key={s} className="empresa-sigla mono">{s}</span>
                      ))}
                    </div>
                  </div>

                  <div className="empresa-right">
                    <span className="empresa-valor mono">{fmtBRL(r.total)}</span>
                    <span className="empresa-regs mono">{fmtNum(r.num_registros)} pag.</span>
                  </div>
                </div>
              ))}
            </div>

            {visibleCount < rows.length && (
              <button className="empresas-more" onClick={() => setVisibleCount(c => c + 10)}>
                ↓ mostrar mais 10 fornecedores
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}
