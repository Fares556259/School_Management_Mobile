import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFullImageUrl } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  FileText, 
  Image as ImageIcon, 
  Download, 
  MoreHorizontal, 
  X, 
  Paperclip, 
  BookOpen, 
  User, 
  AlertCircle 
} from 'lucide-react-native';
import { downloadAndPreviewPDF } from '../utils/fileUtils';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

export const HomeworkDetailScreen = ({ route, navigation }: any) => {
  const { homework: initialHomework } = route.params;
  const [homework, setHomework] = React.useState(initialHomework);
  const [loading, setLoading] = React.useState(!initialHomework.title);
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [statusLoading, setStatusLoading] = React.useState(true);

  const studentId = route.params.studentId;
  const { t, language, isRTL, getTranslatedSubject } = useLanguage();

  const [submissionFiles, setSubmissionFiles] = React.useState<{name: string, url: string, type: string}[]>([]);
  const [uploadingImg, setUploadingImg] = React.useState(false);

  // Fetch task status
  React.useEffect(() => {
    if (!homework.id || !studentId) {
      setStatusLoading(false);
      return;
    }
    const checkStatus = async () => {
      try {
        const { studentService, getFullImageUrl } = await import('../services/api');
        const status = await studentService.checkTaskStatus(studentId, homework.id);
        setIsCompleted(status.isCompleted);
        if (status.img) {
          const files = status.img.split(',').map((url: string, idx: number) => ({
            name: `Photo_${idx + 1}.jpg`,
            url: getFullImageUrl(url) as string,
            type: 'IMAGE'
          }));
          setSubmissionFiles(files);
        }
      } catch (e) {
        console.error('[HomeworkDetail] Failed to check status', e);
      } finally {
        setStatusLoading(false);
      }
    };
    checkStatus();
  }, [homework.id, studentId]);

  const pickSubmissionImage = async () => {
    if (submissionFiles.length >= 4) {
      Alert.alert("Limite atteinte", "Vous pouvez ajouter 4 photos au maximum.");
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t.permissionNeeded, t.allowPhotoAccess);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const remainingSlots = 4 - submissionFiles.length;
        const assetsToUpload = result.assets.slice(0, remainingSlots);

        if (result.assets.length > remainingSlots) {
          Alert.alert("Information", `Seules ${remainingSlots} photo(s) ont été ajoutées (maximum 4 photos).`);
        }

        const localFiles = assetsToUpload.map((asset) => {
          const uri = asset.uri;
          const fileName = asset.fileName || uri.split('/').pop() || 'image.jpg';
          return { name: fileName, url: uri, type: 'IMAGE' };
        });
        
        setSubmissionFiles(prev => [...prev, ...localFiles]);
      }
    } catch (e: any) {
      Alert.alert(t.error, t.error + ': ' + (e.message || ''));
    }
  };

  const pickSubmissionDocument = async () => {
    try {
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        multiple: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadingImg(true);
        const { uiService } = await import('../services/api');
        
        const uploadedFiles = await Promise.all(
          result.assets.map(async (asset) => {
            const uri = asset.uri;
            const fileName = asset.name;
            const uploadedUrl = await uiService.uploadImage(uri, 'student', studentId);
            return { name: fileName, url: uploadedUrl?.url || uri, type: 'PDF' };
          })
        );
        
        setSubmissionFiles(prev => [...prev, ...uploadedFiles]);
      }
    } catch (e: any) {
      Alert.alert(t.error, t.error + ': ' + (e.message || ''));
    } finally {
      setUploadingImg(false);
    }
  };

  const removeSubmissionFile = (index: number) => {
    setSubmissionFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleMarkAsDone = async () => {
    try {
      setSubmitting(true);
      const { studentService, uiService } = await import('../services/api');
      
      const uploadedUrls: string[] = [];
      for (const file of submissionFiles) {
        if (file.url && file.url.startsWith('http')) {
          uploadedUrls.push(file.url);
        } else {
          // Upload local URI
          const uploadedRes = await uiService.uploadImage(file.url, 'student', studentId);
          if (uploadedRes?.url) {
             uploadedUrls.push(uploadedRes.url);
          }
        }
      }

      const finalImageUrl = uploadedUrls.length > 0 ? uploadedUrls.join(',') : undefined;
      await studentService.submitTask(studentId, homework.id, finalImageUrl);
      
      // Update local URLs to remote URLs immediately
      setSubmissionFiles(uploadedUrls.map((url, idx) => ({
        name: `Photo_${idx + 1}.jpg`,
        url: url,
        type: 'IMAGE'
      })));
      
      setIsCompleted(true);
      Alert.alert(t.successAlert, t.taskCompletedWellDone);
    } catch (e: any) {
      Alert.alert("Error", `${t.failedToUpdate} ${e.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  React.useEffect(() => {
    if (!homework.title && homework.id) {
      const fetchTask = async () => {
        try {
          setLoading(true);
          const { studentService } = await import('../services/api');
          const taskDate = homework.startDate ? homework.startDate.split('T')[0] : new Date().toISOString().split('T')[0];
          const data = await studentService.fetchDayData(studentId, taskDate);
          const found = [...(data.homeworkGiven || []), ...(data.homeworkDue || [])].find((h: any) => h.id === homework.id);
          if (found) {
            setHomework(found);
          } else {
            Alert.alert("Error", t.taskNotFound);
            navigation.goBack();
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchTask();
    }
  }, [homework.id]);

  if (loading || statusLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#0055d4" />
      </View>
    );
  }

  const teacherName = homework.teacher || t.teacher || 'Teacher';
  const teacherInitials = teacherName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  const description = homework.description || t.noDescription;
  
  // Attachments
  const attachmentUrls = (homework.img ? homework.img.split(',') : []).map(getFullImageUrl).filter(Boolean);

  const handleDownload = async (url: string, name: string) => {
    setDownloading(url);
    try {
      await downloadAndPreviewPDF(url, name);
    } finally {
      setDownloading(null);
    }
  };

  const renderHighlightedText = (text: string) => {
    const highlights = [
      /pages?\s+\d+(?: to |-|–)\d+/gi,
      /all\s+steps/gi,
      /complex\s+functions/gi
    ];
    let parts = [text];
    highlights.forEach(regex => {
      let newParts: any[] = [];
      parts.forEach(part => {
        if (typeof part !== 'string') {
          newParts.push(part);
          return;
        }
        const splitParts = part.split(regex);
        const matches = part.match(regex);
        splitParts.forEach((sp, i) => {
          newParts.push(sp);
          if (matches && matches[i]) {
            newParts.push(
              <Text key={`${i}-${matches[i]}`} style={{ color: '#0055d4', fontWeight: '700' }}>
                {matches[i]}
              </Text>
            );
          }
        });
      });
      parts = newParts;
    });
    return parts;
  };

  const formatFriendlyDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const isTomorrow = date.toDateString() === tomorrow.toDateString();
      
      const locale = language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar-TN' : 'en-US';
      const options: any = { month: 'short', day: 'numeric', year: 'numeric' };
      const formatted = date.toLocaleDateString(locale, options);
      
      if (isToday) return { main: formatted, sub: t.todayDate || (language === 'fr' ? "Aujourd'hui" : language === 'ar' ? "اليوم" : "Today") };
      if (isTomorrow) return { main: formatted, sub: t.tomorrowDate || (language === 'fr' ? "Demain" : language === 'ar' ? "غداً" : "Tomorrow") };
      
      return { main: formatted, sub: date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) };
    } catch (e) {
      return { main: dateStr, sub: '' };
    }
  };

  const hasDueDate = Boolean(
    homework.dueDate &&
    homework.dueDate !== 'null' &&
    new Date(homework.dueDate).getFullYear() > 1970
  );

  const assignedDate = formatFriendlyDate(homework.startDate || new Date().toISOString());
  const dueDate = hasDueDate 
    ? formatFriendlyDate(homework.dueDate) 
    : { main: t.notDetermined || 'Non déterminée', sub: '' };

  const getTimeRemaining = () => {
    if (!hasDueDate) {
      return { label: t.noDeadline || 'Pas de date limite', color: '#64748b', bg: '#f1f5f9' };
    }
    const due = new Date(homework.dueDate);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    if (diff <= 0) return { label: t.deadlinePassed, color: '#ef4444', bg: '#fee2e2' };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return { label: `~${days} ${t.daysLeft}`, color: '#d97706', bg: '#fef3c7' };
    return { label: `~${hours} ${t.hoursLeft}`, color: '#d97706', bg: '#fef3c7' };
  };

  const urgency = getTimeRemaining();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      {/* Navigation Header */}
      <View style={{ 
        flexDirection: isRTL ? 'row-reverse' : 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingHorizontal: 20, 
        paddingVertical: 14,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
      }}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={{ 
            width: 40, 
            height: 40, 
            alignItems: 'center', 
            justifyContent: 'center', 
            backgroundColor: '#f8fafc',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#e2e8f0'
          }}
        >
          {isRTL ? <ChevronRight color="#1e293b" size={20} strokeWidth={2.5} /> : <ChevronLeft color="#1e293b" size={20} strokeWidth={2.5} />}
        </TouchableOpacity>

        <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a' }}>{t.taskDetails}</Text>

        <TouchableOpacity 
          style={{ 
            width: 40, 
            height: 40, 
            alignItems: 'center', 
            justifyContent: 'center', 
            backgroundColor: '#f8fafc',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#e2e8f0'
          }}
        >
          <MoreHorizontal color="#64748b" size={20} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
      >
        {/* Status & Urgency Bar */}
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          {/* Status Badge */}
          <View style={{ 
            backgroundColor: isCompleted ? '#dcfce7' : '#fef3c7', 
            paddingHorizontal: 14, 
            paddingVertical: 6, 
            borderRadius: 20, 
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 6
          }}>
            {isCompleted ? <CheckCircle2 size={14} color="#16a34a" strokeWidth={2.5} /> : <Clock size={14} color="#d97706" strokeWidth={2.5} />}
            <Text style={{ color: isCompleted ? '#15803d' : '#b45309', fontSize: 13, fontWeight: '800' }}>
              {isCompleted ? t.completed : t.pending}
            </Text>
          </View>

          {/* Time Remaining Badge (only if pending) */}
          {!isCompleted && urgency && (
            <View style={{ 
              backgroundColor: urgency.bg, 
              paddingHorizontal: 12, 
              paddingVertical: 6, 
              borderRadius: 20,
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 6
            }}>
              <AlertCircle size={13} color={urgency.color} strokeWidth={2.5} />
              <Text style={{ color: urgency.color, fontSize: 12, fontWeight: '800' }}>
                {urgency.label}
              </Text>
            </View>
          )}
        </View>

        {/* Task Title */}
        <Text style={{ 
          fontSize: 22, 
          fontWeight: '900', 
          color: '#0f172a', 
          lineHeight: 30, 
          marginBottom: 16, 
          textAlign: isRTL ? 'right' : 'left' 
        }}>
          {homework.title}
        </Text>

        {/* Teacher / Author Card */}
        <View style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: 18, 
          padding: 14, 
          borderWidth: 1, 
          borderColor: '#e2e8f0',
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.02,
          shadowRadius: 6,
          elevation: 1
        }}>
          <View style={{ 
            width: 42, 
            height: 42, 
            borderRadius: 21, 
            backgroundColor: '#eff6ff', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginRight: isRTL ? 0 : 12,
            marginLeft: isRTL ? 12 : 0,
            borderWidth: 1,
            borderColor: '#bfdbfe'
          }}>
            <Text style={{ color: '#0055d4', fontSize: 14, fontWeight: '800' }}>{teacherInitials}</Text>
          </View>
          <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b' }}>{teacherName}</Text>
            <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' }}>
              {t.teacherLabel || 'Enseignant(e)'}{getTranslatedSubject(homework.subject) ? ` • ${getTranslatedSubject(homework.subject)}` : ''}
            </Text>
          </View>
        </View>

        {/* Dates Grid Card (Assigned Date & Due Date) */}
        <View style={{ 
          flexDirection: isRTL ? 'row-reverse' : 'row', 
          gap: 12, 
          marginBottom: 20 
        }}>
          {/* Assigned Date */}
          <View style={{ 
            flex: 1, 
            backgroundColor: '#ffffff', 
            borderRadius: 18, 
            padding: 14, 
            borderWidth: 1, 
            borderColor: '#e2e8f0',
            alignItems: isRTL ? 'flex-end' : 'flex-start'
          }}>
            <View style={{ 
              width: 34, 
              height: 34, 
              borderRadius: 10, 
              backgroundColor: '#eff6ff', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: 10 
            }}>
              <Calendar size={18} color="#0055d4" strokeWidth={2.5} />
            </View>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              {t.assignedDate}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
              {assignedDate.main}
            </Text>
            {!!assignedDate.sub && (
              <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '600' }}>
                {assignedDate.sub}
              </Text>
            )}
          </View>

          {/* Due Date */}
          <View style={{ 
            flex: 1, 
            backgroundColor: '#ffffff', 
            borderRadius: 18, 
            padding: 14, 
            borderWidth: 1, 
            borderColor: '#e2e8f0',
            alignItems: isRTL ? 'flex-end' : 'flex-start'
          }}>
            <View style={{ 
              width: 34, 
              height: 34, 
              borderRadius: 10, 
              backgroundColor: '#fff7ed', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: 10 
            }}>
              <Clock size={18} color="#d97706" strokeWidth={2.5} />
            </View>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              {t.dueDateLabel || "Date limite"}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
              {dueDate.main}
            </Text>
            {!!dueDate.sub && (
              <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '600' }}>
                {dueDate.sub}
              </Text>
            )}
          </View>
        </View>

        {/* Instructions Card */}
        <View style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: 20, 
          padding: 18, 
          borderWidth: 1, 
          borderColor: '#e2e8f0',
          marginBottom: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.02,
          shadowRadius: 6,
          elevation: 1
        }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <BookOpen size={18} color="#0055d4" strokeWidth={2.5} />
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#475569', letterSpacing: 1, textTransform: 'uppercase' }}>
              {t.instructions}
            </Text>
          </View>
          <Text style={{ fontSize: 15, color: '#334155', lineHeight: 24, fontWeight: '500', textAlign: isRTL ? 'right' : 'left' }}>
            {renderHighlightedText(description)}
          </Text>
        </View>

        {/* Attachments Card */}
        <View style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: 20, 
          padding: 18, 
          borderWidth: 1, 
          borderColor: '#e2e8f0',
          marginBottom: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.02,
          shadowRadius: 6,
          elevation: 1
        }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Paperclip size={18} color="#0055d4" strokeWidth={2.5} />
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#475569', letterSpacing: 1, textTransform: 'uppercase' }}>
              {t.attachments}
            </Text>
          </View>

          {attachmentUrls.length > 0 ? (
            attachmentUrls.map((url: any, index: number) => {
              const isPdf = url.toLowerCase().endsWith('.pdf');
              const fileName = url.split('/').pop() || `Attachment_${index + 1}`;
              
              return (
                <TouchableOpacity 
                  key={index}
                  onPress={() => handleDownload(url, fileName)}
                  activeOpacity={0.7}
                  style={{ 
                    backgroundColor: '#f8fafc', 
                    borderRadius: 14, 
                    padding: 14, 
                    flexDirection: isRTL ? 'row-reverse' : 'row', 
                    alignItems: 'center',
                    marginBottom: index === attachmentUrls.length - 1 ? 0 : 10,
                    borderWidth: 1,
                    borderColor: '#f1f5f9'
                  }}
                >
                  <View style={{ 
                    width: 42, 
                    height: 42, 
                    borderRadius: 12, 
                    backgroundColor: isPdf ? '#fee2e2' : '#eff6ff', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginRight: isRTL ? 0 : 12,
                    marginLeft: isRTL ? 12 : 0
                  }}>
                    {downloading === url ? (
                      <ActivityIndicator size="small" color={isPdf ? "#ef4444" : "#0055d4"} />
                    ) : (
                      isPdf ? <FileText color="#ef4444" size={20} /> : <ImageIcon color="#0055d4" size={20} />
                    )}
                  </View>
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>{fileName}</Text>
                    <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '500', textAlign: isRTL ? 'right' : 'left' }}>
                      {isPdf ? 'Document PDF' : 'Fichier Image'}
                    </Text>
                  </View>
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' }}>
                    <Download size={15} color="#475569" />
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={{ padding: 16, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12 }}>
              <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '600' }}>{t.noAttachments}</Text>
            </View>
          )}
        </View>

        {/* Student Submission Card */}
        {isCompleted && submissionFiles.length > 0 && (
          <View style={{ 
            backgroundColor: '#f8fafc', 
            borderRadius: 20, 
            padding: 18, 
            borderWidth: 1, 
            borderColor: '#e2e8f0',
            marginBottom: 20,
          }}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <CheckCircle2 size={18} color="#16a34a" strokeWidth={2.5} />
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#16a34a', letterSpacing: 1, textTransform: 'uppercase' }}>
                {language === 'ar' ? 'عملي' : language === 'fr' ? 'Mon Travail' : 'My Work'}
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              {submissionFiles.map((file, idx) => (
                <View key={idx} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' }}>
                  <ImageIcon size={18} color="#0055d4" />
                  <Text style={{ flex: 1, marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0, fontSize: 14, fontWeight: '700', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>{file.name}</Text>
                  <TouchableOpacity onPress={() => handleDownload(file.url, file.name)} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                    <Download size={14} color="#64748b" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {!isCompleted && (
          <View style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: 20, 
            padding: 18, 
            borderWidth: 1, 
            borderColor: '#e2e8f0',
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.02,
            shadowRadius: 6,
            elevation: 1
          }}>
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#475569', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14, textAlign: isRTL ? 'right' : 'left' }}>
              {t.attachWork}
            </Text>
            
            <View style={{ marginBottom: submissionFiles.length > 0 ? 14 : 0 }}>
              <TouchableOpacity 
                onPress={pickSubmissionImage} 
                disabled={uploadingImg || submissionFiles.length >= 4} 
                style={{ 
                  height: 48, 
                  borderRadius: 12, 
                  backgroundColor: submissionFiles.length >= 4 ? '#f1f5f9' : '#f5f3ff', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  flexDirection: isRTL ? 'row-reverse' : 'row', 
                  gap: 8, 
                  borderWidth: 1, 
                  borderColor: submissionFiles.length >= 4 ? '#cbd5e1' : '#ddd6fe',
                  opacity: submissionFiles.length >= 4 ? 0.6 : 1
                }}
              >
                <ImageIcon size={18} color={submissionFiles.length >= 4 ? '#94a3b8' : '#7c3aed'} />
                <Text style={{ fontSize: 14, fontWeight: '800', color: submissionFiles.length >= 4 ? '#94a3b8' : '#7c3aed' }}>
                  {t.addPhotos} ({submissionFiles.length}/4)
                </Text>
              </TouchableOpacity>
            </View>

            {uploadingImg && (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <ActivityIndicator color="#0055d4" />
                <Text style={{ color: '#64748b', fontSize: 13, marginTop: 8, fontWeight: '600' }}>{t.uploading}</Text>
              </View>
            )}

            {submissionFiles.length > 0 && (
              <View style={{ gap: 8 }}>
                {submissionFiles.map((file, idx) => (
                  <View key={idx} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' }}>
                    {file.type === 'IMAGE' ? <ImageIcon size={16} color="#7c3aed" /> : <FileText size={16} color="#0055d4" />}
                    <Text style={{ flex: 1, marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0, fontSize: 13, fontWeight: '700', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>{file.name}</Text>
                    <TouchableOpacity onPress={() => removeSubmissionFile(idx)} disabled={uploadingImg}>
                      <X size={17} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={{ 
        position: 'absolute', 
        bottom: 0, left: 0, right: 0, 
        backgroundColor: '#ffffff', 
        paddingHorizontal: 20, 
        paddingTop: 14, 
        paddingBottom: 24,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10
      }}>
        <TouchableOpacity 
          disabled={isCompleted || submitting} 
          onPress={handleMarkAsDone} 
          style={{ 
            backgroundColor: isCompleted ? '#16a34a' : '#0055d4', 
            borderRadius: 16, 
            height: 54, 
            flexDirection: isRTL ? 'row-reverse' : 'row', 
            alignItems: 'center', 
            justifyContent: 'center', 
            shadowColor: isCompleted ? '#16a34a' : '#0055d4', 
            shadowOffset: { width: 0, height: 4 }, 
            shadowOpacity: 0.25, 
            shadowRadius: 8, 
            elevation: 4, 
            opacity: submitting ? 0.7 : 1 
          }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <CheckCircle2 size={22} color="#ffffff" strokeWidth={2.5} style={{ marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0 }} />
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#ffffff' }}>
                {isCompleted ? t.completedCheck : t.markAsComplete}
              </Text>
            </>
          )}
        </TouchableOpacity>
        {!isCompleted && (
          <Text style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 8, fontWeight: '600' }}>
            {t.notifyTeacher}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};
