import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { fmtBRL, fmtBRLFull, fmtNum } from '../lib/fmt'
import { LOGOS } from '../lib/logos'
import './PartidoModal.css'

function ModalLogo({ sigla }) {
  const [failed, setFailed] = useState(false)
  const src = LOGOS[sigla]
  if (!src || failed) return null
  return (
    <span className="pm-logo-wrap">
      <img src={src} alt={sigla} className="pm-logo-img" onError={() => setFailed(true)} />
    </span>
  )
}

const TABS = [
  { id: 'receitas', label: 'Receitas' },
  { id: 'despesas', label: 'Top Despesas' },
  { id: 'repasses', label: 'Repasses' },
]

const REPASSE_TIPOS = [
  'Doações financeiras a outros candidatos/partidos',
  'Doações de outros bens ou serviços a candidatos/partidos',
]

export default function PartidoModal({ partido, onClose }) {
  const [tab, setTab] = useState('receitas')
  const [receitas, setReceitas] = useState(null)
  const [despesas, setDespesas] = useState(null)
  const [repasses, setRepasses] = useState(null)
  const [closing, setClosing] = useState(false)
  const overlayRef = useRef(null)

  const handleClose = () => {
    setClosing(true)
    setTimeout(onClose, 210)
  }

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    if (!partido.id_prestador) return

    supabase
      .from('receitas')
      .select('tipo_receita, doador_nome, valor, data_receita')
      .eq('partido_numero', partido.numero)
      .eq('tipo_consulta', 'lista')
      .order('valor', { ascending: false })
      .limit(40)
      .then(({ data }) => setReceitas(data ?? []))

    supabase
      .from('despesas')
      .select('tipo_despesa, beneficiario_nome, beneficiario_cnpj, valor, data_despesa, descricao_despesa')
      .eq('partido_numero', partido.numero)
      .not('tipo_despesa', 'in', `(${REPASSE_TIPOS.map(t => `"${t}"`).join(',')})`)
      .order('valor', { ascending: false })
      .limit(40)
      .then(({ data }) => setDespesas(data ?? []))

    supabase
      .from('despesas')
      .select('beneficiario_nome, beneficiario_cnpj, valor, tipo_despesa')
      .eq('partido_numero', partido.numero)
      .in('tipo_despesa', REPASSE_TIPOS)
      .order('valor', { ascending: false })
      .limit(40)
      .then(({ data }) => setRepasses(data ?? []))
  }, [partido])

  const clickOverlay = e => { if (e.target === overlayRef.current) handleClose() }

  const totalR = Number(partido.total_receitas || 0)
  const totalD = Number(partido.total_despesas_real || 0)
  const pctPublico = totalR
    ? (() => {
        const pf = Number(partido.total_pf || 0)
        const prop = Number(partido.total_proprios || 0)
        return (((totalR - pf - prop) / totalR) * 100).toFixed(0)
      })()
    : '—'

  return (
    <div className={`pm-overlay${closing ? ' closing' : ''}`} ref={overlayRef} onClick={clickOverlay}>
      <div className={`pm-panel${closing ? ' closing' : ''}`} role="dialog" aria-modal>
        <div className="pm-header">
          <div className="pm-id">
            <ModalLogo sigla={partido.sigla} />
            <span className="pm-sigla pixel">{partido.sigla}</span>
            <span className="pm-nome">{partido.nome}</span>
          </div>
          <button className="pm-close" onClick={handleClose} aria-label="fechar">✕</button>
        </div>

        <div className="pm-summary">
          <div className="pm-stat">
            <span className="pm-stat-label">receitas</span>
            <span className="pm-stat-val mono green">{fmtBRL(totalR)}</span>
          </div>
          <div className="pm-stat-sep" />
          <div className="pm-stat">
            <span className="pm-stat-label">despesas</span>
            <span className="pm-stat-val mono red">{fmtBRL(totalD)}</span>
          </div>
          <div className="pm-stat-sep" />
          <div className="pm-stat">
            <span className="pm-stat-label">% dinheiro público</span>
            <span className="pm-stat-val mono">{pctPublico}%</span>
          </div>
          {partido.total_pf > 0 && (
            <>
              <div className="pm-stat-sep" />
              <div className="pm-stat">
                <span className="pm-stat-label">doações PF</span>
                <span className="pm-stat-val mono amber">{fmtBRL(partido.total_pf)}</span>
              </div>
            </>
          )}
        </div>

        <div className="pm-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`pm-tab mono ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="pm-body">
          <div key={tab} className="pm-content-wrap">
            {tab === 'receitas' && <ReceitasTab rows={receitas} />}
            {tab === 'despesas' && <DespesasTab rows={despesas} />}
            {tab === 'repasses' && <RepassesTab rows={repasses} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReceitasTab({ rows }) {
  if (!rows) return <p className="pm-loading mono">carregando…</p>
  if (!rows.length) return <p className="pm-empty">Nenhuma receita itemizada.</p>

  const total = rows.reduce((s, r) => s + Number(r.valor || 0), 0)
  const byTipo = {}
  for (const r of rows) {
    const k = r.tipo_receita || 'Outro'
    byTipo[k] = (byTipo[k] || 0) + Number(r.valor || 0)
  }

  return (
    <div className="pm-content">
      <div className="pm-subtotals">
        {Object.entries(byTipo).sort((a, b) => b[1] - a[1]).map(([tipo, val]) => (
          <div key={tipo} className="pm-subtotal">
            <span className="pm-subtotal-tipo">{tipo}</span>
            <span className="pm-subtotal-val mono">{fmtBRL(val)}</span>
          </div>
        ))}
      </div>
      <table className="pm-table">
        <thead>
          <tr>
            <th>Doador / Origem</th>
            <th>Tipo</th>
            <th className="r">Valor</th>
            <th className="r">Data</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="pm-td-main">{r.doador_nome || '—'}</td>
              <td className="pm-td-muted">{r.tipo_receita || '—'}</td>
              <td className="r mono green">{fmtBRLFull(r.valor)}</td>
              <td className="r mono pm-td-date">{r.data_receita || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DespesasTab({ rows }) {
  if (!rows) return <p className="pm-loading mono">carregando…</p>
  if (!rows.length) return <p className="pm-empty">Nenhuma despesa operacional encontrada.</p>

  return (
    <div className="pm-content">
      <p className="pm-note">Despesas operacionais — exclui repasses a candidatos e partidos.</p>
      <table className="pm-table">
        <thead>
          <tr>
            <th>Fornecedor</th>
            <th>Tipo</th>
            <th className="r">Valor</th>
            <th className="r">Data</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="pm-td-main">{r.beneficiario_nome || '—'}</td>
              <td className="pm-td-muted">{r.tipo_despesa || '—'}</td>
              <td className="r mono red">{fmtBRLFull(r.valor)}</td>
              <td className="r mono pm-td-date">{r.data_despesa || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RepassesTab({ rows }) {
  if (!rows) return <p className="pm-loading mono">carregando…</p>
  if (!rows.length) return <p className="pm-empty">Nenhum repasse encontrado.</p>

  const total = rows.reduce((s, r) => s + Number(r.valor || 0), 0)

  return (
    <div className="pm-content">
      <p className="pm-note">
        Total repassado: <span className="mono red">{fmtBRL(total)}</span> — transferências a candidatos e filiais.
      </p>
      <table className="pm-table">
        <thead>
          <tr>
            <th>Beneficiário</th>
            <th>CNPJ</th>
            <th className="r">Valor</th>
            <th className="r">Data</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="pm-td-main">{r.beneficiario_nome || '—'}</td>
              <td className="pm-td-muted">{r.beneficiario_cnpj || '—'}</td>
              <td className="r mono red">{fmtBRLFull(r.valor)}</td>
              <td />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
