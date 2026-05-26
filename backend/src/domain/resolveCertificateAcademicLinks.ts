/**
 * TEMPORÁRIO — compatibilidade com multipart legado
 *
 * O campo textual `cert_N_grupo` do multipart não transporta IDs formais de grupo/categoria.
 * Este mapeamento fixo permite persistir `CertificateValidation` sem quebrar integrações existentes.
 *
 * Destino futuro: o cliente (formulário web ou integração Moodle/chatbot) deve enviar
 * `activityGroupId` e `activityCategoryId` (ou códigos GI/GII + slug de categoria) de forma explícita;
 * quando isso existir, este arquivo pode ser reduzido ou removido.
 */

import { CATEGORY_IDS, GROUP_IDS } from './academicCatalog'

export type AcademicLinkResolution = {
  activityGroupId: string
  activityCategoryId: string
}

function normalizeGrupo(raw: string): string {
  return stripDiacritics(raw.trim().toLowerCase())
}

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Resolve o par (grupo, categoria) acadêmico a partir do texto livre enviado no multipart.
 */
export function resolveCertificateAcademicLinks(grupo: string): AcademicLinkResolution {
  const g = normalizeGrupo(grupo)

  if (g === 'pesquisa') {
    return { activityGroupId: GROUP_IDS.GI, activityCategoryId: CATEGORY_IDS.GI_PESQUISA }
  }
  if (g === 'ensino' || g === 'monitoria') {
    return { activityGroupId: GROUP_IDS.GI, activityCategoryId: CATEGORY_IDS.GI_ENSINO }
  }
  if (g === 'eventos' || g.includes('evento')) {
    return { activityGroupId: GROUP_IDS.GII, activityCategoryId: CATEGORY_IDS.GII_CONGRESSOS }
  }
  if (g === 'publicacoes' || g === 'publicações' || g === 'publicacao' || g === 'publicação') {
    return { activityGroupId: GROUP_IDS.GIII, activityCategoryId: CATEGORY_IDS.GIII_PUBLICACOES }
  }
  if (g === 'vivencia' || g === 'vivência' || g === 'estagio' || g === 'estágio') {
    return { activityGroupId: GROUP_IDS.GIV, activityCategoryId: CATEGORY_IDS.GIV_VIVENCIA }
  }
  if (g === 'extensao' || g === 'extensão' || g === 'outros' || g === 'outro') {
    return { activityGroupId: GROUP_IDS.GV, activityCategoryId: CATEGORY_IDS.GV_DEMAIS }
  }

  return { activityGroupId: GROUP_IDS.GV, activityCategoryId: CATEGORY_IDS.GV_DEMAIS }
}
