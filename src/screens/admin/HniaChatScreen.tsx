import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
} from 'react-native';
import {
  Send,
  ArrowUp,
  Paperclip,
  Mic,
  MicOff,
  Square,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Bot,
  Check,
  X,
  Maximize2,
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
  Globe,
  Building2,
  BookOpen,
  History,
  Trash2,
  MessageSquare,
  TrendingUp,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import {
  CaisseCardWidget,
  UnpaidTuitionWidget,
  PdfReceiptWidget,
  ActionCardWidget,
  FinanceSummaryWidget,
  StudentProfileWidget,
  AttendanceSummaryWidget,
  ActionCardData,
  FinanceSummaryData,
  StudentProfileData,
  AttendanceSummaryData,
  tryParseCaisseWidget,
  tryParseUnpaidWidget,
  tryParseReceiptWidget,
} from './HniaWidgets';

const HNIA_STORAGE_KEY = '@hnia_chat_messages_v2';
const HNIA_CONV_STORAGE_KEY = '@hnia_chat_conv_id_v2';

async function readAudioAsBase64(uri: string): Promise<string> {
  try {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
    });
  } catch (legacyErr) {
    try {
      const { File } = require('expo-file-system');
      const file = new File(uri);
      return await file.base64();
    } catch (newErr) {
      console.error('[HniaChat] All audio base64 conversion failed:', legacyErr, newErr);
      throw legacyErr;
    }
  }
}

const HNIA_AVATAR = require('../../../assets/hnia/hnia_mascot_icon.png');

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUri?: string;
  isVoice?: boolean;
  transcription?: string;
  isStreaming?: boolean;
  widget?: {
    type: 'caisse' | 'unpaid_tuition' | 'pdf_receipt' | 'finance_summary' | 'student_card' | 'attendance_card' | 'action_card';
    data: any;
  } | null;
  pendingConfirmation?: ActionCardData | null;
  followUpSuggestions?: string[];
  createdAt?: string;
}

interface ConversationThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: string | null;
}

// Performant smooth fade-in & slide-up animation for message bubbles (P4)
function AnimatedMessageItem({ children }: { children: React.ReactNode }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
}

