import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  FlatList,
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
  Linking,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Reanimated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import {
  History,
  Plus,
  X,
  Square,
  Sparkles,
  RotateCcw,
  MoreHorizontal,
  Search,
  Languages,
  ChevronDown,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useQueryClient } from '@tanstack/react-query';

import { adminService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import { useLanguage } from '../../context/LanguageContext';

import { hniaText, contextualPrompts, localizedProgress, HniaLanguage } from './hniaExperience';
import { replaceInterruptedReply } from './interruptedReply';
import { getAccountChatCache, chatStorageKeys } from './chatCache';
import { submitActionDecision, applyActionDecision } from './actionConfirmation';
import HniaEmptyState from './components/HniaEmptyState';
import HniaHistoryDrawer, { ConversationThread } from './components/HniaHistoryDrawer';
import HniaComposer from './components/HniaComposer';
import HniaActivity from './components/HniaActivity';
import HniaMessageBubble, { ChatMessage } from './components/HniaMessageBubble';
import { tryParseActionCardWidget, ActionCardField, ActionCardData } from './HniaWidgets';

const HNIA_AVATAR = require('../../../assets/hnia/hnia_mascot_icon.png');

// In-Memory Fast Cache: preserves messages and active thread across tab switches
// Ensures instant 0ms mount with ZERO loading spinner

function copyToClipboard(text: string): Promise<void> {
  try {
    const { requireOptionalNativeModule } = require('expo-modules-core');
    if (requireOptionalNativeModule('ExpoClipboard')) {
      const Clipboard = require('expo-clipboard');
      return Clipboard.setStringAsync(text);
    }
  } catch {}
  try {
    const { Clipboard } = require('react-native');
    if (Clipboard?.setString) {
      Clipboard.setString(text);
    }
  } catch {}
  return Promise.resolve();
}

function getNativeAudioModule(): any {
  try {
    const { requireOptionalNativeModule } = require('expo-modules-core');
    if (!requireOptionalNativeModule('ExponentAV')) return null;
    return require('expo-av').Audio;
  } catch {
    return null;
  }
}

async function readAudioAsBase64(uri: string): Promise<string> {
  try {
    const data = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
    });
    console.log('[Audio] Successfully read audio base64, chars:', data?.length);
    return data;
  } catch (legacyErr) {
    try {
      const { File } = require('expo-file-system');
      const file = new File(uri);
      const data = await file.base64();
      console.log('[Audio] Successfully read via new File base64, chars:', data?.length);
      return data;
    } catch (newErr) {
      console.error('[HniaChat] Audio base64 conversion failed:', legacyErr, newErr);
      throw legacyErr;
    }
  }
}

export default function HniaChatScreen() {
  const userId = useAppStore(state => state.userId);
  return <HniaChatForAccount key={userId || 'signed-out'} userId={userId || 'signed-out'} />;
}

