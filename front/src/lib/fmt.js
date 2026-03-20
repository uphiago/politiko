export const fmtBRL = (v) => {
  if (v == null) return '—'
  const n = Number(v)
  if (n >= 1e9) return 'R$ ' + (n / 1e9).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' bi'
  if (n >= 1e6) return 'R$ ' + (n / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' mi'
  if (n >= 1e3) return 'R$ ' + (n / 1e3).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' mil'
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Versão por extenso para títulos e destaques
export const fmtBRLLong = (v) => {
  if (v == null) return '—'
  const n = Number(v)
  if (n >= 1e9) return 'R$ ' + (n / 1e9).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' bilhões'
  if (n >= 1e6) return 'R$ ' + (n / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' milhões'
  if (n >= 1e3) return 'R$ ' + (n / 1e3).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' mil'
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const fmtBRLFull = (v) => {
  if (v == null) return '—'
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const fmtPct = (v, total) => {
  if (!total) return '0,0%'
  return ((v / total) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}

export const fmtNum = (v) => {
  if (v == null) return '—'
  return Number(v).toLocaleString('pt-BR')
}
