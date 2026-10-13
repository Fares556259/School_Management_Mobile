jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const { formatNotificationText, formatSubjectName } = require('../LanguageContext');

describe('notification language formatting', () => {
  it('removes legacy Arabic urgency markers from French announcements', () => {
    expect(formatNotificationText('عاجل: Avis officiel : école fermée.', 'fr'))
      .toBe('Avis officiel : école fermée.');
  });

  it('localizes generated homework titles', () => {
    expect(formatNotificationText('📝 مهمة جديدة: Lecture chapitre 2', 'fr'))
      .toBe('Nouveau devoir : Lecture chapitre 2');
    expect(formatNotificationText('📝 مهمة جديدة: Lecture chapter 2', 'en'))
      .toBe('New assignment: Lecture chapter 2');
  });

  it('shows only the selected language from legacy bilingual payment reminders', () => {
    const reminder = 'تذكير: نرجو تسوية المعاليم.\n\nRappel : Merci de régulariser les frais.';
    expect(formatNotificationText(reminder, 'ar')).toBe('تذكير: نرجو تسوية المعاليم.');
    expect(formatNotificationText(reminder, 'fr')).toBe('Rappel : Merci de régulariser les frais.');
  });

  it('localizes generated attendance and resource notifications', () => {
    expect(formatNotificationText('تنبيه الحضور: غياب', 'fr')).toBe('Absence enregistrée');
    expect(formatNotificationText('📚 ملخص جديد: Chapitre 3', 'en')).toBe('New course material: Chapitre 3');
    expect(formatNotificationText('تمت إضافة مواد تعليمية جديدة في مادة Mathématiques.', 'fr'))
      .toBe('Un nouveau support a été ajouté en Mathématiques.');
  });

  it('localizes free periods instead of leaking English into Arabic', () => {
    expect(formatSubjectName('Free Period', 'ar')).toBe('حصة فراغ');
    expect(formatSubjectName('Free Period', 'fr')).toBe('Heure libre');
  });
});
