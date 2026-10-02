import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  Maximize2,
  Mic,
  Copy,
  Check,
  Calendar,
  Wallet,
  Globe,
  Users,
  BookOpen,
  Building2,
  FileText,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  ActionCardWidget,
  CaisseCardWidget,
  UnpaidTuitionWidget,
  PdfReceiptWidget,
  FinanceSummaryWidget,
  StudentProfileWidget,
  AttendanceSummaryWidget,
  ActionCardData,
  tryParseCaisseWidget,
  tryParseUnpaidWidget,
  tryParseReceiptWidget,
} from '../HniaWidgets';

const HNIA_AVATAR = require('../../../../assets/hnia/hnia_mascot_icon.png');

export interface ChatMessage {
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
  pendingConfirmation?: ActionCardData | ActionCardData[] | null;
  followUpSuggestions?: string[];
  createdAt?: string;
}

interface HniaMessageBubbleProps {
  message: ChatMessage;
  onPreviewImage: (uri: string) => void;
  onCopyText: (msgId: string, text: string) => void;
  isCopied: boolean;
  onConfirmAction: (toolCallId: string, updatedArgs?: Record<string, any>) => void;
  onCancelAction: (toolCallId: string) => void;
  isActionExecuting: boolean;
  onSelectSuggestion: (text: string) => void;
  onNavigateToCaisse?: () => void;
}

