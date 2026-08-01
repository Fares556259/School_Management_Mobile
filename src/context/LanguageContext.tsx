import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'ar' | 'fr' | 'en';

const LANGUAGE_KEY = 'snapschool_app_language';

const translations = {
  ar: {
    // Navigation
    tabHome: "الرئيسية",
    tabCourses: "المواد",
    tabAnnouncements: "الإعلانات",
    tabPayments: "المدفوعات",
    tabProfile: "حسابي",

    // Header & Common
    loading: "جاري التحميل...",
    switchChild: "تغيير التلميذ",

    // Home Screen
    todaysSchedule: "جدول اليوم",
    history: "السجل",
    noClasses: "لا توجد دروس اليوم",
    freeDay: "اليوم راحة، نتمنى لك يوماً سعيداً!",
    tasks: "الواجبات المنزلية",
    allCaughtUp: "ممتاز! تم إنجاز جميع الواجبات.",
    teacherRemarks: "ملاحظات وتوصيات المعلمين",
    noRemarks: "لا توجد ملاحظات جديدة اليوم.",
    
    // Status Badges
    absent: "غائب",
    present: "حاضر",
    late: "متأخر",
    upcoming: "قادم",
    teacher: "المدرس",

    // Courses / Academic
    academicSpace: "الفضاء المدرسي",
    coursesTitle: "المواد الدراسية",
    results: "الأعداد والنتائج",
    attendance: "المواظبة والحضور",
    exams: "جدول الامتحانات",
    documents: "وثائق ومستندات",
    documentsCenter: "مركز الوثائق",

    // Payments
    paymentsTitle: "الرسوم والمدفوعات",
    receipts: "وصولات الخلاص",
    paid: "خلاص تام",
    pending: "في انتظار الدفع",
    totalPaid: "المبلغ المدفوع",
    remaining: "المتبقي",
    downloadReceipt: "تحميل الوصل (PDF)",

    // Announcements
    announcementsTitle: "إعلانات المدرسة",
    schoolNews: "أخبار وإعلانات الإدارة",
    readMore: "قراءة التفاصيل",

    // Profile & Settings
    profileTitle: "الملف الشخصي",
    myChildren: "أبنائي المسجلين",
    appLanguage: "لغة التطبيق",
    arabic: "العربية 🇹🇳",
    french: "Français 🇫🇷",
    english: "English 🇬🇧",
    signOut: "تسجيل الخروج",
    linkChild: "ربط تلميذ جديد",
    selectLanguageTitle: "اختر لغة التطبيق",
    confirm: "تأكيد",

    // Days & Months
    monday: "الإثنين",
    tuesday: "الثلاثاء",
    wednesday: "الأربعاء",
    thursday: "الخميس",
    friday: "الجمعة",
    saturday: "السبت",
    sunday: "الأحد",
  },
  fr: {
    // Navigation
    tabHome: "Accueil",
    tabCourses: "Matières",
    tabAnnouncements: "Annonces",
    tabPayments: "Paiements",
    tabProfile: "Profil",

    // Header & Common
    loading: "Chargement...",
    switchChild: "Changer d'élève",

    // Home Screen
    todaysSchedule: "Emploi du Temps",
    history: "Historique",
    noClasses: "Aucun cours aujourd'hui",
    freeDay: "Journée libre ! Profitez-en pour réviser.",
    tasks: "Devoirs & Tâches",
    allCaughtUp: "Bravo ! Tout est à jour.",
    teacherRemarks: "Remarques des Enseignants",
    noRemarks: "Aucune remarque aujourd'hui.",

    // Status Badges
    absent: "Absent",
    present: "Présent",
    late: "En retard",
    upcoming: "À venir",
    teacher: "Enseignant",

    // Courses / Academic
    academicSpace: "Espace Académique",
    coursesTitle: "Matières & Cours",
    results: "Bulletins & Notes",
    attendance: "Présence & Absences",
    exams: "Planning d'Examens",
    documents: "Documents",
    documentsCenter: "Centre de Documents",

    // Payments
    paymentsTitle: "Frais de Scolarité",
    receipts: "Reçus de Paiement",
    paid: "Payé",
    pending: "En attente",
    totalPaid: "Total Payé",
    remaining: "Reste à payer",
    downloadReceipt: "Télécharger le reçu (PDF)",

    // Announcements
    announcementsTitle: "Annonces de l'École",
    schoolNews: "Actualités & Communiqués",
    readMore: "Lire la suite",

    // Profile & Settings
    profileTitle: "Profil & Réglages",
    myChildren: "Mes Enfants Inscrits",
    appLanguage: "Langue de l'application",
    arabic: "العربية 🇹🇳",
    french: "Français 🇫🇷",
    english: "English 🇬🇧",
    signOut: "Déconnexion",
    linkChild: "Lier un autre enfant",
    selectLanguageTitle: "Choisir la langue",
    confirm: "Confirmer",

    // Days
    monday: "Lun",
    tuesday: "Mar",
    wednesday: "Mer",
    thursday: "Jeu",
    friday: "Ven",
    saturday: "Sam",
    sunday: "Dim",
  },
  en: {
    // Navigation
    tabHome: "Home",
    tabCourses: "Courses",
    tabAnnouncements: "Announcements",
    tabPayments: "Payments",
    tabProfile: "Profile",

    // Header & Common
    loading: "Loading...",
    switchChild: "Switch Student",

    // Home Screen
    todaysSchedule: "Today's Schedule",
    history: "History",
    noClasses: "No classes today",
    freeDay: "Enjoy your free day and catch up on reading!",
    tasks: "Tasks",
    allCaughtUp: "All caught up! No tasks due.",
    teacherRemarks: "Teacher Remarks",
    noRemarks: "No remarks for today.",

    // Status Badges
    absent: "Absent",
    present: "Present",
    late: "Late",
    upcoming: "Upcoming",
    teacher: "Teacher",

    // Courses / Academic
    academicSpace: "Academic Space",
    coursesTitle: "Courses",
    results: "Results & Marks",
    attendance: "Attendance",
    exams: "Exam Schedule",
    documents: "Documents",
    documentsCenter: "Document Center",

    // Payments
    paymentsTitle: "Tuition & Fees",
    receipts: "Payment Receipts",
    paid: "Paid",
    pending: "Pending",
    totalPaid: "Total Paid",
    remaining: "Remaining",
    downloadReceipt: "Download Receipt (PDF)",

    // Announcements
    announcementsTitle: "School Announcements",
    schoolNews: "News & Bulletins",
    readMore: "Read Details",

    // Profile & Settings
    profileTitle: "Profile & Settings",
    myChildren: "My Enrolled Children",
    appLanguage: "App Language",
    arabic: "العربية 🇹🇳",
    french: "Français 🇫🇷",
    english: "English 🇬🇧",
    signOut: "Sign Out",
    linkChild: "Link New Child",
    selectLanguageTitle: "Select App Language",
    confirm: "Confirm",

    // Days
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: typeof translations['ar'];
  isRTL: boolean;
  getTranslatedSubject: (rawName: string | null | undefined) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: async () => {},
  t: translations.ar,
  isRTL: true,
  getTranslatedSubject: () => '',
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<Language>('ar');

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY).then((stored) => {
      if (stored && (stored === 'ar' || stored === 'fr' || stored === 'en')) {
        setLangState(stored as Language);
      }
    });
  }, []);

  const setLanguage = async (newLang: Language) => {
    setLangState(newLang);
    await AsyncStorage.setItem(LANGUAGE_KEY, newLang);
  };

  const getTranslatedSubject = (rawName: string | null | undefined): string => {
    if (!rawName) return '';
    const parts = rawName.split('|').map((p) => p.trim());
    if (parts.length >= 3) {
      if (language === 'ar') return parts[0];
      if (language === 'fr') return parts[1];
      return parts[2];
    }
    return parts[0];
  };

  const t = translations[language] || translations.ar;
  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, getTranslatedSubject }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
