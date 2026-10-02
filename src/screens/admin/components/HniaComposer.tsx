import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Image,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  Plus,
  ArrowUp,
  Mic,
  Square,
  X,
  Camera,
  Image as ImageIcon,
  FileText,
  Maximize2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface StagedAttachment {
  type: 'image' | 'document' | 'audio';
  uri: string;
  name?: string;
  base64?: string;
  mimeType?: string;
}

interface HniaComposerProps {
  inputText: string;
  onChangeText: (text: string) => void;
  onSend: (text?: string) => void;
  isLoading: boolean;
  onInterrupt: () => void;
  // Attachments
  stagedImage: { uri: string; base64: string; mimeType: string } | null;
  onClearImage: () => void;
  stagedAudio: { uri: string; base64: string; name: string } | null;
  onClearAudio: () => void;
  onTakePhoto: () => void;
  onPickImage: () => void;
  onPickDocument: () => void;
  onPickAudioFile: () => void;
  onPreviewImage: (uri: string) => void;
  // Audio Recording
  isRecording: boolean;
  isRecordingPaused: boolean;
  recordingDuration: number;
  liveAmplitude: number;
  bottomBarAnims: Animated.Value[];
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onStopAndSendRecording: () => void;
  onCancelRecording: () => void;
  vocalError: string | null;
  onDismissVocalError: () => void;
  bottomInset: number;
  isKeyboardVisible: boolean;
  onFocus?: () => void;
}

