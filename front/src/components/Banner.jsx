import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fmtNum, fmtBRLLong } from '../lib/fmt'
import './Banner.css'

export default function Banner() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    supabase
      .from('mv_ranking_partidos')
      .select('total_receitas, total_despesas_real, num_despesas')
      .then(({ data }) => {
        if (!data) return
        const totalR = data.reduce((s, r) => s + Number(r.total_receitas || 0), 0)
        const totalD = data.reduce((s, r) => s + Number(r.total_despesas_real || 0), 0)
        const numDespesas = data.reduce((s, r) => s + Number(r.num_despesas || 0), 0)
        const comContas = data.filter(r => r.total_receitas).length
        setStats({ totalR, totalD, numDespesas, comContas })
      })
  }, [])

  return (
    <div className="banner">
      <div className="banner-inner">
        <p className="banner-eyebrow mono">eleições municipais 2024 · brasil</p>

        <div className="banner-hero">
          <p className="banner-label mono">total gasto pelos partidos nas urnas</p>
          <div className="banner-number-wrap">
            <span className="banner-number pixel">
              {stats
                ? fmtBRLLong(stats.totalD)
                : <span className="skeleton" style={{ width: 320, height: 72, display: 'inline-block', borderRadius: 6 }} />
              }
            </span>
          </div>
          <p className="banner-statement">
            do seu dinheiro nas eleições municipais de 2024 — declarado ao TSE pelos partidos brasileiros.
            <br /><strong>Mais de 99% saiu direto do orçamento federal.</strong>
          </p>
        </div>

        {stats && (
          <div className="banner-stats">
            <div className="banner-stat">
              <span className="banner-stat-val mono">{fmtBRLLong(stats.totalR)}</span>
              <span className="banner-stat-label">total arrecadado</span>
            </div>
            <div className="banner-stat">
              <span className="banner-stat-val mono">{fmtNum(stats.numDespesas)}</span>
              <span className="banner-stat-label">despesas registradas</span>
            </div>
            <div className="banner-stat">
              <span className="banner-stat-val mono">{stats.comContas}</span>
              <span className="banner-stat-label">partidos com contas</span>
            </div>
            <div className="banner-stat accent">
              <span className="banner-stat-val mono red">+99%</span>
              <span className="banner-stat-label">dinheiro público</span>
            </div>
          </div>
        )}

        <p className="banner-scroll mono">
          <span className="banner-scroll-arrow">↓</span>
          role para explorar os dados
        </p>
      </div>
    </div>
  )
}
