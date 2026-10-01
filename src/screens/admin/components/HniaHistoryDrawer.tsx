import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  X,
  Plus,
  MessageSquare,
  Trash2,
  Edit3,
  Search,
  Check,
  Calendar,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renamingThread, setRenamingThread] = useState<{ id: string; title: string } | null>(null);
  const [newTitleInput, setNewTitleInput] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Group threads by relative date
  const groupedThreads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = threads.filter((t) => {
      if (!query) return true;
      const titleMatch = (t.title || '').toLowerCase().includes(query);
      const snippetMatch = (t.lastMessage || '').toLowerCase().includes(query);
      return titleMatch || snippetMatch;
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    const groups: { [key: string]: ConversationThread[] } = {
      "Aujourd'hui": [],
      'Hier': [],
      'Cette semaine': [],
      'Ce mois-ci': [],
      'Plus ancien': [],
    };

    filtered.forEach((thread) => {
      const threadDate = new Date(thread.updatedAt || thread.createdAt);
      if (threadDate >= today) {
        groups["Aujourd'hui"].push(thread);
      } else if (threadDate >= yesterday) {
        groups['Hier'].push(thread);
      } else if (threadDate >= oneWeekAgo) {
        groups['Cette semaine'].push(thread);
      } else if (threadDate >= oneMonthAgo) {
        groups['Ce mois-ci'].push(thread);
      } else {
        groups['Plus ancien'].push(thread);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [threads, searchQuery]);

  const openRenameModal = (thread: ConversationThread) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRenamingThread({ id: thread.id, title: thread.title });
    setNewTitleInput(thread.title || '');
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
    Alert.alert(
      thread.title || 'Discussion',
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
          onPress: () => onDeleteThread(thread.id, thread.title || 'Discussion'),
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
        {/* Backdrop touch */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Drawer Content */}
        <SafeAreaView style={styles.drawerContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.hniaIconMini}>
                <Sparkles size={16} color="#0055d4" />
              </View>
              <Text style={styles.headerTitle}>Historique Hnia</Text>
              {threads.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{threads.length}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={19} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* New Chat Button */}
          <TouchableOpacity
            style={styles.newChatBtn}
            activeOpacity={0.85}
            onPress={onCreateNewThread}
          >
            <Plus size={18} color="#ffffff" strokeWidth={2.6} />
            <Text style={styles.newChatBtnText}>Nouvelle discussion</Text>
          </TouchableOpacity>

          {/* Search Bar */}
          {threads.length > 3 && (
            <View style={styles.searchContainer}>
              <Search size={15} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher une discussion..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={14} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Threads List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0055d4" />
              <Text style={styles.loadingText}>Chargement des discussions...</Text>
            </View>
          ) : threads.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <MessageSquare size={32} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>Aucune discussion archivée</Text>
              <Text style={styles.emptySubtitle}>
                Vos échanges avec Hnia apparaîtront automatiquement ici au fil de votre travail.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollList}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {groupedThreads.map(([groupLabel, items]) => (
                <View key={groupLabel} style={styles.groupSection}>
                  <View style={styles.groupHeaderRow}>
                    <Calendar size={12} color="#64748b" />
                    <Text style={styles.groupHeader}>{groupLabel}</Text>
                  </View>

                  <View style={styles.groupList}>
                    {items.map((thread) => {
                      const isActive = thread.id === activeConversationId;
                      const timeStr = thread.updatedAt
                        ? new Date(thread.updatedAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '';

                      return (
                        <TouchableOpacity
                          key={thread.id}
                          style={[styles.threadItem, isActive && styles.threadItemActive]}
                          activeOpacity={0.7}
                          onPress={() => onSelectThread(thread.id)}
                          onLongPress={() => handleThreadLongPress(thread)}
                        >
                          <View
                            style={[
                              styles.threadIconBox,
                              isActive && styles.threadIconBoxActive,
                            ]}
                          >
                            <MessageSquare
                              size={15}
                              color={isActive ? '#0055d4' : '#64748b'}
                            />
                          </View>

                          <View style={styles.threadContent}>
                            <View style={styles.threadTopRow}>
                              <Text
                                style={[
                                  styles.threadTitle,
                                  isActive && styles.threadTitleActive,
                                ]}
                                numberOfLines={1}
                              >
                                {thread.title || 'Discussion sans titre'}
                              </Text>

                              {isActive ? (
                                <View style={styles.activePill}>
                                  <Text style={styles.activePillText}>Actif</Text>
                                </View>
                              ) : timeStr ? (
                                <Text style={styles.threadTime}>{timeStr}</Text>
                              ) : null}
                            </View>

                            {thread.lastMessage ? (
                              <Text style={styles.threadSnippet} numberOfLines={1}>
                                {thread.lastMessage}
                              </Text>
                            ) : null}
                          </View>

                          {/* Quick Actions (Rename / Delete) */}
                          <View style={styles.actionButtonsRow}>
                            <TouchableOpacity
                              style={styles.actionBtn}
                              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                              onPress={() => openRenameModal(thread)}
                            >
                              <Edit3 size={14} color="#94a3b8" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.actionBtn}
                              hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
                              onPress={() =>
                                onDeleteThread(
                                  thread.id,
                                  thread.title || 'Discussion'
                                )
                              }
                            >
                              <Trash2 size={14} color="#94a3b8" />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
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
              <Edit3 size={18} color="#0055d4" />
              <Text style={styles.renameTitle}>Renommer la discussion</Text>
            </View>

            <TextInput
              style={styles.renameInput}
              value={newTitleInput}
              onChangeText={setNewTitleInput}
              placeholder="Nouveau titre..."
              placeholderTextColor="#94a3b8"
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
                    <Check size={16} color="#ffffff" strokeWidth={2.4} />
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backdrop: {
    flex: 1,
  },
  drawerContainer: {
    width: '84%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hniaIconMini: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0055d4',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0055d4',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#0055d4',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  newChatBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
  },
  emptyContainer: {
    paddingVertical: 50,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },
  groupSection: {
    gap: 6,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  groupHeader: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupList: {
    gap: 8,
  },
  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 13,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  threadItemActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  threadIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  threadIconBoxActive: {
    backgroundColor: '#dbeafe',
  },
  threadContent: {
    flex: 1,
    marginRight: 6,
  },
  threadTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  threadTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  threadTitleActive: {
    color: '#0055d4',
  },
  activePill: {
    backgroundColor: '#dbeafe',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  activePillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0055d4',
  },
  threadTime: {
    fontSize: 10,
    color: '#94a3b8',
  },
  threadSnippet: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionBtn: {
    padding: 5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  renameCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
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
    fontWeight: '800',
    color: '#0f172a',
  },
  renameInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
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
    color: '#475569',
  },
  renameSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0055d4',
  },
  renameSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
