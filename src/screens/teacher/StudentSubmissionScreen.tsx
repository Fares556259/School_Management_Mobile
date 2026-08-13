import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StatusBar, Dimensions, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CheckCircle2, Calendar, Camera, Maximize2, FileText, Download } from 'lucide-react-native';
import { downloadAndPreviewPDF } from '../../utils/fileUtils';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');

export const StudentSubmissionScreen = ({ route, navigation }: any) => {
  const { student, task } = route.params;
  const { t, language, isRTL } = useLanguage();
  const [imgExpanded, setImgExpanded] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState<string | null>(null);

  const handleDownload = async (url: string, name: string) => {
    setDownloading(url);
    try {
      await downloadAndPreviewPDF(url, name);
    } finally {
      setDownloading(null);
    }
  };

  const getLocale = () => {
    if (language === 'ar') return 'ar-TN';
    if (language === 'fr') return 'fr-FR';
    return 'en-US';
  };

  const submittedDate = student.submittedAt
    ? new Date(student.submittedAt).toLocaleDateString(getLocale(), {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
      })
    : null;

  const submittedTime = student.submittedAt
    ? new Date(student.submittedAt).toLocaleTimeString(getLocale(), {
        hour: '2-digit', minute: '2-digit'
      })
    : null;

  const initials = student.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}
        >
          <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
            <ChevronLeft size={22} color="#1e293b" />
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: isRTL ? 0 : 16, marginRight: isRTL ? 16 : 0 }}>
          <Text style={{ fontSize: 17, fontWeight: '900', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }}>{(t?.submission || 'Submission')}</Text>
          <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '700', marginTop: 1, textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>{task?.title}</Text>
        </View>
        {/* Completed Badge */}
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0' }}>
          <CheckCircle2 size={14} color="#16a34a" />
          <Text style={{ fontSize: 12, fontWeight: '900', color: '#16a34a', marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }}>{(t?.completed || 'Completed')}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        {/* Student Card */}
        <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' }}>
          {student.avatar ? (
            <Image source={{ uri: student.avatar }} style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 14 }} />
          ) : (
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 28, fontWeight: '900', color: '#0055d4' }}>{initials}</Text>
            </View>
          )}
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e293b', textAlign: 'center' }}>{student.name}</Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '700', marginTop: 4 }}>{task?.className}</Text>
        </View>

        {/* Submission Time */}
        {submittedDate && (
          <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#dcfce7', flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}>
              <Calendar size={22} color="#16a34a" />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: isRTL ? 'right' : 'left' }}>{(t?.submitted || 'Submitted')}</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>{submittedDate}</Text>
              <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '600', marginTop: 1, textAlign: isRTL ? 'right' : 'left' }}>{(t?.at || 'at')} {submittedTime}</Text>
            </View>
          </View>
        )}

        {/* Work Photo */}
        <Text style={{ fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }}>
          {(t?.workSubmitted || 'Work Submitted')}
        </Text>

        {(() => {
          let attachments = student.attachments;
          if (!attachments || attachments.length === 0) {
            if (student.submissionImg && typeof student.submissionImg === 'string') {
              attachments = student.submissionImg.split(',').filter(Boolean).map((url: string) => ({
                url,
                type: url.toLowerCase().includes('.pdf') ? 'pdf' : 'image'
              }));
            }
          }
          
          if (attachments && attachments.length > 0) {
            return (
              <View style={{ gap: 16 }}>
                {attachments.map((att: { url: string; type: string }, index: number) => {
                  const url = att.url;
              const isPdf = att.type === 'pdf';
              if (isPdf) {
                const fileName = url.split('/').pop() || `Document_${index + 1}.pdf`;
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.85}
                    onPress={() => handleDownload(url, fileName)}
                    style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#fff5f5', alignItems: 'center', justifyContent: 'center', marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}>
                      <FileText color="#ef4444" size={24} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>{fileName}</Text>
                      <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>{(t?.pdfDocument || 'PDF Document')}</Text>
                    </View>
                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                      <Download size={18} color="#64748b" />
                    </View>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.85}
                  onPress={() => setImgExpanded(url)}
                  style={{ backgroundColor: 'white', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', position: 'relative' }}
                >
                  <Image
                    source={{ uri: url }}
                    style={{ width: '100%', height: width - 40, borderRadius: 24 }}
                    resizeMode="cover"
                  />
                  <View style={{ position: 'absolute', bottom: 14, [isRTL ? 'left' : 'right']: 14, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, padding: 8, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                    <Maximize2 size={14} color="white" />
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }}>{(t?.tapToExpand || 'Tap to expand')}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
              </View>
            );
          }
          
          return (
            <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#f1f5f9', borderStyle: 'dashed' }}>
              <Camera size={40} color="#d1d5db" />
              <Text style={{ color: '#94a3b8', fontWeight: '700', marginTop: 12, fontSize: 15, textAlign: 'center' }}>{(t?.noPhotoSubmitted || 'No work attached')}</Text>
              <Text style={{ color: '#cbd5e1', fontWeight: '500', marginTop: 4, fontSize: 13, textAlign: 'center' }}>{language === 'ar' ? 'تم وضع علامة على المهمة كمكتملة بدون إرفاق عمل' : language === 'fr' ? 'L\'étudiant a marqué comme terminé sans joindre de travail' : 'The student marked as done without attaching any work'}</Text>
            </View>
          );
        })()}
      </ScrollView>

      {/* Full-screen Image Viewer */}
      <Modal visible={!!imgExpanded} transparent animationType="fade" onRequestClose={() => setImgExpanded(null)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setImgExpanded(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}
        >
          {imgExpanded && (
            <Image
              source={{ uri: imgExpanded }}
              style={{ width: width, height: width * 1.2 }}
              resizeMode="contain"
            />
          )}
          <Text style={{ color: 'white', marginTop: 24, fontSize: 13, fontWeight: '600', opacity: 0.6 }}>{language === 'ar' ? 'انقر في أي مكان للإغلاق' : language === 'fr' ? 'Appuyez n\'importe où pour fermer' : 'Tap anywhere to close'}</Text>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};
