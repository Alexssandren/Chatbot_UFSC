# Chatbot certificados / Validação de atividades complementares

Sistema para **recebimento**, **armazenamento** e **análise operacional** de submissões de atividades complementares (requerimento + certificados em PDF), com painel web para o orientador.

**Última atualização deste documento:** 04/06/2026

---

## Manutenção deste README

Sempre que forem feitas alterações relevantes no projeto (nova funcionalidade, mudança de rotas, env, fluxo de deploy, decisões de arquitetura), **atualize este arquivo**: estado atual, pendências e, se aplicável, uma linha na seção **Changelog** no final.

---

## Visão geral do repositório

| Pasta | Conteúdo |
|-------|----------|
| [`backend/`](backend/) | API **Fastify** (TypeScript), **Prisma** + **SQLite**, upload multipart, PDFs via `GET /api/files/*` (autenticado) |
| [`frontend/`](frontend/) | SPA **React 19** + **Vite** + **Tailwind CSS 4**, **React Router 7** |

Documentação adicional por pacote:

- [`backend/README.md`](backend/README.md) — endpoints, multipart, seed, checklist de integração com chatbot/Moodle
- [`frontend/README.md`](frontend/README.md) — scripts padrão do template Vite (se existir)

---

## Estado atual (funcional)

### Backend

- **Banco:** SQLite via `DATABASE_URL` (ver [`backend/.env.example`](backend/.env.example)).
- **Modelos:** `Student`, `Submission`, `Certificate`; domínio UFSC: `ActivityGroup`, `ActivityCategory` (`maxEligibleHours` para tetos normativos), `CertificateValidation` — ver [`backend/README.md`](backend/README.md).
- **Uploads:** pastas `requerimentos/{submissionId}/` e `certificados/{submissionId}/` sob `UPLOAD_DIR`.
- **API REST:** submissões (`POST/GET/PATCH`), alunos (`GET`); **consolidação normativa** `GET /api/students/:id/academic-summary` (cálculo **on-demand**, sem cache nem snapshot persistido); **`PATCH /api/certificates/:id/academic-review`** — revisão acadêmica (`CertificateValidation`). Ver [`backend/README.md`](backend/README.md).
- **Autenticação (Fase 8):** sessão server-side (cookie HttpOnly); `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`; painel protegido; `POST /api/submissions` permanece público (Moodle).
- **Arquivos:** `GET /api/files/*` com sessão — não há mais `/uploads/` público.
- **CORS:** `credentials: true` com `CORS_ORIGIN` explícito (ex.: `http://localhost:5173`).
- **Seed:** `npm run db:seed` — dados de demonstração + PDFs mínimos (ver backend README; operação destrutiva).

### Frontend

- **Rotas protegidas:** exceto `/login`, o app exige sessão ([`frontend/src/components/ProtectedRoute.tsx`](frontend/src/components/ProtectedRoute.tsx)).
- **Autenticação:** sessão real via cookie (`credentials: 'include'`); login em [`frontend/src/context/AuthContext.tsx`](frontend/src/context/AuthContext.tsx) contra a API.
- **Páginas principais:**
  - `/` — Dashboard híbrido (submissões, alunos com resumo, regras GI–GV)
  - `/submission/:id` — Detalhe de uma submissão (certificados agrupados por grupo/categoria)
  - `/students` — Lista de alunos
  - `/students/:id` — Perfil do aluno (5 grupos, resumo acadêmico, conclusão oficial, relatório PDF)
  - `/profile` — Perfil do orientador (sessão)
  - `/login` — Login do orientador
