import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  StatusBar,
} from 'react-native';
import {
  Send,
  ArrowUp,
  Paperclip,
  Mic,
  MicOff,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Bot,
  Check,
  X,
  RotateCcw,
  Copy,
  Receipt,
  Users,
  Calendar,
  Bell,
  CreditCard,
  Wallet,
  Clock,
  ChevronRight,
  AlertCircle,
  FileText,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { adminService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';

const HNIA_AVATAR = require('../../../assets/hnia/hnia_avatar.jpg');

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUri?: string;
  isVoice?: boolean;
  transcription?: string;
  pendingConfirmation?: {
    toolCallId: string;
    toolName: string;
    confirmText: string;
    arguments?: Record<string, any>;
    status?: 'PENDING' | 'EXECUTING' | 'EXECUTED' | 'REJECTED';
  } | null;
  followUpSuggestions?: string[];
  createdAt?: string;
}

export default function HniaChatScreen() {
  const userName = useAppStore((s) => s.userName) || 'Directeur';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedImage, setSelectedImage] = useState<{ uri: string; base64: string; mimeType: string } | null>(null);
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
  const [confirmingToolId, setConfirmingToolId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  const flatListRef = useRef<FlatList>(null);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      setIsInitializing(true);
      const res = await adminService.fetchChatHistory();
      if (res && res.success) {
        if (res.conversationId) setConversationId(res.conversationId);
        if (Array.isArray(res.messages) && res.messages.length > 0) {
          const loaded: ChatMessage[] = res.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          }));
          setMessages(loaded);
        }
      }
    } catch (err) {
      console.warn('[HniaChat] Load history error:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleResetConversation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Nouvelle session',
      'Voulez-vous démarrer une nouvelle conversation avec Hnia ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Nouvelle conversation',
          style: 'destructive',
          onPress: () => {
            setMessages([]);
            setConversationId(undefined);
            setSelectedImage(null);
            setInputText('');
          },
        },
      ]
    );
  };

  // Pick Image from Gallery
  const handlePickImage = async () => {
    setAttachmentModalVisible(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission requise', 'Veuillez autoriser l’accès à vos photos pour joindre un reçu ou document.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.6,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          setSelectedImage({
            uri: asset.uri,
            base64: asset.base64,
            mimeType: asset.mimeType || 'image/jpeg',
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (err) {
      console.warn('[ImagePicker] Error:', err);
    }
  };

  // Take Photo with Camera
  const handleTakePhoto = async () => {
    setAttachmentModalVisible(false);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission requise', 'Veuillez autoriser la caméra pour photographier un document.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        base64: true,
        quality: 0.6,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          setSelectedImage({
            uri: asset.uri,
            base64: asset.base64,
            mimeType: asset.mimeType || 'image/jpeg',
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (err) {
      console.warn('[Camera] Error:', err);
    }
  };

  // Send message to Hnia
  const handleSendMessage = async (textToSend?: string) => {
    const rawText = (textToSend ?? inputText).trim();
    if (!rawText && !selectedImage) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsgId = `user_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: rawText || (selectedImage ? '📷 Document envoyé' : ''),
      imageUri: selectedImage?.uri,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    const imagePayload = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const payload: any = {
        message: rawText,
        conversationId,
      };

      if (imagePayload) {
        payload.imageBase64 = imagePayload.base64;
        payload.imageMimeType = imagePayload.mimeType;
      }

      const res = await adminService.sendMessage(payload);

      if (res && res.success) {
        if (res.conversationId) setConversationId(res.conversationId);

        const botMsg: ChatMessage = {
          id: `bot_${Date.now()}`,
          role: 'assistant',
          content: res.message || 'C’est bon !',
          transcription: res.transcription,
          pendingConfirmation: res.pendingConfirmation,
          followUpSuggestions: res.followUpSuggestions,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, botMsg]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const errorMsg: ChatMessage = {
          id: `bot_${Date.now()}`,
          role: 'assistant',
          content: res?.message || 'Désolée, une erreur est survenue lors de la communication.',
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err: any) {
      console.error('[HniaChat] Send error:', err);
      const errorMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        content: '⚠️ Connexion interrompue. Vérifiez votre réseau et réessayez.',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Confirm or cancel action
  const handleConfirmation = async (toolCallId: string, action: 'confirm' | 'cancel') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmingToolId(toolCallId);

    try {
      const res = await adminService.confirmAction(toolCallId, action);
      if (res && res.success) {
        // Update local message pendingConfirmation status
        setMessages((prev) =>
          prev.map((m) => {
            if (m.pendingConfirmation?.toolCallId === toolCallId) {
              return {
                ...m,
                pendingConfirmation: {
                  ...m.pendingConfirmation,
                  status: action === 'confirm' ? 'EXECUTED' : 'REJECTED',
                },
              };
            }
            return m;
          })
        );

        // Add confirmation response bubble
        const resultMsg: ChatMessage = {
          id: `res_${Date.now()}`,
          role: 'assistant',
          content: res.message || (action === 'confirm' ? '✅ Action confirmée et enregistrée !' : '❌ Action annulée.'),
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, resultMsg]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Erreur', res?.message || "Impossible d'exécuter l'action.");
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Erreur réseau');
    } finally {
      setConfirmingToolId(null);
    }
  };

  // Quick Action Prompts
  const QUICK_ACTIONS = [
    {
      id: 'doc',
      icon: Receipt,
      color: '#0055d4',
      bg: '#eff6ff',
      title: 'Analyser document',
      subtitle: 'Scanner reçu, facture ou justificatif',
      onPress: () => setAttachmentModalVisible(true),
    },
    {
      id: 'caisse',
      icon: Wallet,
      color: '#059669',
      bg: '#ecfdf5',
      title: 'Clôture de Caisse',
      subtitle: 'Bilan physique & encaissements du jour',
      prompt: 'Fais le bilan officiel de clôture de caisse du jour (recettes, dépenses, solde physique).',
    },
    {
      id: 'absences',
      icon: Users,
      color: '#d97706',
      bg: '#fffbeb',
      title: 'Absences du jour',
      subtitle: 'Élèves et enseignants absents',
      prompt: "Donne-moi la liste des absences et retards d'aujourd'hui dans toutes les classes.",
    },
    {
      id: 'timetable',
      icon: Clock,
      color: '#7c3aed',
      bg: '#f5f3ff',
      title: 'Emploi du temps',
      subtitle: 'Séances prévues aujourd’hui',
      prompt: "Quel est l'emploi du temps des cours prévus aujourd'hui ?",
    },
    {
      id: 'announcement',
      icon: Bell,
      color: '#ea580c',
      bg: '#fff7ed',
      title: 'Diffuser annonce',
      subtitle: 'Notifier les parents d’une classe',
      prompt: 'Je souhaite diffuser une annonce importante aux parents.',
    },
    {
      id: 'impayes',
      icon: CreditCard,
      color: '#dc2626',
      bg: '#fef2f2',
      title: 'Impayés du mois',
      subtitle: 'Liste des élèves avec reliquats',
      prompt: 'Quels sont les élèves qui ont des impayés pour le mois en cours ?',
    },
  ];

  // Markdown parser & renderer
  const renderFormattedText = (text: string) => {
    if (!text) return null;

    // Detect markdown table
    const tableRegex = /\|(.+)\|[\r\n]+\|[-:| ]+\|[\r\n]+((?:\|.+\|[\r\n]*)+)/;
    const tableMatch = text.match(tableRegex);

    if (tableMatch) {
      const parts = text.split(tableMatch[0]);
      const headerRow = tableMatch[1].split('|').map((c) => c.trim()).filter(Boolean);
      const bodyRows = tableMatch[2]
        .trim()
        .split('\n')
        .map((r) =>
          r
            .split('|')
            .map((c) => c.trim())
            .filter(Boolean)
        );

      return (
        <View>
          {parts[0]?.trim() ? renderTextParagraphs(parts[0].trim()) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableContainer}>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                {headerRow.map((h, idx) => (
                  <Text key={idx} style={styles.tableHeaderCell}>
                    {h}
                  </Text>
                ))}
              </View>
              {bodyRows.map((row, rIdx) => (
                <View
                  key={rIdx}
                  style={[styles.tableRow, rIdx % 2 === 1 && { backgroundColor: '#f8fafc' }]}
                >
                  {row.map((cell, cIdx) => (
                    <Text key={cIdx} style={styles.tableCell}>
                      {cell}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
          {parts[1]?.trim() ? renderTextParagraphs(parts[1].trim()) : null}
        </View>
      );
    }

    return renderTextParagraphs(text);
  };

  const renderTextParagraphs = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <View key={idx} style={{ height: 6 }} />;
      }

      // Blockquote / Tip
      if (trimmed.startsWith('<blockquote>') || trimmed.includes('💡 Hnia :') || trimmed.includes('💡')) {
        const cleanTip = trimmed.replace(/<\/?blockquote>/g, '').replace(/<[^>]*>/g, '');
        return (
          <View key={idx} style={styles.tipCard}>
            <Text style={styles.tipText}>{cleanTip}</Text>
          </View>
        );
      }

      // Header 3
      if (trimmed.startsWith('###')) {
        return (
          <Text key={idx} style={styles.header3}>
            {trimmed.replace(/^###\s*/, '')}
          </Text>
        );
      }

      // Header 2 or 1
      if (trimmed.startsWith('##') || trimmed.startsWith('#')) {
        return (
          <Text key={idx} style={styles.header2}>
            {trimmed.replace(/^#+\s*/, '')}
          </Text>
        );
      }

      // Bullet points
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const bulletText = trimmed.replace(/^[-•*]\s*/, '');
        return (
          <View key={idx} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{renderInlineBold(bulletText)}</Text>
          </View>
        );
      }

      return (
        <Text key={idx} style={styles.normalText}>
          {renderInlineBold(trimmed)}
        </Text>
      );
    });
  };

  // Helper for **bold** text
  const renderInlineBold = (str: string) => {
    // Strip raw HTML tags if any (e.g. <b>, <code>)
    const cleanStr = str.replace(/<b>(.*?)<\/b>/g, '**$1**').replace(/<code>(.*?)<\/code>/g, '$1');
    const parts = cleanStr.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={i} style={styles.boldText}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      return <Text key={i}>{part}</Text>;
    });
  };

  // Render Single Message
  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
        {!isUser && (
          <Image source={HNIA_AVATAR} style={styles.assistantAvatarSmall} />
        )}

        <View style={[styles.bubbleContainer, isUser ? styles.userBubble : styles.assistantBubble]}>
          {/* Attached image preview */}
          {item.imageUri && (
            <Image
              source={{ uri: item.imageUri }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}

          {/* Transcribed badge if voice note */}
          {item.transcription && (
            <View style={styles.transcriptionBadge}>
              <Mic size={14} color="#059669" />
              <Text style={styles.transcriptionLabel}>Dictée vocale transcrite</Text>
            </View>
          )}

          {/* Content */}
          {isUser ? (
            <Text style={styles.userText}>{item.content}</Text>
          ) : (
            renderFormattedText(item.content)
          )}

          {/* Interactive Confirmation Card */}
          {item.pendingConfirmation && (
            <View style={styles.confirmationCard}>
              <View style={styles.confirmationHeader}>
                <AlertCircle size={18} color="#d97706" />
                <Text style={styles.confirmationTitle}>Confirmation d'action</Text>
              </View>

              <Text style={styles.confirmationDesc}>
                {item.pendingConfirmation.confirmText.replace(/❓\s*/, '').replace(/\*\*/g, '')}
              </Text>

              {item.pendingConfirmation.status === 'EXECUTED' ? (
                <View style={[styles.actionStatusBadge, { backgroundColor: '#ecfdf5' }]}>
                  <Check size={16} color="#059669" />
                  <Text style={[styles.actionStatusText, { color: '#059669' }]}>
                    Action confirmée et exécutée ✅
                  </Text>
                </View>
              ) : item.pendingConfirmation.status === 'REJECTED' ? (
                <View style={[styles.actionStatusBadge, { backgroundColor: '#fef2f2' }]}>
                  <X size={16} color="#dc2626" />
                  <Text style={[styles.actionStatusText, { color: '#dc2626' }]}>
                    Action annulée ❌
                  </Text>
                </View>
              ) : (
                <View style={styles.confirmationButtonsRow}>
                  <TouchableOpacity
                    style={[styles.confirmBtn, confirmingToolId === item.pendingConfirmation.toolCallId && styles.btnDisabled]}
                    onPress={() => handleConfirmation(item.pendingConfirmation!.toolCallId, 'confirm')}
                    disabled={confirmingToolId === item.pendingConfirmation.toolCallId}
                  >
                    {confirmingToolId === item.pendingConfirmation.toolCallId ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Check size={16} color="#fff" />
                        <Text style={styles.confirmBtnText}>Confirmer</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleConfirmation(item.pendingConfirmation!.toolCallId, 'cancel')}
                    disabled={confirmingToolId === item.pendingConfirmation.toolCallId}
                  >
                    <X size={16} color="#6b7280" />
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Follow-up Suggestion Chips */}
          {!isUser && item.followUpSuggestions && item.followUpSuggestions.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.suggestionsScroll}
              contentContainerStyle={{ gap: 8, paddingTop: 10 }}
            >
              {item.followUpSuggestions.map((sug, sIdx) => (
                <TouchableOpacity
                  key={sIdx}
                  style={styles.suggestionChip}
                  onPress={() => handleSendMessage(sug)}
                >
                  <Text style={styles.suggestionChipText}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={HNIA_AVATAR} style={styles.headerAvatar} />
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerTitle}>Hnia IA</Text>
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>En ligne</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>Assistante administrative & opérations</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.newChatButton}
          onPress={handleResetConversation}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <RotateCcw size={18} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Main Content */}
        {isInitializing ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#0055d4" />
            <Text style={styles.loadingText}>Initialisation d'Hnia...</Text>
          </View>
        ) : messages.length === 0 ? (
          /* Empty State (Screenshots 1 & 5) */
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.emptyContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.avatarHaloContainer}>
              <View style={styles.avatarHalo}>
                <Image source={HNIA_AVATAR} style={styles.avatarLarge} />
              </View>
            </View>

            <Text style={styles.welcomeTitle}>
              Bienvenue, <Text style={{ color: '#0055d4' }}>{userName}</Text>
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Que puis-je faire pour vous aujourd'hui ?
            </Text>

            {/* Quick Action Grid */}
            <View style={styles.quickActionGrid}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.quickActionCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (action.onPress) {
                      action.onPress();
                    } else if (action.prompt) {
                      handleSendMessage(action.prompt);
                    }
                  }}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: action.bg }]}>
                    <action.icon size={22} color={action.color} />
                  </View>
                  <Text style={styles.actionCardTitle}>{action.title}</Text>
                  <Text style={styles.actionCardSub}>{action.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          /* Chat Message List */
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={
              isLoading ? (
                <View style={styles.thinkingRow}>
                  <Image source={HNIA_AVATAR} style={styles.assistantAvatarSmall} />
                  <View style={styles.thinkingBubble}>
                    <ActivityIndicator size="small" color="#0055d4" />
                    <Text style={styles.thinkingText}>Hnia réfléchit...</Text>
                  </View>
                </View>
              ) : null
            }
          />
        )}

        {/* Selected Attachment Chip */}
        {selectedImage && (
          <View style={styles.attachmentPreviewContainer}>
            <Image source={{ uri: selectedImage.uri }} style={styles.attachmentThumbnail} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.attachmentName} numberOfLines={1}>
                Photo prête à être analysée
              </Text>
              <Text style={styles.attachmentSub}>Hnia extraira le montant, date et reçus</Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedImage(null)}
              style={styles.attachmentRemoveBtn}
            >
              <X size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Floating Input Bar (Screenshots 1, 2, 3, 5) */}
        <View style={styles.bottomBarContainer}>
          <View style={styles.inputPillContainer}>
            {/* Paperclip attachment button */}
            <TouchableOpacity
              style={styles.pillIconButton}
              onPress={() => setAttachmentModalVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Paperclip size={20} color="#64748b" />
            </TouchableOpacity>

            {/* Text Input */}
            <TextInput
              style={styles.textInput}
              placeholder="Posez votre question à Hnia..."
              placeholderTextColor="#94a3b8"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />

            {/* Send Button */}
            <TouchableOpacity
              style={[
                styles.sendButtonCircle,
                !(inputText.trim() || selectedImage) && styles.sendButtonDisabled,
              ]}
              disabled={!(inputText.trim() || selectedImage) || isLoading}
              onPress={() => handleSendMessage()}
            >
              <ArrowUp size={20} color="#ffffff" strokeWidth={2.6} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Attachment Selection Modal */}
      <Modal
        visible={attachmentModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAttachmentModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAttachmentModalVisible(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Joindre un document ou reçu</Text>
              <TouchableOpacity onPress={() => setAttachmentModalVisible(false)}>
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.modalOption} onPress={handleTakePhoto}>
              <View style={[styles.modalOptionIcon, { backgroundColor: '#eff6ff' }]}>
                <Camera size={22} color="#0055d4" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.modalOptionTitle}>Prendre une photo</Text>
                <Text style={styles.modalOptionSub}>Photographier un ticket de caisse, facture ou justificatif</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={handlePickImage}>
              <View style={[styles.modalOptionIcon, { backgroundColor: '#f0fdf4' }]}>
                <ImageIcon size={22} color="#16a34a" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.modalOptionTitle}>Choisir depuis la galerie</Text>
                <Text style={styles.modalOptionSub}>Sélectionner un reçu ou une image déjà enregistrée</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#e0edff',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  },
  onlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
  },
  newChatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  avatarHaloContainer: {
    marginBottom: 16,
  },
  avatarHalo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0055d4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  avatarLarge: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 6,
    marginBottom: 26,
    textAlign: 'center',
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    width: '100%',
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionCardSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
    lineHeight: 16,
  },

  /* Messages */
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 16,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  assistantAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginTop: 2,
  },
  bubbleContainer: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: '#f1f5f9',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  userText: {
    fontSize: 15,
    color: '#0f172a',
    lineHeight: 22,
  },
  normalText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '700',
    color: '#0f172a',
  },
  header2: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 6,
    marginBottom: 4,
  },
  header3: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0055d4',
    marginTop: 4,
    marginBottom: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginVertical: 2,
  },
  bulletDot: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0055d4',
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
  tipCard: {
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderLeftColor: '#0055d4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 6,
  },
  tipText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    fontStyle: 'italic',
  },
  messageImage: {
    width: 220,
    height: 140,
    borderRadius: 12,
    marginBottom: 8,
  },
  transcriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  transcriptionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },

  /* Tables (Screenshot 3 style) */
  tableContainer: {
    marginVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  table: {
    backgroundColor: '#ffffff',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  tableHeaderCell: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: '800',
    color: '#1e40af',
    minWidth: 110,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableCell: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#334155',
    minWidth: 110,
  },

  /* Confirmation Card */
  confirmationCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 12,
    marginTop: 10,
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  confirmationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400e',
  },
  confirmationDesc: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 19,
    marginBottom: 10,
  },
  confirmationButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 9,
    borderRadius: 10,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 9,
    borderRadius: 10,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  actionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  actionStatusText: {
    fontSize: 13,
    fontWeight: '700',
  },

  /* Follow-up suggestions */
  suggestionsScroll: {
    marginTop: 6,
  },
  suggestionChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0055d4',
  },

  /* Thinking Indicator */
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  thinkingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },

  /* Attachment preview */
  attachmentPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  attachmentThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  attachmentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  attachmentSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  attachmentRemoveBtn: {
    padding: 6,
  },

  /* Bottom Input Bar (Screenshot 1, 2, 5 style) */
  bottomBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  inputPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  pillIconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    maxHeight: 100,
  },
  sendButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669', // Elegant green send button from screenshots!
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalOptionSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
});
