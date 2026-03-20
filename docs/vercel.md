# Vercel — Guia de Deploy

Projeto: `politiko` · Repositório: `github.com/uphiago/politiko`

---

## Como funciona

O deploy é **automático**: qualquer push para `main` dispara um build no Vercel.

```
git add .
git commit -m "feat: ..."
git push origin main
# → Vercel detecta o push e faz build+deploy automaticamente
```

O Vercel lê o arquivo `vercel.json` na raiz do repositório:

```json
{
  "buildCommand": "cd front && npm run build",
  "outputDirectory": "front/dist",
  "installCommand": "cd front && npm install"
}
```

---

## Variáveis de ambiente

Configurar em: **Vercel → Project → Settings → Environment Variables**

| Variável | Valor | Escopo |
|----------|-------|--------|
| `VITE_SUPABASE_URL` | `https://gevgknnlvepsulkvnewt.supabase.co` | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` (chave anon do Supabase) | Production, Preview |

> Variáveis com prefixo `VITE_` são expostas ao bundle do browser. **Nunca** colocar a service key ou DATABASE_URL aqui.

---

## Deploy manual (sem push)

```bash
cd /home/g15/repositories/homelab/channel/politiko
vercel --prod
```

Requer Vercel CLI instalado e autenticado:

```bash
npm i -g vercel
vercel login
```

---

## Build local (para testar antes do push)

```bash
cd front
npm install
npm run build      # gera front/dist/
npm run preview    # serve front/dist/ localmente
```

---

## Estrutura do projeto no Vercel

- **Framework:** Vite (detectado automaticamente)
- **Root directory:** `/` (raiz do repo, não `front/`)
- **Build output:** `front/dist/`
- **Routing:** SPA — todas as rotas servem `index.html` (padrão Vite)

---

## Analytics

O projeto usa dois sistemas de analytics:

### Vercel Analytics + Speed Insights
Instalados em `front/src/main.jsx`:
```jsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
```
Dashboard: vercel.com → Project → Analytics

### Umami (self-hosted)
Script adicionado no `front/index.html`.
Dashboard público: `https://cloud.umami.is/share/mCM0K6eRHTKpu4qL`
Link no rodapé do site → "estatísticas do site →"

---

## Solução de problemas

### Build falha no Vercel mas passa local

1. Checar se as `VITE_` env vars estão configuradas no painel
2. Checar se `vercel.json` está na raiz do repo (não dentro de `front/`)
3. Ver logs em Vercel → Deployments → (build com erro) → View Logs

### `.vercel/project.json` deve estar na raiz

```json
{
  "orgId": "...",
  "projectId": "..."
}
```

Se não existir, o Vercel não associa o GitHub push ao projeto correto.

### Mudança de env var não reflete

Env vars do Vercel só entram no bundle em novos builds. Após alterar, fazer redeploy:
```bash
vercel --prod
# ou push qualquer commit
```
