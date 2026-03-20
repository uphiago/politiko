# Como o crawler funciona

Documentação técnica de como descobrimos e acessamos a API do TSE.

---

## O problema

O site `divulgacandcontas.tse.jus.br` é uma **SPA Angular com hash routing** (`#/partidos/...`). Isso significa que:

- O HTML retornado pelo servidor é um shell vazio — todo conteúdo é renderizado pelo JavaScript no browser
- Não existe conteúdo crawlável via HTTP simples
- A API REST que o frontend consome **não é documentada publicamente**
- Requests diretos à API retornam `403 Forbidden` sem os headers corretos

---

## Como descobrimos os endpoints

### 1. Identificamos o bundle Angular

Acessando o HTML da aplicação:

```
GET https://divulgacandcontas.tse.jus.br/divulga/index.html
```

Encontramos os arquivos JavaScript gerados pelo build:

```html
<script src="runtime.7b9eaea8dd7fb6b4.js">
<script src="main.54eac8babc1e00df.js">      ← bundle principal
```

### 2. Extraímos os endpoints do bundle principal

O Angular compila os serviços HTTP dentro do bundle. Buscando padrões de template literals:

```bash
curl https://.../divulga/main.54eac8babc1e00df.js \
  | grep -oE 'http\.get\(`\$\{[^}]+\}[^`]+`'
```

Encontramos os três serviços base:

```
/divulga/rest/v1/ata      → atas de convenção
/divulga/rest/v1/eleicao  → dados de eleições
/divulga/rest/v1/sistema  → configurações/versão
```

### 3. Descobrimos os chunks lazy-loaded

O Angular usa `loadChildren` para carregar módulos sob demanda. O mapa de chunks fica no `runtime.js`:

```javascript
// runtime.7b9eaea8dd7fb6b4.js
{'989': '61a58001b57e2d21', '825': 'b234c541aca6335e', ...}
```

O módulo `ConsultaIndividualModule` (que contém prestação de contas) está no chunk `989`:

```
GET https://.../divulga/989.61a58001b57e2d21.js
```

### 4. Extraímos todos os apiURLs do chunk 989

```bash
curl https://.../989.61a58001b57e2d21.js \
  | grep -oE 'this\.api[A-Za-z]*URL=`[^`]+`'
```

Resultado:

```
/divulga/rest/v1/prestador/campanha       → lista de partidos
/divulga/rest/v1/prestador/consulta       → prestação de contas, receitas
/divulga/rest/v1/prestador/consulta/despesas
/divulga/rest/v1/prestador/buscar
/divulga/rest/v1/prestador/consulta/nfes
/divulga/rest/v1/prestador/consulta/conciliacao
/divulga/rest/v1/doador-fornecedor
/divulga/rest/v1/limitegastos
/divulga/rest/v1/preteritas/doador-fornecedor/consulta/despesas  ← eleições < 2016
```

### 5. Descobrimos a ordem correta dos parâmetros

O bundle também revela as assinaturas das funções:

```javascript
// chunk 989
getPrestacaoPartido(Y) {
  return this.http.get(
    `${this.apiURL}/partido/${Y.sqEleicao}/${Y.anoReferencia}/${Y.siglaUe}/${Y.codigoOrgao}/${Y.numero}`
  )
}

getDespesas(Y) {
  return this.http.get(
    `${this.apiURL}/${Y.sqEleicao}/${Y.idPrestador}/${Y.idUltimaEntrega}`
  )
}
```

Isso define exatamente a ordem e os campos necessários.

---

## Por que a API não bloqueou

### Cabeçalhos de browser real

A API retorna `403` sem os headers corretos. Basta enviar:

```python
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    "Referer": "https://divulgacandcontas.tse.jus.br/divulga/",
    "Origin": "https://divulgacandcontas.tse.jus.br",
}
```

Não há token de sessão, CSRF token, ou autenticação — qualquer request com headers de browser passa.

### Sem rate limiting agressivo

O TSE não implementa rate limiting visível (sem `429` durante o crawl). Mesmo assim, usamos delay de 1.5–3.5s entre requests por boa prática e para não sobrecarregar o servidor público.

### Dados são públicos por lei

A Lei de Acesso à Informação (LAI) e a legislação eleitoral obrigam o TSE a publicar esses dados. A API não tem — e não pode ter — bloqueio real ao acesso.

---

## Fluxo de coleta

```
1. GET /prestador/campanha/partidos/{sqEleicao}
   → lista dos 29 partidos com número e sigla

2. Para cada partido:
   GET /prestador/consulta/partido/{sqEleicao}/{ano}/{uf}/{orgao}/{numero}
   → retorna idPrestador + idUltimaEntrega (chaves internas do TSE)
              ↓
   GET /prestador/consulta/receitas/{sqEleicao}/{idPrestador}/{idUltimaEntrega}/lista
   GET /prestador/consulta/receitas/{sqEleicao}/{idPrestador}/{idUltimaEntrega}/rank
   GET /prestador/consulta/despesas/{sqEleicao}/{idPrestador}/{idUltimaEntrega}
```

O campo `idUltimaEntrega` é a chave que garante pegar a **entrega mais recente** — partidos podem ter feito múltiplas entregas de prestação de contas.

---

## Parâmetros fixos (Eleições Municipais 2024)

| Parâmetro | Valor | Significado |
|-----------|-------|-------------|
| `sqEleicao` | `2045202024` | ID interno da eleição no TSE |
| `anoReferencia` | `2024` | Ano de referência |
| `siglaUe` | `BR` | Escopo nacional |
| `codigoOrgao` | `2` | Diretório Nacional (vs. Estadual=3, Municipal=5) |

---

## Limitações conhecidas

- **PCB e PMB** retornaram `total_receitas = NULL` — provavelmente não entregaram prestação de contas no prazo
- Despesas retornam sem paginação — a API manda tudo de uma vez (testado com 15k+ registros)
- Eleições anteriores a 2016 usam endpoint diferente (`/preteritas/`) com estrutura distinta
- Dados municipais (por cidade) exigem `siglaUe` diferente e `codigoOrgao=5` — não coletados ainda
