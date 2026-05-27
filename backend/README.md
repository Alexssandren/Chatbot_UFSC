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
   - `SESSION_SECRET` – obrigatório (mínimo 16 caracteres); assina o cookie de sessão.
   - `CORS_ORIGIN` – origem do frontend com credenciais (padrão dev: `http://localhost:5173`).
   - **E-mail (Fase 11):** `MAIL_ENABLED` (padrão desligado); com `true`, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`. Em `production` com mail ativo, credenciais ausentes impedem o boot.

2. Instale dependências e aplique migrações:

```bash
npm install
npx prisma migrate dev
```

### Domínio acadêmico (UFSC) — Fase 1

O Prisma modela **grupos oficiais** (`ActivityGroup`, códigos GI–GV), **categorias** por grupo (`ActivityCategory`, com `maxHours`, **`maxEligibleHours`** (teto elegível Fase 3), `ruleNotes` sem motor de cálculo) e **`CertificateValidation`** (1:1 com `Certificate`): `requestedHours`, `approvedHours`, `status` de validação acadêmica, `reviewNotes`, `reviewedAt`.

- **`Certificate.grupo` / `Certificate.horas`**: mantidos para compatibilidade com multipart e frontend legado.
- **`Certificate.approvalStatus`**: continua sendo aprovação **operacional** do arquivo (orientador).
- **`CertificateValidation.status`**: validação **acadêmica** formal (`pending` | `approved` | `rejected`). No SQLite o campo é `TEXT`; os valores canônicos estão em [`src/domain/academicRules.ts`](src/domain/academicRules.ts) como `ValidationStatus` (o conector SQLite não usa `enum` nativo do Prisma neste projeto).
- **Semântica de `approvedHours`:** `pending` → `null`; `rejected` → `0`; `approved` → valor **> 0**. A persistência é feita via **`PATCH /api/certificates/:id/academic-review`** (Fase 5).
- **Constantes globais:** `MIN_TOTAL_HOURS`, `MIN_DISTINCT_GROUPS`, `MIN_HOURS_PER_GROUP` em [`src/domain/academicRules.ts`](src/domain/academicRules.ts).
- **Multipart legado:** o mapeamento texto `cert_N_grupo` → par grupo/categoria está em [`src/domain/resolveCertificateAcademicLinks.ts`](src/domain/resolveCertificateAcademicLinks.ts), **temporário** até o cliente enviar IDs formais.
- **Invariante:** `assertCategoryBelongsToGroup` em [`src/domain/academicGuards.ts`](src/domain/academicGuards.ts) garante que a categoria pertence ao grupo antes de persistir.

### Integridade normativa (invariantes na escrita e leitura)

- **Contrato de revisão:** [`src/domain/academicValidationContract.ts`](src/domain/academicValidationContract.ts) — valida `PATCH` contra o registro (`requestedHours`, par grupo/categoria, semântica `status`/`approvedHours`).
- **Horas homologadas:** com `status === approved`, exige `approvedHours` finito, `> 0` e **`<= requestedHours`**.
- **`requestedHours`:** deve ser finito e `> 0` na criação da submissão e antes de aceitar revisão; caso contrário `400` com mensagem explícita.
- **Consolidação:** [`isAcademicallyApproved`](src/domain/academicRules.ts) só inclui registros `approved` que passam nas checagens acima (registros legados inconsistentes são ignorados com `console.warn`).

**Reparo em dev:** após backups, `npm run repair-academic` normaliza combinações inválidas de `status`/`approvedHours` e `approved` não consolidáveis para `pending`/`null` quando seguro. O script é **writer oficial de domínio**: altera `CertificateValidation`, impacta consolidação e grava `AcademicReviewHistory` com `source=repair_script` (não é manutenção cosmética).

### Histórico de revisão acadêmica (Fase 6)

- **Tabela:** `AcademicReviewHistory` — log **append-only** de transições em `status`, `approvedHours` e `reviewNotes` por validação.
- **Estado atual:** continua em `CertificateValidation` (fonte de verdade para consolidação).
- **Persistência:** [`src/services/academicReviewPersistence.ts`](src/services/academicReviewPersistence.ts) — função única `applyAcademicReviewChange` (insert histórico + update validação na mesma transação).
- **Domínio:** diff e builder em [`src/domain/academicReviewHistory.ts`](src/domain/academicReviewHistory.ts).
- **Writers oficiais:** `PATCH /api/certificates/:id/academic-review` (`source=academic_review_patch`) e `npm run repair-academic` (`source=repair_script`).
- **`changeReason`:** motivo opcional **desta transição** (texto livre no histórico). Distinto de `reviewNotes` (parecer no estado atual da validação).
- **`changedById`:** preenchido no PATCH com o usuário da sessão; `repair_script` permanece `null`.
- **Sem mudança real:** PATCH idempotente não cria histórico e não atualiza `reviewedAt`.
- **Leitura HTTP:** `GET /api/certificates/:id/academic-review/history` — expõe `changedBy: { id, displayName }` **somente** quando houver FK (sem fallback “Sistema”).

#### Limitações da auditabilidade

1. **Responsabilização mínima** — apenas revisões via PATCH autenticado; repair e entradas antigas sem `changedBy`.
2. **Sem reconstrução temporal do resumo** — o histórico registra transições **por certificado**, não snapshots de `GET .../academic-summary`. Reconstruir elegibilidade passada exige recalcular manualmente a partir do estado em cada data.
3. **Sem retenção garantida** — `onDelete: Cascade` em `AcademicReviewHistory` apaga o histórico junto com `CertificateValidation`/certificado (aceitável em dev/demo; provável mudança em produção).
4. **Dois writers** — PATCH humano e repair automático alteram estado normativo; executar repair com consciência de impacto na consolidação.

**Migrations:** a pasta `20260208103000_certificate_approval_status` foi renomeada para `20260508103000_certificate_approval_status` para rodar **depois** de `init`. Se o seu `dev.db` já tinha aplicado a migration antiga e `migrate deploy` acusar coluna duplicada, use `npx prisma migrate resolve --applied 20260508103000_certificate_approval_status` e rode `migrate deploy` de novo.

### Consolidação acadêmica (UFSC) — Fases 2 e 3

- **Serviço:** [`src/services/academicValidationService.ts`](src/services/academicValidationService.ts) — `getStudentAcademicConsolidation(studentId)`.
- **Filtro contábil:** apenas validações que passam em [`isAcademicallyApproved`](src/domain/academicRules.ts) (status `approved`, `requestedHours` válido, `approvedHours` dentro do solicitado, categoria coerente com o grupo). Registros `approved` inconsistentes são ignorados na soma (com aviso em log).

**Fase 2 (base):** todos os grupos GI–GV na resposta; ordem institucional em [`academicCatalog.ts`](src/domain/academicCatalog.ts) (`displayOrder`).

**Fase 3 (consolidação normativa):**

- **`ActivityCategory.maxEligibleHours`** (Prisma, migration `add_category_eligible_hours_limit`): teto de horas **elegíveis** para integralização por categoria; `null` = sem teto. Mantém-se `maxHours` no modelo (outro significado / legado).
- **Fluxo:** somar `approvedHours` **por categoria** (vários certificados na mesma categoria somam antes do teto); depois aplicar [`applyCategoryEligibleCap`](src/domain/academicRules.ts) uma vez por categoria — **nunca** cap por certificado isolado.
- **`categories[]`:** por categoria com horas aprovadas > 0: `approvedHours`, `eligibleHours`, `maxEligibleHours`, `cappedHours` (= `approvedHours - eligibleHours`).
- **`groups[]`:** `approvedHours` e **`eligibleHours`** (soma das elegíveis das categorias do grupo); **`meetsMinimumHours`** e **`validGroupsCount`** usam **`eligibleHours`**.
- **Totais:** `totalApprovedHours` (auditoria, antes do teto); **`totalEligibleHours`** (base normativa); **`remainingEligibleHours`** = `max(0, MIN_TOTAL_HOURS - totalEligibleHours)`; **`requirements.meetsTotalHoursRequirement`** e **`eligible`** usam **`totalEligibleHours`**.

**Breaking change (Fase 3):** o campo `remainingHours` foi **removido**; use **`remainingEligibleHours`**.

**Fonte da verdade (tetos):** após `migrate` + `db:seed`, o **banco** (`ActivityCategory.maxEligibleHours` lido via Prisma na consolidação) é a fonte em runtime. O catálogo TypeScript (`academicCatalog.ts`) alinha o seed e o multipart legado; alterar só o TS sem atualizar o banco pode gerar inconsistência.

**Cálculo em runtime:** `GET /api/students/:id/academic-summary` **recalcula a consolidação a cada requisição**. Não existe cache nem snapshot persistido de totais. Qualquer otimização futura (materialização, jobs) deve preservar **consistência normativa** com a mesma semântica de `academicRules` / `applyCategoryEligibleCap`.

**Limitações:** não há `capReason` / `ruleApplied`; `ruleNotes` não é interpretado; `Certificate.approvalStatus` (operacional) não altera este cálculo.

### Elegibilidade acadêmica normativa (UFSC) — Fase 7

Pilha de projeções: `CertificateValidation` (canônico) → consolidação (`academic-summary`) → **`academicEligibility`** (elegibilidade normativa derivada, **não persistida**).

- **Domínio:** [`src/domain/studentAcademicEligibility.ts`](src/domain/studentAcademicEligibility.ts) — `deriveAcademicEligibility`, `pendingGroups`, `remainingHours`, `status` (`apto` | `nao_apto`). Regra de aptidão canônica em [`isStudentNormativelyEligible`](src/domain/academicRules.ts): **>= 144h elegíveis no total** e **>= 3 grupos validados** (cada grupo com **>= 20h elegíveis**). Constantes `MIN_*` apenas em [`academicRules.ts`](src/domain/academicRules.ts).
- **Serviço:** após montar `groups[]` e totais, `getStudentAcademicConsolidation` chama `deriveAcademicEligibility` uma vez; `eligible` e `remainingEligibleHours` são **espelhos** do bloco oficial (nunca recalculados em paralelo).
- **Sem endpoint separado, sem migration, sem writer novo.**

**Contrato oficial (UI e integrações novas):** `academicEligibility` no JSON de `GET /api/students/:id/academic-summary`.

**Deprecated conceitualmente (compatibilidade aditiva):** `eligible`, `remainingEligibleHours`. Roadmap futuro: remoção após migração de consumidores.

**Limitação arquitetural:** `academicEligibility` é derivado **da consolidação normativa atual** (formato de `groups[]`, `eligibleHours`, `validGroupsCount`), não de um modelo de elegibilidade independente. Alterações em `groups[]` ou na semântica de `eligibleHours` exigem revisão conjunta de `studentAcademicEligibility.ts`.

**Proibição — frontend:** o cliente **nunca** deve recalcular elegibilidade normativa (limiares 144/3/20, `pendingGroups`, `hoursShortfall`, aptidão). Toda regra deve vir do backend (`academicEligibility`, `groups[]`, `requirements`).

### Conclusão oficial (Fase 10)

Decisão **administrativa** persistida, separada da elegibilidade normativa.

- **Modelo:** `StudentAcademicCompletion` — relação **1:1** com `Student` (`studentId` @unique). Estado derivado: `concluded = concludedAt != null && revokedAt == null`.
- **Serviço:** [`src/services/academicCompletionService.ts`](src/services/academicCompletionService.ts).
- **Gate no POST conclude:** chama `getStudentAcademicConsolidation` e exige `academicEligibility.status === 'apto'`. Persiste snapshot mínimo (`snapshotTotalEligibleHours`, `snapshotValidGroupsCount`).
- **Não altera** `getStudentAcademicConsolidation` nem deriva `apto` da existência de conclusão.
- **Revogação:** manual via `POST .../revoke`; novo conclude após revoke **reutiliza** o mesmo registro (limpa `revokedAt`).

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/api/students/:id/academic-completion` | Leitura do registro (ou vazio) |
| POST | `/api/students/:id/academic-completion` | Registrar conclusão (`201`; `409` se já concluído; `422` se não apto) |
| POST | `/api/students/:id/academic-completion/revoke` | Revogar (`404` sem conclusão ativa) |