function HniaChatForAccount({ userId }: { userId: string }) {
  const cache = getAccountChatCache(userId);
  const keys = chatStorageKeys(userId);
  const HNIA_STORAGE_KEY = keys.messages;
  const HNIA_CONV_STORAGE_KEY = keys.conversation;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const schoolName = useAppStore((s) => s.schoolName) || 'SnapSchool';
  const { t, language: appLanguage } = useLanguage();
  const [language, setChatLanguage] = useState<HniaLanguage>(appLanguage as HniaLanguage);
  const isRTL = language === 'ar';
  const tx = (fr: string, en: string, ar: string) => hniaText(language, fr, en, ar);
  const chatFailureCopy = (error?: string) => {
    const value = String(error || '');
    if (/plusieurs demandes|too many|rate.?limit|trop de requêtes/i.test(value)) {
      return tx(
        'Hnia reçoit plusieurs demandes. Patientez quelques secondes avant de continuer.',
        'Hnia is handling several requests. Wait a few seconds before continuing.',
        'هنية تعالج في برشة طلبات. استنى ثواني وبعد كمّل.'
      );
    }
    if (/temporaire|generation|modèle|model|quota|capacity|unavailable/i.test(value)) {
      return tx(
        'Hnia n’a pas pu terminer cette réponse. Vos données et vos actions restent inchangées.',
        'Hnia could not finish this answer. Your data and actions are unchanged.',
        'هنية ما نجمتش تكمّل الإجابة. معطياتك والعمليات ما تبدّل منهم شيء.'
      );
    }
    if (/HTTP 401|session|unauthorized/i.test(value)) {
      return tx(
        'Votre session doit être renouvelée pour continuer.',
        'Your session needs to be renewed before continuing.',
        'يلزم تجدّد الدخول باش تكمّل.'
      );
    }
    return tx(
      'La connexion a été perdue avant la fin de la réponse.',
      'I lost the connection before completing the answer.',
      'تقصّت الكونكسيون قبل ما نكمّل الإجابة.'
    );
  };
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[] | null>(null);
  const [voiceReview, setVoiceReview] = useState(false);
  const [recentClass, setRecentClass] = useState<string | undefined>();
  const classUsageRef = useRef<Record<string, number>>({});
  const newConversationRef = useRef(false);
  const historyRequestRef = useRef(0);
  const lastToolRef = useRef<string | undefined>(undefined);
  const [visibleDate, setVisibleDate] = useState<string | null>(null);

  // Chat State — initialized instantly from in-memory cache (0ms mount, zero spinner)
  const [messages, setMessages] = useState<ChatMessage[]>(() => cache.messages);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(() => cache.messages.length === 0);
  const [conversationId, setConversationId] = useState<string | undefined>(() => cache.conversationId);
  const [activeStatusStep, setActiveStatusStep] = useState<string | null>(null);

  // History Drawer State
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);

  // Staged Attachments
  const [stagedImage, setStagedImage] = useState<{ uri: string; base64: string; mimeType: string } | null>(null);
  const [stagedAudio, setStagedAudio] = useState<{ uri: string; base64: string; name: string } | null>(null);
  const [fullscreenImageUri, setFullscreenImageUri] = useState<string | null>(null);

  // Actions & Copy Feedback
  const [confirmingToolId, setConfirmingToolId] = useState<string | null>(null);
  const confirmingActionRef = useRef(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [vocalError, setVocalError] = useState<string | null>(null);
  const [liveAmplitude, setLiveAmplitude] = useState<number>(0);
  const smoothedAmplitudeRef = useRef<number>(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSendingRef = useRef(false);

  // 20 Sound wave bars for recording visualization
  const bottomBarAnims = useRef<Animated.Value[]>(
    Array.from({ length: 20 }, () => new Animated.Value(0.18))
  ).current;

  const flatListRef = useRef<FlatList>(null);
  const isInitialLoadRef = useRef(true);
  const lastScrollTimeRef = useRef(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const userIsDraggingRef = useRef(false);
  const tokenFlushTimerRef = useRef<any>(null);
  const streamingTextRef = useRef('');

  // Keyboard state
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const isNearBottomRef = useRef(true);

  // Reanimated native keyboard tracking:
  // Dynamically lifts content above the keyboard on both iOS and Android (edge-to-edge aware)
  const keyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
    isNavigationBarTranslucentAndroid: true,
  });
  const animatedKeyboardStyle = useAnimatedStyle(() => {
    const anim = keyboard.height.value;
    const fallback = isKeyboardVisible ? keyboardHeight : 0;
    const effectiveHeight = anim > 0 ? anim : fallback;
    return {
      paddingBottom: effectiveHeight,
    };
  }, [isKeyboardVisible, keyboardHeight]);

  // Agent Status in Header
  const hasPendingAction = messages.some((m) => {
    if (!m.pendingConfirmation) return false;
    if (Array.isArray(m.pendingConfirmation)) {
      return m.pendingConfirmation.some((c: any) => c.status === 'PENDING');
    }
    return m.pendingConfirmation.status === 'PENDING';
  });
  const agentStatus = hasPendingAction && !isLoading
    ? {
        label: language === 'ar' ? 'إجراء مطلوب' : language === 'en' ? 'Action Required' : 'Action requise',
        dotColor: '#f59e0b',
        textColor: '#b45309',
        bg: '#fef3c7',
      }
    : isLoading
    ? {
        label: tx('Recherche…', 'Searching…', 'نبحث…'),
        dotColor: '#2563eb',
        textColor: '#1d4ed8',
        bg: '#eff6ff',
      }
    : {
        label: tx('Prête', 'Ready', 'حاضرة'),
        dotColor: '#10b981',
        textColor: '#059669',
        bg: '#ecfdf5',
      };

  const QUICK_CHIPS = contextualPrompts(language, new Date().getHours(), recentClass);
  const displayedMessages = useMemo(() => searchText.trim() && searchResults ? [...searchResults].reverse() : [...messages].reverse().filter(message => !searchText.trim() || message.content.toLocaleLowerCase().includes(searchText.trim().toLocaleLowerCase())), [messages, searchText, searchResults]);
  useEffect(() => {
    setSearchResults(null);
    if (!searchText.trim() || !conversationId) return;
    let active = true;
    const timer = setTimeout(() => { adminService.searchChatHistory(conversationId, searchText).then(result => { if (active && result?.success) setSearchResults(result.messages || []); }).catch(() => null); }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [conversationId, searchText]);
  const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString(language === 'ar' ? 'ar-TN' : language === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long' }) : '';
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const first = viewableItems.find((item: any) => item.isViewable && item.item?.createdAt);
    if (first) setVisibleDate(first.item.createdAt);
  }).current;
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(`hnia_language_${userId}_${conversationId || 'new'}`).then(value => { if (live) setChatLanguage((['fr', 'en', 'ar'].includes(value || '') ? value : appLanguage) as HniaLanguage); }).catch(() => null);
    return () => { live = false; };
  }, [userId, conversationId]);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(`hnia_class_usage_${userId}_${schoolName}`).then(value => {
      if (!active || !value) return;
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
      classUsageRef.current = Object.fromEntries(Object.entries(parsed).filter(([, count]) => typeof count === 'number' && Number.isFinite(count) && count > 0).map(([name, count]) => [name, Number(count)]));
      const mostUsed = Object.entries(classUsageRef.current).sort((a, b) => b[1] - a[1])[0];
      if (mostUsed) setRecentClass(mostUsed[0]);
    }).catch(() => null);
    return () => { active = false; };
  }, [userId, schoolName]);
  const chooseLanguage = (next: HniaLanguage) => { setChatLanguage(next); AsyncStorage.setItem(`hnia_language_${userId}_${conversationId || 'new'}`, next).catch(() => null); };


  // Cleanup audio recording on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        try {
          recordingRef.current.stopAndUnloadAsync();
        } catch {}
      }
      if (tokenFlushTimerRef.current) {
        clearTimeout(tokenFlushTimerRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  // Keyboard listeners - tracks keyboard visibility without jittering or forcing scroll
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true);
      const kh = e?.endCoordinates?.height || 0;
      setKeyboardHeight(kh);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    const blurSub = navigation.addListener('blur', () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      blurSub();
    };
  }, [navigation]);

  // With inverted FlatList, new messages auto-appear at the top (visual bottom)
  // No manual scrollToEnd needed

  // Audio recording timer
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

  // Local AsyncStorage sync & In-Memory Fast Cache
  const saveMessagesToLocal = useCallback(async (msgs: ChatMessage[], convId?: string) => {
    try {
      if (msgs && msgs.length > 0) {
        cache.messages = msgs.slice(-50);
        await AsyncStorage.setItem(HNIA_STORAGE_KEY, JSON.stringify(msgs.slice(-80)));
      }
      if (convId) {
        cache.conversationId = convId;
        await AsyncStorage.setItem(HNIA_CONV_STORAGE_KEY, convId);
      }
    } catch (e) {
      console.warn('[HniaChat] Local save error:', e);
    }
  }, [cache, HNIA_STORAGE_KEY, HNIA_CONV_STORAGE_KEY]);

  // Initial load: instant in-memory first, then AsyncStorage fallback, then silent server sync
  useEffect(() => {
    let isMounted = true;
    (async () => {
      let foundConvId: string | undefined = cache.conversationId || undefined;
      // If in-memory cache was empty on cold start, hydrate from AsyncStorage
      if (cache.messages.length === 0) {
        try {
          const [cachedRaw, cachedConvId] = await Promise.all([
            AsyncStorage.getItem(HNIA_STORAGE_KEY),
            AsyncStorage.getItem(HNIA_CONV_STORAGE_KEY),
          ]);
          if (!isMounted) return;
          if (cachedConvId) {
            setConversationId(cachedConvId);
            cache.conversationId = cachedConvId;
            foundConvId = cachedConvId;
          }
          if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              cache.messages = parsed.slice(-50);
              setMessages(parsed);
              setIsInitializing(false);
            }
          }
        } catch (cacheErr) {
          console.warn('[HniaChat] Read cache error:', cacheErr);
        }
      } else {
        // Fast path: in-memory cache already present, ensure zero spinner
        setIsInitializing(false);
      }
      if (isMounted) {
        setIsInitializing(false);
        await loadChatHistory(foundConvId || undefined);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadChatHistory = async (overrideConvId?: string) => {
    const requestId = ++historyRequestRef.current;
    const idToUse = overrideConvId || conversationId;
    try {
      const res = await adminService.fetchChatHistory(idToUse);
      if (requestId !== historyRequestRef.current || isSendingRef.current) return;
      if (res && res.success) {
        if (res.conversationId) {
          setConversationId(res.conversationId);
          AsyncStorage.setItem(HNIA_CONV_STORAGE_KEY, res.conversationId).catch(() => null);
        }
        if (Array.isArray(res.messages)) {
          const pendingList: any[] = Array.isArray(res.pendingConfirmations) ? res.pendingConfirmations : [];
          const usedPendingIds = new Set<string>();

          const loaded: ChatMessage[] = res.messages.map((m: any, mIdx: number) => {
            let content = m.content || '';
            let imageUri = m.imageUri;

            // Extract image tag
            const imgMatch = content.match(/\[IMAGE:(https?:\/\/[^\]]+)\]/);
            if (imgMatch) {
              imageUri = imgMatch[1];
              content = content.replace(/\[IMAGE:https?:\/\/[^\]]+\]\n?/, '').trim();
            }

            // Match pendingConfirmation only if the message is genuinely an action confirmation prompt
            let pendingConfirmation = m.pendingConfirmation || null;
            if (pendingConfirmation?.toolCallId) {
              usedPendingIds.add(pendingConfirmation.toolCallId);
            }
            if (!pendingConfirmation && m.role === 'assistant') {
              const parsedCard = tryParseActionCardWidget(content);
              const isConfirmationPrompt =
                Boolean(parsedCard) ||
                content.includes('❓') ||
                /confirmer/i.test(content) ||
                /vérifier/i.test(content) ||
                content.toLowerCase().includes('souhaitez-vous');

              if (isConfirmationPrompt) {
                const matchedPending = pendingList.find(
                  (tc: any) =>
                    !usedPendingIds.has(tc.toolCallId) &&
                    (!tc.toolName || content.toLowerCase().includes(tc.toolName.replace(/_/g, ' ')))
                ) || pendingList.find((tc: any) => !usedPendingIds.has(tc.toolCallId));

                if (matchedPending) {
                  usedPendingIds.add(matchedPending.toolCallId);
                  const fullParsed = tryParseActionCardWidget(content, matchedPending.toolCallId);

                  const args = matchedPending.arguments || {};
                  const argFields: ActionCardField[] = [];
                  if (matchedPending.toolName === 'add_expense' || /dépense|expense/i.test(matchedPending.toolName || '')) {
                    if (args.amount !== undefined) argFields.push({ label: 'Montant', value: `${args.amount} DT` });
                    if (args.title || args.description) argFields.push({ label: 'Description', value: String(args.title || args.description) });
                    if (args.category) argFields.push({ label: 'Catégorie', value: String(args.category) });
                    if (args.date) argFields.push({ label: 'Date', value: String(args.date) });
                  } else if (matchedPending.toolName?.includes('payment')) {
                    if (args.amount !== undefined) argFields.push({ label: 'Montant', value: `${args.amount} DT` });
                    if (args.studentNameOrId || args.parentNameOrId) argFields.push({ label: 'Bénéficiaire', value: String(args.studentNameOrId || args.parentNameOrId) });
                    if (args.feePeriod) argFields.push({ label: 'Période', value: String(args.feePeriod) });
                    if (args.paymentMethod) argFields.push({ label: 'Règlement', value: String(args.paymentMethod) });
                  } else {
                    Object.entries(args)
                      .filter(([k]) => !k.startsWith('_') && k !== 'schoolId' && k !== 'adminId')
                      .forEach(([k, v]) => {
                        argFields.push({
                          label: k.charAt(0).toUpperCase() + k.slice(1),
                          value: String(v) + (k.toLowerCase().includes('amount') ? ' DT' : ''),
                        });
                      });
                  }

                  if (matchedPending.actionTitle) {
                    pendingConfirmation = matchedPending;
                  } else if (fullParsed) {
                    pendingConfirmation = {
                      ...fullParsed,
                      toolCallId: matchedPending.toolCallId,
                      arguments: matchedPending.arguments,
                      fields: fullParsed.fields && fullParsed.fields.length > 0 ? fullParsed.fields : argFields,
                    };
                  } else {
                    pendingConfirmation = {
                      toolCallId: matchedPending.toolCallId,
                      toolName: matchedPending.toolName,
                      actionTitle:
                        matchedPending.toolName === 'add_expense'
                          ? 'Ajouter une dépense'
                          : matchedPending.toolName?.includes('payment')
                          ? 'Encaisser un paiement'
                          : matchedPending.toolName === 'create_student'
                          ? 'Inscrire un élève'
                          : 'Action en attente',
                      actionType:
                        matchedPending.toolName === 'add_expense'
                          ? 'expense'
                          : matchedPending.toolName?.includes('payment')
                          ? 'payment'
                          : matchedPending.toolName === 'create_student'
                          ? 'student'
                          : 'generic',
                      confirmText: 'Confirmer l’action ?',
                      fields: argFields,
                      status: 'PENDING',
                      arguments: matchedPending.arguments,
                    };
                  }
                }
              }
            }

            return {
              id: m.id,
              role: m.role,
              content,
              imageUri,
              widget: m.widget || null,
              evidence: m.evidence || null,
              pendingConfirmation,
              createdAt: m.createdAt,
            };
          });

          // Keep pending cards visible even if their original summary was outside this history page.
          pendingList.filter((card: any) => !usedPendingIds.has(card.toolCallId)).forEach((card: any) => {
            loaded.push({ id: `action_${card.toolCallId}`, role: 'assistant', content: '', pendingConfirmation: card, createdAt: new Date().toISOString() });
          });
          setMessages(loaded);
          saveMessagesToLocal(loaded, res.conversationId);
          isInitialLoadRef.current = false;
        }
      }
    } catch (err) {
      console.warn('[HniaChat] Load history error:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  // Load threads for History Drawer
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

    newConversationRef.current = false;
    setSearchText('');
    setVisibleDate(null);
    cache.conversationId = threadId;
    cache.messages = [];
    setIsLoading(true);
    setMessages([]);
    isInitialLoadRef.current = true;
    try {
      await loadChatHistory(threadId);
    } finally {
      setIsLoading(false);
      // Inverted FlatList auto-shows latest messages
    }
  };

  const handleCreateNewThread = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setHistoryDrawerVisible(false);
    historyRequestRef.current++;
    newConversationRef.current = true;
    setSearchText('');
    setSearchVisible(false);
    setVoiceReview(false);
    setLastFailedMessage(null);
    setVisibleDate(null);
    cache.messages = [];
    cache.conversationId = undefined;
    setMessages([]);
    setConversationId(undefined);
    setStagedImage(null);
    setStagedAudio(null);
    setInputText('');
    await AsyncStorage.removeItem(HNIA_STORAGE_KEY).catch(() => null);
    await AsyncStorage.removeItem(HNIA_CONV_STORAGE_KEY).catch(() => null);
  };

  const handleDeleteThread = (threadId: string, threadTitle: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      language === 'ar' ? 'حذف المحادثة' : language === 'en' ? 'Delete Conversation' : 'Supprimer la discussion',
      language === 'ar'
        ? `هل تريد حقاً حذف "${threadTitle}" ؟`
        : language === 'en'
        ? `Are you sure you want to delete "${threadTitle}"?`
        : `Voulez-vous supprimer définitivement "${threadTitle}" ?`,
      [
        {
          text: language === 'ar' ? 'إلغاء' : language === 'en' ? 'Cancel' : 'Annuler',
          style: 'cancel',
        },
        {
          text: language === 'ar' ? 'حذف' : language === 'en' ? 'Delete' : 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteThread(threadId);
              setThreads((prev) => prev.filter((t) => t.id !== threadId));
              if (threadId === conversationId) {
                handleCreateNewThread();
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err) {
              console.warn('[HniaChat] Delete thread error:', err);
            }
          },
        },
      ]
    );
  };

  const handleRenameThread = async (threadId: string, newTitle: string) => {
    await adminService.renameThread(threadId, newTitle);
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, title: newTitle } : t))
    );
  };

  // Image Manipulation & Picker
  const processAndSetImage = async (uri: string) => {
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (manipulated.base64) {
        setStagedImage({
          uri: manipulated.uri,
          base64: manipulated.base64,
          mimeType: 'image/jpeg',
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.warn('[HniaChat] Image manipulation error:', e);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          language === 'ar' ? 'الإذن مطلوب' : language === 'en' ? 'Permission Required' : 'Permission requise',
          language === 'ar'
            ? 'يرجى السماح بالوصول إلى الكاميرا.'
            : language === 'en'
            ? 'Please grant camera access.'
            : 'Veuillez autoriser l’accès à la caméra.'
        );
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

  const handlePickImage = async () => {
    try {
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

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.mimeType?.startsWith('image/')) {
          await processAndSetImage(asset.uri);
        } else {
          Alert.alert(
            'Document prêt',
            `Fichier : ${asset.name}\nPosez votre question à Hnia concernant ce document.`
          );
        }
      }
    } catch (err) {
      console.warn('[PickDoc] Error:', err);
    }
  };

  const handlePickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const base64 = await readAudioAsBase64(asset.uri);
        if (base64) {
          setStagedAudio({
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

  // Audio Recording Handlers
  const handleAudioMetering = (meteringDb: number) => {
    const minDb = -52;
    const maxDb = -4;
    let raw = 0;
    if (meteringDb > minDb) {
      raw = Math.min(1, Math.max(0, (meteringDb - minDb) / (maxDb - minDb)));
      raw = Math.pow(raw, 1.25);
    }
    const prev = smoothedAmplitudeRef.current;
    const smoothed = raw > prev ? prev + 0.45 * (raw - prev) : prev + 0.12 * (raw - prev);
    smoothedAmplitudeRef.current = smoothed;
    setLiveAmplitude(smoothed);

    const count = bottomBarAnims.length;
    const mid = (count - 1) / 2;
    bottomBarAnims.forEach((anim, i) => {
      const dist = Math.abs(i - mid) / mid;
      const weight = 0.35 + 0.65 * Math.cos((dist * Math.PI) / 2);
      const target = Math.max(0.14, smoothed * weight * 2.5);
      Animated.spring(anim, {
        toValue: target,
        friction: 7,
        tension: 110,
        useNativeDriver: true,
      }).start();
    });
  };

  const startAudioRecording = async () => {
    // Immediate tactile feedback on touch
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setVocalError(null);

    const Audio = getNativeAudioModule();
    if (!Audio) {
      setVocalError(
        language === 'ar'
          ? 'وحدة الصوت غير متوفرة'
          : language === 'en'
          ? 'Audio module unavailable'
          : 'Module audio indisponible'
      );
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setVocalError(
          language === 'ar'
            ? 'إذن الميكروفون مطلوب'
            : language === 'en'
            ? 'Microphone permission required'
            : 'Permission microphone requise'
        );
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
      // High-compatibility speech audio profile (44.1kHz / 128kbps mono AAC):
      // Full compatibility with Android hardware encoders (Samsung, Xiaomi...) & high acoustic clarity
      await recording.prepareToRecordAsync({
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 24000,
          numberOfChannels: 1,
          bitRate: 48000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MEDIUM,
          sampleRate: 24000,
          numberOfChannels: 1,
          bitRate: 48000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 64000,
        },
      });

      recording.setProgressUpdateInterval(120);
      recording.setOnRecordingStatusUpdate((status: any) => {
        if (status.isRecording && typeof status.metering === 'number') {
          handleAudioMetering(status.metering);
        }
      });
      await recording.startAsync();
      recordingRef.current = recording;

      // Tactile confirmation that recording is rolling
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setIsRecording(true);
      setIsRecordingPaused(false);
      setRecordingDuration(0);
    } catch (err: any) {
      console.warn('[Audio] Start error:', err);
      setVocalError('Impossible d’activer le microphone');
    }
  };

  const pauseAudioRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRecordingPaused(true);
    setLiveAmplitude(0);
    smoothedAmplitudeRef.current = 0;
    if (recordingRef.current) {
      try {
        await recordingRef.current.pauseAsync();
      } catch {}
    }
  };

  const stopAndSendAudioRecording = async () => {
    // Immediate crisp stop haptic
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const elapsedMs = Date.now() - recordingStartTimeRef.current;
    const duration = recordingDuration;
    setIsRecording(false);
    setIsRecordingPaused(false);
    setRecordingDuration(0);

    const recording = recordingRef.current;
    recordingRef.current = null;

    if (recording) {
      try {
        const uri = recording.getURI();
        await recording.stopAndUnloadAsync();
        const Audio = getNativeAudioModule();
        if (Audio) {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
          }).catch(() => null);
        }

        if (uri && (elapsedMs >= 400 || duration >= 1)) {
          const base64 = await readAudioAsBase64(uri);
          if (base64 && base64.length > 50) {
            console.log(`[Audio] Sending voice note: duration=${duration}s, size=${base64.length} chars`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            handleSendMessage(undefined, base64, 'audio/mp4');
            return;
          } else {
            console.warn('[Audio] Audio base64 was empty or too small');
            setVocalError('Message vocal vide');
            return;
          }
        }
      } catch (err: any) {
        console.warn('[Audio] Stop error:', err);
        setVocalError('Enregistrement audio illisible');
        return;
      }
    }

    if (elapsedMs < 400 && duration < 1) {
      setVocalError('Message trop court : maintenez pour dicter');
    }
  };

  const cancelAudioRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRecording(false);
    setIsRecordingPaused(false);
    setRecordingDuration(0);
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch {}
    }
  };

  const handleInterrupt = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (tokenFlushTimerRef.current) {
      clearTimeout(tokenFlushTimerRef.current);
      tokenFlushTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages(prev => prev.map(m => 
      m.isStreaming ? { ...m, isStreaming: false, content: streamingTextRef.current || m.content } : m
    ));
    setIsLoading(false);
    setActiveStatusStep(null);
  };

  // Send Message with SSE streaming
  const aiConsent = useRef(false);
  const handleSendMessage = async (
    textToSend?: string,
    directAudioBase64?: string,
    directAudioMime?: string,
    refresh?: { readId: string; messageId: string; nextPage?: boolean }
  ) => {
    const rawText = (textToSend ?? inputText).trim();
    if (!rawText && !stagedImage && !stagedAudio && !directAudioBase64) return;
    if (!aiConsent.current) {
      Alert.alert('Hnia IA', language === 'ar' ? 'ستُرسل رسائلك والصور والتسجيلات التي تختارها إلى خدمة الذكاء الاصطناعي لمعالجتها. تجنب البيانات غير الضرورية وتحقق من الإجابات قبل تنفيذ القرارات.' : language === 'fr' ? 'Vos messages et les photos ou enregistrements choisis seront transmis au service d’intelligence artificielle. Évitez les données inutiles et vérifiez les réponses avant toute décision.' : 'Your messages and selected photos or recordings will be sent to the AI service. Avoid unnecessary personal data and verify responses before acting.', [
        { text: language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        { text: language === 'ar' ? 'متابعة' : language === 'fr' ? 'Continuer' : 'Continue', onPress: () => { aiConsent.current = true; void handleSendMessage(textToSend, directAudioBase64, directAudioMime); } }
      ]);
      return;
    }
    if (isSendingRef.current) return; // Prevent double-send on rapid tap
    isSendingRef.current = true;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLastFailedMessage(null);
    historyRequestRef.current++;
    lastToolRef.current = undefined;
    if (directAudioBase64 || stagedAudio) {
      setIsLoading(true);
      setActiveStatusStep(tx('Compréhension du vocal…', 'Understanding your voice…', 'نفهم في التسجيل…'));
      const controller = new AbortController();
      abortControllerRef.current = controller;
      try {
        const result = await adminService.transcribeHniaAudio(directAudioBase64 || stagedAudio!.base64, directAudioMime || 'audio/mp4', controller.signal);
        if (!controller.signal.aborted) {
          if (!result?.success || !result.transcription) throw new Error('NO_SPEECH');
          setInputText(result.transcription);
          setVoiceReview(true);
          setStagedAudio(null);
        }
      } catch (error) { if (!controller.signal.aborted) setVocalError(tx('Vocal non compris. Réessayez.', 'Could not understand the recording. Try again.', 'ما فهمتش التسجيل. عاود جرّب.')); }
      finally { setIsLoading(false); setActiveStatusStep(null); abortControllerRef.current = null; isSendingRef.current = false; }
      return;
    }
    setVoiceReview(false);

    const userMsgId = `user_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content:
        rawText ||
        (directAudioBase64
          ? '🎙️ Transcription en cours...'
          : stagedImage
          ? '📷 Document envoyé'
          : ''),
      imageUri: stagedImage?.uri,
      isVoice: Boolean(stagedAudio || directAudioBase64),
      createdAt: new Date().toISOString(),
    };

    if (!refresh) {
      setMessages((prev) => [...prev, userMsg]);
      saveMessagesToLocal([...messages, userMsg], conversationId);
    }

    // Inverted FlatList auto-shows new messages at visual bottom

    setInputText('');
    const imagePayload = stagedImage;
    setStagedImage(null);
    setStagedAudio(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);
    setActiveStatusStep(
      directAudioBase64
        ? 'Transcription du message vocal...'
        : imagePayload
        ? 'Analyse du document...'
        : 'Analyse de la demande...'
    );

    const botMsgId = refresh?.messageId || `bot_${Date.now()}`;
    let accumulatedText = '';
    let isStreamStarted = false;
    let isDoneTriggered = false;
    let receivedWidget: any = null;
    let receivedConfirmation: any = null;

    try {
      const payload: any = {
        message: rawText,
        conversationId,
        newConversation: newConversationRef.current,
        language,
        ...(refresh ? { refreshReadId: refresh.readId, nextReadPage: refresh.nextPage === true } : {}),
      };

      if (imagePayload) {
        payload.imageBase64 = imagePayload.base64;
        payload.imageMimeType = imagePayload.mimeType;
      }

      if (directAudioBase64) {
        payload.audioBase64 = directAudioBase64;
        payload.audioMimeType = directAudioMime || 'audio/mp4';
      }

      const res = await adminService.streamMessage(
        payload,
        {
          onStatus: (status) => {
            if (controller.signal.aborted) return;
            // Clean status step without exposing raw tool names
            lastToolRef.current = status.tool || lastToolRef.current;
            setActiveStatusStep(localizedProgress(status.step, status.tool, language));
          },
          onTranscription: (transcription) => {
            if (controller.signal.aborted || !transcription) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === userMsg.id
                  ? {
                      ...m,
                      content: `🎙️ "${transcription}"`,
                      transcription,
                    }
                  : m
              )
            );
            setActiveStatusStep('Hnia prépare votre réponse...');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
          onToken: (delta) => {
            if (controller.signal.aborted) return;
            accumulatedText += delta;
            streamingTextRef.current = accumulatedText;

            // Update the bot message in the FlatList so streaming text renders live
            if (!isStreamStarted) {
              isStreamStarted = true;
              setActiveStatusStep(null);
              setMessages((prev) => [
                ...prev,
                {
                  id: botMsgId,
                  role: 'assistant' as const,
                  content: accumulatedText,
                  isStreaming: true,
                  createdAt: new Date().toISOString(),
                },
              ]);
            } else {
              // Throttle updates to ~60ms to avoid excessive re-renders
              if (tokenFlushTimerRef.current) return;
              tokenFlushTimerRef.current = setTimeout(() => {
                tokenFlushTimerRef.current = null;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botMsgId
                      ? { ...m, content: streamingTextRef.current }
                      : m
                  )
                );
              }, 60);
            }
          },
          onWidget: (widget) => {
            if (controller.signal.aborted) return;
            receivedWidget = widget;
            setMessages((prev) =>
              prev.map((m) => (m.id === botMsgId ? { ...m, widget } : m))
            );
          },
          onConfirmation: (pendingConfirmation) => {
            if (controller.signal.aborted) return;
            if (tokenFlushTimerRef.current) {
              clearTimeout(tokenFlushTimerRef.current);
              tokenFlushTimerRef.current = null;
            }
            isStreamStarted = true;
            receivedConfirmation = pendingConfirmation;
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === botMsgId);
              if (exists) {
                return prev.map((m) =>
                  m.id === botMsgId ? { ...m, pendingConfirmation, content: streamingTextRef.current || m.content } : m
                );
              }
              return [
                ...prev,
                {
                  id: botMsgId,
                  role: 'assistant',
                  content: accumulatedText || 'Vérification requise pour cette action :',
                  isStreaming: false,
                  pendingConfirmation,
                  createdAt: new Date().toISOString(),
                },
              ];
            });
          },
          onDone: (result) => {
            if (controller.signal.aborted) return;
            if (tokenFlushTimerRef.current) {
              clearTimeout(tokenFlushTimerRef.current);
              tokenFlushTimerRef.current = null;
            }
            isDoneTriggered = true;
            isStreamStarted = true;
            setActiveStatusStep(null);

            const nextConvId = result?.conversationId || conversationId;
            newConversationRef.current = false;
            if (nextConvId) AsyncStorage.setItem(`hnia_language_${userId}_${nextConvId}`, language).catch(() => null);
            const classFilter = result?.evidence?.filters?.className;
            if (classFilter) {
              const usage: Record<string, number> = { ...classUsageRef.current, [String(classFilter)]: (Number(classUsageRef.current[String(classFilter)]) || 0) + 1 };
              const ranked = Object.entries(usage).sort((a, b) => b[1] - a[1]).slice(0, 20);
              classUsageRef.current = Object.fromEntries(ranked);
              setRecentClass(ranked[0][0]);
              AsyncStorage.setItem(`hnia_class_usage_${userId}_${schoolName}`, JSON.stringify(classUsageRef.current)).catch(() => null);
            }
            if (result?.conversationId) {
              setConversationId(result.conversationId);
              AsyncStorage.setItem(HNIA_CONV_STORAGE_KEY, result.conversationId).catch(() => null);
            }

            if (result?.transcription) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === userMsg.id
                    ? {
                        ...m,
                        content: `🎙️ "${result.transcription}"`,
                        transcription: result.transcription,
                      }
                    : m
                )
              );
            }

            const finalContent = result?.message || accumulatedText || 'Action terminée avec succès.';
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
                        evidence: result?.evidence,
                        recovery: undefined,
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
                    evidence: result?.evidence,
                    createdAt: new Date().toISOString(),
                  },
                ];
              }
              saveMessagesToLocal(next, nextConvId);
              return next;
            });
            queryClient.invalidateQueries({ queryKey: ['admin'] });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
          onError: (streamErr) => {
            console.warn('[HniaChat] Stream error:', streamErr);
            // The completed request path replaces the fragment with one clear error reply.
          },
        },
        controller.signal
      );

      if (controller.signal.aborted || res?.aborted) return;

      if (res && res.success && !isDoneTriggered && !isStreamStarted) {
        const nextConvId = res?.conversationId || conversationId;
        if (res.conversationId) setConversationId(res.conversationId);

        const botMsg: ChatMessage = {
          id: botMsgId,
          role: 'assistant',
          content: res.message || 'C’est bon !',
          transcription: res.transcription,
          pendingConfirmation: res.pendingConfirmation,
          widget: res.widget,
          evidence: res.evidence,
          followUpSuggestions: res.followUpSuggestions,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => {
          const next = [...prev, botMsg];
          saveMessagesToLocal(next, nextConvId);
          return next;
        });
        queryClient.invalidateQueries({ queryKey: ['admin'] });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (res && !res.success && !isDoneTriggered) {
        setLastFailedMessage(rawText);
        if (tokenFlushTimerRef.current) { clearTimeout(tokenFlushTimerRef.current); tokenFlushTimerRef.current = null; }
        setMessages(prev => {
          const next = replaceInterruptedReply(prev, botMsgId, chatFailureCopy(res.error)).map(m => m.id === botMsgId ? { ...m, recovery: { prompt: rawText, uncertainAction: Boolean(receivedConfirmation || (lastToolRef.current && !/^(get_|search_|query_)/.test(lastToolRef.current))) } } : m);
          saveMessagesToLocal(next, conversationId);
          return next;
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setLastFailedMessage(rawText);
      if (tokenFlushTimerRef.current) { clearTimeout(tokenFlushTimerRef.current); tokenFlushTimerRef.current = null; }
      setMessages(prev => {
        const next = replaceInterruptedReply(prev, botMsgId, chatFailureCopy(err?.message)).map(m => m.id === botMsgId ? { ...m, recovery: { prompt: rawText, uncertainAction: Boolean(receivedConfirmation || (lastToolRef.current && !/^(get_|search_|query_)/.test(lastToolRef.current))) } } : m);
        saveMessagesToLocal(next, conversationId);
        return next;
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      if (tokenFlushTimerRef.current) {
        clearTimeout(tokenFlushTimerRef.current);
        tokenFlushTimerRef.current = null;
      }
      setIsLoading(false);
      setActiveStatusStep(null);
      abortControllerRef.current = null;
      isSendingRef.current = false;
      // No manual scroll needed with inverted FlatList
    }
  };

  // Confirm or Cancel Action Card
  const handleConfirmation = async (
    toolCallId: string,
    action: 'confirm' | 'cancel',
    updatedArgs?: Record<string, any>
  ) => {
    if (confirmingActionRef.current) return;
    confirmingActionRef.current = true;
    setConfirmingToolId(toolCallId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await submitActionDecision(adminService.confirmAction, toolCallId, action, updatedArgs);
      setMessages(prev => {
        const next = applyActionDecision(prev, toolCallId, res, updatedArgs);
        saveMessagesToLocal(next, conversationId);
        return next;
      });
      if (res.actionStatus === 'EXECUTED') queryClient.invalidateQueries({ queryKey: ['admin'] });
      if (res.success) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Décision de l’action', res.message || 'Actualisez la discussion pour vérifier son statut.');
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Confirmation non vérifiée', err.message || 'Vérifiez votre connexion et actualisez la discussion avant de réessayer.');
      // Read-only reconciliation; never recreate or replay a possibly completed write.
      await loadChatHistory();
    } finally {
      confirmingActionRef.current = false;
      setConfirmingToolId(null);
    }
  };

  const handleCopyMessage = async (msgId: string, textToCopy: string) => {
    try {
      const cleanText = textToCopy.replace(/\[IMAGE:https?:\/\/[^\]]+\]\n?/g, '').trim();
      await copyToClipboard(cleanText);
      await Haptics.selectionAsync();
      setCopiedMessageId(msgId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {}
  };

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: Math.max(
            insets.top,
            Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0
          ),
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={Platform.OS === 'android'} />

      {/* Top Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.headerLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>


          <View style={styles.avatarBox}>
            <Image source={HNIA_AVATAR} style={styles.avatarImg} />
            <View
              style={[
                styles.avatarDot,
                { backgroundColor: agentStatus.dotColor },
                isRTL ? { right: undefined, left: 0 } : { right: 0 },
              ]}
            />
          </View>

          <View style={[styles.headerTitleCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <View style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.headerTitle}>{language === 'ar' ? 'هنيّة' : 'Hnia'}</Text>
              <View style={[styles.statusBadge, { backgroundColor: agentStatus.bg, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.statusDot, { backgroundColor: agentStatus.dotColor }]} />
                <Text style={[styles.statusText, { color: agentStatus.textColor }]}>
                  {agentStatus.label}
                </Text>
              </View>
            </View>
            <Text style={[styles.headerSubtitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
              {schoolName}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.newChatBtn}
          onPress={() => setMenuVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={tx('Menu Hnia', 'Hnia menu', 'قائمة هنية')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <MoreHorizontal size={22} color="#506a87" />
        </TouchableOpacity>
      </View>

      {searchVisible && <View style={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f7f9fc' }}><Search size={16} color="#6983a0" /><TextInput accessibilityLabel={tx('Rechercher dans la conversation', 'Search conversation', 'لوّج في المحادثة')} value={searchText} onChangeText={setSearchText} placeholder={tx('Rechercher dans cette conversation…', 'Search this conversation…', 'لوّج في المحادثة…')} style={{ flex: 1, minHeight: 38, color: '#25415f' }} autoFocus /><Text style={{ fontSize: 11, color: '#6b839d' }}>{displayedMessages.length}</Text><TouchableOpacity accessibilityRole="button" onPress={() => { setSearchVisible(false); setSearchText(''); }}><X size={18} color="#6b839d" /></TouchableOpacity></View>}
      {visibleDate && messages.length > 0 && !searchVisible && <View style={{ paddingVertical: 4, alignItems: 'center', backgroundColor: '#f7f9fc' }}><Text style={{ fontSize: 10, color: '#8496aa' }}>{dateLabel(visibleDate)}</Text></View>}
      <Reanimated.View
        style={[
          { flex: 1 },
          animatedKeyboardStyle,
        ]}
      >
        <View style={{ flex: 1 }}>
          {/* Main Area */}
          {messages.length === 0 ? (
            /* Welcome / Empty State */
            <HniaEmptyState
              schoolName={schoolName}
              chatLanguage={language}
              onSelectPrompt={(prompt) => handleSendMessage(prompt)}
              onOpenAttachmentSheet={handleTakePhoto}
            />
          ) : (
            /* Message List */
            <FlatList
              ref={flatListRef}
              data={displayedMessages}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={{ itemVisiblePercentThreshold: 30 }}
              inverted={true}
              keyExtractor={(item) => item.id}
              extraData={[confirmingToolId, isLoading, language]}
              windowSize={7}
              maxToRenderPerBatch={10}
              initialNumToRender={15}
              removeClippedSubviews={Platform.OS === 'android'}
              onScroll={(e) => {
                const { contentOffset } = e.nativeEvent;
                // In inverted list, offset 0 = bottom (latest messages)
                isNearBottomRef.current = contentOffset.y < 80;
                setShowScrollToBottom(contentOffset.y > 200);
              }}
              onScrollBeginDrag={() => {
                userIsDraggingRef.current = true;
              }}
              onScrollEndDrag={() => {
                setTimeout(() => {
                  userIsDraggingRef.current = false;
                }, 200);
              }}
              onMomentumScrollEnd={() => {
                userIsDraggingRef.current = false;
              }}
              scrollEventThrottle={100}
              keyboardDismissMode="none"
              renderItem={({ item, index }) => (
                <View style={{ gap: 10 }}>
                <HniaMessageBubble
                  message={item}
                  onPreviewImage={(uri) => setFullscreenImageUri(uri)}
                  onCopyText={handleCopyMessage}
                  isCopied={copiedMessageId === item.id}
                  onConfirmAction={(id, updatedArgs) => handleConfirmation(id, 'confirm', updatedArgs)}
                  onCancelAction={(id) => handleConfirmation(id, 'cancel')}
                  executingToolId={confirmingToolId}
                  isActionExecuting={
                    Boolean(
                      confirmingToolId &&
                        (Array.isArray(item.pendingConfirmation)
                          ? item.pendingConfirmation.some((c: any) => c.toolCallId === confirmingToolId)
                          : item.pendingConfirmation?.toolCallId === confirmingToolId)
                    )
                  }
                  onSelectSuggestion={(sug) => handleSendMessage(sug)}
                  onNavigateToCaisse={() => navigation.navigate('Caisse')}
                  language={language}
                  schoolName={schoolName}
                  disabled={isLoading}
                  onRefreshRead={(id) => handleSendMessage(tx('Actualiser les données', 'Refresh records', 'حدّث المعطيات'), undefined, undefined, { readId: id, messageId: item.id })}
                  onNextReadPage={(id) => { if (id) handleSendMessage('Page suivante', undefined, undefined, { readId: id, messageId: item.id, nextPage: true }); }}
                  onOpenClass={(classId) => Linking.openURL(`https://www.snapschool.academy/list/classes/${encodeURIComponent(classId)}`)}
                  onRecover={async (message, mode) => {
                    if (message.recovery?.uncertainAction) { await loadChatHistory(); return; }
                    const prompt = message.recovery?.prompt;
                    if (prompt) handleSendMessage(mode === 'continue' ? tx('Reprends cette consultation : ', 'Resume this lookup: ', 'كمّل التثبت: ') + prompt : prompt);
                  }}
                />
                </View>
              )}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                isLoading && !messages.some((m) => m.isStreaming) ? (
                  <View style={[styles.typingCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <HniaActivity label={activeStatusStep || tx('Préparation de la réponse…', 'Preparing your answer…', 'نحضّر في الإجابة…')} />
                  </View>
                ) : null
              }
            />
          )}

          {/* Scroll-to-bottom floating button */}
          {showScrollToBottom && (
            <TouchableOpacity
              style={styles.scrollToBottomBtn}
              onPress={() => {
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                setShowScrollToBottom(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.scrollToBottomIcon}>↓</Text>
            </TouchableOpacity>
          )}

          {/* Quick Action Suggestion Chips (when chatting - hidden while typing to maximize message visibility) */}
          {messages.length > 0 && !isLoading && !hasPendingAction && !isRecording && !isKeyboardVisible && !searchVisible && (
            <View style={styles.quickChipsBar}>
              <FlatList
                horizontal
                data={QUICK_CHIPS}
                keyExtractor={(item, index) => index.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.quickChipsContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.chipBtn}
                    onPress={() => handleSendMessage(item.prompt)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {voiceReview && <View style={{ backgroundColor: '#eef5ff', paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: '#3d6192', fontSize: 12, flex: 1 }}>{tx('Vocal compris. Relisez et modifiez avant l’envoi.', 'Voice understood. Review and edit before sending.', 'فهمت التسجيل. راجع وعدّل قبل ما تبعث.')}</Text><TouchableOpacity accessibilityRole="button" onPress={() => { setVoiceReview(false); setInputText(''); }}><X size={17} color="#637f9f" /></TouchableOpacity></View>}
          {messages.length === 0 && isLoading && <View style={{ paddingHorizontal: 22 }}><HniaActivity label={activeStatusStep || tx('Consultation des données…', 'Checking school data…', 'نراجع في المعطيات…')} /></View>}
          {/* Composer */}
          <HniaComposer
            chatLanguage={language}
            inputText={inputText}
            onChangeText={setInputText}
            onSend={(txt) => handleSendMessage(txt)}
            isLoading={isLoading}
            onInterrupt={handleInterrupt}
            stagedImage={stagedImage}
            onClearImage={() => setStagedImage(null)}
            stagedAudio={stagedAudio}
            onClearAudio={() => setStagedAudio(null)}
            onTakePhoto={handleTakePhoto}
            onPickImage={handlePickImage}
            onPickDocument={handlePickDocument}
            onPickAudioFile={handlePickAudioFile}
            onPreviewImage={(uri) => setFullscreenImageUri(uri)}
            isRecording={isRecording}
            isRecordingPaused={isRecordingPaused}
            recordingDuration={recordingDuration}
            liveAmplitude={liveAmplitude}
            bottomBarAnims={bottomBarAnims}
            onStartRecording={startAudioRecording}
            onPauseRecording={pauseAudioRecording}
            onStopAndSendRecording={stopAndSendAudioRecording}
            onCancelRecording={cancelAudioRecording}
            vocalError={vocalError}
            onDismissVocalError={() => setVocalError(null)}
            bottomInset={insets.bottom}
            isKeyboardVisible={isKeyboardVisible}
            onFocus={() => {
              // Inverted FlatList handles keyboard naturally
            }}
          />
        </View>
      </Reanimated.View>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity activeOpacity={1} style={experienceStyles.overlay} onPress={() => setMenuVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={experienceStyles.menu} onPress={() => {}}>
            <Text style={experienceStyles.menuTitle}>{tx('Votre espace Hnia', 'Your Hnia workspace', 'فضاء هنية')}</Text>
            <TouchableOpacity accessibilityRole="button" disabled={isLoading} style={experienceStyles.menuRow} onPress={() => { setMenuVisible(false); handleCreateNewThread(); }}><Plus size={19} color="#456387" /><Text style={experienceStyles.menuText}>{tx('Nouveau sujet', 'New topic', 'موضوع جديد')}</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" disabled={isLoading} style={experienceStyles.menuRow} onPress={() => { setMenuVisible(false); handleOpenHistoryDrawer(); }}><History size={19} color="#456387" /><Text style={experienceStyles.menuText}>{tx('Historique', 'Conversation history', 'المحادثات السابقة')}</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" disabled={!messages.length} style={experienceStyles.menuRow} onPress={() => { setMenuVisible(false); setSearchVisible(true); }}><Search size={19} color="#456387" /><Text style={experienceStyles.menuText}>{tx('Rechercher dans la conversation', 'Search conversation', 'لوّج في المحادثة')}</Text></TouchableOpacity>
            <View style={experienceStyles.menuRow}><Languages size={19} color="#456387" /><Text style={experienceStyles.menuText}>{tx('Langue de réponse', 'Reply language', 'لغة الإجابة')}</Text></View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>{(['fr', 'en', 'ar'] as const).map(code => <TouchableOpacity key={code} accessibilityRole="button" accessibilityState={{ selected: code === language }} onPress={() => chooseLanguage(code)} style={[experienceStyles.language, code === language && { backgroundColor: '#e9f1ff', borderColor: '#b8cff1' }]}><Text style={{ color: '#345d91', fontWeight: '600' }}>{code === 'ar' ? 'عربي' : code === 'en' ? 'English' : 'Français'}</Text></TouchableOpacity>)}</View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      {/* History Drawer Modal */}
      <HniaHistoryDrawer
        visible={historyDrawerVisible}
        onClose={() => setHistoryDrawerVisible(false)}
        threads={threads}
        activeConversationId={conversationId}
        isLoading={isLoadingThreads}
        onSelectThread={handleSelectThread}
        onCreateNewThread={handleCreateNewThread}
        onDeleteThread={handleDeleteThread}
        onRenameThread={handleRenameThread}
      />

      {/* Fullscreen Image Modal */}
      <Modal
        visible={Boolean(fullscreenImageUri)}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenImageUri(null)}
      >
        <View style={styles.fullscreenModal}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setFullscreenImageUri(null)}
          >
            <X size={22} color="#ffffff" strokeWidth={2.4} />
          </TouchableOpacity>
          {fullscreenImageUri && (
            <Image
              source={{ uri: fullscreenImageUri }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
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
    flex: 1,
  },
  historyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBox: {
    position: 'relative',
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e0edff',
  },
  avatarDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  headerTitleCol: {
    gap: 1,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '500',
  },
  newChatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
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
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 16,
  },
  typingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 10,
    marginVertical: 4,
  },
  typingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  typingContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  stopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  stopPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
  retryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    paddingVertical: 8,
    marginVertical: 6,
  },
  retryText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#dc2626',
  },
  quickChipsBar: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    paddingVertical: 6,
  },
  quickChipsContent: {
    paddingHorizontal: 14,
    gap: 8,
  },
  chipBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  fullscreenModal: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '85%',
  },
  scrollToBottomBtn: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0055d4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  scrollToBottomIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
});

const experienceStyles = StyleSheet.create({ overlay: { flex: 1, backgroundColor: 'rgba(15,32,55,0.25)', justifyContent: 'flex-end' }, menu: { backgroundColor: '#fff', padding: 24, paddingBottom: 36, borderTopLeftRadius: 26, borderTopRightRadius: 26 }, menuTitle: { color: '#193552', fontSize: 20, fontWeight: '700', marginBottom: 18 }, menuRow: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 50 }, menuText: { color: '#3e5977', fontSize: 15 }, language: { flex: 1, borderWidth: 1, borderColor: '#e2eaf4', paddingVertical: 13, borderRadius: 12, alignItems: 'center' } });