export default function HniaComposer({
  inputText,
  onChangeText,
  onSend,
  isLoading,
  onInterrupt,
  stagedImage,
  onClearImage,
  stagedAudio,
  onClearAudio,
  onTakePhoto,
  onPickImage,
  onPickDocument,
  onPickAudioFile,
  onPreviewImage,
  isRecording,
  isRecordingPaused,
  recordingDuration,
  liveAmplitude,
  bottomBarAnims,
  onStartRecording,
  onPauseRecording,
  onStopAndSendRecording,
  onCancelRecording,
  vocalError,
  onDismissVocalError,
  bottomInset,
  isKeyboardVisible,
  onFocus,
}: HniaComposerProps) {
  const [attachmentSheetVisible, setAttachmentSheetVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const formatRecordingTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const hasContentToSend = Boolean(
    inputText.trim() || stagedImage || stagedAudio
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: 8,
        },
      ]}
    >
      {/* 1. Staged Attachment Previews (Above Composer) */}
      {stagedImage && (
        <View style={styles.stagingBar}>
          <View style={styles.imageThumbContainer}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onPreviewImage(stagedImage.uri)}
            >
              <Image source={{ uri: stagedImage.uri }} style={styles.imageThumb} />
              <View style={styles.zoomHint}>
                <Maximize2 size={9} color="#ffffff" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeBadge}
              onPress={onClearImage}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={11} color="#ffffff" strokeWidth={2.8} />
            </TouchableOpacity>
          </View>
          <Text style={styles.stagingLabel}>Document prêt à être analysé</Text>
        </View>
      )}

      {stagedAudio && (
        <View style={styles.stagingBar}>
          <View style={styles.audioPill}>
            <Mic size={14} color="#0055d4" strokeWidth={2.2} />
            <Text style={styles.audioPillText} numberOfLines={1}>
              {stagedAudio.name || 'Mémo vocal'}
            </Text>
            <TouchableOpacity
              onPress={onClearAudio}
              style={styles.audioRemoveBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={12} color="#64748b" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 2. Vocal Error Notice Pill */}
      {vocalError && (
        <View style={styles.errorContainer}>
          <TouchableOpacity
            style={styles.errorDismissBtn}
            onPress={onDismissVocalError}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color="#dc2626" strokeWidth={2.4} />
          </TouchableOpacity>
          <Text style={styles.errorText} numberOfLines={1}>
            {vocalError}
          </Text>
        </View>
      )}

      {/* 3. Composer Row: Active Recording OR Standard Input */}
      {isRecording ? (
        /* LIVE AUDIO RECORDING BAR */
        <View style={styles.recordingRow}>
          <TouchableOpacity
            style={styles.recordingCancelBtn}
            onPress={onCancelRecording}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={18} color="#64748b" strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={styles.recordingCenterArea}>
            <View
              style={[
                styles.recordingPulseDot,
                isRecordingPaused && { backgroundColor: '#94a3b8' },
              ]}
            />
            <Text style={styles.recordingTimerText}>
              {formatRecordingTime(recordingDuration)}
            </Text>

            {/* Waveform Bars */}
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

          {/* Pause / Stop button */}
          {!isRecordingPaused && (
            <TouchableOpacity
              style={styles.recordingPauseBtn}
              onPress={onPauseRecording}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Square size={12} color="#ffffff" fill="#ffffff" />
            </TouchableOpacity>
          )}

          {/* Send audio button */}
          <TouchableOpacity
            style={styles.recordingSendBtn}
            onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            onPress={onStopAndSendRecording}
            activeOpacity={0.85}
          >
            <ArrowUp size={19} color="#ffffff" strokeWidth={2.6} />
          </TouchableOpacity>
        </View>
      ) : (
        /* STANDARD MESSAGE COMPOSER */
        <View style={styles.inputRow}>
          {/* + Attachment Button */}
          <TouchableOpacity
            style={styles.plusButton}
            onPress={() => setAttachmentSheetVisible(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Plus size={20} color="#475569" strokeWidth={2.2} />
          </TouchableOpacity>

          {/* Input Box */}
          <View style={styles.inputPill}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Message à Hnia..."
              placeholderTextColor="#94a3b8"
              value={inputText}
              onChangeText={onChangeText}
              onFocus={onFocus}
              multiline
              maxLength={1500}
            />

            {/* Trailing Action: Stop OR Send OR Mic */}
            {isLoading ? (
              <TouchableOpacity
                style={styles.stopButton}
                onPress={onInterrupt}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Square size={12} color="#ffffff" fill="#ffffff" />
              </TouchableOpacity>
            ) : hasContentToSend ? (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={() => onSend()}
                activeOpacity={0.85}
              >
                <ArrowUp size={18} color="#ffffff" strokeWidth={2.6} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.micButton}
                onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
                onPress={onStartRecording}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.75}
              >
                <Mic size={20} color="#475569" strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* 4. Attachment Bottom Sheet */}
      <Modal
        visible={attachmentSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAttachmentSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setAttachmentSheetVisible(false)}
        >
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>Joindre un document</Text>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setAttachmentSheetVisible(false);
                onTakePhoto();
              }}
            >
              <View style={[styles.sheetIconBox, { backgroundColor: '#eff6ff' }]}>
                <Camera size={20} color="#0055d4" strokeWidth={2} />
              </View>
              <View style={styles.sheetOptionTextCol}>
                <Text style={styles.sheetOptionTitle}>Appareil photo</Text>
                <Text style={styles.sheetOptionSub}>Photographier un reçu ou une facture</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setAttachmentSheetVisible(false);
                onPickImage();
              }}
            >
              <View style={[styles.sheetIconBox, { backgroundColor: '#f0fdf4' }]}>
                <ImageIcon size={20} color="#16a34a" strokeWidth={2} />
              </View>
              <View style={styles.sheetOptionTextCol}>
                <Text style={styles.sheetOptionTitle}>Galerie photos</Text>
                <Text style={styles.sheetOptionSub}>Choisir une image existante</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setAttachmentSheetVisible(false);
                onPickDocument();
              }}
            >
              <View style={[styles.sheetIconBox, { backgroundColor: '#faf5ff' }]}>
                <FileText size={20} color="#9333ea" strokeWidth={2} />
              </View>
              <View style={styles.sheetOptionTextCol}>
                <Text style={styles.sheetOptionTitle}>Document ou PDF</Text>
                <Text style={styles.sheetOptionSub}>Bordereau, relevé bancaire, contrat</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setAttachmentSheetVisible(false);
                onPickAudioFile();
              }}
            >
              <View style={[styles.sheetIconBox, { backgroundColor: '#fff7ed' }]}>
                <Mic size={20} color="#ea580c" strokeWidth={2} />
              </View>
              <View style={styles.sheetOptionTextCol}>
                <Text style={styles.sheetOptionTitle}>Fichier audio</Text>
                <Text style={styles.sheetOptionSub}>Importer un mémo vocal enregistré</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingTop: 8,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  stagingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  imageThumbContainer: {
    position: 'relative',
    width: 50,
    height: 50,
    borderRadius: 10,
    overflow: 'visible',
  },
  imageThumb: {
    width: 50,
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#0055d4',
  },
  zoomHint: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    padding: 2,
  },
  closeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  stagingLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  audioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  audioPillText: {
    fontSize: 12.5,
    color: '#0055d4',
    fontWeight: '600',
    maxWidth: 200,
  },
  audioRemoveBtn: {
    padding: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    gap: 8,
  },
  errorDismissBtn: {
    padding: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  plusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  inputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 5,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#0f172a',
    maxHeight: 110,
    paddingTop: Platform.OS === 'ios' ? 7 : 4,
    paddingBottom: Platform.OS === 'ios' ? 7 : 4,
    lineHeight: 20,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0055d4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  micButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  stopButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  /* Recording Bar */
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    paddingHorizontal: 8,
    paddingVertical: 6,
    height: 48,
  },
  recordingCancelBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingCenterArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 6,
  },
  recordingPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc2626',
  },
  recordingTimerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    fontVariant: ['tabular-nums'],
  },
  soundWaveContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: 20,
  },
  waveBar: {
    width: 2,
    height: 18,
    borderRadius: 1,
    backgroundColor: '#0055d4',
  },
  recordingPauseBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  recordingSendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0055d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Bottom Sheet */
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  sheetIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionTextCol: {
    flex: 1,
  },
  sheetOptionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  sheetOptionSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
});