### E-mail institucional simples (Fase 11)

Notificação **derivada** pós-transação — não é fonte de verdade; falha SMTP **não** impede a revisão acadêmica.

- **Caso de uso:** transição para `status: rejected` via `PATCH .../academic-review` (somente quando `before.status !== rejected`).
- **Módulo:** [`src/modules/email/academicRejectionEmail.ts`](src/modules/email/academicRejectionEmail.ts) — texto puro, `nodemailer`, transport lazy.
- **Orquestração:** `notifyAcademicRejectionIfNeeded()` em [`academicValidationService.ts`](src/services/academicValidationService.ts), **após** commit de `applyAcademicReviewChange`.
- **Regra institucional:** `reviewNotes` **obrigatório** quando `status === rejected` (`400` antes da transação) — ver [`academicValidationContract.ts`](src/domain/academicValidationContract.ts).
- **Sem persistência** de log de e-mail, fila ou histórico de entrega.
- **Semântica honesta:** SMTP confirma aceite pelo servidor remoto, não entrega ao aluno. Resposta PATCH inclui `notification` efêmera: `{ attempted, smtpAccepted, skipped?, error? }`.
- **`MAIL_ENABLED`:** padrão `false`; testes (`npm test`) não enviam e-mail real.
- **Excluído:** `repair_script`, aprovação acadêmica, rejeição operacional, conclusão oficial.

