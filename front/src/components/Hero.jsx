import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import './Hero.css'

export default function Hero() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    supabase
      .from('prestacoes_contas')
      .select('total_receitas, total_despesas')
      .then(({ data }) => {
        if (!data) return
        const totalR = data.reduce((s, r) => s + (r.total_receitas || 0), 0)
        const totalD = data.reduce((s, r) => s + (r.total_despesas || 0), 0)
        setStats({ partidos: data.length, receitas: totalR, despesas: totalD })
      })
  }, [])

  const fmt = (v) =>
    v == null
      ? '—'
      : 'R$ ' + (v / 1e9).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' bi'

  return (
    <section className="hero">
      <div className="hero-inner section-inner">
        <p className="section-label">Eleições 2024 · Brasil</p>
        <h1 className="hero-title pixel">
          Contas dos<br /><span>partidos</span><br />em dados
        </h1>
        <p className="hero-desc">
          Dados abertos do TSE. Receitas, despesas e fornecedores de todos os
          partidos com prestação de contas nas eleições municipais de 2024.
        </p>
        {stats && (
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value mono">{stats.partidos}</span>
              <span className="hero-stat-label">partidos</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value mono">{fmt(stats.receitas)}</span>
              <span className="hero-stat-label">em receitas</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value mono">{fmt(stats.despesas)}</span>
              <span className="hero-stat-label">em despesas</span>
            </div>
          </div>
        )}
        <p className="hero-cta">Clique em um partido para explorar ↓</p>
      </div>
    </section>
  )
}