- **Fase 5 (acadêmico no painel):** em `/students/:id`, card **Resumo acadêmico** (`GET .../academic-summary`); em cada certificado, **revisão acadêmica** separada do fluxo **operacional** (`approvalStatus` ≠ `CertificateValidation.status`). Após salvar revisão, a UI **reidrata** submissão e resumo sem refresh manual. O tipo `Submission.studentDbId` guarda o UUID Prisma do aluno; `Submission.studentId` continua sendo a **matrícula** (dívida de nomenclatura documentada em código).
- **Painel do orientador (operacional):** aprovação/rejeição de submissão (quando aplicável) e **aprovação por arquivo** com feedback visual ([`frontend/src/components/SubmissionDetailContent.tsx`](frontend/src/components/SubmissionDetailContent.tsx)).
- **Fase 7 (elegibilidade acadêmica):** o card de resumo usa `academicEligibility` do `GET .../academic-summary` (apto/não apto, horas faltantes, grupos pendentes). Banner e pendências **não** usam `eligible` nem recálculo local (`Math.max` para shortfall).
- **Consolidação no servidor:** o frontend **não** recalcula elegibilidade normativa (limiares 144/3/20, `pendingGroups`, aptidão); apenas exibe o JSON da API e validação mínima de formulário (horas quando status acadêmico é aprovado).
- **Fase 9 (PDF consolidado):** em `/students/:id`, botão **Baixar relatório consolidado** → `GET /api/students/:id/consolidated-report.pdf` (download direto, sem preview). Totais e aptidão vêm do mesmo motor de `academic-summary`.
- **Fase 10 (conclusão oficial):** decisão administrativa persistida (`StudentAcademicCompletion`, 1 registro por aluno). Endpoints `POST/GET /api/students/:id/academic-completion` e `POST .../revoke`. A elegibilidade em `academic-summary` continua recalculada e **não** é alterada pela conclusão.
- **Fase 11 (e-mail de rejeição acadêmica):** após `PATCH .../academic-review` com transição para `rejected`, envio SMTP síncrono pós-transação (best-effort; `MAIL_ENABLED` desligado por padrão). Parecer obrigatório na rejeição. UI exibe feedback efêmero com linguagem honesta (*"notificação encaminhada ao servidor de e-mail"* — sem promessa de entrega). Ver [`backend/README.md`](backend/README.md).
- **PDFs:** visualização em **modal** com `iframe`, download, loading e falha por **timeout (15s)**; distinção visual **Requerimento** vs **Certificado** ([`frontend/src/components/PdfViewerModal.tsx`](frontend/src/components/PdfViewerModal.tsx), [`DocumentFileActions.tsx`](frontend/src/components/DocumentFileActions.tsx)).
- **Histórico acadêmico:** exibe `changedBy.displayName` quando o PATCH foi feito por usuário autenticado; repair sem autor.
- **API no dev:** proxy Vite de `/api` para o backend ([`frontend/vite.config.ts`](frontend/vite.config.ts)). Opcional: `VITE_API_URL` em [`frontend/.env.example`](frontend/.env.example).

### Scripts na raiz (Windows)

- [`iniciar.bat`](iniciar.bat) — abre frontend em nova janela; no mesmo terminal instala/migra backend e roda `npm run dev`.
- [`encerrar.bat`](encerrar.bat) — encerra processos em uma porta (padrão 3000), útil para liberar o backend.

---

## Como executar (resumo)

1. **Backend:** em `backend/`, copiar `.env.example` → `.env`, `npm install`, `npx prisma migrate dev`, opcional `npm run db:seed`, depois `npm run dev`.
2. **Frontend:** em `frontend/`, `npm install`, `npm run dev` (com backend na porta esperada pelo proxy, normalmente **3000**).
3. Ou usar [`iniciar.bat`](iniciar.bat) na raiz (Windows).

Credenciais demo (após `npm run db:seed` no backend): usuário **Vilson**, senha **1234**.

Deploy na VPS: ver [`docs/DEPLOY-CHECKLIST.md`](docs/DEPLOY-CHECKLIST.md). Integração chatbot: [`docs/INTEGRACAO-CHATBOT.md`](docs/INTEGRACAO-CHATBOT.md).

**Sessão in-memory:** reiniciar o backend desloga todos; múltiplas instâncias não compartilham sessão — ver [`backend/README.md`](backend/README.md).

---

## O que ainda falta fazer (backlog sugerido)

Prioridades dependem do escopo da disciplina/produto; lista não ordenada:

1. **Perfis e RBAC** — hoje qualquer usuário logado acessa o painel; `role` é metadado apenas.
2. **Credencial de serviço para Moodle** — `POST /api/submissions` segue público; API key simples em fase futura se necessário.
3. **Validação de upload** — restringir tipos (ex.: só PDF), tamanho e mensagens de erro alinhadas ao Moodle/chatbot.
4. **Integração chatbot/Moodle** — seguir checklist em [`backend/README.md`](backend/README.md) (PHP/envio multipart).
5. **Testes automatizados** — API (Fastify), componentes críticos do front, ou E2E smoke.
6. **Deploy e ambientes** — build do front, `NODE_ENV=production`, `migrate deploy`, `VITE_API_URL` coerente com o host que serve `/uploads/`.
7. **Acessibilidade** — trap de foco completo no modal, revisão de contraste e leitores de tela, se necessário para produção.

Itens explicitamente **fora** do escopo atual (evitar sem decisão): OCR, anotação em PDF, react-pdf/pdf.js pesado, microfrontends.

---

## Changelog (resumo)

| Data | Notas |
|------|--------|
| 04/06/2026 | Plano por fases: dashboard híbrido, catálogo de regras, agrupamento de certificados, perfil 5 grupos, PDF com cabeçalho/assinatura, página `/profile`, docs de deploy e integração. |
| 27/05/2026 | Fase 11: e-mail SMTP simples na rejeição acadêmica (`modules/email/academicRejectionEmail.ts`, `nodemailer`); `reviewNotes` obrigatório ao rejeitar; `notification` efêmera no PATCH; testes `academicRejectionEmail.test.ts`. |
| 27/05/2026 | Fase 10: `StudentAcademicCompletion` (1:1 aluno); `POST/GET .../academic-completion`, `POST .../revoke`; UI bloco Conclusão oficial em `StudentDetails`; testes `academicCompletion.test.ts`. |
| 27/05/2026 | Fase 9: `GET /api/students/:id/consolidated-report.pdf` (PDFKit, sob demanda); botão de download no detalhe do aluno; testes `npm test` no backend. |
| 27/05/2026 | Fase 8: sessão server-side, `User`, `changedById` no histórico, `GET /api/files/*`, login `orientador`; `POST /api/submissions` público. |
| 27/05/2026 | Fase 7: `academicEligibility` em `GET .../academic-summary` (`studentAcademicEligibility.ts`); UI apto/não apto e grupos pendentes; `eligible`/`remainingEligibleHours` deprecated conceitualmente. |
| 27/05/2026 | Fase 6: `AcademicReviewHistory` (append-only), `applyAcademicReviewChange`, histórico transacional no PATCH e no `repair-academic`; `changeReason` opcional; `GET .../academic-review/history`. |
| 26/05/2026 | Fase 5: `PATCH /api/certificates/:id/academic-review` (retorno com `validation`); painel com resumo acadêmico em `StudentDetails`, formulário `AcademicReviewForm` por certificado, mapeamento de `validation` nas submissões; `studentDbId` no tipo `Submission` (UUID vs matrícula). |
| 26/05/2026 | Fase 2 backend: consolidação acadêmica (`academicValidationService`), `GET /api/students/:id/academic-summary`, `isAcademicallyApproved`, `displayOrder` no catálogo GI–GV; seed com validações `approved` para smoke. |
| 26/05/2026 | Fase 1 backend: `ActivityGroup`, `ActivityCategory` (`ruleNotes`), `CertificateValidation`; constantes UFSC; resolver textual temporário para `cert_N_grupo`; migration `add_academic_domain_models`; seed e docs atualizados. |
| 26/05/2026 | Criação deste README de raiz; baseline: backend Fastify/Prisma, front com login demo, rotas protegidas, modal de PDF (iframe + timeout), distinção requerimento/certificado. |

---

## Referência rápida de tecnologias

- **Backend:** Node.js, Fastify 5, Prisma 5, SQLite, `@fastify/static`, `@fastify/multipart`, `@fastify/cors`, nodemailer (Fase 11)
- **Frontend:** React 19, Vite 8, Tailwind 4, React Router 7, lucide-react