### Dados de demonstração (`db:seed`)

O script `npm run db:seed` recria usuário demo (`orientador`), alunos, submissões (pendente / aprovada / rejeitada), certificados e **arquivos PDF mínimos** sob `UPLOAD_DIR`, para testar lista, detalhes e `GET /api/files/...` (com login) sem enviar multipart.

**Atenção:** o seed é **destrutivo**: apaga `StudentAcademicCompletion`, `CertificateValidation`, `Certificate`, `Submission`, `Student`, `ActivityCategory`, `ActivityGroup` e remove as pastas `requerimentos/` e `certificados/` dentro do `UPLOAD_DIR` (não altera `tmp/`). Em seguida recria grupos/categorias oficiais (GI–GV), dados de demo e PDFs mínimos. Use apenas em ambiente de desenvolvimento ou antes de uma demo controlada.

Ordem sugerida:

```bash
npx prisma migrate dev   # ou migrate deploy em CI/prod
npm run db:seed
```

Requer o mesmo `.env` do servidor (`DATABASE_URL`, `UPLOAD_DIR`), pois o seed importa `loadEnv()` de `src/env.ts`.

IDs úteis para smoke manual (após o seed): submissão pendente com certificados `22222222-2222-4222-8222-000000000001`; submissão só com requerimento (lista vazia de certificados) `22222222-2222-4222-8222-000000000004`.

