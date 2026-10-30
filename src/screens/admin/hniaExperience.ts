export type HniaLanguage = 'fr' | 'en' | 'ar';
export const hniaText = (language: string, fr: string, en: string, ar: string) => language === 'ar' ? ar : language === 'en' ? en : fr;

export function freshnessLabel(fetchedAt: string | undefined, language: string, now = Date.now()) {
  const age = fetchedAt ? now - new Date(fetchedAt).getTime() : NaN;
  if (!Number.isFinite(age)) return hniaText(language, 'Date indisponible', 'Time unavailable', 'التاريخ غير متاح');
  if (age < 60_000 && age >= -60_000) return hniaText(language, 'À l’instant', 'Just now', 'توا');
  if (age < 3_600_000 && age >= 0) {
    const minutes = Math.floor(age / 60_000);
    return hniaText(language, `Il y a ${minutes} min`, `${minutes} min ago`, `منذ ${minutes} دق`);
  }
  return new Date(fetchedAt!).toLocaleString(language === 'ar' ? 'ar-TN' : language === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function contextualPrompts(language: string, hour = new Date().getHours(), className?: string) {
  const item = (id: string, fr: string, en: string, ar: string, prompt: string) => ({ id, label: hniaText(language, fr, en, ar), prompt });
  const attendance = item('attendance', 'Absences du jour', 'Today’s absences', 'غيابات اليوم', 'Absences du jour');
  const schedule = item('schedule', 'Planning du jour', 'Today’s schedule', 'توقيت اليوم', 'Montre les cours prévus aujourd’hui');
  const revenue = item('revenue', 'Caisse du jour', 'Today’s cash', 'كاسة اليوم', 'Caisse du jour');
  const unpaid = item('unpaid', 'Impayés du mois', 'Monthly unpaid fees', 'المستحقات', 'Impayés du mois');
  const items = hour < 13 ? [attendance, schedule, unpaid] : [revenue, unpaid, attendance];
  return className ? [item('class', `Classe ${className}`, `Class ${className}`, `القسم ${className}`, `Élèves de la classe ${className}`), ...items.slice(0, 2)] : items;
}

export function localizedProgress(step: string | null, tool: string | undefined, language: string) {
  const count = step?.match(/^(\d+) résultat/);
  if (count) return hniaText(language, `${count[1]} résultats vérifiés`, `${count[1]} verified records`, `${count[1]} نتائج مثبتة`);
  if (tool?.includes('payment') || tool?.includes('financial') || tool?.includes('caisse')) return hniaText(language, 'Vérification des finances…', 'Checking finances…', 'نتثبت في المالية…');
  if (tool?.includes('attendance')) return hniaText(language, 'Vérification des présences…', 'Checking attendance…', 'نتثبت في الحضور…');
  if (tool?.includes('student') || tool?.includes('class')) return hniaText(language, 'Consultation des dossiers…', 'Checking school records…', 'نراجع في الملفات…');
  if (/transcri|vocal/i.test(step || '')) return hniaText(language, 'Compréhension du vocal…', 'Understanding your voice…', 'نفهم في التسجيل…');
  if (/document|photo|image/i.test(step || '')) return hniaText(language, 'Lecture du document…', 'Reading the document…', 'نقرا في الوثيقة…');
  return hniaText(language, 'Consultation des données…', 'Checking school data…', 'نراجع في معطيات المدرسة…');
}
