/**
 * IDs fixos de grupos e categorias: alinham seed Prisma e o resolver de multipart legado
 * (`resolveCertificateAcademicLinks`). Evita drift entre seed e runtime.
 */

export const GROUP_IDS = {
  GI: 'a1000000-0000-4000-8000-000000000001',
  GII: 'a1000000-0000-4000-8000-000000000002',
  GIII: 'a1000000-0000-4000-8000-000000000003',
  GIV: 'a1000000-0000-4000-8000-000000000004',
  GV: 'a1000000-0000-4000-8000-000000000005',
} as const

export const CATEGORY_IDS = {
  GI_PESQUISA: 'b2000000-0000-4000-8000-000000000001',
  GI_ENSINO: 'b2000000-0000-4000-8000-000000000002',
  GII_CONGRESSOS: 'b2000000-0000-4000-8000-000000000010',
  GII_SEMINARIOS: 'b2000000-0000-4000-8000-000000000011',
  GII_DEFESAS: 'b2000000-0000-4000-8000-000000000012',
  GII_VISITAS: 'b2000000-0000-4000-8000-000000000013',
  GIII_PUBLICACOES: 'b2000000-0000-4000-8000-000000000020',
  GIV_VIVENCIA: 'b2000000-0000-4000-8000-000000000030',
  GV_DEMAIS: 'b2000000-0000-4000-8000-000000000099',
} as const

/** Ordem institucional GI → GV (exibição e consolidação); não persiste no banco nesta fase. */
export const SEED_ACTIVITY_GROUPS = [
  {
    id: GROUP_IDS.GI,
    code: 'GI',
    name: 'Grupo I — Docência e pesquisa',
    minHours: 20,
    displayOrder: 1,
  },
  {
    id: GROUP_IDS.GII,
    code: 'GII',
    name: 'Grupo II — Eventos e atividades assistidas',
    minHours: 20,
    displayOrder: 2,
  },
  {
    id: GROUP_IDS.GIII,
    code: 'GIII',
    name: 'Grupo III — Publicações científicas',
    minHours: 20,
    displayOrder: 3,
  },
  {
    id: GROUP_IDS.GIV,
    code: 'GIV',
    name: 'Grupo IV — Vivência profissional',
    minHours: 20,
    displayOrder: 4,
  },
  {
    id: GROUP_IDS.GV,
    code: 'GV',
    name: 'Grupo V — Formação complementar',
    minHours: 20,
    displayOrder: 5,
  },
] as const

const groupDisplayOrderById: Record<string, number> = {}
for (const g of SEED_ACTIVITY_GROUPS) {
  groupDisplayOrderById[g.id] = g.displayOrder
}

/**
 * Ordena grupos pela ordem oficial do catálogo (GI–GV). IDs desconhecidos vão ao fim.
 */
export function compareActivityGroupsByDisplayOrder(a: { id: string }, b: { id: string }): number {
  const oa = groupDisplayOrderById[a.id] ?? 999
  const ob = groupDisplayOrderById[b.id] ?? 999
  return oa - ob
}

export const SEED_ACTIVITY_CATEGORIES = [
  {
    id: CATEGORY_IDS.GI_PESQUISA,
    groupId: GROUP_IDS.GI,
    name: 'Pesquisa científica e tecnológica',
    maxHours: null as number | null,
    maxEligibleHours: null as number | null,
    description: 'Atividades de pesquisa vinculadas à graduação.',
    ruleNotes: 'Limite e contagem conforme regulamento UFSC da categoria (ex.: horas por projeto aprovado).',
  },
  {
    id: CATEGORY_IDS.GI_ENSINO,
    groupId: GROUP_IDS.GI,
    name: 'Atividades de ensino',
    maxHours: null as number | null,
    maxEligibleHours: null as number | null,
    description: 'Monitoria, preparação de material didático, etc.',
    ruleNotes: 'Exemplo de regra típica: X h por semestre de monitoria; teto Y h por curso (detalhar no regulamento oficial).',
  },
  {
    id: CATEGORY_IDS.GII_CONGRESSOS,
    groupId: GROUP_IDS.GII,
    name: 'Congressos',
    maxHours: 40,
    maxEligibleHours: 30,
    description: 'Participação em congressos e similares.',
    ruleNotes: 'Exemplo documental: até 2 h por palestra assistida; máximo total 10 h nesta categoria (ajustar ao regulamento vigente).',
  },
  {
    id: CATEGORY_IDS.GII_SEMINARIOS,
    groupId: GROUP_IDS.GII,
    name: 'Seminários',
    maxHours: 30,
    maxEligibleHours: 15,
    description: 'Seminários, colóquios e encontros científicos.',
    ruleNotes: 'Exemplo: 1 h por sessão; teto conforme regulamento.',
  },
  {
    id: CATEGORY_IDS.GII_DEFESAS,
    groupId: GROUP_IDS.GII,
    name: 'Defesas',
    maxHours: 20,
    maxEligibleHours: null as number | null,
    description: 'Participação em bancas e defesas.',
    ruleNotes: 'Exemplo: 1 h por participação em banca; máximo 20 h (referência típica; confirmar no regulamento).',
  },
  {
    id: CATEGORY_IDS.GII_VISITAS,
    groupId: GROUP_IDS.GII,
    name: 'Visitas técnicas',
    maxHours: 20,
    maxEligibleHours: null as number | null,
    description: 'Visitas técnicas e equivalentes.',
    ruleNotes: 'Contagem e teto conforme regulamento UFSC.',
  },
  {
    id: CATEGORY_IDS.GIII_PUBLICACOES,
    groupId: GROUP_IDS.GIII,
    name: 'Artigos e publicações',
    maxHours: null as number | null,
    maxEligibleHours: null as number | null,
    description: 'Divulgação científica e publicações.',
    ruleNotes: 'Pontuação por tipo de publicação conforme regulamento.',
  },
  {
    id: CATEGORY_IDS.GIV_VIVENCIA,
    groupId: GROUP_IDS.GIV,
    name: 'Estágio não obrigatório e vivência',
    maxHours: null as number | null,
    maxEligibleHours: null as number | null,
    description: 'Experiência profissional fora da matriz obrigatória.',
    ruleNotes: 'Limite de horas conforme regulamento e comprovação.',
  },
  {
    id: CATEGORY_IDS.GV_DEMAIS,
    groupId: GROUP_IDS.GV,
    name: 'Demais atividades complementares',
    maxHours: null as number | null,
    maxEligibleHours: null as number | null,
    description: 'Fallback para atividades de formação complementar não classificadas em outra categoria.',
    ruleNotes: 'Usado quando o texto legado do multipart não puder ser mapeado com segurança. Preferir envio formal de categoryId no futuro.',
  },
] as const