**Consolidação (após seed):** Bruno (`11111111-1111-4111-8111-000000000002`): Congressos 60 h aprovadas (teto 30 h elegíveis), GI 72 h, GV 42 h — `totalEligibleHours` 144, `validGroupsCount` 3, `academicEligibility.status` `apto` (candidato a `POST .../academic-completion`). Daniel (`11111111-1111-4111-8111-000000000004`): Seminários 25 h aprovadas (teto 15 h elegíveis), GI 45 h — GII com `meetsMinimumHours` false (15 &lt; 20). `GET /api/students/:id/academic-summary`.

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
| GET | `/api/submissions` | Lista (`skip`, `take` opcionais; `take` máx. 100). Cada item inclui **`totalDeclaredHours`** e **`totalAcademicApprovedHours`** (ver abaixo). |
| GET | `/api/submissions/:id` | Detalhe com aluno e certificados (mesmos totais por submissão). |
| PATCH | `/api/submissions/:id/status` | JSON `{"status":"pending"\|"approved"\|"rejected"}` |
| GET | `/api/students` | Lista de alunos (resumo) |
| GET | `/api/students/:id` | Aluno com submissões e certificados |
| GET | `/api/students/:id/academic-summary` | Consolidação acadêmica + `academicEligibility` (Fase 7) |
| GET | `/api/students/:id/consolidated-report.pdf` | PDF consolidado sob demanda (Fase 9; sessão obrigatória; `Content-Disposition: attachment`) |
| PATCH | `/api/certificates/:id/academic-review` | Revisão acadêmica (`CertificateValidation`: `status`, `approvedHours`, `reviewNotes`, `changeReason` opcional). Grava histórico quando há mudança real. Resposta `200` com `validation`; em transição para `rejected`, inclui `notification` efêmera (Fase 11). |
| GET | `/api/certificates/:id/academic-review/history` | Histórico read-only de transições (`entries[]` com `before`/`after`, `source`, `changeReason`). `200` com `entries: []` se não houver transições. |

