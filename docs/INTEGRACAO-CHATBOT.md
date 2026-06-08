# Integracao chatbot (Rafa) — ValidaCert

## Canal oficial

`POST /api/submissions` (multipart, **sem** autenticacao de sessao).

Resposta de sucesso: `{ "success": true, "submissionId": "<uuid>" }`.

## Campos esperados

Consulte o contrato completo em [`backend/README.md`](../backend/README.md).

Resumo:

- `requerimento` — arquivo PDF do requerimento (obrigatorio)
- `aluno_matricula`, `aluno_nome`, `aluno_email` — identificacao do aluno
- `cert_N_grupo`, `cert_N_horas`, `cert_N_arquivo` — certificados (N = 1, 2, …)

## Pasta compartilhada (opcional)

O plano original sugeria pasta por aluno no mesmo servidor. **Nao implementado** — o fluxo recomendado e POST direto para a API.

Se for necessario watcher de pasta no futuro, alinhar formato de nomes e matricula com este contrato.

## Teste rapido (curl)

```bash
curl -s -X POST http://127.0.0.1:3001/api/submissions \
  -F "aluno_matricula=2025999999" \
  -F "aluno_nome=Teste Integracao" \
  -F "aluno_email=teste@ufsc.br" \
  -F "requerimento=@/caminho/requerimento.pdf" \
  -F "cert_1_grupo=Extensao" \
  -F "cert_1_horas=10" \
  -F "cert_1_arquivo=@/caminho/certificado.pdf"
```

## Rede

- URL publica do backend deve ser acessivel pelo chatbot/Moodle.
- CORS nao afeta POST server-to-server; o front usa cookie em rotas protegidas.
