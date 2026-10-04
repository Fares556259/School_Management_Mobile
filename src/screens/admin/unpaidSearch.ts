interface SearchableAccount {
  name: string;
  className?: string;
  parentName?: string;
  role?: string;
  phone?: string;
  parentPhone?: string;
}

export function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي')
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660))
    .toLocaleLowerCase().trim();
}

export function matchesUnpaidSearch(account: SearchableAccount, search: string) {
  const query = normalizeSearch(search);
  if (!query) return true;
  const phoneQuery = query.replace(/[\s()+.-]/g, '');
  if (/^\d+$/.test(phoneQuery)) {
    const phoneMatch = [account.phone, account.parentPhone].some(phone =>
      phone && normalizeSearch(phone).replace(/\D/g, '').includes(phoneQuery));
    if (phoneMatch) return true;
  }
  const text = normalizeSearch([account.name, account.className, account.parentName, account.role].filter(Boolean).join(' '));
  return query.split(/\s+/).every(word => text.includes(word));
}