**Totais por submissão:** `totalDeclaredHours` = soma de `Certificate.horas` (envio). `totalAcademicApprovedHours` = soma de `approvedHours` apenas onde [`isAcademicallyApproved`](src/domain/academicRules.ts) é verdadeiro (alinhado ao `GET .../academic-summary` por aluno).

### GET /api/students/:id/academic-summary

Resposta `200`: tipo `AcademicConsolidation` em [`src/services/academicValidationService.ts`](src/services/academicValidationService.ts).

- `studentId`, `totalApprovedHours`, **`totalEligibleHours`**, `validGroupsCount`
- **`academicEligibility`** (oficial): `status` (`apto` | `nao_apto`), `remainingHours`, `remainingDistinctGroups`, `pendingGroups[]` (`code`, `name`, `eligibleHours`, `hoursShortfall`)
- `eligible`, **`remainingEligibleHours`** — espelhos de compatibilidade (**deprecated conceitualmente**; use `academicEligibility`)
- `requirements`: mínimos e flags (`meetsTotalHoursRequirement` usa **`totalEligibleHours`**)
- `groups`: sempre todos os `ActivityGroup` do banco; cada item com `approvedHours`, **`eligibleHours`**, `meetsMinimumHours` (por **eligible**)
- **`categories[]`:** detalhe normativo por categoria (`approvedHours`, `eligibleHours`, `maxEligibleHours`, `cappedHours`)

**Invariantes:** `eligible === (academicEligibility.status === 'apto')`; `remainingEligibleHours === academicEligibility.remainingHours`.

**Breaking change (Fase 3):** o campo top-level `remainingHours` foi removido; use `academicEligibility.remainingHours` ou `remainingEligibleHours` (deprecated).

`404`: aluno inexistente.

### GET /api/students/:id/consolidated-report.pdf (Fase 9)

Geração **sob demanda** de PDF consolidado (PDFKit). Reutiliza `getStudentAcademicConsolidation` para totais e elegibilidade; linhas de atividades vêm de `CertificateValidation` filtradas por [`isAcademicallyApproved`](src/domain/academicRules.ts).

- `200`: `application/pdf`, `Content-Disposition: attachment`
- `401`: sem sessão
- `404`: aluno inexistente

Código: [`src/services/academicReportService.ts`](src/services/academicReportService.ts), [`src/pdf/renderConsolidatedReportPdf.ts`](src/pdf/renderConsolidatedReportPdf.ts).

