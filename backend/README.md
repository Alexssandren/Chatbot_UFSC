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

2. Instale dependências e aplique migrações:

```bash
npm install
npx prisma migrate dev
```

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

## Contrato multipart (`POST /api/submissions`)

Campos texto obrigatórios:

- `aluno_id`
- `aluno_matricula`
- `aluno_nome`
- `aluno_email`
- `total_certificados` – inteiro `>= 0`

Arquivo obrigatório:

- `requerimento`

Para cada índice `i` de `0` a `total_certificados - 1`:

- `cert_{i}_grupo` (texto)
- `cert_{i}_horas` (número `>= 0`, vírgula ou ponto)
- `cert_{i}_arquivo` (arquivo)

Arquivos são gravados em `UPLOAD_DIR/requerimentos/{submissionId}/` e `UPLOAD_DIR/certificados/{submissionId}/` com nome seguro (UUID + extensão). O banco guarda caminhos relativos a `UPLOAD_DIR` e o nome original.

### Limite de upload

Até **25 MB** por arquivo e **50** arquivos por requisição (ajuste em `src/plugins/multipart.ts`).

## Testes manuais

### curl (Linux / macOS / Git Bash)

Substitua os caminhos dos arquivos.

```bash
curl -X POST http://127.0.0.1:3000/api/submissions \
  -F "aluno_id=123" \
  -F "aluno_matricula=111" \
  -F "aluno_nome=Nome Completo" \
  -F "aluno_email=a@b.com" \
  -F "total_certificados=1" \
  -F "requerimento=@/caminho/requerimento.pdf" \
  -F "cert_0_grupo=GrupoA" \
  -F "cert_0_horas=10" \
  -F "cert_0_arquivo=@/caminho/cert0.pdf"
```

### Windows PowerShell

O corpo JSON do `PATCH` costuma falhar por escape de aspas; use arquivo:

```powershell
Set-Content -Path status.json -Value '{"status":"approved"}' -Encoding utf8
curl.exe -X PATCH "http://127.0.0.1:3000/api/submissions/<ID>/status" `
  -H "Content-Type: application/json" `
  --data-binary "@status.json"
```

Use Postman ou Insomnia para multipart e JSON sem lidar com escape do PowerShell.

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