export default function HniaChatScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const userName = useAppStore((s) => s.userName) || 'Directeur';
  const schoolName = useAppStore((s) => s.schoolName) || 'SnapSchool';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Dynamic Agent Status
  const hasPendingAction = messages.some(
    (m) => m.pendingConfirmation && m.pendingConfirmation.status === 'PENDING'
  );
  const agentStatus = hasPendingAction
    ? { label: 'Action en attente', dotColor: '#f59e0b', textColor: '#b45309', bg: '#fef3c7' }
    : isLoading
    ? { label: 'Hnia travaille...', dotColor: '#2563eb', textColor: '#1d4ed8', bg: '#eff6ff' }
    : { label: 'Hnia est prête', dotColor: '#10b981', textColor: '#059669', bg: '#ecfdf5' };

  // Live Tool Steps (P1)
  const [activeStatusStep, setActiveStatusStep] = useState<string | null>(null);
  const [activeToolName, setActiveToolName] = useState<string | null>(null);

  // Multi-Thread Conversation History (P2)
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);

  const [selectedImage, setSelectedImage] = useState<{ uri: string; base64: string; mimeType: string } | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<{ uri: string; base64: string; name: string } | null>(null);
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
  const [fullscreenImageUri, setFullscreenImageUri] = useState<string | null>(null);
  const [confirmingToolId, setConfirmingToolId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleCopyMessage = async (msgId: string, textToCopy: string) => {
    try {
      const cleanText = textToCopy.replace(/\[IMAGE:https?:\/\/[^\]]+\]\n?/g, '').trim();
      await Clipboard.setStringAsync(cleanText);
      await Haptics.selectionAsync();
      setCopiedMessageId(msgId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.warn('[HniaChat] Copy failed:', err);
    }
  };

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [vocalError, setVocalError] = useState<string | null>(null);
  const [apkUpdateModalVisible, setApkUpdateModalVisible] = useState(false);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Animated sound waves
  const waveAnim1 = useRef(new Animated.Value(0.4)).current;
  const waveAnim2 = useRef(new Animated.Value(0.8)).current;
  const waveAnim3 = useRef(new Animated.Value(0.3)).current;
  const waveAnim4 = useRef(new Animated.Value(0.9)).current;

  // Real-time audio amplitude for live voice visualization (0.0 to 1.0)
  const [liveAmplitude, setLiveAmplitude] = useState<number>(0);
  const smoothedAmplitudeRef = useRef<number>(0);
  const [isProcessingVocal, setIsProcessingVocal] = useState<boolean>(false);

  // Dynamic live waveform bars for the bottom recording bar (22 bars)
  const bottomBarAnims = useRef<Animated.Value[]>(
    Array.from({ length: 22 }, () => new Animated.Value(0.18))
  ).current;

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Cleanup recording on screen unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        try {
          recordingRef.current.stopAndUnloadAsync();
        } catch {}
      }
    };
  }, []);

  // Track whether user was near the bottom before keyboard showed
  const isNearBottomRef = useRef(true);
  const handleScroll = useCallback((e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const paddingToBottom = 80;
    isNearBottomRef.current =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  }, []);

  // Keyboard show/hide handling:
  // When keyboard opens: if user was at bottom, keep newest messages visible
  // When keyboard dismisses (e.g. back button on Android): blur input cleanly to prevent ghost focus
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      if (isNearBottomRef.current && messages.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 120);
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      if (inputRef.current?.isFocused()) {
        inputRef.current?.blur();
      }
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [messages.length]);

  // Auto-scroll to bottom ONLY when new messages arrive (allows smooth scrolling up to read old messages)
  const prevMessagesLengthRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

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

  // Audio recording timer (supports pause)
  useEffect(() => {
    if (isRecording && !isRecordingPaused) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording, isRecordingPaused]);

  // Auto-dismiss vocal error after 6 seconds
  useEffect(() => {
    if (vocalError) {
      const t = setTimeout(() => setVocalError(null), 6000);
      return () => clearTimeout(t);
    }
  }, [vocalError]);

  const formatRecordingTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Handle live audio amplitude from expo-av metering
  const handleAudioMetering = (meteringDb: number) => {
    // meteringDb ranges from -160 dBFS (silence) to 0 dBFS (loudest)
    const minDb = -52;
    const maxDb = -4;

    let raw = 0;
    if (meteringDb > minDb) {
      raw = (meteringDb - minDb) / (maxDb - minDb);
      raw = Math.min(1, Math.max(0, raw));
      raw = Math.pow(raw, 1.25);
    }

    const prev = smoothedAmplitudeRef.current;
    const attack = 0.45;
    const release = 0.12;
    const smoothed = raw > prev ? prev + attack * (raw - prev) : prev + release * (raw - prev);
    smoothedAmplitudeRef.current = smoothed;

    setLiveAmplitude(smoothed);

    // Live update bottom bar waveform bars across all bars
    const count = bottomBarAnims.length;
    const mid = (count - 1) / 2;
    bottomBarAnims.forEach((anim, i) => {
      const dist = Math.abs(i - mid) / mid;
      const weight = 0.35 + 0.65 * Math.cos((dist * Math.PI) / 2);
      const jitter = 0.88 + 0.24 * Math.sin(i * 1.4);
      const target = Math.max(0.14, smoothed * weight * jitter * 2.5);
      Animated.spring(anim, {
        toValue: target,
        friction: 7,
        tension: 110,
        useNativeDriver: true,
      }).start();
    });
  };

  const startAudioRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVocalError(null);

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setVocalError('Permission microphone requise dans les réglages');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      recordingStartTimeRef.current = Date.now();
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });
      recording.setProgressUpdateInterval(40);
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && typeof status.metering === 'number') {
          handleAudioMetering(status.metering);
        }
      });
      await recording.startAsync();
      recordingRef.current = recording;

      setIsRecording(true);
      setIsRecordingPaused(false);
      setRecordingDuration(0);
    } catch (err: any) {
      console.warn('[HniaChat] Audio recording start error:', err);
      if (
        err?.message?.includes('ExponentAV') ||
        err?.message?.includes('null') ||
        err?.message?.includes('not found')
      ) {
        setApkUpdateModalVisible(true);
      } else {
        setVocalError('Erreur micro : ' + (err.message || 'Impossible de démarrer'));
      }
    }
  };

  const pauseAudioRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRecordingPaused(true);
    setLiveAmplitude(0);
    smoothedAmplitudeRef.current = 0;
    bottomBarAnims.forEach((anim) => {
      Animated.spring(anim, { toValue: 0.14, friction: 8, tension: 50, useNativeDriver: true }).start();
    });
    const recording = recordingRef.current;
    if (recording) {
      try {
        await recording.pauseAsync();
      } catch (err) {
        console.warn('[HniaChat] Pause error:', err);
      }
    }
  };

  const stopAndSendAudioRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const elapsedMs = Date.now() - recordingStartTimeRef.current;
    const duration = recordingDuration;
    setIsRecording(false);
    setIsRecordingPaused(false);
    setRecordingDuration(0);
    setLiveAmplitude(0);
    smoothedAmplitudeRef.current = 0;
    bottomBarAnims.forEach((anim) => {
      Animated.spring(anim, { toValue: 0.14, friction: 8, tension: 50, useNativeDriver: true }).start();
    });

    const recording = recordingRef.current;
    recordingRef.current = null;

    if (recording) {
      try {
        const uri = recording.getURI();
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        }).catch(() => null);

        const finalUri = uri || recording.getURI();
        if (finalUri && (elapsedMs >= 400 || duration >= 1)) {
          const base64 = await readAudioAsBase64(finalUri);
          if (base64) {
            setIsProcessingVocal(true);
            handleSendMessage(undefined, base64, 'audio/mp4');
            return;
          }
        }
      } catch (err: any) {
        console.warn('[HniaChat] Stop recording error:', err);
        setVocalError('Erreur audio : ' + (err?.message || 'Fichier non lisible'));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }

    if (selectedAudio) {
      handleSendMessage(undefined);
      return;
    }

    if (elapsedMs < 400 && duration < 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setVocalError('Message trop court : maintenez pour dicter');
    }
  };

  const cancelAudioRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRecording(false);
    setIsRecordingPaused(false);
    setRecordingDuration(0);
    setLiveAmplitude(0);
    smoothedAmplitudeRef.current = 0;
    setIsProcessingVocal(false);
    bottomBarAnims.forEach((anim) => {
      Animated.spring(anim, { toValue: 0.14, friction: 8, tension: 50, useNativeDriver: true }).start();
    });
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        }).catch(() => null);
      } catch (err) {
        console.warn('[HniaChat] Cancel error:', err);
      }
    }
  };

  const handleInterrupt = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setActiveStatusStep(null);
    setActiveToolName(null);
  };

  // Pick audio note / vocal file (via DocumentPicker)
  const handlePickAudioFile = async () => {
    setAttachmentModalVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const base64 = await readAudioAsBase64(asset.uri);

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

  // Save messages to local AsyncStorage for instant loading across app sessions
  const saveMessagesToLocal = useCallback(async (msgs: ChatMessage[], convId?: string) => {
    try {
      if (msgs && msgs.length > 0) {
        await AsyncStorage.setItem(HNIA_STORAGE_KEY, JSON.stringify(msgs.slice(-80)));
      }
      if (convId) {
        await AsyncStorage.setItem(HNIA_CONV_STORAGE_KEY, convId);
      }
    } catch (e) {
      console.warn('[HniaChat] Local save error:', e);
    }
  }, []);

  // Send direct audio message (delegates to handleSendMessage with streaming & live steps)
  const handleSendAudioMessage = async (
    audioBase64: string,
    audioMimeType: string,
    label = '🎙️ Message vocal'
  ) => {
    await handleSendMessage('', audioBase64, audioMimeType);
  };

  // Load conversation threads for drawer (P2)
  const loadThreads = async () => {
    setIsLoadingThreads(true);
    try {
      const res = await adminService.fetchThreads();
      if (res && res.success && Array.isArray(res.threads)) {
        setThreads(res.threads);
      }
    } catch (e) {
      console.warn('[HniaChat] Load threads error:', e);
    } finally {
      setIsLoadingThreads(false);
    }
  };

  const handleOpenHistoryDrawer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHistoryDrawerVisible(true);
    loadThreads();
  };

  const handleSelectThread = async (threadId: string) => {
    Haptics.selectionAsync();
    setHistoryDrawerVisible(false);
    if (threadId === conversationId) return;

    setIsLoading(true);
    try {
      const res = await adminService.fetchChatHistory(threadId);
      if (res && res.success) {
        setConversationId(threadId);
        await AsyncStorage.setItem(HNIA_CONV_STORAGE_KEY, threadId).catch(() => null);
        if (Array.isArray(res.messages)) {
          const loaded: ChatMessage[] = res.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content || '',
            imageUri: m.imageUri,
            createdAt: m.createdAt,
          }));
          setMessages(loaded);
          saveMessagesToLocal(loaded, threadId);
        }
      }
    } catch (err) {
      console.warn('[HniaChat] Select thread error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewThread = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setHistoryDrawerVisible(false);
    try {
      const res = await adminService.createThread();
      if (res && res.success && res.conversationId) {
        setConversationId(res.conversationId);
        await AsyncStorage.setItem(HNIA_CONV_STORAGE_KEY, res.conversationId).catch(() => null);
      } else {
        setConversationId(undefined);
      }
      setMessages([]);
      await AsyncStorage.removeItem(HNIA_STORAGE_KEY).catch(() => null);
      loadThreads();
    } catch (e) {
      setConversationId(undefined);
      setMessages([]);
    }
  };

  const handleDeleteThread = (threadId: string, threadTitle: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Supprimer la discussion',
      `Voulez-vous supprimer définitivement "${threadTitle}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteThread(threadId);
              setThreads((prev) => prev.filter((t) => t.id !== threadId));
              if (threadId === conversationId) {
                setConversationId(undefined);
                setMessages([]);
                await AsyncStorage.removeItem(HNIA_STORAGE_KEY).catch(() => null);
                await AsyncStorage.removeItem(HNIA_CONV_STORAGE_KEY).catch(() => null);
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (delErr) {
              console.warn('[HniaChat] Delete thread error:', delErr);
            }
          },
        },
      ]
    );
  };

  // Load chat history: immediately from local cache, then sync from server
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [cachedRaw, cachedConvId] = await Promise.all([
          AsyncStorage.getItem(HNIA_STORAGE_KEY),
          AsyncStorage.getItem(HNIA_CONV_STORAGE_KEY),
        ]);
        if (!isMounted) return;
        if (cachedConvId) setConversationId(cachedConvId);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            setIsInitializing(false);
          }
        }
      } catch (cacheErr) {
        console.warn('[HniaChat] Read local cache error:', cacheErr);
      }
      if (isMounted) {
        await loadChatHistory();
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadChatHistory = async () => {
    try {
      const res = await adminService.fetchChatHistory();
      if (res && res.success) {
        if (res.conversationId) {
          setConversationId(res.conversationId);
          AsyncStorage.setItem(HNIA_CONV_STORAGE_KEY, res.conversationId).catch(() => null);
        }
        if (Array.isArray(res.messages) && res.messages.length > 0) {
          const loaded: ChatMessage[] = res.messages.map((m: any) => {
            let content = m.content || '';
            let imageUri = m.imageUri;

            // Client-side fallback parsing for image tags or legacy prompt descriptors
            if (content.includes('[IMAGE:')) {
              const match = content.match(/\[IMAGE:(https?:\/\/[^\]]+)\]/);
              if (match) {
                imageUri = match[1];
                content = content.replace(/\[IMAGE:https?:\/\/[^\]]+\]\n?/, '').trim();
              }
            } else if (content.includes('[DOCUMENT NUMÉRISÉ REÇU PAR PHOTO]')) {
              const urlMatch = content.match(/Justificatif \(URL image\) :\s*(https?:\/\/[^\s\n]+)/) ||
                               content.match(/img:\s*["\x27](https?:\/\/[^"\x27]+)["\x27]/);
              if (urlMatch) imageUri = urlMatch[1];
              const titleMatch = content.match(/Titre \/ Enseigne :\s*([^\n]+)/);
              const amountMatch = content.match(/Montant extrait :\s*([^\n]+)/);
              const merchant = titleMatch && !titleMatch[1].includes('Non spécifié') ? titleMatch[1].trim() : '';
              const amount = amountMatch && !amountMatch[1].includes('Non spécifié') ? amountMatch[1].trim() : '';
              content = merchant ? `📷 ${merchant}${amount ? ` (${amount})` : ''}` : '📷 Justificatif / Reçu envoyé';
            }

            return {
              id: m.id,
              role: m.role,
              content,
              imageUri,
              widget: m.widget || null,
              createdAt: m.createdAt,
            };
          });
          setMessages(loaded);
          saveMessagesToLocal(loaded, res.conversationId);
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
          onPress: async () => {
            setMessages([]);
            setConversationId(undefined);
            setSelectedImage(null);
            setSelectedAudio(null);
            setInputText('');
            await AsyncStorage.removeItem(HNIA_STORAGE_KEY).catch(() => null);
            await AsyncStorage.removeItem(HNIA_CONV_STORAGE_KEY).catch(() => null);
          },
        },
      ]
    );
  };

  // Process, resize (max width 1200) and compress image for fast, reliable upload
  const processAndSetImage = async (uri: string) => {
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (manipulated.base64) {
        setSelectedImage({
          uri: manipulated.uri,
          base64: manipulated.base64,
          mimeType: 'image/jpeg',
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.warn('[HniaChat] Image manipulation fallback:', e);
    }
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
        allowsEditing: false,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await processAndSetImage(result.assets[0].uri);
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
        allowsEditing: false,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await processAndSetImage(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('[Camera] Error:', err);
    }
  };

  // Send message to Hnia with real-time SSE streaming (P1 + P3)
  const handleSendMessage = async (
    textToSend?: string,
    directAudioBase64?: string,
    directAudioMime?: string
  ) => {
    const rawText = (textToSend ?? inputText).trim();
    if (!rawText && !selectedImage && !selectedAudio && !directAudioBase64) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsgId = `user_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content:
        rawText ||
        (directAudioBase64
          ? '🎙️ Note vocale enregistrée'
          : selectedAudio
          ? `🎙️ ${selectedAudio.name}`
          : selectedImage
          ? '📷 Document envoyé'
          : ''),
      imageUri: selectedImage?.uri,
      isVoice: !!selectedAudio || !!directAudioBase64,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => {
      const next = [...prev, userMsg];
      saveMessagesToLocal(next, conversationId);
      return next;
    });

    setInputText('');
    const imagePayload = selectedImage;
    const audioPayload = selectedAudio;
    setSelectedImage(null);
    setSelectedAudio(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);
    setActiveStatusStep('Analyse de la demande...');
    setActiveToolName(null);

    const botMsgId = `bot_${Date.now()}`;
    let accumulatedText = '';
    let isStreamStarted = false;
    let receivedWidget: any = null;
    let receivedConfirmation: any = null;

    try {
      const payload: any = {
        message: rawText,
        conversationId,
      };

      if (imagePayload) {
        payload.imageBase64 = imagePayload.base64;
        payload.imageMimeType = imagePayload.mimeType;
      }

      if (directAudioBase64) {
        payload.audioBase64 = directAudioBase64;
        payload.audioMimeType = directAudioMime || 'audio/mp4';
      } else if (audioPayload) {
        payload.audioBase64 = audioPayload.base64;
        payload.audioMimeType = 'audio/mp4';
      }

      const res = await adminService.streamMessage(
        payload,
        {
          onStatus: (status) => {
            if (controller.signal.aborted) return;
            setActiveStatusStep(status.step);
            setActiveToolName(status.tool || null);
          },
          onToken: (delta) => {
            if (controller.signal.aborted) return;
            accumulatedText += delta;
            setActiveStatusStep('Génération de la réponse...');

            if (!isStreamStarted) {
              isStreamStarted = true;
              setMessages((prev) => [
                ...prev,
                {
                  id: botMsgId,
                  role: 'assistant',
                  content: accumulatedText,
                  isStreaming: true,
                  createdAt: new Date().toISOString(),
                },
              ]);
            } else {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === botMsgId
                    ? { ...m, content: accumulatedText, isStreaming: true }
                    : m
                )
              );
            }

            flatListRef.current?.scrollToEnd({ animated: false });
          },
          onWidget: (widget) => {
            if (controller.signal.aborted) return;
            receivedWidget = widget;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === botMsgId ? { ...m, widget } : m
              )
            );
          },
          onConfirmation: (pendingConfirmation) => {
            if (controller.signal.aborted) return;
            receivedConfirmation = pendingConfirmation;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === botMsgId ? { ...m, pendingConfirmation } : m
              )
            );
          },
          onDone: (result) => {
            if (controller.signal.aborted) return;
            setActiveStatusStep(null);
            setActiveToolName(null);

            const nextConvId = result?.conversationId || conversationId;
            if (result?.conversationId) {
              setConversationId(result.conversationId);
              AsyncStorage.setItem(HNIA_CONV_STORAGE_KEY, result.conversationId).catch(() => null);
            }

            if (result?.transcription) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === userMsg.id
                    ? { ...m, content: `🎙️ "${result.transcription}"`, transcription: result.transcription }
                    : m
                )
              );
            }

            if (result?.imageUrl || result?.analyzedDocument) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === userMsg.id
                    ? {
                        ...m,
                        imageUri: result.imageUrl || m.imageUri,
                        content:
                          rawText ||
                          (result.analyzedDocument?.merchant || result.analyzedDocument?.title
                            ? `📷 ${result.analyzedDocument.merchant || result.analyzedDocument?.title}${result.analyzedDocument.amount ? ` (${result.analyzedDocument.amount} DT)` : ''}`
                            : m.content),
                      }
                    : m
                )
              );
            }

            const finalContent = result?.message || accumulatedText || 'C’est bon !';
            const finalWidget = result?.widget || receivedWidget;
            const finalConfirmation = result?.pendingConfirmation || receivedConfirmation;

            setMessages((prev) => {
              const exists = prev.some((m) => m.id === botMsgId);
              let next: ChatMessage[];
              if (exists) {
                next = prev.map((m) =>
                  m.id === botMsgId
                    ? {
                        ...m,
                        content: finalContent,
                        isStreaming: false,
                        widget: finalWidget,
                        pendingConfirmation: finalConfirmation,
                        followUpSuggestions: result?.followUpSuggestions,
                      }
                    : m
                );
              } else {
                next = [
                  ...prev,
                  {
                    id: botMsgId,
                    role: 'assistant',
                    content: finalContent,
                    isStreaming: false,
                    widget: finalWidget,
                    pendingConfirmation: finalConfirmation,
                    followUpSuggestions: result?.followUpSuggestions,
                    createdAt: new Date().toISOString(),
                  },
                ];
              }
              saveMessagesToLocal(next, nextConvId);
              return next;
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
          onError: (streamErr) => {
            console.warn('[HniaChat] Stream error:', streamErr);
          },
        },
        controller.signal
      );

      // If user interrupted via Stop button (■), exit cleanly
      if (controller.signal.aborted || res?.aborted) {
        return;
      }

      // If stream didn't trigger onDone but finished successfully
      if (res && res.success && !isStreamStarted) {
        const nextConvId = res?.conversationId || conversationId;
        if (res.conversationId) setConversationId(res.conversationId);

        const botMsg: ChatMessage = {
          id: botMsgId,
          role: 'assistant',
          content: res.message || 'C’est bon !',
          transcription: res.transcription,
          pendingConfirmation: res.pendingConfirmation,
          widget: res.widget,
          followUpSuggestions: res.followUpSuggestions,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => {
          const next = [...prev, botMsg];
          saveMessagesToLocal(next, nextConvId);
          return next;
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (res && !res.success && !isStreamStarted) {
        const isVocal = Boolean(audioPayload || directAudioBase64);
        if (isVocal) {
          setVocalError(res?.message || 'Erreur : message vocal non compris');
        }
        const errorMsg: ChatMessage = {
          id: `bot_${Date.now()}`,
          role: 'assistant',
          content: isVocal
            ? (res?.message || '🎙️ Je n’ai pas bien compris la note vocale. Veuillez réessayer de parler un peu plus distinctement.')
            : (res?.message || res?.error || 'Désolée, une erreur est survenue lors de la communication.'),
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => {
          const next = [...prev, errorMsg];
          saveMessagesToLocal(next, conversationId);
          return next;
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err: any) {
      if (controller.signal.aborted) {
        return;
      }
      console.error('[HniaChat] Send error:', err);
      const isVocal = Boolean(audioPayload || directAudioBase64);
      if (isVocal) {
        setVocalError('Erreur : message vocal non compris');
      }
      const errorMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        content: isVocal
          ? '🎙️ Je n’ai pas pu traiter votre message vocal. Vérifiez votre connexion et réessayez.'
          : '⚠️ Connexion interrompue. Vérifiez votre réseau et réessayez.',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => {
        const next = [...prev, errorMsg];
        saveMessagesToLocal(next, conversationId);
        return next;
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
      setIsProcessingVocal(false);
      setActiveStatusStep(null);
      setActiveToolName(null);
      abortControllerRef.current = null;
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
                  reference: res.actionResult?.reference,
                  resultMessage: res.actionResult?.summary || res.message,
                },
              };
            }
            return m;
          })
        );

        // Add confirmation response bubble
        if (action === 'confirm') {
          const resultMsg: ChatMessage = {
            id: `res_${Date.now()}`,
            role: 'assistant',
            content: res.message || '✅ Action confirmée et enregistrée avec succès !',
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, resultMsg]);
        }
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
      id: 'depense',
      icon: Wallet,
      color: '#059669',
      bg: '#ecfdf5',
      title: 'Ajouter une dépense',
      subtitle: 'Ex: "Ajoute une dépense de 350 DT pour l\'électricité"',
      prompt: "Ajoute une dépense de 350 DT pour l'électricité facture STEG",
    },
    {
      id: 'impayes',
      icon: CreditCard,
      color: '#dc2626',
      bg: '#fef2f2',
      title: 'Vérifier les impayés',
      subtitle: 'Ex: "Combien d\'élèves n\'ont pas encore payé ?"',
      prompt: "Combien d'élèves n'ont pas encore payé ce mois-ci ?",
    },
    {
      id: 'revenus',
      icon: TrendingUp,
      color: '#0284c7',
      bg: '#e0f2fe',
      title: 'Revenus du mois',
      subtitle: 'Ex: "Donne-moi les revenus de ce mois"',
      prompt: 'Donne-moi les revenus et le bilan financier de ce mois',
    },
    {
      id: 'absences',
      icon: Users,
      color: '#d97706',
      bg: '#fffbeb',
      title: 'Appel & Absences',
      subtitle: 'Ex: "Marque les absences de la 6ème B aujourd\'hui"',
      prompt: "Marque les absences de la classe 6ème B aujourd'hui",
    },
    {
      id: 'timetable',
      icon: Clock,
      color: '#7c3aed',
      bg: '#f5f3ff',
      title: 'Emploi du temps',
      subtitle: 'Ex: "Montre-moi l\'emploi du temps de demain"',
      prompt: "Montre-moi l'emploi du temps des cours prévus aujourd'hui.",
    },
    {
      id: 'doc',
      icon: Receipt,
      color: '#0055d4',
      bg: '#eff6ff',
      title: 'Scanner un reçu',
      subtitle: 'Photo de reçu ou facture avec pré-remplissage',
      onPress: () => setAttachmentModalVisible(true),
    },
  ];

  const EXECUTIVE_QUICK_CHIPS = [
    { label: '💰 Ajouter dépense', prompt: 'Je veux enregistrer une nouvelle dépense' },
    { label: '👨‍🎓 Ajouter élève', prompt: 'Je veux inscrire un nouvel élève' },
    { label: '💳 Vérifier impayés', prompt: "Quels sont les élèves qui ont des impayés ?" },
    { label: '📊 Résumé financier', prompt: 'Donne-moi les revenus de ce mois' },
    { label: '📋 Présences & Absences', prompt: "Quelles sont les absences d'aujourd'hui ?" },
    { label: '📢 Annonce parents', prompt: 'Je souhaite diffuser une annonce importante aux parents' },
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

      // 1. Official SnapSchool Card Header: e.g. "🏛️ SNAPSCHOOL │ SUIVI DES ABSENCES" or "🏛️ SNAPSCHOOL | WIKIPEDIA"
      if (/^(?:🏛️|🏢|🏫)?\s*SNAPSCHOOL\s*[│|:]\s*(.+)$/i.test(trimmed) || /^(?:🏛️|🏢|🏫)\s+([A-ZÀ-Ÿ\s]{3,})$/i.test(trimmed)) {
        const match = trimmed.match(/^(?:🏛️|🏢|🏫)?\s*SNAPSCHOOL\s*[│|:]\s*(.+)$/i) || trimmed.match(/^(?:🏛️|🏢|🏫)\s+([A-ZÀ-Ÿ\s]{3,})$/i);
        const title = (match ? match[1] : trimmed).replace(/[━─═-]{2,}/g, '').trim();
        const upper = title.toUpperCase();

        const IconComponent =
          upper.includes('ABSENCE') || upper.includes('PRÉSENCE') || upper.includes('APPEL')
            ? Calendar
            : upper.includes('CAISSE') || upper.includes('FINANCE') || upper.includes('IMPAYÉ') || upper.includes('PAIEMENT')
            ? Wallet
            : upper.includes('WIKI') || upper.includes('RECHERCHE')
            ? Globe
            : upper.includes('ÉLÈVE') || upper.includes('PROFIL') || upper.includes('PARENT')
            ? Users
            : upper.includes('NOTE') || upper.includes('EXAMEN')
            ? BookOpen
            : Building2;

        return (
          <View key={idx} style={styles.cardHeaderBadge}>
            <View style={styles.cardHeaderIconContainer}>
              <IconComponent size={13} color="#0055d4" />
            </View>
            <Text style={styles.cardHeaderBadgeTitle} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.cardHeaderTag}>
              <Text style={styles.cardHeaderTagText}>SNAPSCHOOL</Text>
            </View>
          </View>
        );
      }

      // 2. ASCII Progress Bar: e.g. "[░░░░░░░░░░] 100%" or "[▓▓▓▓▓▓▓▓▓░] 90%" or "[██████████] 100%"
      const progressMatch = trimmed.match(/\[([▓█░▒─\-#=]+)\]\s*(\d+)%/);
      if (progressMatch) {
        const pct = Math.min(100, Math.max(0, parseInt(progressMatch[2], 10)));
        const barColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
        const badgeBg = pct >= 80 ? '#ecfdf5' : pct >= 50 ? '#fef3c7' : '#fef2f2';
        const badgeText = pct >= 80 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';

        return (
          <View key={idx} style={styles.progressBarWrapper}>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
            </View>
            <View style={[styles.progressBadge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.progressBadgeText, { color: badgeText }]}>{pct}%</Text>
            </View>
          </View>
        );
      }

      // 3. Date Pill: e.g. "📅 29/09/2026 (Mardi 29 Septembre 2026)"
      if (trimmed.startsWith('📅')) {
        const dateText = trimmed.replace(/^📅\s*/, '').trim();
        return (
          <View key={idx} style={styles.datePillRow}>
            <Calendar size={13} color="#475569" />
            <Text style={styles.datePillText}>{dateText}</Text>
          </View>
        );
      }

      // 4. Blockquote / Tip / Advice Card: e.g. "> 💡 **Hnia :** ..." or "💡 Hnia : ..." or "<blockquote>...</blockquote>"
      if (
        trimmed.startsWith('>') ||
        trimmed.startsWith('<blockquote>') ||
        trimmed.includes('💡 Hnia :') ||
        trimmed.includes('💡 **Hnia :**') ||
        (trimmed.startsWith('💡') && trimmed.length > 5)
      ) {
        let cleanTip = trimmed
          .replace(/<\/?blockquote>/g, '')
          .replace(/^>\s*/, '')
          .replace(/^💡\s*/, '')
          .replace(/^\*{0,2}Hnia\s*:\*{0,2}\s*/i, '')
          .trim();

        return (
          <View key={idx} style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <View style={styles.insightIconBadge}>
                <Sparkles size={13} color="#0055d4" />
              </View>
              <Text style={styles.insightTitle}>Conseil Hnia</Text>
            </View>
            <Text style={styles.insightBody}>
              {renderRichText(cleanTip, styles.insightBody)}
            </Text>
          </View>
        );
      }

      // 5. Metric Key-Value Row: e.g. "• 🟢 Présents : 498 / 498 élèves" or "• 📍 Géographie : ..."
      const metricMatch = trimmed.match(
        /^(?:[•*-]\s*)?([🟢🔴🟠🟡🔵⚪⚫📍🏛️🌾💰💳📋📞👤🏢])\s*(.+?)\s*:\s*(.+)$/
      );
      if (metricMatch) {
        const emoji = metricMatch[1];
        const label = metricMatch[2].trim();
        const value = metricMatch[3].trim();

        return (
          <View key={idx} style={styles.metricCardRow}>
            <View style={styles.metricIconBox}>
              <Text style={styles.metricIconText}>{emoji}</Text>
            </View>
            <View style={styles.metricBody}>
              <Text style={styles.metricLabelText}>{label}</Text>
              <Text style={styles.metricValueText}>
                {renderRichText(value, styles.metricValueText)}
              </Text>
            </View>
          </View>
        );
      }

      // 6. Section Subtitle with leading emoji: e.g. "📊 Assiduité du jour :" or "🇹🇳 Tajerouine (تاجروين)"
      if (/^[📊📈📉📍👥📌🎯💼💰🇹🇳]\s*(.+)$/.test(trimmed) && trimmed.length < 50) {
        return (
          <Text key={idx} style={styles.sectionSubtitle}>
            {renderRichText(trimmed, styles.sectionSubtitle)}
          </Text>
        );
      }

      // 7. Headers
      if (trimmed.startsWith('###')) {
        return (
          <Text key={idx} style={styles.header3}>
            {trimmed.replace(/^###\s*/, '')}
          </Text>
        );
      }

      if (trimmed.startsWith('##') || trimmed.startsWith('#')) {
        return (
          <Text key={idx} style={styles.header2}>
            {trimmed.replace(/^#+\s*/, '')}
          </Text>
        );
      }

      // 8. Bullet points: only match literal "•" OR "-" / "*" followed by whitespace
      const bulletMatch = trimmed.match(/^(?:[•]|(?:[-*]\s+))(.+)$/);
      if (bulletMatch) {
        const bulletContent = bulletMatch[1].trim();
        return (
          <View key={idx} style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              {renderRichText(bulletContent, styles.bulletText)}
            </Text>
          </View>
        );
      }

      return (
        <Text key={idx} style={styles.normalText}>
          {renderRichText(trimmed, styles.normalText)}
        </Text>
      );
    });
  };

  // Comprehensive Rich Text Formatter supporting HTML & Markdown (<b>, <i>, <code>, **, *, _, etc.)
  const renderRichText = (rawStr: string, baseStyle: any = styles.normalText) => {
    if (!rawStr) return null;

    // 1. Decode HTML entities
    let str = rawStr
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    // 2. Strip separator bars
    str = str.replace(/[━─═-]{4,}/g, '');

    // 3. Fix mismatched asterisks like *Word** -> **Word** or **Word* -> **Word**
    str = str.replace(/(^|\s)\*([^*\s][^*]*?)\*\*(?=\s|$|[.,!?;:])/g, '$1**$2**');
    str = str.replace(/(^|\s)\*\*([^*\s][^*]*?)\*(?=\s|$|[.,!?;:])/g, '$1**$2**');

    // 4. Tokenize Code pills (HTML code or backticks)
    str = str.replace(/<\/?code>/gi, '|||C|||');
    str = str.replace(/`([^`]+)`/g, '|||C|||$1|||C|||');

    // 5. Tokenize Bold Italic ***text***
    str = str.replace(/\*\*\*(.+?)\*\*\*/g, '|||B||||||I|||$1|||I||||||B|||');

    // 6. Tokenize Bold <b> or **text**
    str = str.replace(/<\/?(?:b|strong)>/gi, '|||B|||');
    str = str.replace(/\*\*(.+?)\*\*/g, '|||B|||$1|||B|||');

    // 7. Tokenize Italic <i> or *text* or _text_
    str = str.replace(/<\/?(?:i|em)>/gi, '|||I|||');
    str = str.replace(/(^|\s)\*([^*\s][^*]*?)\*(?=\s|$|[.,!?;:])/g, '$1|||I|||$2|||I|||');
    str = str.replace(/(^|\s)_([^_\s][^_]*?)_(?=\s|$|[.,!?;:])/g, '$1|||I|||$2|||I|||');

    // 8. Strip any remaining HTML tags
    str = str.replace(/<[^>]+>/g, '');

    // 9. Tokenize
    const tokens = str.split(/(\|\|\|[BIC]\|\|\|)/g);

    let isBold = false;
    let isItalic = false;
    let isCode = false;

    const elements: React.ReactNode[] = [];

    tokens.forEach((token, idx) => {
      if (token === '|||B|||') {
        isBold = !isBold;
      } else if (token === '|||I|||') {
        isItalic = !isItalic;
      } else if (token === '|||C|||') {
        isCode = !isCode;
      } else if (token) {
        if (isCode) {
          elements.push(
            <Text key={idx} style={styles.codeTextInline}>
              {` ${token.trim()} `}
            </Text>
          );
          return;
        }

        const textStyles: any = [baseStyle];
        if (isBold) textStyles.push(styles.boldText);
        if (isItalic) textStyles.push(styles.italicText);

        elements.push(
          <Text key={idx} style={textStyles}>
            {token}
          </Text>
        );
      }
    });

    return elements;
  };

  // Structured Confirmation Card Renderer with zero raw HTML
  const renderConfirmationCardContent = (confirmText: string) => {
    if (!confirmText) return null;

    let cleaned = confirmText.replace(/^[❓⚠️\s]+/, '').trim();
    cleaned = cleaned.replace(/[━─═-]{4,}/g, '');

    const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);

    return (
      <View style={{ gap: 6, marginTop: 4 }}>
        {lines.map((line, idx) => {
          const isQuestion = line.startsWith('Confirmer ') || line.endsWith('?') || line.includes('Souhaitez-vous');
          if (isQuestion) {
            return (
              <View key={idx} style={styles.confirmPromptBox}>
                <Text style={styles.confirmPromptText}>
                  {renderRichText(line, styles.confirmPromptText)}
                </Text>
              </View>
            );
          }

          const isHeader = line.toLowerCase().includes('confirmation') && idx === 0;
          if (isHeader) {
            return (
              <Text key={idx} style={styles.confirmActionHeading}>
                {renderRichText(line, styles.confirmActionHeading)}
              </Text>
            );
          }

          return (
            <View key={idx} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
              {renderRichText(line, styles.confirmationLineText)}
            </View>
          );
        })}
      </View>
    );
  };

  // Render Single Message
  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    const caisseData = !isUser
      ? (item.widget?.type === 'caisse' ? item.widget.data : tryParseCaisseWidget(item.content))
      : null;
    const unpaidData = !isUser
      ? (item.widget?.type === 'unpaid_tuition' ? item.widget.data : tryParseUnpaidWidget(item.content))
      : null;
    const receiptData = !isUser
      ? (item.widget?.type === 'pdf_receipt' ? item.widget.data : tryParseReceiptWidget(item.content))
      : null;
    const financeData = !isUser && item.widget?.type === 'finance_summary' ? item.widget.data : null;
    const studentData = !isUser && item.widget?.type === 'student_card' ? item.widget.data : null;
    const attendanceData = !isUser && item.widget?.type === 'attendance_card' ? item.widget.data : null;
    const actionCardData = !isUser
      ? (item.pendingConfirmation || (item.widget?.type === 'action_card' ? item.widget.data : null))
      : null;

    const hasWidget = Boolean(
      caisseData || unpaidData || receiptData || financeData || studentData || attendanceData || actionCardData
    );

    return (
      <AnimatedMessageItem key={item.id}>
        <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
        {!isUser && (
          <Image source={HNIA_AVATAR} style={styles.assistantAvatarSmall} />
        )}

        <View
          style={[
            styles.bubbleContainer,
            isUser ? styles.userBubble : styles.assistantBubble,
            hasWidget && { maxWidth: '88%', minWidth: '78%' },
          ]}
        >
          {/* Attached image preview */}
          {item.imageUri && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setFullscreenImageUri(item.imageUri!)}
              style={styles.messageImageWrapper}
            >
              <Image
                source={{ uri: item.imageUri }}
                style={styles.messageImage}
                resizeMode="cover"
              />
              <View style={styles.imageZoomBadge}>
                <Maximize2 size={11} color="#ffffff" />
                <Text style={styles.imageZoomText}>Agrandir</Text>
              </View>
            </TouchableOpacity>
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
            <Text style={styles.userText}>
              {item.content?.includes('[DOCUMENT NUMÉRISÉ REÇU PAR PHOTO]')
                ? '📷 Justificatif / Reçu envoyé'
                : item.content?.replace(/\[IMAGE:https?:\/\/[^\]]+\]\n?/, '').trim() || (item.imageUri ? '📷 Document envoyé' : '')}
            </Text>
          ) : actionCardData && actionCardData.status === 'PENDING' ? (
            <Text style={[styles.normalText, { fontWeight: '600', color: '#0f172a', marginBottom: 4 }]}>
              {item.content && !item.content.includes("Confirmation") && !item.content.includes("❓")
                ? renderFormattedText(item.content)
                : "Veuillez vérifier et confirmer l'action ci-dessous :"}
            </Text>
          ) : caisseData ? (
            (() => {
              const lines = (item.content || '').split('\n').filter((line) => {
                const l = line.toLowerCase();
                return (
                  !l.includes('recettes :') &&
                  !l.includes('recettes (+') &&
                  !l.includes('dépenses :') &&
                  !l.includes('dépenses (-') &&
                  !l.includes('solde net') &&
                  !l.includes('solde physique') &&
                  !l.includes('encaissement') &&
                  !l.includes('sortie')
                );
              });
              const filtered = lines.join('\n').trim();
              const textToRender = filtered || "Point de caisse d'aujourd'hui :";
              return renderFormattedText(textToRender);
            })()
          ) : (
            <View>
              {renderFormattedText(item.content)}
              {item.isStreaming && (
                <Text style={styles.streamingCursor}>▋</Text>
              )}
            </View>
          )}

          {/* Interactive Visual Widgets */}
          {caisseData && (
            <CaisseCardWidget
              data={caisseData}
              onOpenCaisse={() => navigation.navigate('Caisse')}
            />
          )}

          {unpaidData && (
            <UnpaidTuitionWidget
              data={unpaidData}
              onSendBatchReminder={(students) =>
                handleSendMessage(`Envoie un rappel de paiement aux parents des ${students.length} élèves qui ont des impayés.`)
              }
            />
          )}

          {receiptData && (
            <PdfReceiptWidget data={receiptData} />
          )}

          {financeData && (
            <FinanceSummaryWidget
              data={financeData}
              onViewCaisse={() => navigation.navigate('Caisse')}
            />
          )}

          {studentData && (
            <StudentProfileWidget student={studentData} />
          )}

          {attendanceData && (
            <AttendanceSummaryWidget
              data={attendanceData}
              onNotifyParents={() =>
                handleSendMessage("Envoie un rappel d'absence aux parents des élèves absents d'aujourd'hui.")
              }
            />
          )}

          {/* Action Card Widget */}
          {actionCardData && (
            <ActionCardWidget
              card={actionCardData}
              onConfirm={(id) => handleConfirmation(id, 'confirm')}
              onCancel={(id) => handleConfirmation(id, 'cancel')}
              isExecuting={confirmingToolId === actionCardData.toolCallId}
            />
          )}

          {/* Assistant Action Footer: model tag + copy button */}
          {!isUser && item.content ? (
            <View style={styles.assistantFooterRow}>
              <View style={styles.assistantFooterLeft}>
                <View style={styles.assistantFooterDot} />
                <Text style={styles.assistantFooterModel}>Hnia IA</Text>
              </View>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => handleCopyMessage(item.id, item.content)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {copiedMessageId === item.id ? (
                  <>
                    <Check size={11} color="#059669" />
                    <Text style={[styles.copyButtonText, { color: '#059669' }]}>Copié !</Text>
                  </>
                ) : (
                  <>
                    <Copy size={11} color="#64748b" />
                    <Text style={styles.copyButtonText}>Copier</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Follow-up Suggestion Chips (filter out duplicate confirm/cancel) */}
          {!isUser && item.followUpSuggestions && item.followUpSuggestions.length > 0 && (
            (() => {
              const filteredSuggestions = item.followUpSuggestions.filter(
                (sug) =>
                  !item.pendingConfirmation ||
                  (!sug.toLowerCase().includes('confirm') && !sug.toLowerCase().includes('annul'))
              );
              if (filteredSuggestions.length === 0) return null;
              return (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.suggestionsScroll}
                  contentContainerStyle={{ gap: 8, paddingTop: 10 }}
                >
                  {filteredSuggestions.map((sug, sIdx) => (
                    <TouchableOpacity
                      key={sIdx}
                      style={styles.suggestionChip}
                      onPress={() => handleSendMessage(sug)}
                    >
                      <Text style={styles.suggestionChipText}>{sug}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              );
            })()
          )}
        </View>
      </View>
    </AnimatedMessageItem>
  );
  };

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0) }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={Platform.OS === 'android'} />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.historyMenuButton}
            onPress={handleOpenHistoryDrawer}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <History size={20} color="#334155" />
          </TouchableOpacity>
          <View style={styles.headerAvatarContainer}>
            <Image source={HNIA_AVATAR} style={styles.headerAvatar} />
            <View style={[styles.headerAvatarStatusDot, { backgroundColor: agentStatus.dotColor }]} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerTitle}>Hnia</Text>
              <View style={[styles.agentStatusBadge, { backgroundColor: agentStatus.bg }]}>
                <View style={[styles.onlineDot, { backgroundColor: agentStatus.dotColor }]} />
                <Text style={[styles.agentStatusText, { color: agentStatus.textColor }]}>
                  {agentStatus.label}
                </Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Assistante IA • Connectée à {schoolName}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.newChatButton}
          onPress={handleCreateNewThread}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Plus size={19} color="#0055d4" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={{ flex: 1 }}>
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
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.avatarHaloContainer}>
                <View style={styles.avatarHalo}>
                  <Image source={HNIA_AVATAR} style={styles.avatarLarge} />
                </View>
              </View>

              <Text style={styles.welcomeTitle}>
                Bonjour 👋 Je suis <Text style={{ color: '#0055d4' }}>Hnia</Text>
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Je peux gérer votre école avec vous. Parlez-moi ou choisissez une action :
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
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              ListFooterComponent={
                isLoading ? (
                  <View style={styles.liveStepCard}>
                    <Image source={HNIA_AVATAR} style={styles.assistantAvatarSmall} />
                    <View style={styles.liveStepContent}>
                      <View style={styles.liveStepHeader}>
                        <ActivityIndicator size="small" color="#0055d4" style={{ marginRight: 6 }} />
                        <Text style={styles.liveStepTitle}>
                          {activeStatusStep || 'Hnia prépare la réponse...'}
                        </Text>
                      </View>
                      {activeToolName && (
                        <Text style={styles.liveStepToolName}>Outil : {activeToolName}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.stopButtonPill}
                      onPress={handleInterrupt}
                      activeOpacity={0.8}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Square size={10} color="#dc2626" fill="#dc2626" />
                      <Text style={styles.stopButtonText}>Arrêter</Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              }
            />
          )}

          {/* Selected Attachment Thumbnail (ChatGPT clean style - minimal, no text clutter) */}
          {selectedImage && (
            <View style={styles.attachmentPreviewContainer}>
              <View style={styles.attachmentImageWrapper}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setFullscreenImageUri(selectedImage.uri)}
                >
                  <Image source={{ uri: selectedImage.uri }} style={styles.attachmentImageThumb} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedImage(null)}
                  style={styles.attachmentCloseBadge}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={11} color="#ffffff" strokeWidth={2.8} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Selected Attachment Audio Pill (Minimal) */}
          {selectedAudio && (
            <View style={styles.attachmentPreviewContainer}>
              <View style={styles.attachmentAudioPill}>
                <Mic size={15} color="#0055d4" strokeWidth={2.2} />
                <Text style={styles.attachmentAudioText} numberOfLines={1}>
                  {selectedAudio.name || 'Note vocale'}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedAudio(null)}
                  style={styles.attachmentAudioRemoveBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={13} color="#64748b" strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Executive Quick Suggestion Chips (when in chat and no attachment) */}
          {messages.length > 0 && !isRecording && !selectedImage && !selectedAudio && (
            <View style={styles.quickChipsWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.quickChipsContent}
              >
                {EXECUTIVE_QUICK_CHIPS.map((chip, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.quickChipBtn}
                    activeOpacity={0.7}
                    onPress={() => handleSendMessage(chip.prompt)}
                  >
                    <Text style={styles.quickChipText}>{chip.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Bottom Floating Input Bar (ChatGPT Mobile Interface) */}
          <View
            style={[
              styles.bottomBarContainer,
              { paddingBottom: 8 },
            ]}
          >
            {vocalError ? (
              /* ChatGPT-style Vocal Error Pill (Screenshot 4) */
              <View style={styles.errorPillContainer}>
                <TouchableOpacity
                  style={styles.errorDismissBtn}
                  onPress={() => setVocalError(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color="#dc2626" strokeWidth={2.4} />
                </TouchableOpacity>

                <View style={styles.errorTextPill}>
                  <Text style={styles.errorPillText} numberOfLines={1}>
                    {vocalError}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.errorRetryBtn}
                  onPress={() => {
                    setVocalError(null);
                    startAudioRecording();
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <RotateCcw size={18} color="#dc2626" strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
            ) : isRecording ? (
              /* Active Vocal Recording Bar (Screenshot 3 - ChatGPT Live Bar) */
              <View style={styles.recordingPillContainer}>
                <TouchableOpacity
                  style={styles.recordingCancelBtn}
                  onPress={cancelAudioRecording}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color="#64748b" strokeWidth={2.4} />
                </TouchableOpacity>

                <View style={styles.recordingWaveArea}>
                  <View style={[styles.recordingPulseDot, isRecordingPaused && { backgroundColor: '#94a3b8' }]} />
                  <Text style={styles.recordingTimeText}>
                    {formatRecordingTime(recordingDuration)}
                  </Text>

                  {/* Dynamic Sound Wave Bars driven by live amplitude */}
                  <View style={styles.soundWaveContainer}>
                    {bottomBarAnims.map((anim, i) => (
                      <Animated.View
                        key={i}
                        style={[
                          styles.waveBar,
                          {
                            transform: [{ scaleY: isRecordingPaused ? 0.25 : anim }],
                            backgroundColor: isRecordingPaused
                              ? '#94a3b8'
                              : liveAmplitude > 0.08
                              ? '#0055d4'
                              : '#334155',
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>

                {/* Stop / Pause Square Button (■) */}
                {!isRecordingPaused ? (
                  <TouchableOpacity
                    style={styles.recordingStopSquareBtn}
                    onPress={pauseAudioRecording}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  >
                    <Square size={13} color="#ffffff" fill="#ffffff" />
                  </TouchableOpacity>
                ) : null}

                {/* Send Button (⬆) */}
                <TouchableOpacity
                  style={styles.recordingSendBtn}
                  onPress={stopAndSendAudioRecording}
                  activeOpacity={0.8}
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

                  {isLoading ? (
                    /* ChatGPT Stop / Interrupt Button (■) */
                    <TouchableOpacity
                      style={styles.chatGptStopBtn}
                      onPress={handleInterrupt}
                      activeOpacity={0.8}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Square size={13} color="#ffffff" fill="#ffffff" />
                    </TouchableOpacity>
                  ) : Boolean(inputText.trim() || selectedImage || selectedAudio) ? (
                    /* Send Button (Dark Circle) */
                    <TouchableOpacity
                      style={styles.chatGptSendBtn}
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
                        onPress={startAudioRecording}
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
                startAudioRecording();
              }}
            >
              <View style={[styles.chatGptSheetIconBox, { backgroundColor: '#eff6ff' }]}>
                <AudioLines size={22} color="#0055d4" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.chatGptSheetOptionText, { color: '#0055d4' }]}>Mode Vocal Hnia</Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Enregistrement vocal direct en temps réel</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Voice Mode / Legacy APK Guide Modal */}
      <Modal
        visible={apkUpdateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setApkUpdateModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setApkUpdateModalVisible(false)}
        >
          <View style={styles.chatGptSheet}>
            <View style={styles.sheetHandle} />

            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Mic size={28} color="#0055d4" strokeWidth={2.2} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a', textAlign: 'center' }}>
                Dictée Vocale Hnia 🎙️
              </Text>
              <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 19, paddingHorizontal: 16 }}>
                Le nouvel APK avec micro direct est en cours de compilation. En attendant, vous pouvez utiliser votre voix facilement :
              </Text>
            </View>

            <TouchableOpacity
              style={styles.chatGptSheetOption}
              onPress={() => {
                setApkUpdateModalVisible(false);
                inputRef.current?.focus();
              }}
            >
              <View style={[styles.chatGptSheetIconBox, { backgroundColor: '#eff6ff' }]}>
                <Sparkles size={22} color="#0055d4" strokeWidth={2} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }}>
                  Dicter avec le clavier ⌨️
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                  Appuyez sur le micro du clavier pour dicter à voix haute
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chatGptSheetOption}
              onPress={() => {
                setApkUpdateModalVisible(false);
                handlePickAudioFile();
              }}
            >
              <View style={[styles.chatGptSheetIconBox, { backgroundColor: '#f0fdf4' }]}>
                <FolderUp size={22} color="#16a34a" strokeWidth={2} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }}>
                  Joindre une note vocale 📁
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                  Fichier audio WhatsApp ou enregistreur (.m4a, .mp3)
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ paddingVertical: 14, alignItems: 'center', marginTop: 8 }}
              onPress={() => setApkUpdateModalVisible(false)}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#64748b' }}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Fullscreen Image Preview Modal */}
      <Modal
        visible={!!fullscreenImageUri}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setFullscreenImageUri(null)}
      >
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={styles.fullscreenModalContainer}>
          <TouchableOpacity
            style={styles.fullscreenBackdrop}
            activeOpacity={1}
            onPress={() => setFullscreenImageUri(null)}
          >
            <View style={styles.fullscreenHeaderArea}>
              <TouchableOpacity
                style={styles.fullscreenCloseBtn}
                onPress={() => setFullscreenImageUri(null)}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                activeOpacity={0.8}
              >
                <X size={22} color="#ffffff" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
            <View style={styles.fullscreenImageArea}>
              {fullscreenImageUri && (
                <Image
                  source={{ uri: fullscreenImageUri }}
                  style={styles.fullscreenImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Conversation History Drawer Modal (P2) */}
      <Modal
        visible={historyDrawerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHistoryDrawerVisible(false)}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            style={styles.drawerBackdropTouch}
            activeOpacity={1}
            onPress={() => setHistoryDrawerVisible(false)}
          />
          <SafeAreaView style={styles.drawerContainer}>
            <View style={styles.drawerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <History size={22} color="#0055d4" />
                <Text style={styles.drawerTitle}>Discussions</Text>
                {threads.length > 0 && (
                  <View style={styles.threadCountBadge}>
                    <Text style={styles.threadCountText}>{threads.length}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.drawerCloseButton}
                onPress={() => setHistoryDrawerVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.drawerNewChatBtn}
              onPress={handleCreateNewThread}
              activeOpacity={0.85}
            >
              <Plus size={18} color="#ffffff" strokeWidth={2.6} />
              <Text style={styles.drawerNewChatBtnText}>Nouvelle discussion</Text>
            </TouchableOpacity>

            {isLoadingThreads ? (
              <View style={styles.drawerLoading}>
                <ActivityIndicator size="small" color="#0055d4" />
                <Text style={styles.drawerLoadingText}>Chargement des discussions...</Text>
              </View>
            ) : threads.length === 0 ? (
              <View style={styles.drawerEmpty}>
                <MessageSquare size={36} color="#94a3b8" />
                <Text style={styles.drawerEmptyText}>Aucune discussion archivée</Text>
                <Text style={styles.drawerEmptySubtext}>
                  Vos futurs échanges avec Hnia apparaîtront automatiquement ici.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
                showsVerticalScrollIndicator={false}
              >
                {threads.map((thread) => {
                  const isActive = thread.id === conversationId;
                  const dateStr = thread.updatedAt
                    ? new Date(thread.updatedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';

                  return (
                    <TouchableOpacity
                      key={thread.id}
                      style={[styles.threadItem, isActive && styles.threadItemActive]}
                      onPress={() => handleSelectThread(thread.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.threadIconBox, isActive && styles.threadIconBoxActive]}>
                        <MessageSquare size={16} color={isActive ? '#0055d4' : '#64748b'} />
                      </View>
                      <View style={{ flex: 1, marginRight: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text
                            style={[styles.threadTitle, isActive && styles.threadTitleActive]}
                            numberOfLines={1}
                          >
                            {thread.title || 'Discussion avec Hnia'}
                          </Text>
                          {isActive && (
                            <View style={styles.activePill}>
                              <Text style={styles.activePillText}>Actif</Text>
                            </View>
                          )}
                        </View>
                        {thread.lastMessage ? (
                          <Text style={styles.threadSnippet} numberOfLines={1}>
                            {thread.lastMessage}
                          </Text>
                        ) : null}
                        <Text style={styles.threadDate}>{dateStr}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.threadDeleteBtn}
                        onPress={() => handleDeleteThread(thread.id, thread.title || 'Discussion')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={16} color="#94a3b8" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
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
  headerAvatarContainer: {
    position: 'relative',
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#e0edff',
  },
  headerAvatarStatusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  agentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  agentStatusText: {
    fontSize: 11,
    fontWeight: '700',
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
    backgroundColor: '#0055d4',
    borderBottomRightRadius: 4,
    shadowColor: '#0055d4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  assistantBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  userText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
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
  italicText: {
    fontStyle: 'italic',
    color: '#334155',
  },
  codePill: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginHorizontal: 2,
    alignSelf: 'center',
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
  },
  codeTextInline: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: '#0055d4',
    backgroundColor: '#eff6ff',
    fontWeight: '700',
  },
  confirmActionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 6,
  },
  confirmationLineText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 20,
  },
  confirmPromptBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  confirmPromptText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
    lineHeight: 18,
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
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0055d4',
    marginTop: 7,
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

  /* Enhanced Rich Message Components (Header pills, progress bar, insights, metrics) */
  cardHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginVertical: 6,
    gap: 8,
  },
  cardHeaderIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  cardHeaderBadgeTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: '#1e40af',
    letterSpacing: 0.3,
  },
  cardHeaderTag: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardHeaderTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  progressBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },

  datePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  datePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },

  insightCard: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  insightIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369a1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightBody: {
    fontSize: 13,
    color: '#0c4a6e',
    lineHeight: 19,
    fontStyle: 'italic',
  },

  metricCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginVertical: 3,
    gap: 10,
  },
  metricIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricIconText: {
    fontSize: 14,
  },
  metricBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  metricLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  metricValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8,
    marginBottom: 4,
  },

  assistantFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  assistantFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  assistantFooterDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0055d4',
  },
  assistantFooterModel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.3,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  copyButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  messageImageWrapper: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageImage: {
    width: 220,
    height: 150,
    borderRadius: 14,
    backgroundColor: '#0f172a',
  },
  imageZoomBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  imageZoomText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
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

  /* Attachment preview (ChatGPT clean thumbnail style) */
  attachmentPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  attachmentImageWrapper: {
    position: 'relative',
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#0f172a',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  attachmentImageThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  attachmentCloseBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  attachmentAudioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    maxWidth: 240,
  },
  attachmentAudioText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    flexShrink: 1,
  },
  attachmentAudioRemoveBtn: {
    padding: 2,
    marginLeft: 2,
  },

  /* Quick Chips Bar */
  quickChipsWrapper: {
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  quickChipsContent: {
    paddingHorizontal: 14,
    gap: 8,
  },
  quickChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
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

  /* ChatGPT Recording Bar (Screenshot 3) */
  recordingPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 46,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  recordingCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingWaveArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recordingPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  recordingTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginRight: 4,
  },
  soundWaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.2,
    height: 24,
    paddingHorizontal: 4,
  },
  waveBar: {
    width: 2.2,
    height: 22,
    borderRadius: 99,
    backgroundColor: '#334155',
  },
  recordingStopSquareBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  recordingSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb', // ChatGPT blue send circle
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ChatGPT Vocal Error Pill (Screenshot 4) */
  errorPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 4,
  },
  errorDismissBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTextPill: {
    flex: 1,
    height: 44,
    backgroundColor: '#fff1f2',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  errorPillText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '700',
  },
  errorRetryBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ChatGPT Stop Button */
  chatGptStopBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0f172a',
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

  /* Fullscreen Image Modal */
  fullscreenModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullscreenBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenHeaderArea: {
    position: 'absolute',
    top: Platform.OS === 'android' ? Math.max(StatusBar.currentHeight || 0, 32) + 24 : 64,
    right: 20,
    zIndex: 99,
  },
  fullscreenCloseBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(30, 41, 59, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  fullscreenImageArea: {
    width: '100%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },

  historyMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },

  /* Live Tool Steps (P1) */
  liveStepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 4,
    gap: 10,
  },
  liveStepContent: {
    flex: 1,
  },
  liveStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveStepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  liveStepToolName: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  stopButtonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stopButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
  streamingCursor: {
    fontSize: 15,
    color: '#0055d4',
    fontWeight: '900',
    marginLeft: 2,
  },

  /* Multi-Thread Drawer Modal (P2) */
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  drawerBackdropTouch: {
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
    shadowRadius: 12,
    elevation: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  drawerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
  },
  threadCountBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  threadCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0055d4',
  },
  drawerCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerNewChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0055d4',
    marginHorizontal: 16,
    marginVertical: 14,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#0055d4',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  drawerNewChatBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  drawerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  drawerLoadingText: {
    fontSize: 13,
    color: '#64748b',
  },
  drawerEmpty: {
    paddingVertical: 50,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
  },
  drawerEmptyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  drawerEmptySubtext: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  threadItemActive: {
    backgroundColor: '#f0f7ff',
    borderColor: '#bfdbfe',
  },
  threadIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  threadIconBoxActive: {
    backgroundColor: '#dbeafe',
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
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0055d4',
  },
  threadSnippet: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  threadDate: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 3,
  },
  threadDeleteBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