function HniaMessageBubble({
  message,
  onPreviewImage,
  onCopyText,
  isCopied,
  onConfirmAction,
  onCancelAction,
  isActionExecuting,
  onSelectSuggestion,
  onNavigateToCaisse,
}: HniaMessageBubbleProps) {
  const isUser = message.role === 'user';

  // Extract structured widgets if available
  const caisseData = !isUser
    ? (message.widget?.type === 'caisse' ? message.widget.data : tryParseCaisseWidget(message.content))
    : null;
  const unpaidData = !isUser
    ? (message.widget?.type === 'unpaid_tuition' ? message.widget.data : tryParseUnpaidWidget(message.content))
    : null;
  const receiptData = !isUser
    ? (message.widget?.type === 'pdf_receipt' ? message.widget.data : tryParseReceiptWidget(message.content))
    : null;
  const financeData = !isUser && message.widget?.type === 'finance_summary' ? message.widget.data : null;
  const studentData = !isUser && message.widget?.type === 'student_card' ? message.widget.data : null;
  const attendanceData = !isUser && message.widget?.type === 'attendance_card' ? message.widget.data : null;

  const rawActionCard = !isUser
    ? (message.pendingConfirmation || (message.widget?.type === 'action_card' ? message.widget.data : null))
    : null;
  const actionCards: ActionCardData[] = Array.isArray(rawActionCard)
    ? rawActionCard
    : rawActionCard ? [rawActionCard] : [];
  const actionCardData = actionCards[0] || null;

  const hasWidget = Boolean(
    caisseData || unpaidData || receiptData || financeData || studentData || attendanceData || actionCards.length > 0
  );

  // Markdown line-by-line parser
  const renderFormattedContent = (rawText: string) => {
    if (!rawText) return null;

    // Check for Markdown table
    const tableRegex = /\|(.+)\|[\r\n]+\|[-:| ]+\|[\r\n]+((?:\|.+\|[\r\n]*)+)/;
    const tableMatch = rawText.match(tableRegex);

    if (tableMatch) {
      const parts = rawText.split(tableMatch[0]);
      const headerRow = tableMatch[1].split('|').map((c) => c.trim()).filter(Boolean);
      const bodyRows = tableMatch[2]
        .trim()
        .split('\n')
        .map((r) => r.split('|').map((c) => c.trim()).filter(Boolean));

      return (
        <View>
          {parts[0]?.trim() ? renderParagraphs(parts[0].trim()) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                {headerRow.map((h, idx) => (
                  <Text key={idx} style={styles.tableHeaderCell}>{h}</Text>
                ))}
              </View>
              {bodyRows.map((row, rIdx) => (
                <View
                  key={rIdx}
                  style={[styles.tableRow, rIdx % 2 === 1 && { backgroundColor: '#f8fafc' }]}
                >
                  {row.map((cell, cIdx) => (
                    <Text key={cIdx} style={styles.tableCell}>{cell}</Text>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
          {parts[1]?.trim() ? renderParagraphs(parts[1].trim()) : null}
        </View>
      );
    }

    return renderParagraphs(rawText);
  };

  const renderParagraphs = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <View key={idx} style={{ height: 6 }} />;
      }

      // 1. Heading 2 (## Header)
      if (trimmed.startsWith('## ')) {
        return (
          <Text key={idx} style={styles.h2}>
            {renderInlineMarkdown(trimmed.replace(/^##\s+/, ''), styles.h2)}
          </Text>
        );
      }

      // 2. Heading 3 (### Header)
      if (trimmed.startsWith('### ')) {
        return (
          <Text key={idx} style={styles.h3}>
            {renderInlineMarkdown(trimmed.replace(/^###\s+/, ''), styles.h3)}
          </Text>
        );
      }

      // 3. Bullet points (- item, * item, • item)
      if (/^[-*•]\s+/.test(trimmed)) {
        const itemContent = trimmed.replace(/^[-*•]\s+/, '');
        return (
          <View key={idx} style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              {renderInlineMarkdown(itemContent, styles.bulletText)}
            </Text>
          </View>
        );
      }

      // 4. Numbered list items (1. item)
      const numMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/);
      if (numMatch) {
        return (
          <View key={idx} style={styles.bulletRow}>
            <Text style={styles.numberedBadge}>{numMatch[1]}.</Text>
            <Text style={styles.bulletText}>
              {renderInlineMarkdown(numMatch[2], styles.bulletText)}
            </Text>
          </View>
        );
      }

      // 5. Blockquote / Advice (> conseil)
      if (trimmed.startsWith('> ') || trimmed.startsWith('💡 ')) {
        const quoteContent = trimmed.replace(/^[>💡]\s*/, '');
        return (
          <View key={idx} style={styles.quoteCard}>
            <Text style={styles.quoteText}>
              💡 {renderInlineMarkdown(quoteContent, styles.quoteText)}
            </Text>
          </View>
        );
      }

      // 6. Regular text line
      return (
        <Text key={idx} style={styles.normalText}>
          {renderInlineMarkdown(trimmed, styles.normalText)}
        </Text>
      );
    });
  };

  const renderInlineMarkdown = (line: string, baseStyle: any) => {
    // Replace markdown tags with delimiters
    let processed = line;
    processed = processed.replace(/\*\*(.+?)\*\*/g, '|||B|||$1|||B|||');
    processed = processed.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '|||I|||$1|||I|||');
    processed = processed.replace(/`([^`]+?)`/g, '|||C|||$1|||C|||');
    processed = processed.replace(/<code>([^<]+?)<\/code>/g, '|||C|||$1|||C|||');
    processed = processed.replace(/<b>([^<]+?)<\/b>/g, '|||B|||$1|||B|||');
    processed = processed.replace(/<i>([^<]+?)<\/i>/g, '|||I|||$1|||I|||');

    const tokens = processed.split('|||');
    let isBold = false;
    let isItalic = false;
    let isCode = false;

    const elements: React.ReactNode[] = [];

    tokens.forEach((token, idx) => {
      if (token === 'B') {
        isBold = !isBold;
      } else if (token === 'I') {
        isItalic = !isItalic;
      } else if (token === 'C') {
        isCode = !isCode;
      } else if (token) {
        if (isCode) {
          elements.push(
            <Text key={idx} style={styles.codePill}>
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

  const renderedContent = useMemo(() => {
    return renderFormattedContent(message.content);
  }, [message.content]);

  return (
    <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
      {/* Assistant Avatar */}
      {!isUser && (
        <Image source={HNIA_AVATAR} style={styles.assistantAvatar} />
      )}

      {/* Bubble Container */}
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          hasWidget && styles.widgetContainerReset,
        ]}
      >
        {/* Attached Image Thumbnail */}
        {message.imageUri && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPreviewImage(message.imageUri!)}
            style={styles.imageWrapper}
          >
            <Image
              source={{ uri: message.imageUri }}
              style={styles.messageImage}
              resizeMode="cover"
            />
            <View style={styles.imageZoomBadge}>
              <Maximize2 size={10} color="#ffffff" />
              <Text style={styles.imageZoomText}>Agrandir</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Voice Note Badge for User */}
        {isUser && message.isVoice && (
          <View style={styles.voiceNoteBadge}>
            <Mic size={13} color="#ffffff" />
            <Text style={styles.voiceNoteBadgeText}>Note vocale</Text>
          </View>
        )}

        {/* User Content */}
        {isUser ? (
          <Text style={styles.userText}>
            {message.content?.includes('[DOCUMENT NUMÉRISÉ REÇU PAR PHOTO]')
              ? '📷 Justificatif / Reçu envoyé'
              : message.content?.replace(/\[IMAGE:https?:\/\/[^\]]+\]\n?/, '').trim() ||
                (message.imageUri ? '📷 Document envoyé' : '')}
          </Text>
        ) : actionCards.length > 0 ? (
          /* Native Action Card Rendering */
          <View style={{ width: '100%' }}>
            {message.content &&
              !message.content.includes('❓') &&
              !/^veuillez vérifier et confirmer/i.test(message.content.trim()) && (
                <View style={{ marginBottom: 8 }}>
                  {renderedContent}
                </View>
              )}
            {actionCards.map((card, idx) => (
              <View key={card.toolCallId || idx} style={{ marginTop: idx > 0 ? 10 : 0 }}>
                <ActionCardWidget
                  card={card}
                  onConfirm={onConfirmAction}
                  onCancel={onCancelAction}
                  isExecuting={isActionExecuting}
                />
              </View>
            ))}
          </View>
        ) : (
          /* Standard Assistant Markdown Response */
          <View style={{ width: '100%' }}>
            {renderedContent}
          </View>
        )}

        {/* Interactive Visual Widgets (when provided) */}
        {caisseData && (
          <CaisseCardWidget
            data={caisseData}
            onOpenCaisse={onNavigateToCaisse}
          />
        )}

        {unpaidData && (
          <UnpaidTuitionWidget
            data={unpaidData}
            onSendBatchReminder={(students) =>
              onSelectSuggestion(
                `Envoie un rappel de paiement aux parents des ${students.length} élèves qui ont des impayés.`
              )
            }
          />
        )}

        {receiptData && <PdfReceiptWidget data={receiptData} />}
        {financeData && <FinanceSummaryWidget data={financeData} onViewCaisse={onNavigateToCaisse} />}
        {studentData && <StudentProfileWidget student={studentData} />}
        {attendanceData && (
          <AttendanceSummaryWidget
            data={attendanceData}
            onNotifyParents={() =>
              onSelectSuggestion("Envoie un rappel d'absence aux parents des élèves absents d'aujourd'hui.")
            }
          />
        )}

        {/* Assistant Footer (Model Tag & Copy Button) */}
        {!isUser && message.content && (
          <View style={styles.assistantFooter}>
            <View style={styles.modelTag}>
              <View style={styles.modelDot} />
              <Text style={styles.modelText}>Hnia IA</Text>
            </View>

            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => onCopyText(message.id, message.content)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isCopied ? (
                <>
                  <Check size={11} color="#10b981" />
                  <Text style={[styles.copyBtnText, { color: '#10b981' }]}>Copié !</Text>
                </>
              ) : (
                <>
                  <Copy size={11} color="#94a3b8" />
                  <Text style={styles.copyBtnText}>Copier</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Follow-up Suggestion Chips */}
        {!isUser &&
          message.followUpSuggestions &&
          message.followUpSuggestions.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.suggestionsScroll}
              contentContainerStyle={styles.suggestionsContent}
            >
              {message.followUpSuggestions.map((sug, sIdx) => (
                <TouchableOpacity
                  key={sIdx}
                  style={styles.suggestionChip}
                  onPress={() => onSelectSuggestion(sug)}
                >
                  <Text style={styles.suggestionChipText}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  userBubble: {
    maxWidth: '82%',
    backgroundColor: '#0055d4',
    borderBottomRightRadius: 4,
    shadowColor: '#0055d4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  assistantBubble: {
    flex: 1,
    maxWidth: '89%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderBottomLeftRadius: 4,
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 1,
  },
  widgetContainerReset: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    shadowOpacity: 0,
    elevation: 0,
    maxWidth: '92%',
    minWidth: '85%',
  },
  userText: {
    fontSize: 14.5,
    color: '#ffffff',
    fontWeight: '500',
    lineHeight: 21,
  },
  normalText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 21,
    marginVertical: 1,
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
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12.5,
    color: '#0055d4',
    backgroundColor: '#eff6ff',
    fontWeight: '700',
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  h2: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0055d4',
    marginTop: 6,
    marginBottom: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginVertical: 2,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0055d4',
    marginTop: 8,
  },
  numberedBadge: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0055d4',
    minWidth: 16,
  },
  bulletText: {
    flex: 1,
    fontSize: 13.5,
    color: '#1e293b',
    lineHeight: 20,
  },
  quoteCard: {
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderLeftColor: '#0055d4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginVertical: 6,
  },
  quoteText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  streamingCursor: {
    fontSize: 14,
    color: '#0055d4',
    fontWeight: '900',
    marginLeft: 2,
  },
  voiceNoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  voiceNoteBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  messageImage: {
    width: 220,
    height: 140,
    borderRadius: 12,
  },
  imageZoomBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  imageZoomText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  assistantFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modelTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  modelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  suggestionsScroll: {
    marginTop: 8,
  },
  suggestionsContent: {
    gap: 6,
    paddingVertical: 4,
  },
  suggestionChip: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0055d4',
  },
  /* Table styles */
  tableScroll: {
    marginVertical: 8,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableHeaderCell: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    minWidth: 80,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableCell: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0f172a',
    minWidth: 80,
  },
});

export default React.memo(HniaMessageBubble, (prev, next) => {
  const prevCard = Array.isArray(prev.message.pendingConfirmation)
    ? prev.message.pendingConfirmation[0]
    : prev.message.pendingConfirmation;
  const nextCard = Array.isArray(next.message.pendingConfirmation)
    ? next.message.pendingConfirmation[0]
    : next.message.pendingConfirmation;

  return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.isStreaming === next.message.isStreaming &&
    prev.isCopied === next.isCopied &&
    prev.isActionExecuting === next.isActionExecuting &&
    prev.message.widget === next.message.widget &&
    prevCard?.status === nextCard?.status &&
    prevCard?.toolCallId === nextCard?.toolCallId &&
    prev.message.followUpSuggestions === next.message.followUpSuggestions &&
    prev.message.imageUri === next.message.imageUri
  );
});
