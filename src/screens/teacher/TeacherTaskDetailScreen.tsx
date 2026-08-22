import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, StatusBar, RefreshControl, Modal, Dimensions, Alert, Linking
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, CheckCircle2, Clock, Users, Image as ImageIcon, FileText as FileIcon, Paperclip, CalendarDays, Download, X } from 'lucide-react-native';
import { teacherService } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { downloadAndPreviewPDF } from '../../utils/fileUtils';
import moment from 'moment';

const { width } = Dimensions.get('window');

const Avatar = ({ name, img, size = 44 }: any) => {
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  if (img) {
    return <Image source={{ uri: img }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#e2e8f0' }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.33, fontWeight: '900', color: '#0055d4' }}>{initials}</Text>
    </View>
  );
};

export const TeacherTaskDetailScreen = ({ route, navigation }: any) => {
  const { task } = route.params;
  const { t, language, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedImg, setSelectedImg] = React.useState<string | null>(null);
  const [modalImgLoading, setModalImgLoading] = React.useState(true);
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

  const fetchData = async () => {
    try {
      const res = await teacherService.fetchTaskSubmissions(task.id);
      if (res && res.totalStudents !== undefined) {
        setData(res);
      } else {
        // API returned null or an error object — show what we got for debugging
        console.warn('[TaskDetail] Unexpected response:', JSON.stringify(res));
        Alert.alert(
          'Could not load submissions',
          res?.error ? `Server error: ${res.error}` : 'The server returned an unexpected response. Check console logs.',
          [{ text: 'OK' }]
        );
        setData({ totalStudents: 0, submittedCount: 0, submitted: [], pending: [], title: task.title, className: task.className });
      }
    } catch (e: any) {
      console.error('[TaskDetail] fetch error:', e?.message);
      setData({ totalStudents: 0, submittedCount: 0, submitted: [], pending: [], title: task.title, className: task.className });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => { fetchData(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const total = data?.totalStudents ?? 0;
  const submittedCount = data?.submittedCount ?? 0;
  const percent = total > 0 ? Math.round((submittedCount / total) * 100) : 0;

  // Task attachments
  const attachments = task?.attachments || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}>
          <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
            <ChevronLeft size={22} color="#1e293b" />
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: isRTL ? 0 : 16, marginRight: isRTL ? 16 : 0 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>{task.title}</Text>
          <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '700', marginTop: 1, textAlign: isRTL ? 'right' : 'left' }}>{task.className}</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0055d4" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0055d4" />}
        >
          {/* Date Indications (Moved to top) */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20, justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
            {(task.startDate || task.createdAt) && (
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
                <CalendarDays size={14} color="#64748b" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569', marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }}>
                  {language === 'ar' ? 'نُشر في: ' : language === 'fr' ? 'Publié le : ' : 'Posted: '}
                  {moment(task.startDate || task.createdAt).format('DD MMM YYYY')}
                </Text>
              </View>
            )}
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: (task.dueDate && moment(task.dueDate).year() > 1970) ? '#fff7ed' : '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
              <Clock size={14} color={(task.dueDate && moment(task.dueDate).year() > 1970) ? '#ea580c' : '#64748b'} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: (task.dueDate && moment(task.dueDate).year() > 1970) ? '#c2410c' : '#475569', marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }}>
                {language === 'ar' ? 'آخر موعد: ' : language === 'fr' ? 'À rendre le : ' : 'Due: '}
                {(task.dueDate && moment(task.dueDate).year() > 1970)
                  ? moment(task.dueDate).format('DD MMM YYYY')
                  : (t?.notDetermined || (language === 'fr' ? 'Non déterminée' : language === 'ar' ? 'غير محدد' : 'Not set'))}
              </Text>
            </View>
          </View>

          {/* Progress Card */}
          <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: '#f1f5f9' }}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: isRTL ? 'right' : 'left' }}>{(t?.overallProgress || 'Overall Progress')}</Text>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'baseline', marginTop: 4 }}>
                  <Text style={{ fontSize: 36, fontWeight: '900', color: percent === 100 ? '#16a34a' : '#0055d4' }}>{percent}%</Text>
                  <Text style={{ fontSize: 14, color: '#94a3b8', marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0, fontWeight: '700' }}>{(t?.completed2 || 'completed')}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#1e293b' }}>{submittedCount}</Text>
                <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '700' }}>{language === 'ar' ? `من ${total}` : language === 'fr' ? `sur ${total}` : `of ${total}`}</Text>
              </View>
            </View>
            <View style={{ height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${percent}%`, backgroundColor: percent === 100 ? '#16a34a' : '#0055d4', borderRadius: 5, alignSelf: isRTL ? 'flex-end' : 'flex-start' }} />
            </View>
          </View>

          {/* Submitted Section */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 14 }}>
            <CheckCircle2 size={18} color="#16a34a" />
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#1e293b', marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}>{language === 'ar' ? `المُسلّمة (${submittedCount})` : language === 'fr' ? `Soumis (${submittedCount})` : `Submitted (${submittedCount})`}</Text>
          </View>

          {data?.submitted?.length > 0 ? (
            data.submitted.map((student: any) => (
              <TouchableOpacity
                key={student.id}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('StudentSubmission', { student, task })}
                style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#dcfce7', flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}
              >
                <Avatar name={student.name} img={student.avatar} />
                <View style={{ flex: 1, marginLeft: isRTL ? 0 : 14, marginRight: isRTL ? 14 : 0 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }}>{student.name}</Text>
                  <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>
                    {student.submittedAt ? new Date(student.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  </Text>
                </View>
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
                      <View style={{ position: 'relative' }}>
                        {attachments[0].type === 'pdf' ? (
                          <View style={{ width: 56, height: 56, borderRadius: 12, borderWidth: 2, borderColor: '#bbf7d0', backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>PDF</Text>
                          </View>
                        ) : (
                          <Image source={{ uri: attachments[0].url }} style={{ width: 56, height: 56, borderRadius: 12, borderWidth: 2, borderColor: '#bbf7d0' }} resizeMode="cover" />
                        )}
                        {attachments.length > 1 && (
                          <View style={{ position: 'absolute', top: -6, [isRTL ? 'left' : 'right']: -6, backgroundColor: '#0055d4', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'white' }}>
                            <Text style={{ color: 'white', fontSize: 9, fontWeight: '900' }}>+{attachments.length - 1}</Text>
                          </View>
                        )}
                      </View>
                    );
                  }

                  return (
                    <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={22} color="#16a34a" />
                    </View>
                  );
                })()}
              </TouchableOpacity>
            ))
          ) : (
            <View style={{ padding: 24, alignItems: 'center', backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 10 }}>
              <Text style={{ color: '#94a3b8', fontWeight: '600', fontSize: 14 }}>{(t?.noSubmissionsYet || 'No submissions yet')}</Text>
            </View>
          )}

          {/* Pending Section */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 16, marginBottom: 14 }}>
            <Clock size={18} color="#f59e0b" />
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#1e293b', marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}>{language === 'ar' ? `قيد الانتظار (${data?.pending?.length ?? 0})` : language === 'fr' ? `En attente (${data?.pending?.length ?? 0})` : `Pending (${data?.pending?.length ?? 0})`}</Text>
          </View>

          {data?.pending?.map((student: any) => (
            <View key={student.id} style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#fef3c7', flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
              <Avatar name={student.name} img={student.avatar} />
              <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', color: '#1e293b', marginLeft: isRTL ? 0 : 14, marginRight: isRTL ? 14 : 0, flex: 1, textAlign: isRTL ? 'right' : 'left' }}>{student.name}</Text>
              <View style={{ backgroundColor: '#fff7ed', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#fed7aa', flexShrink: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '900', color: '#ea580c' }}>⏳ {(t?.pending || 'Pending')}</Text>
              </View>
            </View>
          ))}

          {/* Task Instructions & Teacher Attachments Card (Bottom) */}
          {(task.description || attachments.length > 0 || task.startDate || task.dueDate) && (
            <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, marginTop: 16, borderWidth: 1, borderColor: '#f1f5f9' }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 16 }}>
                <Paperclip size={16} color="#0055d4" />
                <Text style={{ fontSize: 12, fontWeight: '900', color: '#0055d4', textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }}>
                  {(t?.taskDetailsAttachments || 'Task Details & Attachments')}
                </Text>
              </View>

              {task.description ? (
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155', lineHeight: 21, marginBottom: attachments.length > 0 ? 16 : 0, textAlign: isRTL ? 'right' : 'left' }}>
                  {task.description}
                </Text>
              ) : null}

              {attachments.length > 0 && (
                <View style={{ marginTop: task.description ? 4 : 0 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>
                    {language === 'ar' ? `الملفات المرفقة (${attachments.length})` : language === 'fr' ? `Fichiers joints (${attachments.length})` : `Attached Files (${attachments.length})`}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
                    {attachments.map((att: any, idx: number) => {
                      const uri = typeof att === 'string' ? att : (att.uri || att.url);
                      const isPdf = att.type === 'PDF' || (uri && uri.toLowerCase().includes('.pdf'));

                      return (
                        <TouchableOpacity
                          key={idx}
                          activeOpacity={0.85}
                          onPress={() => {
                            if (isPdf) {
                              Linking.openURL(uri);
                            } else {
                              setSelectedImg(uri);
                            }
                          }}
                          style={{
                            width: 88, height: 88, borderRadius: 16, overflow: 'hidden',
                            backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: isPdf ? '#dbeafe' : '#e2e8f0',
                            alignItems: 'center', justifyContent: 'center',
                            transform: [{ scaleX: isRTL ? -1 : 1 }]
                          }}
                        >
                          {isPdf ? (
                            <View style={{ alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                              <FileIcon size={26} color="#0055d4" />
                              <Text style={{ fontSize: 10, fontWeight: '900', color: '#0055d4', marginTop: 4 }}>PDF</Text>
                            </View>
                          ) : (
                            <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Full-screen Image Viewer */}
      <Modal visible={!!selectedImg} transparent animationType="fade" onRequestClose={() => setSelectedImg(null)}>
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
              onPress={() => setSelectedImg(null)}
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
                if (selectedImg) {
                  const fileName = selectedImg.split('/').pop() || 'attachment.jpg';
                  handleDownload(selectedImg, fileName);
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
              {downloading === selectedImg ? (
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
            onPress={() => setSelectedImg(null)}
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative', paddingHorizontal: 10 }}
          >
            {modalImgLoading && (
              <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', zIndex: 0 }}>
                <ActivityIndicator size="large" color="#38bdf8" />
              </View>
            )}

            {selectedImg && (
              <Image
                source={{ uri: selectedImg }}
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
