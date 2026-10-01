import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import {
  Wallet,
  CreditCard,
  TrendingUp,
  Users,
  Camera,
  Calendar,
  Sparkles,
  ChevronRight,
} from 'lucide-react-native';

const HNIA_AVATAR = require('../../../../assets/hnia/hnia_mascot_icon.png');

export interface SuggestionAction {
  id: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  prompt?: string;
  onPress?: () => void;
}

interface HniaEmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
  onOpenAttachmentSheet: () => void;
  schoolName?: string;
}

export default function HniaEmptyState({
  onSelectPrompt,
  onOpenAttachmentSheet,
  schoolName = 'SnapSchool',
}: HniaEmptyStateProps) {
  const suggestions: SuggestionAction[] = [
    {
      id: 'revenus',
      icon: TrendingUp,
      iconColor: '#0284c7',
      iconBg: '#e0f2fe',
      title: 'Recettes du mois',
      description: 'Point de caisse, rentrées et solde physique net',
      prompt: 'Donne-moi les revenus et le bilan financier de ce mois',
    },
    {
      id: 'impayes',
      icon: CreditCard,
      iconColor: '#dc2626',
      iconBg: '#fef2f2',
      title: 'Paiements en retard',
      description: 'Élèves avec impayés et options de relance',
      prompt: "Quels sont les élèves qui ont des impayés ce mois-ci ?",
    },
    {
      id: 'depense',
      icon: Wallet,
      iconColor: '#059669',
      iconBg: '#ecfdf5',
      title: 'Ajouter une dépense / recette',
      description: 'Enregistrer une sortie ou une rentrée de fonds',
      prompt: 'Je souhaite enregistrer une nouvelle dépense',
    },
    {
      id: 'doc',
      icon: Camera,
      iconColor: '#0055d4',
      iconBg: '#eff6ff',
      title: 'Analyser un reçu / document',
      description: 'Photo de facture ou reçu avec extraction automatique',
      onPress: onOpenAttachmentSheet,
    },
    {
      id: 'absences',
      icon: Users,
      iconColor: '#d97706',
      iconBg: '#fffbeb',
      title: 'Élèves absents du jour',
      description: 'Suivi des présences et alertes parents',
      prompt: "Quelles sont les absences constatées aujourd'hui ?",
    },
    {
      id: 'timetable',
      icon: Calendar,
      iconColor: '#7c3aed',
      iconBg: '#f5f3ff',
      title: 'Emploi du temps',
      description: 'Séances prévues et disponibilité des enseignants',
      prompt: "Montre-moi l'emploi du temps des cours prévus aujourd'hui.",
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Welcome Banner */}
      <View style={styles.heroSection}>
        <View style={styles.avatarGlowRing}>
          <Image source={HNIA_AVATAR} style={styles.avatarImage} />
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
          </View>
        </View>

        <Text style={styles.heroTitle}>
          Bonjour 👋 Je suis <Text style={styles.brandName}>Hnia</Text>
        </Text>
        <Text style={styles.heroSubtitle}>
          Assistante de direction connectée à <Text style={styles.schoolName}>{schoolName}</Text>.
          Posez-moi une question ou choisissez une action :
        </Text>
      </View>

      {/* Suggested Actions Grid */}
      <View style={styles.gridSection}>
        <View style={styles.sectionHeader}>
          <Sparkles size={14} color="#0055d4" />
          <Text style={styles.sectionTitle}>Suggestions rapides</Text>
        </View>

        <View style={styles.grid}>
          {suggestions.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => {
                if (item.onPress) {
                  item.onPress();
                } else if (item.prompt) {
                  onSelectPrompt(item.prompt);
                }
              }}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
                  <item.icon size={20} color={item.iconColor} />
                </View>
                <ChevronRight size={15} color="#cbd5e1" />
              </View>

              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.cardDescription} numberOfLines={2}>
                {item.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Help Hint */}
      <View style={styles.hintBox}>
        <Text style={styles.hintText}>
          💡 <Text style={styles.hintBold}>Astuce :</Text> Vous pouvez aussi me dicter un message vocal ou photographier un reçu.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
    width: '100%',
  },
  avatarGlowRing: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#dbeafe',
    marginBottom: 16,
    shadowColor: '#0055d4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  avatarImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  brandName: {
    color: '#0055d4',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  schoolName: {
    color: '#1e293b',
    fontWeight: '700',
  },
  gridSection: {
    width: '100%',
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    width: '100%',
  },
  card: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 16,
  },
  hintBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '100%',
  },
  hintText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    textAlign: 'center',
  },
  hintBold: {
    fontWeight: '700',
    color: '#1e293b',
  },
});
