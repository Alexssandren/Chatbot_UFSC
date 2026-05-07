# Backend – validação de atividades complementares

API Node.js (Fastify + TypeScript + Prisma + SQLite) para receber submissões multipart do chatbot/Moodle, gravar metadados e arquivos em disco.

## Pré-requisitos

- Node.js 20+
- npm

## Configuração

1. Copie `.env.example` para `.env` e ajuste se necessário:

   - `DATABASE_URL` – padrão `file:./dev.db` (arquivo criado na pasta `backend` ao migrar)
   - `PORT` – padrão `3000`
   - `UPLOAD_DIR` – padrão `./uploads` (relativo ao diretório de trabalho ao iniciar o servidor)
   - `NODE_ENV` – em `production`, valores dos campos da submissão não são logados por padrão (somente chaves); use `DEBUG_SUBMISSIONS=1` para forçar log detalhado.

2. Instale dependências e aplique migrações:

```bash
npm install
npx prisma migrate dev
```

### Dados de demonstração (`db:seed`)

O script `npm run db:seed` recria um conjunto fixo de alunos, submissões (pendente / aprovada / rejeitada), certificados e **arquivos PDF mínimos** sob `UPLOAD_DIR`, para testar lista, detalhes e `/uploads/...` sem enviar multipart.

**Atenção:** o seed é **destrutivo**: apaga todas as linhas de `Certificate`, `Submission` e `Student` e remove as pastas `requerimentos/` e `certificados/` dentro do `UPLOAD_DIR` (não altera `tmp/`). Use apenas em ambiente de desenvolvimento ou antes de uma demo controlada.

Ordem sugerida:

```bash
npx prisma migrate dev   # ou migrate deploy em CI/prod
npm run db:seed
```

Requer o mesmo `.env` do servidor (`DATABASE_URL`, `UPLOAD_DIR`), pois o seed importa `loadEnv()` de `src/env.ts`.

IDs úteis para smoke manual (após o seed): submissão pendente com certificados `22222222-2222-4222-8222-000000000001`; submissão só com requerimento (lista vazia de certificados) `22222222-2222-4222-8222-000000000004`.

## Executar

Desenvolvimento (hot reload):

```bash
npm run dev
```

Produção local (build + Node):

```bash
npm run build
npm start
```

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Verificação simples |
| POST | `/api/submissions` | Nova submissão (multipart) |
| GET | `/api/submissions` | Lista (`skip`, `take` opcionais; `take` máx. 100) |
| GET | `/api/submissions/:id` | Detalhe com aluno e certificados |
| PATCH | `/api/submissions/:id/status` | JSON `{"status":"pending"\|"approved"\|"rejected"}` |

### Health

```http
GET /health
```

Resposta:

```json
{ "status": "ok" }
```

### POST /api/submissions – resposta

Sucesso (`201`):

```json
{
  "success": true,
  "submissionId": "<uuid>"
}
```

`submissionId` é o mesmo UUID usado nas pastas em `uploads/` e no banco.

Erro (`4xx` / `5xx`):

```json
{
  "success": false,
  "message": "..."
}
```

## Contrato multipart (`POST /api/submissions`)

Campos texto obrigatórios:

- `aluno_matricula`
- `aluno_nome`
- `aluno_email`
- `total_certificados` – inteiro `>= 0`

Opcional:

- `aluno_id` – se omitido ou vazio, `externalUserId` no banco usa a matrícula.

Arquivo obrigatório:

- `requerimento`

Para cada índice `i` de `0` a `total_certificados - 1`:

- `cert_{i}_grupo` (texto)
- `cert_{i}_horas` (número `>= 0`, vírgula ou ponto)
- `cert_{i}_arquivo` (arquivo)

Arquivos são gravados em `UPLOAD_DIR/requerimentos/{submissionId}/` e `UPLOAD_DIR/certificados/{submissionId}/` com nome seguro (UUID + extensão). O banco guarda caminhos relativos a `UPLOAD_DIR` e o nome original.

