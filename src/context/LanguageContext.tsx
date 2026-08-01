import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nManager } from 'react-native';
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
    quickActions: "وصول سريع",
    examCenter: "مركز الامتحانات",
    examCenterSub: "مواعيد وجدول الامتحانات",
    reportCard: "دفتر الأعداد والنتائج",
    reportCardSub: "المعدلات والملاحظات",
    backToToday: "العودة لليوم",
    
    // Status Badges
    absent: "غائب",
    present: "حاضر",
    late: "متأخر",
    upcoming: "قادم",
    teacher: "المدرس",

    // Courses / Academic
    academicPortal: "الفضاء المدرسي",
    coursesHub: "المواد والدروس",
    coursesSub: "الدروس والوثائق الخاصة بـ",
    filesCount: "وثائق",
    viewLearningMaterials: "عرض الوثائق والدروس",
    noCourses: "لا توجد مواد مسجلة حالياً",
    noCoursesSub: "ستظهر الوثائق والدروس هنا فور تنزيلها من قبل المعلم.",
    academicSpace: "الفضاء المدرسي",
    coursesTitle: "المواد الدراسية",
    results: "الأعداد والنتائج",
    attendance: "المواظبة والحضور",
    exams: "جدول الامتحانات",
    noExams: "لا توجد امتحانات مبرمجة حالياً",
    documents: "وثائق ومستندات",
    documentsCenter: "مركز الوثائق",
    trimester1: "الثلاثي الأول",
    trimester2: "الثلاثي الثاني",
    trimester3: "الثلاثي الثالث",

    // Payments
    paymentsTitle: "الرسوم والمدفوعات",
    totalOutstanding: "المبلغ الجملي المستحق",
    currencyTnd: "د.ت",
    filterAll: "الكل",
    filterPaid: "المستخلصة",
    filterUnpaid: "غير المستخلصة",
    paymentHistory: "جدول الأقساط والمدفوعات",
    tuitionFees: "قسط التسجيل والدراسة",
    overdueBadge: "متأخر",
    overdueDays: "مستحق منذ",
    daysLabel: "يوم",
    receipts: "وصولات الخلاص",
    paid: "خلاص تام",
    pending: "في انتظار الدفع",
    totalPaid: "المبلغ المدفوع",
    remaining: "المتبقي",
    downloadReceipt: "تحميل الوصل (PDF)",

    // Announcements
    announcementsTitle: "إعلانات المدرسة",
    schoolNews: "أخبار وإعلانات الإدارة",
    schoolNewsBadge: "أخبار المدرسة",
    urgentBadge: "عاجل",
    readMore: "قراءة التفاصيل",

    // Profile & Settings
    profileTitle: "الملف الشخصي",
    profileSettingTitle: "إعدادات الملف الشخصي",
    myChildren: "أبنائي المسجلين",
    generalSection: "إعدادات عامة",
    preferencesSection: "التفضيلات واللغة",
    editProfileItem: "تعديل الملف الشخصي",
    editProfileSub: "تحديث الصورة، الاسم، ورقم الهاتف",
    reportCardItem: "دفتر الأعداد والنتائج",
    profileReportCardSub: "متابعة نتائج ومعدلات التلميذ",
    documentCenterItem: "مركز الوثائق والمستندات",
    profileDocumentCenterSub: "تحميل الوثائق الإدارية والشهائد",
    notificationsItem: "التنبيهات والإشعارات",
    notificationsSub: "تعديل وتخصيص تفضيلات التنبيهات",
    schoolSupportItem: "الدعم والتواصل مع المدرسة",
    schoolSupportSub: "الاتصال المباشر بإدارة المؤسسة",
    signOutSub: "تسجيل الخروج الآمن من الحساب",
    classLabel: "القسم",
    cancel: "إلغاء",
    save: "حفظ",
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
    jan: "يناير", feb: "فبراير", mar: "مارس", apr: "أبريل", may: "ماي", jun: "جوان",
    jul: "جويلية", aug: "أوت", sep: "سبتمبر", oct: "أكتوبر", nov: "نوفمبر", dec: "ديسمبر",
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
    quickActions: "Accès Rapide",
    examCenter: "Centre d'Examens",
    examCenterSub: "Dates & plannings",
    reportCard: "Bulletin Scolaire",
    reportCardSub: "Moyennes & notes",
    backToToday: "Aujourd'hui",

    // Status Badges
    absent: "Absent",
    present: "Présent",
    late: "En retard",
    upcoming: "À venir",
    teacher: "Enseignant",

    // Courses / Academic
    academicPortal: "Portail Académique",
    coursesHub: "Matières & Cours",
    coursesSub: "Cours et documents pour",
    filesCount: "fichiers",
    viewLearningMaterials: "Voir les cours & supports",
    noCourses: "Aucune matière inscrite",
    noCoursesSub: "Les cours apparaîtront dès qu'ils seront mis en ligne par l'enseignant.",
    academicSpace: "Espace Académique",
    coursesTitle: "Matières & Cours",
    results: "Bulletins & Notes",
    attendance: "Présence & Absences",
    exams: "Planning d'Examens",
    noExams: "Aucun examen programmé pour le moment",
    documents: "Documents",
    documentsCenter: "Centre de Documents",
    trimester1: "1er Trimestre",
    trimester2: "2ème Trimestre",
    trimester3: "3ème Trimestre",

    // Payments
    paymentsTitle: "Frais de Scolarité",
    totalOutstanding: "Total Reste à Payer",
    currencyTnd: "TND",
    filterAll: "Tous",
    filterPaid: "Payés",
    filterUnpaid: "Non Payés",
    paymentHistory: "Historique des Paiements",
    tuitionFees: "Frais de Scolarité",
    overdueBadge: "En Retard",
    overdueDays: "En retard de",
    daysLabel: "jours",
    receipts: "Reçus de Paiement",
    paid: "Payé",
    pending: "En attente",
    totalPaid: "Total Payé",
    remaining: "Reste à payer",
    downloadReceipt: "Télécharger le reçu (PDF)",

    // Announcements
    announcementsTitle: "Annonces de l'École",
    schoolNews: "Actualités & Communiqués",
    schoolNewsBadge: "Info École",
    urgentBadge: "Urgent",
    readMore: "Lire la suite",

    // Profile & Settings
    profileTitle: "Profil & Réglages",
    profileSettingTitle: "Réglages du Profil",
    myChildren: "Mes Enfants Inscrits",
    generalSection: "Général",
    preferencesSection: "Préférences & Langue",
    editProfileItem: "Modifier le Profil",
    editProfileSub: "Changer photo, nom et numéro",
    reportCardItem: "Bulletin Scolaire",
    profileReportCardSub: "Voir les notes et moyennes",
    documentCenterItem: "Centre de Documents",
    profileDocumentCenterSub: "Télécharger les documents scolaires",
    notificationsItem: "Notifications",
    notificationsSub: "Gérer les préférences d'alertes",
    schoolSupportItem: "Support de l'École",
    schoolSupportSub: "Contacter l'administration",
    signOutSub: "Déconnexion sécurisée",
    classLabel: "Classe",
    cancel: "Annuler",
    save: "Enregistrer",
    appLanguage: "Langue de l'application",
    arabic: "العربية 🇹🇳",
    french: "Français 🇫🇷",
    english: "English 🇬🇧",
    signOut: "Déconnexion",
    linkChild: "Lier un autre enfant",
    selectLanguageTitle: "Choisir la langue",
    confirm: "Confirmer",

    // Days & Months
    monday: "Lun", tuesday: "Mar", wednesday: "Mer", thursday: "Jeu", friday: "Ven", saturday: "Sam", sunday: "Dim",
    jan: "Janv", feb: "Févr", mar: "Mars", apr: "Avril", may: "Mai", jun: "Juin", jul: "Juil", aug: "Août", sep: "Sept", oct: "Oct", nov: "Nov", dec: "Déc",
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
    quickActions: "Quick Actions",
    examCenter: "Exam Center",
    examCenterSub: "Dates & schedules",
    reportCard: "Report Card",
    reportCardSub: "Grades & averages",
    backToToday: "Back to Today",

    // Status Badges
    absent: "Absent",
    present: "Present",
    late: "Late",
    upcoming: "Upcoming",
    teacher: "Teacher",

    // Courses / Academic
    academicPortal: "Academic Portal",
    coursesHub: "Courses Hub",
    coursesSub: "Materials and lessons for",
    filesCount: "Files",
    viewLearningMaterials: "View learning materials",
    noCourses: "No active courses",
    noCoursesSub: "Course materials will appear here once your teacher uploads them.",
    academicSpace: "Academic Space",
    coursesTitle: "Courses",
    results: "Results & Marks",
    attendance: "Attendance",
    exams: "Exam Schedule",
    noExams: "No exams scheduled currently",
    documents: "Documents",
    documentsCenter: "Document Center",
    trimester1: "1st Term",
    trimester2: "2nd Term",
    trimester3: "3rd Term",

    // Payments
    paymentsTitle: "Tuition & Fees",
    totalOutstanding: "Total Outstanding",
    currencyTnd: "TND",
    filterAll: "All",
    filterPaid: "Paid",
    filterUnpaid: "Unpaid",
    paymentHistory: "Payment History",
    tuitionFees: "Tuition Fees",
    overdueBadge: "Overdue",
    overdueDays: "Overdue by",
    daysLabel: "days",
    receipts: "Payment Receipts",
    paid: "Paid",
    pending: "Pending",
    totalPaid: "Total Paid",
    remaining: "Remaining",
    downloadReceipt: "Download Receipt (PDF)",

    // Announcements
    announcementsTitle: "School Announcements",
    schoolNews: "News & Bulletins",
    schoolNewsBadge: "School News",
    urgentBadge: "Urgent",
    readMore: "Read Details",

    // Profile & Settings
    profileTitle: "Profile & Settings",
    profileSettingTitle: "Profile Setting",
    myChildren: "My Enrolled Children",
    generalSection: "General",
    preferencesSection: "Preferences & Language",
    editProfileItem: "Edit Profile",
    editProfileSub: "Change profile picture, number, name",
    reportCardItem: "Report Card",
    profileReportCardSub: "View student academic performance",
    documentCenterItem: "Document Center",
    profileDocumentCenterSub: "Securely access school documents",
    notificationsItem: "Notification",
    notificationsSub: "Customize your notification preferences",
    schoolSupportItem: "School Support",
    schoolSupportSub: "Official SnapSchool Help",
    signOutSub: "Securely log out of Account",
    classLabel: "Class",
    cancel: "Cancel",
    save: "Save",
    appLanguage: "App Language",
    arabic: "العربية 🇹🇳",
    french: "Français 🇫🇷",
    english: "English 🇬🇧",
    signOut: "Sign Out",
    linkChild: "Link Another Student",
    selectLanguageTitle: "Select App Language",
    confirm: "Confirm",

    // Days & Months
    monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun",
    jan: "Jan", feb: "Feb", mar: "Mar", apr: "Apr", may: "May", jun: "Jun", jul: "Jul", aug: "Aug", sep: "Sep", oct: "Oct", nov: "Nov", dec: "Dec",
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