### PATCH /api/certificates/:id/academic-review

Corpo JSON:

- `status` (obrigatório): `pending` | `approved` | `rejected`
- `approvedHours` (opcional): obrigatório semanticamente quando `status === approved` (número > 0); ignorado/normalizado para `pending`/`rejected` conforme [`isValidApprovedHoursForStatus`](src/domain/academicRules.ts)
- `reviewNotes` (opcional em geral; **obrigatório** quando `status === rejected`): string ou omitido / `null`
- `changeReason` (opcional): motivo desta transição, gravado só em `AcademicReviewHistory` (não altera o shape da resposta)

Resposta `200`: objeto com `certificateId` e `validation` (status, horas, parecer, `reviewedAt`, `requestedHours`, `activityGroup`, `activityCategory`). Quando há transição para `rejected` com mudança real, inclui `notification` efêmera (`attempted`, `smtpAccepted`, `skipped?`, `error?`). Se não houver mudança real nos campos revisáveis, retorna `200` sem atualizar `reviewedAt` nem criar histórico.

`400`: combinação inválida de status/horas; `approvedHours` acima de `requestedHours`; `requestedHours` inválido no certificado; **rejeição sem parecer** (`reviewNotes` vazio). `404`: certificado inexistente ou sem registro de validação acadêmica. `500`: inconsistência persistida entre grupo e categoria.

### GET /api/certificates/:id/academic-review/history

Leitura **read-only** das transições em `AcademicReviewHistory`. Não revalida regras normativas nem reconstrói `academic-summary`.

Resposta `200`:

```json
{
  "certificateId": "uuid",
  "validationId": "uuid",
  "entries": [
    {
      "id": "uuid",
      "changedAt": "2026-05-27T12:00:00.000Z",
      "source": "academic_review_patch",
      "changeReason": null,
      "before": { "status": "pending", "approvedHours": null, "reviewNotes": null },
      "after": { "status": "approved", "approvedHours": 20, "reviewNotes": "OK" }
    }
  ]
}
```

- `entries: []` quando não houve transições (inclui certificados legados pré-Fase 6).
- Ordenação: `changedAt` asc, desempate `id` asc.
- Limite interno: 500 entradas (sem parâmetros de paginação na API).
- `source`: `academic_review_patch` (PATCH) ou `repair_script` (`npm run repair-academic`).
- `changedBy` (opcional): `{ "id", "displayName" }` quando `changedById` foi gravado no PATCH; omitido em `repair_script` e entradas legadas.

`404`: certificado inexistente ou sem `CertificateValidation`. `401`: sem sessão (rota protegida). `500`: erro interno.

**Limitações:** sem snapshots temporais do resumo do aluno; histórico apagado em cascade com certificado/validação.

### Autenticação e sessão (Fase 8)

- **Sessão:** `@fastify/session` + cookie HttpOnly (`SameSite=Lax`; `Secure` em `NODE_ENV=production`).
- **Rotas de entrada:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` (session-aware — retorna 401 sem cookie válido).
- **Painel:** rotas registradas em [`src/routes/protected/index.ts`](src/routes/protected/index.ts) com hook `onRequest` único (não repetir `preHandler` por arquivo).
- **Integração pública:** `POST /api/submissions` permanece **sem** sessão (Moodle/chatbot).
- **Arquivos:** `GET /api/files/*` — stream autenticado; prefixos permitidos: `requerimentos/`, `certificados/`. `/uploads/` público foi removido.
- **Seed:** usuário demo `orientador` / `orientador123` (bcrypt).

#### Limitações operacionais da sessão (não é bug)

| Comportamento | Causa |
|---------------|-------|
| Restart do backend desloga todos | Store in-memory do `@fastify/session` |
| Múltiplas instâncias não compartilham sessão | Sem Redis/DB store |
| `tsx watch` pode invalidar cookie | Reinício do processo Node |

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
