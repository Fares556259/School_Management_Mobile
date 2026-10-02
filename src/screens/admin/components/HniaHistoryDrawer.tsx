import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import {
  Search,
  X,
  Trash2,
  Edit3,
  Check,
  FileText,
  Wallet,
  Users,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../../store/useAppStore';

export interface ConversationThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: string | null;
}

interface HniaHistoryDrawerProps {
  visible: boolean;
  onClose: () => void;
  threads: ConversationThread[];
  activeConversationId?: string;
  isLoading: boolean;
  onSelectThread: (threadId: string) => void;
  onCreateNewThread: () => void;
  onDeleteThread: (threadId: string, title: string) => void;
  onRenameThread: (threadId: string, newTitle: string) => Promise<void>;
}

export function formatThreadTitle(title: string | null | undefined): string {
  if (!title) return 'Nouvelle discussion';
  let clean = title.trim();

  // Strip technical document analysis tags and map them nicely
  if (clean.includes('[DOCUMENT ANALYSÉ]') || clean.includes('[DOCUMENT NUMÉRISÉ]')) {
    const lower = clean.toLowerCase();
    if (lower.includes('bordereau') || lower.includes('bancaire')) return '📄 Bordereau bancaire';
    if (lower.includes('reçu') || lower.includes('recu') || lower.includes('paiement')) return '🧾 Reçu de paiement';
    if (lower.includes('facture')) return '🧾 Facture';
    if (lower.includes('bulletin') || lower.includes('note')) return '📊 Relevé de notes';
    if (lower.includes('chèque') || lower.includes('cheque')) return '🏦 Chèque';
    return '📄 Document analysé';
  }

  // Strip technical bracket tags like [SOMETHING]
  clean = clean.replace(/^\[.*?\]\s*/g, '');
  // Strip markdown formatting characters
  clean = clean.replace(/[#*_`]/g, '');
  // Strip bullet points or dashes at start
  clean = clean.replace(/^\s*[-•]\s*/, '');
  clean = clean.trim();

  if (!clean) return 'Discussion';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function formatThreadSnippet(snippet: string | null | undefined): string {
  if (!snippet) return '';
  let clean = snippet.trim();
  if (clean.includes('[DOCUMENT ANALYSÉ]') || clean.includes('[DOCUMENT NUMÉRISÉ]')) {
    return 'Document analysé par Hnia';
  }
  clean = clean.replace(/^\[IMAGE:.*?\]\s*/g, '📷 Image ');
  clean = clean.replace(/[#*_`]/g, '');
  clean = clean.replace(/<[^>]*>/g, '');
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

export default function HniaHistoryDrawer({
  visible,
  onClose,
  threads,
  activeConversationId,
  isLoading,
  onSelectThread,
  onCreateNewThread,
  onDeleteThread,
  onRenameThread,
}: HniaHistoryDrawerProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0) + 12;

  const userName = useAppStore((s) => s.userName) || 'Admin';
  const userAvatarUrl = useAppStore((s) => s.userAvatarUrl);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'docs' | 'caisse' | 'students'>('all');

  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renamingThread, setRenamingThread] = useState<{ id: string; title: string } | null>(null);
  const [newTitleInput, setNewTitleInput] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // User 2-letter initials (like "SE" in ChatGPT)
  const initials = useMemo(() => {
    const parts = (userName || 'Admin').trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (userName || 'AD').slice(0, 2).toUpperCase();
  }, [userName]);

  // Filter threads by category and search query
  const groupedThreads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = threads.filter((t) => {
      // Category quick filter
      if (activeFilter === 'docs') {
        const titleLower = (t.title || '').toLowerCase();
        const msgLower = (t.lastMessage || '').toLowerCase();
        const isDoc =
          titleLower.includes('document') ||
          titleLower.includes('bordereau') ||
          titleLower.includes('reçu') ||
          titleLower.includes('facture') ||
          titleLower.includes('chèque') ||
          titleLower.includes('bulletin') ||
          msgLower.includes('document') ||
          msgLower.includes('[image:');
        if (!isDoc) return false;
      } else if (activeFilter === 'caisse') {
        const titleLower = (t.title || '').toLowerCase();
        const msgLower = (t.lastMessage || '').toLowerCase();
        const isCaisse =
          titleLower.includes('caisse') ||
          titleLower.includes('recette') ||
          titleLower.includes('dépense') ||
          titleLower.includes('solde') ||
          titleLower.includes('payer') ||
          titleLower.includes('impayé') ||
          msgLower.includes('caisse') ||
          msgLower.includes('recette') ||
          msgLower.includes('dépense');
        if (!isCaisse) return false;
      } else if (activeFilter === 'students') {
        const titleLower = (t.title || '').toLowerCase();
        const msgLower = (t.lastMessage || '').toLowerCase();
        const isStudent =
          titleLower.includes('élève') ||
          titleLower.includes('absence') ||
          titleLower.includes('présence') ||
          titleLower.includes('classe') ||
          titleLower.includes('retard') ||
          msgLower.includes('élève') ||
          msgLower.includes('absence');
        if (!isStudent) return false;
      }

      // Text query match
      if (!query) return true;
      const formattedTitle = formatThreadTitle(t.title).toLowerCase();
      const rawTitle = (t.title || '').toLowerCase();
      const snippetMatch = (t.lastMessage || '').toLowerCase().includes(query);
      return formattedTitle.includes(query) || rawTitle.includes(query) || snippetMatch;
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const groups: { [key: string]: ConversationThread[] } = {
      "Aujourd'hui": [],
      'Hier': [],
      '7 derniers jours': [],
      'Ce mois-ci': [],
      'Précédents': [],
    };

    filtered.forEach((thread) => {
      const threadDate = new Date(thread.updatedAt || thread.createdAt);
      if (threadDate >= today) {
        groups["Aujourd'hui"].push(thread);
      } else if (threadDate >= yesterday) {
        groups['Hier'].push(thread);
      } else if (threadDate >= sevenDaysAgo) {
        groups['7 derniers jours'].push(thread);
      } else if (threadDate >= thirtyDaysAgo) {
        groups['Ce mois-ci'].push(thread);
      } else {
        groups['Précédents'].push(thread);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [threads, searchQuery, activeFilter]);

  const toggleCategoryFilter = (cat: 'docs' | 'caisse' | 'students') => {
    Haptics.selectionAsync();
    setActiveFilter((prev) => (prev === cat ? 'all' : cat));
  };

  const openRenameModal = (thread: ConversationThread) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const cleanTitle = formatThreadTitle(thread.title);
    setRenamingThread({ id: thread.id, title: cleanTitle });
    setNewTitleInput(cleanTitle);
    setRenameModalVisible(true);
  };

  const handleConfirmRename = async () => {
    if (!renamingThread || !newTitleInput.trim()) return;
    setIsRenaming(true);
    try {
      await onRenameThread(renamingThread.id, newTitleInput.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRenameModalVisible(false);
      setRenamingThread(null);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de renommer la discussion.');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleThreadLongPress = (thread: ConversationThread) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cleanTitle = formatThreadTitle(thread.title);
    Alert.alert(
      cleanTitle,
      'Choisissez une action pour cette discussion :',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: '✏️ Renommer',
          onPress: () => openRenameModal(thread),
        },
        {
          text: '🗑️ Supprimer',
          style: 'destructive',
          onPress: () => onDeleteThread(thread.id, cleanTitle),
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* 1. DRAWER ON THE LEFT (ChatGPT layout) */}
        <View style={styles.drawerContainer}>
          {/* Top Header: "Hnia" on left, search icon & close button on right */}
          <View style={[styles.header, { paddingTop: topPadding }]}>
            <Text style={styles.headerTitle}>Hnia</Text>
            <View style={styles.headerRightActions}>
              <TouchableOpacity
                style={[styles.headerIconBtn, showSearch && styles.headerIconBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowSearch((prev) => !prev);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Search size={18} color={showSearch ? '#0055d4' : '#334155'} strokeWidth={2.2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color="#64748b" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar Input (toggled via Search icon) */}
          {showSearch && (
            <View style={styles.searchBarContainer}>
              <Search size={15} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher une discussion..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={14} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ChatGPT-style Shortcuts: Images, Bibliothèque, Projets equivalent */}
            <View style={styles.shortcutsSection}>
              <TouchableOpacity
                style={[
                  styles.shortcutRow,
                  activeFilter === 'docs' && styles.shortcutRowActive,
                ]}
                activeOpacity={0.6}
                onPress={() => toggleCategoryFilter('docs')}
              >
                <FileText
                  size={18}
                  color={activeFilter === 'docs' ? '#0055d4' : '#0f172a'}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.shortcutLabel,
                    activeFilter === 'docs' && styles.shortcutLabelActive,
                  ]}
                >
                  Justificatifs & Reçus
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.shortcutRow,
                  activeFilter === 'caisse' && styles.shortcutRowActive,
                ]}
                activeOpacity={0.6}
                onPress={() => toggleCategoryFilter('caisse')}
              >
                <Wallet
                  size={18}
                  color={activeFilter === 'caisse' ? '#0055d4' : '#0f172a'}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.shortcutLabel,
                    activeFilter === 'caisse' && styles.shortcutLabelActive,
                  ]}
                >
                  Caisse & Dépenses
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.shortcutRow,
                  activeFilter === 'students' && styles.shortcutRowActive,
                ]}
                activeOpacity={0.6}
                onPress={() => toggleCategoryFilter('students')}
              >
                <Users
                  size={18}
                  color={activeFilter === 'students' ? '#0055d4' : '#0f172a'}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.shortcutLabel,
                    activeFilter === 'students' && styles.shortcutLabelActive,
                  ]}
                >
                  Élèves & Présences
                </Text>
              </TouchableOpacity>
            </View>

            {/* Subtle Divider (ChatGPT style) */}
            <View style={styles.divider} />

            {/* Active filter banner (if selected) */}
            {activeFilter !== 'all' && (
              <View style={styles.filterBanner}>
                <Text style={styles.filterBannerText}>
                  Filtre : {activeFilter === 'docs' ? 'Documents' : activeFilter === 'caisse' ? 'Caisse' : 'Élèves'}
                </Text>
                <TouchableOpacity onPress={() => setActiveFilter('all')}>
                  <Text style={styles.filterBannerClear}>Effacer</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Discussion Threads List */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#0055d4" />
              </View>
            ) : threads.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Aucune discussion</Text>
                <Text style={styles.emptySubtitle}>
                  Vos échanges avec Hnia apparaîtront ici.
                </Text>
              </View>
            ) : groupedThreads.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Aucun résultat</Text>
                <Text style={styles.emptySubtitle}>
                  Aucune discussion ne correspond à vos filtres.
                </Text>
              </View>
            ) : (
              groupedThreads.map(([groupLabel, items]) => (
                <View key={groupLabel} style={styles.groupSection}>
                  <Text style={styles.groupHeader}>{groupLabel}</Text>

                  {items.map((thread) => {
                    const isActive = thread.id === activeConversationId;
                    const displayTitle = formatThreadTitle(thread.title);

                    return (
                      <TouchableOpacity
                        key={thread.id}
                        style={[
                          styles.threadRow,
                          isActive && styles.threadRowActive,
                        ]}
                        activeOpacity={0.6}
                        onPress={() => onSelectThread(thread.id)}
                        onLongPress={() => handleThreadLongPress(thread)}
                      >
                        <Text
                          style={[
                            styles.threadTitle,
                            isActive && styles.threadTitleActive,
                          ]}
                          numberOfLines={1}
                        >
                          {displayTitle}
                        </Text>

                        {/* Action buttons on active thread */}
                        {isActive && (
                          <View style={styles.threadActions}>
                            <TouchableOpacity
                              style={styles.actionIconBtn}
                              hitSlop={{ top: 8, bottom: 8, left: 6, right: 4 }}
                              onPress={() => openRenameModal(thread)}
                            >
                              <Edit3 size={13} color="#0055d4" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.actionIconBtn}
                              hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                              onPress={() =>
                                onDeleteThread(thread.id, displayTitle)
                              }
                            >
                              <Trash2 size={13} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))
            )}
          </ScrollView>

          {/* 3. PINNED BOTTOM BAR (ChatGPT Signature layout) */}
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) + 6 }]}>
            {/* Blue "Chat" pill button (bottom left) */}
            <TouchableOpacity
              style={styles.newChatPill}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onCreateNewThread();
              }}
            >
              <Edit3 size={16} color="#ffffff" strokeWidth={2.4} />
              <Text style={styles.newChatPillText}>Chat</Text>
            </TouchableOpacity>

            {/* Admin Avatar Circle (bottom right - like [SE] in ChatGPT) */}
            <View style={styles.userAvatarCircle}>
              {userAvatarUrl ? (
                <Image source={{ uri: userAvatarUrl }} style={styles.userAvatarImg} />
              ) : (
                <Text style={styles.userAvatarInitials}>{initials}</Text>
              )}
            </View>
          </View>
        </View>

        {/* 2. BACKDROP ON THE RIGHT (tapping closes the drawer) */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
      </View>

      {/* Rename Modal */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.renameOverlay}>
          <View style={styles.renameCard}>
            <View style={styles.renameHeader}>
              <Edit3 size={17} color="#0055d4" />
              <Text style={styles.renameTitle}>Renommer</Text>
            </View>

            <TextInput
              style={styles.renameInput}
              value={newTitleInput}
              onChangeText={setNewTitleInput}
              placeholder="Nouveau titre..."
              placeholderTextColor="#9ca3af"
              autoFocus
              maxLength={50}
            />

            <View style={styles.renameActions}>
              <TouchableOpacity
                style={styles.renameCancelBtn}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={styles.renameCancelText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.renameSaveBtn}
                onPress={handleConfirmRename}
                disabled={isRenaming || !newTitleInput.trim()}
              >
                {isRenaming ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Check size={15} color="#ffffff" strokeWidth={2.4} />
                    <Text style={styles.renameSaveText}>Enregistrer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  // Drawer panel sits strictly on the LEFT
  drawerContainer: {
    width: '82%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 24,
  },
  // Backdrop sits on the RIGHT
  backdrop: {
    flex: 1,
  },

  // Header (ChatGPT style)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtnActive: {
    backgroundColor: '#eff6ff',
  },

  // Search input bar
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0f172a',
    padding: 0,
  },

  // Scrollable list
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90, // Space for the pinned bottom bar
  },

  // Shortcuts section (ChatGPT Images, Bibliothèque, Projets...)
  shortcutsSection: {
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 14,
  },
  shortcutRowActive: {
    backgroundColor: '#eff6ff',
  },
  shortcutLabel: {
    fontSize: 14.5,
    fontWeight: '500',
    color: '#0f172a',
  },
  shortcutLabelActive: {
    fontWeight: '600',
    color: '#0055d4',
  },

  // Divider (ChatGPT style)
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e2e8f0',
    marginVertical: 10,
    marginHorizontal: 16,
  },

  // Filter banner
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  filterBannerText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  filterBannerClear: {
    fontSize: 12,
    color: '#0055d4',
    fontWeight: '600',
  },

  // Group sections
  groupSection: {
    marginBottom: 8,
  },
  groupHeader: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#94a3b8',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },

  // Thread rows (Pure ChatGPT: single line, elegant typography)
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 8,
    borderRadius: 10,
  },
  threadRowActive: {
    backgroundColor: '#f1f5f9',
  },
  threadTitle: {
    flex: 1,
    fontSize: 14.5,
    color: '#334155',
    lineHeight: 20,
  },
  threadTitleActive: {
    color: '#0f172a',
    fontWeight: '600',
  },
  threadActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  actionIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  // Empty & loading
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'flex-start',
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#94a3b8',
    lineHeight: 18,
  },

  // PINNED BOTTOM BAR (ChatGPT signature layout)
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f1f5f9',
  },
  // Blue Chat pill button (bottom left)
  newChatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0055d4',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: '#0055d4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  newChatPillText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  // User Avatar circle (bottom right)
  userAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  userAvatarImg: {
    width: '100%',
    height: '100%',
  },
  userAvatarInitials: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  // Rename modal
  renameOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  renameCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  renameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  renameTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  renameInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 16,
  },
  renameActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  renameCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  renameCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  renameSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#0055d4',
  },
  renameSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