### Limite de upload

Até **25 MB** por arquivo e **50** arquivos por requisição (ajuste em `src/plugins/multipart.ts`).

### Logs de integração

No console aparecem linhas `[submission]` com chaves dos campos, chaves dos arquivos, `total_certificados` interpretado e, fora de `production` (ou com `DEBUG_SUBMISSIONS=1`), os valores dos campos texto.

## Testes manuais

### Health

```bash
curl -s http://127.0.0.1:3000/health
```

### curl – exemplo com 2 certificados (Linux / macOS / Git Bash)

Ajuste os caminhos `@...` para arquivos reais no disco.

```bash
curl -s -X POST http://127.0.0.1:3000/api/submissions \
  -F "aluno_id=999" \
  -F "aluno_matricula=2025123456" \
  -F "aluno_nome=Nome Sobrenome" \
  -F "aluno_email=aluno@email.com" \
  -F "total_certificados=2" \
  -F "requerimento=@/caminho/requerimento.pdf" \
  -F "cert_0_grupo=Extensao" \
  -F "cert_0_horas=10" \
  -F "cert_0_arquivo=@/caminho/certificado0.pdf" \
  -F "cert_1_grupo=Pesquisa" \
  -F "cert_1_horas=8" \
  -F "cert_1_arquivo=@/caminho/certificado1.pdf"
```

Resposta esperada (exemplo):

```json
{"success":true,"submissionId":"550e8400-e29b-41d4-a716-446655440000"}
```

Confira no SQLite (`npm run db:studio`) ou:

```bash
curl -s http://127.0.0.1:3000/api/submissions/<submissionId>
```

### Postman

1. Método **POST**, URL `http://127.0.0.1:3000/api/submissions`.
2. Body: **form-data** (não raw JSON).
3. Adicione cada campo como Text ou File conforme o contrato acima (nomes exatamente iguais ao PHP: `requerimento`, `cert_0_arquivo`, etc.).

### Windows PowerShell

O corpo JSON do `PATCH` costuma falhar por escape de aspas; use arquivo:

```powershell
Set-Content -Path status.json -Value '{"status":"approved"}' -Encoding utf8
curl.exe -X PATCH "http://127.0.0.1:3000/api/submissions/<ID>/status" `
  -H "Content-Type: application/json" `
  --data-binary "@status.json"
```

Para multipart, prefira **Postman** ou caminhos absolutos com `curl.exe -F "campo=@C:\pasta\arq.pdf"`.

### Checklist integração com o chatbot (PHP)

- [ ] Mesmos nomes de campo que o `CURLFile` / `post_data` do Moodle.
- [ ] `total_certificados` igual à quantidade de índices `0..n-1` enviados.
- [ ] Content-Type da requisição: `multipart/form-data` (o cliente define boundary automaticamente).
- [ ] Tamanho máximo de arquivo alinhado ao PHP (`upload_max_filesize`, `post_max_size`) e ao limite do Fastify (25 MB).
- [ ] URL base do backend acessível a partir do servidor Moodle (rede e firewall).

## Ferramentas

- Prisma Studio: `npm run db:studio`

## Segurança (escopo acadêmico)

Não há autenticação. Não exponha este serviço na internet pública sem camada de proteção (rede privada, VPN ou token simples em header, se o curso exigir).

## Nota técnica: multipart no Fastify

O plugin `@fastify/multipart` é registrado via `fastify-plugin` para ficar no mesmo escopo das rotas; caso contrário ocorre `415 Unsupported Media Type`.

## Stack fixada

- Prisma **5.x** (compatível com `url` no `schema.prisma` e fluxo clássico `migrate dev`).
- SQLite não usa `enum` nativo no Prisma; `Submission.status` é `String` com valores `pending`, `approved`, `rejected`.
