import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, ArrowLeft, Globe, Check, GraduationCap, Bell, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useLanguage, Language } from '../context/LanguageContext';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: any;
  badge: { fr: string; ar: string; en: string };
  title: { fr: string; ar: string; en: string };
  highlight: { fr: string; ar: string; en: string };
  description: { fr: string; ar: string; en: string };
  image: any;
  accentColor: string;
}

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'grades_and_homework',
    icon: GraduationCap,
    badge: {
      fr: 'SUIVI SCOLAIRE EN DIRECT',
      ar: 'متابعة دراسية مباشرة',
      en: 'REAL-TIME SCHOOL TRACKING',
    },
    title: {
      fr: 'Votre École en Direct, ',
      ar: 'مدرستكم معكم في كل مكان، ',
      en: 'Your School in Real-Time, ',
    },
    highlight: {
      fr: 'Partout & Sans Stress.',
      ar: 'بكل ثقة وسهولة.',
      en: 'Anywhere & Stress-Free.',
    },
    description: {
      fr: 'Accédez instantanément aux devoirs, notes, bulletins, emplois du temps et présences de vos enfants sans attendre.',
      ar: 'اطلعوا فوراً على الأعداد، الملاحظات، جداول الأوقات، الواجبات والغيابات بكل دقة ويسر.',
      en: 'Instantly view homework, exam results, report cards, class schedules, and attendance records on the go.',
    },
    image: require('../../assets/onboarding/onboard_grades.jpg'),
    accentColor: '#0055d4',
  },
  {
    id: 'push_notifications',
    icon: Bell,
    badge: {
      fr: 'NOTIFICATIONS & ALERTES',
      ar: 'تنبيهات وإشعارات فورية',
      en: 'INSTANT NOTIFICATIONS',
    },
    title: {
      fr: 'Ne Manquez Plus Aucune ',
      ar: 'لا تفوتوا أي خبر رسمي أو ',
      en: 'Never Miss a Moment or ',
    },
    highlight: {
      fr: 'Information Cruciale.',
      ar: 'تنبيه استعجالي.',
      en: 'Crucial Update.',
    },
    description: {
      fr: 'Retards, absences, annulations de cours ou circulaires : soyez averti(e) par notification push prioritaire sur votre smartphone.',
      ar: 'إشعارات سريعة وتنبيهات مستعجلة للغيابات، التأخيرات، تغيرات التوقيت والإعلانات الهامة تصلكم مباشرة.',
      en: 'Get instant push alerts for unexpected schedule changes, attendance status, and priority school circulars.',
    },
    image: require('../../assets/onboarding/onboard_alerts.jpg'),
    accentColor: '#d97706',
  },
  {
    id: 'community_collaboration',
    icon: Users,
    badge: {
      fr: 'ENSEIGNANTS & PARENTS',
      ar: 'الأساتذة والأولياء معاً',
      en: 'TEACHERS & PARENTS',
    },
    title: {
      fr: 'Une Plateforme Unifiée pour la ',
      ar: 'منصة موحدة ومريحة من أجل ',
      en: 'A Unified Platform for ',
    },
    highlight: {
      fr: 'Réussite de Chacun.',
      ar: 'تفوق ونجاح أبنائنا.',
      en: 'Student Success.',
    },
    description: {
      fr: "Suivi transparent des paiements de scolarité, gestion d'appel pour les profs et relation fluide pour l'épanouissement des élèves.",
      ar: 'متابعة شفافة لرسوم الدراسة، إدارة سلسة للحصص للمعلمين، وتواصل بنّاء لدعم مسيرة التلميذ.',
      en: 'Streamlined tuition tracking, effortless teacher attendance logs, and frictionless communication.',
    },
    image: require('../../assets/onboarding/onboard_teacher.jpg'),
    accentColor: '#059669',
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { language, setLanguage, isRTL } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
      setCurrentIndex(prevIndex);
    }
  };

  const handleFinish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  };

  const currentSlide = ONBOARDING_SLIDES[currentIndex];
  const CurrentIcon = currentSlide.icon;

  const getLangBadge = () => {
    if (language === 'ar') return 'العربية 🇹🇳';
    if (language === 'fr') return 'Français 🇫🇷';
    return 'English 🇬🇧';
  };

  const skipLabel = language === 'ar' ? 'تخطي ←' : language === 'fr' ? 'Passer →' : 'Skip →';
  const prevLabel = language === 'ar' ? 'السابق' : language === 'fr' ? 'Précédent' : 'Previous';
  const nextLabel = language === 'ar' ? 'Suivant' : language === 'fr' ? 'Suivant' : 'Next';
  const getStartedLabel =
    language === 'ar' ? 'ابدأ الآن 🚀' : language === 'fr' ? 'Commencer 🚀' : 'Get Started 🚀';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fbff" />

      {/* Ambient background decoration */}
      <View style={styles.ambientCircleOne} />
      <View style={styles.ambientCircleTwo} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Top Header Bar */}
        <View style={styles.headerBar}>
          {/* Language Switcher */}
          <TouchableOpacity
            onPress={() => setLangModalVisible(true)}
            activeOpacity={0.8}
            style={styles.langButton}
          >
            <Globe size={16} color="#0055d4" />
            <Text style={styles.langButtonText}>{getLangBadge()}</Text>
          </TouchableOpacity>

          {/* Skip Button */}
          <TouchableOpacity
            onPress={handleFinish}
            activeOpacity={0.7}
            style={styles.skipButton}
          >
            <Text style={styles.skipButtonText}>{skipLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* 3D Hero Carousel */}
        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={ONBOARDING_SLIDES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            keyExtractor={(item) => item.id}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
              }, 100);
            }}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
              setCurrentIndex(Math.min(Math.max(newIndex, 0), ONBOARDING_SLIDES.length - 1));
            }}
            renderItem={({ item }) => (
              <View style={styles.slideItem}>
                <View style={styles.imageCard}>
                  <Image source={item.image} style={styles.heroImage} resizeMode="cover" />
                </View>
              </View>
            )}
          />
        </View>

        {/* Bottom Floating Information Card */}
        <View style={styles.bottomCard}>
          {/* Step Indicator (Pill dots) */}
          <View style={styles.indicatorContainer}>
            {ONBOARDING_SLIDES.map((_, index) => {
              const isActive = index === currentIndex;
              return (
                <View
                  key={index}
                  style={[
                    styles.indicatorDot,
                    isActive ? styles.indicatorActive : styles.indicatorInactive,
                  ]}
                />
              );
            })}
          </View>

          {/* Clean Badge (No AI Sparkles, proper semantic icon) */}
          <View
            style={[
              styles.badgeWrapper,
              {
                backgroundColor: `${currentSlide.accentColor}12`,
                borderColor: `${currentSlide.accentColor}30`,
              },
            ]}
          >
            <CurrentIcon size={14} color={currentSlide.accentColor} strokeWidth={2.4} />
            <Text style={[styles.badgeText, { color: currentSlide.accentColor }]}>
              {currentSlide.badge[language] || currentSlide.badge.fr}
            </Text>
          </View>

          {/* Title & Highlight */}
          <Text style={[styles.mainTitle, isRTL && { textAlign: 'right' }]}>
            {currentSlide.title[language] || currentSlide.title.fr}
            <Text style={[styles.highlightText, { color: currentSlide.accentColor }]}>
              {currentSlide.highlight[language] || currentSlide.highlight.fr}
            </Text>
          </Text>

          {/* Description */}
          <Text style={[styles.descriptionText, isRTL && { textAlign: 'right' }]}>
            {currentSlide.description[language] || currentSlide.description.fr}
          </Text>

          {/* Action Navigation Buttons */}
          <View style={styles.buttonRow}>
            {currentIndex > 0 ? (
              <TouchableOpacity
                onPress={handlePrevious}
                activeOpacity={0.8}
                style={styles.prevButton}
              >
                <ArrowLeft size={18} color="#64748b" />
                <Text style={styles.prevButtonText}>{prevLabel}</Text>
              </TouchableOpacity>
            ) : null}

            {currentIndex < ONBOARDING_SLIDES.length - 1 ? (
              <TouchableOpacity
                onPress={handleNext}
                activeOpacity={0.85}
                style={[
                  styles.nextButton,
                  { flex: currentIndex > 0 ? 1 : undefined, width: currentIndex === 0 ? '100%' : undefined },
                ]}
              >
                <Text style={styles.nextButtonText}>{nextLabel}</Text>
                <ChevronRight size={20} color="#ffffff" strokeWidth={2.5} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleFinish}
                activeOpacity={0.85}
                style={[
                  styles.finishButton,
                  { flex: currentIndex > 0 ? 1 : undefined, width: currentIndex === 0 ? '100%' : undefined },
                ]}
              >
                <Text style={styles.finishButtonText} numberOfLines={1}>
                  {getStartedLabel}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Language Modal */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setLangModalVisible(false)}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {language === 'ar'
                ? 'اختر لغة التطبيق'
                : language === 'fr'
                ? "Langue de l'application"
                : 'Select App Language'}
            </Text>

            {[
              { id: 'ar', name: 'العربية', flag: '🇹🇳' },
              { id: 'fr', name: 'Français', flag: '🇫🇷' },
              { id: 'en', name: 'English', flag: '🇬🇧' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={async () => {
                  await setLanguage(item.id as Language);
                  setLangModalVisible(false);
                }}
                style={[
                  styles.langOption,
                  language === item.id && styles.langOptionSelected,
                ]}
              >
                <Text style={styles.langOptionText}>
                  {item.flag} {item.name}
                </Text>
                {language === item.id && <Check size={20} color="#0055d4" strokeWidth={3} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fbff',
  },
  ambientCircleOne: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: '#0055d40a',
  },
  ambientCircleTwo: {
    position: 'absolute',
    top: height * 0.35,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#0284c708',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
    zIndex: 10,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  langButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  carouselContainer: {
    height: height * 0.42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideItem: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  imageCard: {
    width: Math.min(width * 0.78, 300),
    height: Math.min(width * 0.78, 300),
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    shadowColor: '#0055d4',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#e8f0fe',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  bottomCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
    justifyContent: 'space-between',
    shadowColor: '#0055d4',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  indicatorDot: {
    height: 6,
    borderRadius: 3,
  },
  indicatorActive: {
    width: 26,
    backgroundColor: '#0055d4',
  },
  indicatorInactive: {
    width: 6,
    backgroundColor: '#e2e8f0',
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 7,
    marginBottom: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    lineHeight: 28,
    letterSpacing: -0.4,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    marginBottom: 6,
  },
  highlightText: {
    fontWeight: '900',
  },
  descriptionText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    fontWeight: '500',
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    gap: 6,
  },
  prevButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0055d4',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#0055d4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0055d4',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#0055d4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  finishButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  langOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#0055d4',
  },
  langOptionText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
});
