# Como rodar o projeto localmente

Guia rápido para subir o backend, o frontend e popular o banco SQLite com dados de demonstração.

**Pré-requisitos:** Node.js 20+ e npm.

---

## 1. Configuração inicial (primeira vez)

### Backend

```powershell
cd backend
copy .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
```

O arquivo `.env` é obrigatório. O `SESSION_SECRET` deve ter **no mínimo 16 caracteres** (o exemplo já traz um valor válido para dev).

### Frontend

```powershell
cd frontend
npm install
```

O frontend usa proxy do Vite para `/api` → `http://localhost:3000`. Em dev, **não é necessário** criar `.env` no frontend.

---

## 2. Rodar em desenvolvimento

Abra **dois terminais** (ou use o script Windows na raiz).

### Terminal 1 — Backend (porta 3000)

```powershell
cd backend
npm run dev
```

### Terminal 2 — Frontend (porta 5173)

```powershell
cd frontend
npm run dev
```

Acesse no navegador: **http://localhost:5173**

### Atalho no Windows

Na raiz do repositório, dê duplo clique em [`iniciar.bat`](iniciar.bat). Ele abre o frontend em uma janela nova e sobe o backend no terminal atual (instala dependências e aplica migrations se necessário).

Para liberar a porta do backend:

```powershell
.\encerrar.bat
```

(Padrão: porta 3000.)

---

## 3. Popular o banco de dados (seed)

O projeto já inclui um script de seed com alunos, submissões, certificados, usuário demo e PDFs mínimos.

```powershell
cd backend
npm run db:seed
```

### O que o seed cria

- Usuário orientador: **`orientador`** / **`orientador123`**
- 4 alunos de exemplo
- Submissões em status pendente, aprovada e rejeitada
- Grupos e categorias acadêmicas (UFSC)
- Arquivos PDF de demo em `backend/uploads/`

### Atenção

O seed é **destrutivo**: apaga dados acadêmicos e uploads demo existentes e recria tudo. Use apenas em ambiente local de desenvolvimento.

### Quando rodar o seed

| Situação | Comando |
|----------|---------|
| Primeira configuração | `npx prisma migrate dev` → `npm run db:seed` |
| Banco vazio ou corrompido | `npm run db:seed` |
| Quer resetar a demo | `npm run db:seed` |

Se alterar apenas código (sem mudar schema), normalmente **não** precisa rodar o seed de novo.

---

## 4. Login no painel

Após o seed:

| Campo | Valor |
|-------|--------|
| Usuário | `orientador` |
| Senha | `orientador123` |

URL: http://localhost:5173/login

---

## 5. Problemas comuns

| Problema | Solução |
|----------|---------|
| `DATABASE_URL ausente` | Copie `backend/.env.example` para `backend/.env` |
| `SESSION_SECRET` inválido | Use pelo menos 16 caracteres no `.env` |
| Porta 3000 em uso | Execute `encerrar.bat` ou encerre o processo manualmente |
| Frontend sem dados | Confirme que o backend está rodando na porta 3000 |
| Lista vazia após clone | Rode `npx prisma migrate dev` e `npm run db:seed` no backend |

---

## Referência

Documentação completa: [`README.md`](README.md) e [`backend/README.md`](backend/README.md).
