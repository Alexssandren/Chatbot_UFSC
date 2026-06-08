# Checklist de deploy — ValidaCert (VPS)

## Ambientes na VPS

| Pasta | Porta | Uso |
|-------|-------|-----|
| `/opt/validacert` | 8082 | Producao |
| `/opt/validacert-dev` | 8083 | Testes antes de promover |

## Publicar versao dev (8083)

1. Enviar codigo para `/opt/validacert-dev` (git pull, rsync ou scp).
2. Conferir `.env` (CORS na porta 8083, `SESSION_SECRET`, `DATABASE_URL`).
3. Na pasta do projeto:
   ```bash
   docker compose up -d --build
   ```
4. Validar: `http://207.58.153.22:8083` — login **Vilson** / **1234** (apos seed).

## Testes manuais pos-deploy

- [ ] Login e logout
- [ ] Dashboard: alunos, submissoes, regras dos grupos
- [ ] Perfil do aluno: 5 grupos, resumo, conclusao oficial
- [ ] Detalhe de submissao: certificados agrupados por grupo/categoria
- [ ] Revisao academica (aprovar/rejeitar com parecer)
- [ ] Pre-visualizar e baixar relatorio consolidado (PDF com assinatura)
- [ ] Perfil do orientador (`/profile`)
- [ ] SMTP (se `MAIL_ENABLED=true`): rejeicao envia notificacao

## Promover para producao (8082)

1. Backup volumes Docker de producao (`db_data`, `upload_data`).
2. Replicar codigo testado de `validacert-dev` para `validacert` (ajustar `docker-compose` — porta 8082, project name `validacert`).
3. `docker compose up -d --build` em `/opt/validacert`.
4. Repetir checklist na porta 8082.

## Rollback

- Manter imagem/tag anterior ou copia da pasta antes do deploy.
- Restaurar volumes se migration falhar.
