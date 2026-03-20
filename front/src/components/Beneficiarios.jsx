import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fmtBRL, fmtNum } from '../lib/fmt'
import './Beneficiarios.css'

function classifyBenef(nome) {
  if (!nome) return 'outro'
  const n = nome.toUpperCase()
  if (n.includes('ELEICAO') || n.includes('ELEIÇÃO') || n.includes('PREFEITO') || n.includes('VEREADOR') || n.includes('VICE-PREFEITO')) return 'candidato'
  if (n.includes('PARTIDO') || n.includes('ESTADUAL') || n.includes('MUNICIPAL') || n.includes('DIRETORIO') || n.includes('DIRETÓRIO')) return 'partido'
  return 'empresa'
}

const CLASS_LABEL = {
  candidato: 'candidato',
  partido: 'filial',
  empresa: 'empresa',
  outro: 'outro',
}

const CLASS_COLOR = {
  candidato: 'red',
  partido: 'amber',
  empresa: 'blue',
  outro: '',
}

export default function Beneficiarios() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('mv_top_beneficiarios')
      .select('*')
      .then(({ data }) => {
        if (data) setRows(data)
        setLoading(false)
      })
  }, [])

  const max = rows[0]?.total ? Number(rows[0].total) : 1

  return (
    <section className="benef-section">
      <div className="section-inner">
        <p className="section-eyebrow">Maiores beneficiários</p>
        <h2 className="section-title">Quem recebeu os repasses?</h2>
        <p className="section-desc">
          Os maiores destinatários do dinheiro público redistribuído pelos partidos nacionais.
          A maioria são filiais estaduais dos próprios partidos ou contas de campanha de candidatos.
        </p>
        <hr className="section-rule" />

        {loading ? (
          <div className="benef-skeleton">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 56, borderRadius: 6, marginBottom: 4 }} />
            ))}
          </div>
        ) : (
          <div className="benef-list">
            {rows.map((r, i) => {
              const val = Number(r.total || 0)
              const barW = (val / max) * 100
              const cls = classifyBenef(r.beneficiario_nome)

              return (
                <div key={`${r.beneficiario_nome}-${i}`} className="benef-row">
                  <span className="benef-rank mono">#{i + 1}</span>

                  <div className="benef-main">
                    <div className="benef-head">
                      <span className="benef-nome">{r.beneficiario_nome}</span>
                      <span className={`benef-cls mono ${CLASS_COLOR[cls]}`}>{CLASS_LABEL[cls]}</span>
                    </div>
                    {r.beneficiario_cnpj && (
                      <span className="benef-cnpj mono">{r.beneficiario_cnpj}</span>
                    )}
                    <div className="bar-track benef-bar">
                      <div
                        className={`bar-fill ${CLASS_COLOR[cls] || ''}`}
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                  </div>

                  <div className="benef-right">
                    <span className="benef-valor mono">{fmtBRL(val)}</span>
                    <span className="benef-pag mono">{fmtNum(r.num_pagamentos)} pag.</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
