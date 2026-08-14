import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StatusBar, Dimensions, Modal, ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, CheckCircle2, Calendar, Camera, Maximize2, FileText, Download, X } from 'lucide-react-native';
import { downloadAndPreviewPDF } from '../../utils/fileUtils';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');

const SubmissionImageCard = ({
  url,
  fileName,
  isRTL,
  t,
  onExpand,
  onDownload,
  isDownloading
}: {
  url: string;
  fileName: string;
  isRTL: boolean;
  t: any;
  onExpand: (url: string, name: string) => void;
  onDownload: (url: string, name: string) => void;
  isDownloading: boolean;
}) => {
  const [loaded, setLoaded] = React.useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onExpand(url, fileName)}
      style={{
        backgroundColor: '#f1f5f9',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        position: 'relative',
        height: width - 40,
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      {/* Background loading spinner (only visible until image is rendered) */}
      {!loaded && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', zIndex: 0 }}>
          <ActivityIndicator size="small" color="#0055d4" />
        </View>
      )}

      <Image
        source={{ uri: url }}
        style={{ width: '100%', height: '100%', borderRadius: 24, zIndex: 1 }}
        resizeMode="cover"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        onLoadEnd={() => setLoaded(true)}
      />

      {/* Floating Download Button on Card */}
      <View style={{ position: 'absolute', top: 12, [isRTL ? 'left' : 'right']: 12, zIndex: 3 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={(e) => {
            e.stopPropagation();
            onDownload(url, fileName);
          }}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.25)'
          }}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Download size={17} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Expand Pill */}
      <View style={{
        position: 'absolute',
        bottom: 12,
        [isRTL ? 'right' : 'left']: 12,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 6,
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        zIndex: 3,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)'
      }}>
        <Maximize2 size={13} color="white" />
        <Text style={{ color: 'white', fontSize: 11, fontWeight: '700', marginLeft: isRTL ? 0 : 5, marginRight: isRTL ? 5 : 0 }}>
          {(t?.tapToExpand || 'Tap to expand')}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const StudentSubmissionScreen = ({ route, navigation }: any) => {
  const { student, task } = route.params;
  const { t, language, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  const [imgExpanded, setImgExpanded] = React.useState<string | null>(null);
  const [imgExpandedName, setImgExpandedName] = React.useState<string>('work_submission.jpg');
  const [modalImgLoading, setModalImgLoading] = React.useState<boolean>(true);
  const [downloading, setDownloading] = React.useState<string | null>(null);

  const handleDownload = async (url: string, name: string) => {
    if (downloading) return;
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

        {/* Submission Date */}
        {submittedDate && (
          <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#dcfce7', flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}>
              <Calendar size={22} color="#16a34a" />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: isRTL ? 'right' : 'left' }}>{(t?.submitted || 'Submitted')}</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>{submittedDate}</Text>
            </View>
          </View>
        )}

        {/* Work Section */}
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
                  const fileName = url.split('/').pop() || (isPdf ? `Document_${index + 1}.pdf` : `${student.name.replace(/\s+/g, '_')}_work_${index + 1}.jpg`);

                  if (isPdf) {
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
                          {downloading === url ? (
                            <ActivityIndicator size="small" color="#0055d4" />
                          ) : (
                            <Download size={18} color="#64748b" />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  }

                  return (
                    <SubmissionImageCard
                      key={index}
                      url={url}
                      fileName={fileName}
                      isRTL={isRTL}
                      t={t}
                      onExpand={(u, name) => {
                        setModalImgLoading(true);
                        setImgExpandedName(name);
                        setImgExpanded(u);
                      }}
                      onDownload={(u, name) => handleDownload(u, name)}
                      isDownloading={downloading === url}
                    />
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
        <View style={{ flex: 1, backgroundColor: 'rgba(10, 15, 30, 0.98)' }}>
          {/* Top Bar with safe spacing below Dynamic Island / Notch */}
          <View style={{
            paddingTop: Math.max(insets.top + 8, 48),
            paddingHorizontal: 20,
            paddingBottom: 14,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10
          }}>
            {/* Close Button (X) */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setImgExpanded(null)}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.25)',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} color="white" strokeWidth={2.5} />
            </TouchableOpacity>

            {/* Download Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                if (imgExpanded) {
                  handleDownload(imgExpanded, imgExpandedName);
                }
              }}
              style={{
                height: 42,
                paddingHorizontal: 16,
                borderRadius: 21,
                backgroundColor: '#0055d4',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.25)',
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              {downloading === imgExpanded ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Download size={16} color="white" strokeWidth={2.5} />
                  <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>
                    {language === 'ar' ? 'تحميل' : language === 'fr' ? 'Télécharger' : 'Download'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Full Screen Image with Background Loading Spinner */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setImgExpanded(null)}
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative', paddingHorizontal: 10 }}
          >
            {modalImgLoading && (
              <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', zIndex: 0 }}>
                <ActivityIndicator size="large" color="#38bdf8" />
              </View>
            )}

            {imgExpanded && (
              <Image
                source={{ uri: imgExpanded }}
                style={{ width: width, height: '80%', zIndex: 1 }}
                resizeMode="contain"
                onLoad={() => setModalImgLoading(false)}
                onError={() => setModalImgLoading(false)}
                onLoadEnd={() => setModalImgLoading(false)}
              />
            )}

            <Text style={{ color: 'white', marginTop: 16, fontSize: 13, fontWeight: '600', opacity: 0.6, zIndex: 2 }}>
              {language === 'ar' ? 'انقر في أي مكان للإغلاق' : language === 'fr' ? 'Appuyez n\'importe où pour fermer' : 'Tap anywhere to close'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
