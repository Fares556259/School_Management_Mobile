import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  Keyboard,
  Animated,
  LayoutAnimation,
  UIManager,
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
  Plus,
  AudioLines,
  Volume2,
  FolderUp,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { adminService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const insets = useSafeAreaInsets();
  const userName = useAppStore((s) => s.userName) || 'Directeur';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedImage, setSelectedImage] = useState<{ uri: string; base64: string; mimeType: string } | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<{ uri: string; base64: string; name: string } | null>(null);
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
  const [voiceSheetVisible, setVoiceSheetVisible] = useState(false);
  const [confirmingToolId, setConfirmingToolId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  // Keyboard height tracking for edge-to-edge Android and iOS
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Animated sound waves
  const waveAnim1 = useRef(new Animated.Value(0.4)).current;
  const waveAnim2 = useRef(new Animated.Value(0.8)).current;
  const waveAnim3 = useRef(new Animated.Value(0.3)).current;
  const waveAnim4 = useRef(new Animated.Value(0.9)).current;

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Keyboard listeners for perfect input positioning above keyboard
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch {}
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch {}
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Audio wave pulsing animation
  useEffect(() => {
    if (isRecording) {
      const createPulse = (anim: Animated.Value, toValue: number, duration: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue,
              duration,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.25,
              duration,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const loop1 = createPulse(waveAnim1, 1.0, 300);
      const loop2 = createPulse(waveAnim2, 0.9, 250);
      const loop3 = createPulse(waveAnim3, 1.0, 350);
      const loop4 = createPulse(waveAnim4, 0.85, 280);

      loop1.start();
      loop2.start();
      loop3.start();
      loop4.start();

      return () => {
        loop1.stop();
        loop2.stop();
        loop3.stop();
        loop4.stop();
      };
    }
  }, [isRecording]);

  // Audio recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  const formatRecordingTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const startAudioRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Direct audio picker for voice memos (WhatsApp, voice recorder, audio files)
    handlePickAudioFile();
  };

  const stopAndSendAudioRecording = async () => {
    setIsRecording(false);
  };

  const cancelAudioRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRecording(false);
    setRecordingDuration(0);
  };

  // Pick audio note / vocal file (via DocumentPicker)
  const handlePickAudioFile = async () => {
    setAttachmentModalVisible(false);
    setVoiceSheetVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: 'base64',
        });

        if (base64) {
          setSelectedAudio({
            uri: asset.uri,
            base64,
            name: asset.name || 'Mémo vocal',
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (err) {
      console.warn('[PickAudio] Error:', err);
    }
  };

  // Pick general document
  const handlePickDocument = async () => {
    setAttachmentModalVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.mimeType?.startsWith('image/')) {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: 'base64',
          });
          setSelectedImage({
            uri: asset.uri,
            base64,
            mimeType: asset.mimeType,
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert(
            'Document prêt',
            `Fichier : ${asset.name}\nVous pouvez poser votre question à Hnia concernant ce document.`
          );
        }
      }
    } catch (err) {
      console.warn('[PickDoc] Error:', err);
    }
  };

  // Send direct audio message
  const handleSendAudioMessage = async (
    audioBase64: string,
    audioMimeType: string,
    label = '🎙️ Message vocal'
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsgId = `user_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: label,
      isVoice: true,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await adminService.sendMessage({
        message: '',
        conversationId,
        audioBase64,
        audioMimeType,
      });

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
          content:
            res?.message ||
            res?.error ||
            'Désolée, je n’ai pas pu transcrire votre message vocal.',
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err: any) {
      console.error('[HniaChat] Audio send error:', err);
      const errorMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        content: '⚠️ Erreur lors de l’envoi du mémo vocal. Vérifiez votre connexion.',
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
            setSelectedAudio(null);
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
    if (!rawText && !selectedImage && !selectedAudio) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsgId = `user_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: rawText || (selectedAudio ? `🎙️ ${selectedAudio.name}` : (selectedImage ? '📷 Document envoyé' : '')),
      imageUri: selectedImage?.uri,
      isVoice: !!selectedAudio,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    const imagePayload = selectedImage;
    const audioPayload = selectedAudio;
    setSelectedImage(null);
    setSelectedAudio(null);
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

      if (audioPayload) {
        payload.audioBase64 = audioPayload.base64;
        payload.audioMimeType = 'audio/mp4';
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
          content: res?.message || res?.error || 'Désolée, une erreur est survenue lors de la communication.',
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
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0) }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={Platform.OS === 'android'} />

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
        <View
          style={{
            flex: 1,
            paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0,
          }}
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

          {/* Selected Attachment Chip - Image */}
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

          {/* Selected Attachment Chip - Audio */}
          {selectedAudio && (
            <View style={styles.attachmentPreviewContainer}>
              <View style={[styles.attachmentThumbnail, { backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }]}>
                <Mic size={22} color="#0055d4" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {selectedAudio.name}
                </Text>
                <Text style={styles.attachmentSub}>Note vocale prête à être transcrite</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedAudio(null)}
                style={styles.attachmentRemoveBtn}
              >
                <X size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom Floating Input Bar (ChatGPT Mobile Interface) */}
          <View
            style={[
              styles.bottomBarContainer,
              {
                paddingBottom:
                  keyboardHeight > 0
                    ? 8
                    : Math.max(insets.bottom, 12),
              },
            ]}
          >
            {isRecording ? (
              /* Active Vocal Recording Bar */
              <View style={styles.recordingPillContainer}>
                <TouchableOpacity
                  style={styles.recordingCancelBtn}
                  onPress={cancelAudioRecording}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color="#ef4444" strokeWidth={2.4} />
                </TouchableOpacity>

                <View style={styles.recordingWaveArea}>
                  <View style={styles.recordingPulseDot} />
                  <Text style={styles.recordingTimeText}>
                    {formatRecordingTime(recordingDuration)}
                  </Text>

                  {/* Dynamic Sound Wave Bars */}
                  <View style={styles.soundWaveContainer}>
                    <Animated.View style={[styles.waveBar, { transform: [{ scaleY: waveAnim1 }] }]} />
                    <Animated.View style={[styles.waveBar, { transform: [{ scaleY: waveAnim2 }] }]} />
                    <Animated.View style={[styles.waveBar, { transform: [{ scaleY: waveAnim3 }] }]} />
                    <Animated.View style={[styles.waveBar, { transform: [{ scaleY: waveAnim4 }] }]} />
                    <Animated.View style={[styles.waveBar, { transform: [{ scaleY: waveAnim2 }] }]} />
                    <Animated.View style={[styles.waveBar, { transform: [{ scaleY: waveAnim1 }] }]} />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.recordingSendBtn}
                  onPress={stopAndSendAudioRecording}
                >
                  <ArrowUp size={20} color="#ffffff" strokeWidth={2.6} />
                </TouchableOpacity>
              </View>
            ) : (
              /* Standard ChatGPT-style Input Row */
              <View style={styles.chatGptInputRow}>
                {/* + Action Sheet Button */}
                <TouchableOpacity
                  style={styles.chatGptPlusButton}
                  onPress={() => setAttachmentModalVisible(true)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Plus size={22} color="#475569" strokeWidth={2.2} />
                </TouchableOpacity>

                {/* Text Input Pill */}
                <View style={styles.chatGptInputPill}>
                  <TextInput
                    ref={inputRef}
                    style={styles.chatGptTextInput}
                    placeholder="Demander à Hnia..."
                    placeholderTextColor="#94a3b8"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={1000}
                  />

                  {Boolean(inputText.trim() || selectedImage || selectedAudio) ? (
                    /* Send Button (Dark Circle) */
                    <TouchableOpacity
                      style={[
                        styles.chatGptSendBtn,
                        isLoading && { opacity: 0.6 },
                      ]}
                      disabled={isLoading}
                      onPress={() => handleSendMessage()}
                      activeOpacity={0.8}
                    >
                      <ArrowUp size={19} color="#ffffff" strokeWidth={2.6} />
                    </TouchableOpacity>
                  ) : (
                    /* Mic + ChatGPT Voice Mode Button */
                    <View style={styles.chatGptVoiceButtonsRow}>
                      <TouchableOpacity
                        style={styles.chatGptMicButton}
                        onPress={startAudioRecording}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        activeOpacity={0.7}
                      >
                        <Mic size={21} color="#64748b" strokeWidth={2} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.chatGptVoiceCircleButton}
                        onPress={() => setVoiceSheetVisible(true)}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        activeOpacity={0.85}
                      >
                        <AudioLines size={19} color="#ffffff" strokeWidth={2.2} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ChatGPT-style Action Sheet Modal */}
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
          <View style={styles.chatGptSheet}>
            <View style={styles.sheetHandle} />

            <TouchableOpacity style={styles.chatGptSheetOption} onPress={handleTakePhoto}>
              <View style={styles.chatGptSheetIconBox}>
                <Camera size={22} color="#0f172a" strokeWidth={2} />
              </View>
              <Text style={styles.chatGptSheetOptionText}>Appareil photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.chatGptSheetOption} onPress={handlePickImage}>
              <View style={styles.chatGptSheetIconBox}>
                <ImageIcon size={22} color="#0f172a" strokeWidth={2} />
              </View>
              <Text style={styles.chatGptSheetOptionText}>Photos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.chatGptSheetOption} onPress={handlePickDocument}>
              <View style={styles.chatGptSheetIconBox}>
                <FileText size={22} color="#0f172a" strokeWidth={2} />
              </View>
              <Text style={styles.chatGptSheetOptionText}>Fichiers & Documents</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.chatGptSheetOption} onPress={handlePickAudioFile}>
              <View style={styles.chatGptSheetIconBox}>
                <Mic size={22} color="#0f172a" strokeWidth={2} />
              </View>
              <Text style={styles.chatGptSheetOptionText}>Mémo vocal / Audio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chatGptSheetOption, { borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 4, paddingTop: 14 }]}
              onPress={() => {
                setAttachmentModalVisible(false);
                setVoiceSheetVisible(true);
              }}
            >
              <View style={[styles.chatGptSheetIconBox, { backgroundColor: '#eff6ff' }]}>
                <AudioLines size={22} color="#0055d4" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.chatGptSheetOptionText, { color: '#0055d4' }]}>Mode Vocal Hnia</Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Parler en dialecte tunisien ou français</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Dedicated Hnia Voice Mode Sheet */}
      <Modal
        visible={voiceSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVoiceSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVoiceSheetVisible(false)}
        >
          <View style={styles.voiceModalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.voiceModalHeader}>
              <View style={styles.voiceAvatarRing}>
                <Image source={HNIA_AVATAR} style={styles.voiceAvatarImg} />
              </View>
              <Text style={styles.voiceModalTitle}>Assistant Vocal Hnia 🎙️</Text>
              <Text style={styles.voiceModalSubtitle}>
                Posez vos questions ou donnez des ordres de gestion à la voix. Hnia comprend l'arabe tunisien (Derja) et le français !
              </Text>
            </View>

            {/* Action 1: Pick voice memo from device */}
            <TouchableOpacity
              style={styles.voiceActionButton}
              onPress={handlePickAudioFile}
            >
              <View style={[styles.voiceActionIcon, { backgroundColor: '#f0fdf4' }]}>
                <FolderUp size={24} color="#16a34a" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.voiceActionTitle}>Choisir un fichier audio / mémo</Text>
                <Text style={styles.voiceActionSub}>WhatsApp, enregistreur vocal ou fichiers</Text>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>

            {/* Action 2: Focus keyboard for speech-to-text */}
            <TouchableOpacity
              style={styles.voiceActionButton}
              onPress={() => {
                setVoiceSheetVisible(false);
                setTimeout(() => inputRef.current?.focus(), 250);
              }}
            >
              <View style={[styles.voiceActionIcon, { backgroundColor: '#eff6ff' }]}>
                <Mic size={24} color="#0055d4" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.voiceActionTitle}>Dicter au clavier vocal</Text>
                <Text style={styles.voiceActionSub}>Ouvrir le clavier et toucher le micro 🎙️</Text>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>

            {/* Keyboard dictation tip */}
            <View style={styles.voiceTipBox}>
              <Sparkles size={16} color="#d97706" />
              <Text style={styles.voiceTipText}>
                Astuce : Vous pouvez aussi taper sur l'icône microphone de votre clavier pour dicter du texte en direct !
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
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

  /* Bottom Input Bar (ChatGPT Mobile Style) */
  bottomBarContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  chatGptInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  chatGptPlusButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  chatGptInputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 4,
    minHeight: 42,
  },
  chatGptTextInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    paddingRight: 8,
    maxHeight: 120,
  },
  chatGptVoiceButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatGptMicButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  chatGptVoiceCircleButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2563eb', // ChatGPT signature blue voice mode circle
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  chatGptSendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Recording Bar */
  recordingPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 44,
  },
  recordingCancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingWaveArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  recordingPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  recordingTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b91c1c',
  },
  soundWaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 22,
  },
  waveBar: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#ef4444',
  },
  recordingSendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 16,
  },

  /* ChatGPT Action Sheet (Screenshot 4) */
  chatGptSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  chatGptSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  chatGptSheetIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatGptSheetOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginLeft: 14,
  },

  /* Voice Mode Sheet */
  voiceModalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 36,
  },
  voiceModalHeader: {
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 16,
  },
  voiceAvatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#93c5fd',
    padding: 3,
    marginBottom: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceAvatarImg: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  voiceModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  voiceModalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  voiceActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  voiceActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceActionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  voiceActionSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  voiceTipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  voiceTipText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    lineHeight: 17,
  },
});
