import type { Certificate } from '../types';

const GROUP_CODE_ORDER = ['GI', 'GII', 'GIII', 'GIV', 'GV'];

function compareGroupCodes(a: string, b: string): number {
  const ia = GROUP_CODE_ORDER.indexOf(a);
  const ib = GROUP_CODE_ORDER.indexOf(b);
  const ra = ia >= 0 ? ia : 99;
  const rb = ib >= 0 ? ib : 99;
  if (ra !== rb) {
    return ra - rb;
  }
  return a.localeCompare(b, 'pt-BR');
}

export type GroupedCertificateCategory = {
  categoryKey: string;
  categoryName: string;
  certificates: Certificate[];
};

export type GroupedCertificateGroup = {
  groupCode: string;
  groupLabel: string;
  categories: GroupedCertificateCategory[];
};

function resolveGroupCode(cert: Certificate): string {
  if (cert.academicValidation?.groupCode) {
    return cert.academicValidation.groupCode;
  }
  return cert.group || 'Outros';
}

function resolveCategoryName(cert: Certificate): string {
  if (cert.academicValidation?.categoryName) {
    return cert.academicValidation.categoryName;
  }
  return 'Sem categoria';
}

export function uniqueGroupCodesFromCertificates(certs: Certificate[]): string[] {
  const codes = new Set<string>();
  for (let i = 0; i < certs.length; i++) {
    codes.add(resolveGroupCode(certs[i]));
  }
  return Array.from(codes).sort(compareGroupCodes);
}

export function groupCertificatesForDisplay(certs: Certificate[]): GroupedCertificateGroup[] {
  const groupMap = new Map<
    string,
    { groupLabel: string; categories: Map<string, GroupedCertificateCategory> }
  >();

  for (let i = 0; i < certs.length; i++) {
    const cert = certs[i];
    const groupCode = resolveGroupCode(cert);
    const categoryName = resolveCategoryName(cert);
    const categoryKey = `${groupCode}::${categoryName}`;

    let group = groupMap.get(groupCode);
    if (!group) {
      group = {
        groupLabel: cert.academicValidation?.groupCode ? groupCode : cert.group || groupCode,
        categories: new Map(),
      };
      groupMap.set(groupCode, group);
    }

    let category = group.categories.get(categoryKey);
    if (!category) {
      category = { categoryKey, categoryName, certificates: [] };
      group.categories.set(categoryKey, category);
    }
    category.certificates.push(cert);
  }

  const groups: GroupedCertificateGroup[] = [];
  for (const [groupCode, data] of groupMap) {
    const categories = Array.from(data.categories.values()).sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName, 'pt-BR')
    );
    groups.push({
      groupCode,
      groupLabel: data.groupLabel,
      categories,
    });
  }

  groups.sort((a, b) => compareGroupCodes(a.groupCode, b.groupCode));
  return groups;
}
