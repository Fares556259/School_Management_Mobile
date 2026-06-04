import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFullImageUrl } from '../services/api';
import { ChevronLeft, Calendar, CheckCircle2, FileText, Image as ImageIcon, Download, Camera, MoreHorizontal } from 'lucide-react-native';
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

  // Always fetch the real completion status from the backend on mount
  React.useEffect(() => {
    if (!homework.id || !studentId) {
      setStatusLoading(false);
      return;
    }
    const checkStatus = async () => {
      try {
        const { studentService } = await import('../services/api');
        const completed = await studentService.checkTaskStatus(studentId, homework.id);
        setIsCompleted(completed);
      } catch (e) {
        console.error('[HomeworkDetail] Failed to check status', e);
      } finally {
        setStatusLoading(false);
      }
    };
    checkStatus();
  }, [homework.id, studentId]);

  const [submissionImg, setSubmissionImg] = React.useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = React.useState(false);

  const pickSubmissionImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo access to attach work.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setUploadingImg(true);
        const uri = result.assets[0].uri;
        // Upload the image to get a URL
        const { uiService } = await import('../services/api');
        const uploadedUrl = await uiService.uploadImage(uri, 'student', studentId);
        setSubmissionImg(uploadedUrl?.url || uri);
      }
    } catch (e: any) {
      Alert.alert('Error', 'Could not pick image: ' + (e.message || ''));
    } finally {
      setUploadingImg(false);
    }
  };

  const handleMarkAsDone = async () => {
    try {
      setSubmitting(true);
      const { studentService } = await import('../services/api');
      await studentService.submitTask(studentId, homework.id, submissionImg || undefined);
      setIsCompleted(true);
      Alert.alert("Success! 🎉", "Task marked as completed. Well done!");
    } catch (e: any) {
      Alert.alert("Error", `Failed to update task status: ${e.message || "Unknown error"}`);
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
            Alert.alert("Error", "Task not found or expired.");
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#0055d4" />
      </View>
    );
  }

  const teacherName = homework.teacher || 'Teacher';
  const teacherInitials = teacherName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  const description = homework.description || 'No description provided.';
  
  // Parse multiple attachments
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
              <Text key={`${i}-${matches[i]}`} style={{ color: '#1a1d1e', fontWeight: '700' }}>
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
      const options: any = { month: 'short', day: 'numeric', year: 'numeric' };
      const formatted = date.toLocaleDateString('en-US', options);
      if (isToday) return { main: formatted, sub: 'Today' };
      if (isTomorrow) return { main: formatted, sub: 'Tomorrow · 12:00 AM' };
      return { main: formatted, sub: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    } catch (e) {
      return { main: dateStr, sub: '' };
    }
  };

  const assignedDate = formatFriendlyDate(homework.startDate || new Date().toISOString());
  const dueDate = formatFriendlyDate(homework.dueDate || new Date(Date.now() + 86400000).toISOString());

  const getTimeRemaining = () => {
    const due = new Date(homework.dueDate);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    if (diff <= 0) return { label: 'Deadline passed', percent: 100, color: '#ef4444' };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return { label: `~${days} days left`, percent: Math.max(10, 100 - (days * 10)), color: '#f59e0b' };
    return { label: `~${hours} hours left`, percent: 75, color: '#f59e0b' };
  };

  const urgency = getTimeRemaining();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingHorizontal: 20, 
        paddingVertical: 12,
        backgroundColor: '#ffffff'
      }}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={{ 
            width: 44, 
            height: 44, 
            alignItems: 'center', 
            justifyContent: 'center', 
            borderWidth: 1.5, 
            borderColor: '#f1f3f5', 
            borderRadius: 12 
          }}
        >
          <ChevronLeft color="#1a1d1e" size={20} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1a1d1e' }}>Task Details</Text>
        <TouchableOpacity 
          style={{ 
            width: 44, 
            height: 44, 
            alignItems: 'center', 
            justifyContent: 'center', 
            borderWidth: 1.5, 
            borderColor: '#f1f3f5', 
            borderRadius: 12 
          }}
        >
          <MoreHorizontal color="#1a1d1e" size={20} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
      >
        <View style={{ 
          backgroundColor: isCompleted ? '#ecfdf5' : '#fff7ed', 
          paddingHorizontal: 12, 
          paddingVertical: 6, 
          borderRadius: 100, 
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 20,
          borderWidth: 1,
          borderColor: isCompleted ? '#d1fae5' : '#ffedd5'
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isCompleted ? '#10b981' : '#f59e0b', marginRight: 8 }} />
          {isCompleted ? <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '700' }}>Completed</Text> : <Text style={{ color: '#f59e0b', fontSize: 13, fontWeight: '700' }}>Pending</Text>}
        </View>

        <Text style={{ fontSize: 36, fontWeight: '800', color: '#1a1d1e', lineHeight: 42, marginBottom: 20, letterSpacing: -1 }}>
          {homework.title}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}>
          <View style={{ 
            width: 36, 
            height: 36, 
            borderRadius: 18, 
            backgroundColor: '#e0f2fe', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginRight: 12
          }}>
            <Text style={{ color: '#0ea5e9', fontSize: 13, fontWeight: '800' }}>{teacherInitials}</Text>
          </View>
          <Text style={{ fontSize: 15, color: '#586064', fontWeight: '600' }}>{teacherName}</Text>
        </View>

        <View style={{ marginBottom: 32 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 20, borderWidth: 1.5, borderColor: '#f1f3f5', flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
              <Calendar size={20} color="#0055d4" strokeWidth={2.5} />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#0055d4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Assigned Date</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#1a1d1e' }}>{assignedDate.main}</Text>
                <Text style={{ fontSize: 13, color: '#adb5bd', marginLeft: 8, fontWeight: '600' }}>({assignedDate.sub})</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#adb5bd', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>Instructions</Text>
          <Text style={{ fontSize: 16, color: '#495057', lineHeight: 26, fontWeight: '500' }}>
            {renderHighlightedText(description)}
          </Text>
        </View>

        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#adb5bd', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>Attachments</Text>
          
          {attachmentUrls.length > 0 ? (
            attachmentUrls.map((url: any, index: number) => {
              const isPdf = url.toLowerCase().endsWith('.pdf');
              const fileName = url.split('/').pop() || `Attachment_${index + 1}`;
              
              return (
                <TouchableOpacity 
                  key={index}
                  onPress={() => handleDownload(url, fileName)}
                  style={{ 
                    backgroundColor: '#ffffff', 
                    borderRadius: 24, 
                    padding: 16, 
                    flexDirection: 'row', 
                    alignItems: 'center',
                    marginBottom: 12,
                    borderWidth: 1.5,
                    borderColor: '#f1f3f5'
                  }}
                >
                  <View style={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 16, 
                    backgroundColor: isPdf ? '#fff5f5' : '#f1f3f5', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginRight: 16 
                  }}>
                    {downloading === url ? (
                      <ActivityIndicator size="small" color={isPdf ? "#ef4444" : "#adb5bd"} />
                    ) : (
                      isPdf ? <FileText color="#ef4444" size={24} /> : <ImageIcon color="#adb5bd" size={24} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#1a1d1e' }} numberOfLines={1}>{fileName}</Text>
                    <Text style={{ fontSize: 13, color: '#adb5bd', marginTop: 2, fontWeight: '500' }}>
                      {isPdf ? 'PDF Document' : 'Image File'}
                    </Text>
                  </View>
                  <View style={{ width: 36, height: 36, borderRadius: 12, borderWidth: 1.5, borderColor: '#dee2e6', alignItems: 'center', justifyContent: 'center' }}>
                    <Download size={16} color="#adb5bd" />
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={{ padding: 20, alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 16 }}>
              <Text style={{ color: '#adb5bd', fontSize: 14 }}>No attachments provided.</Text>
            </View>
          )}
        </View>
        <View style={{ marginTop: 40, marginBottom: 20 }}>
          {!isCompleted && (
            <>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#adb5bd', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Attach Your Work (Optional)</Text>
              <TouchableOpacity onPress={pickSubmissionImage} disabled={uploadingImg} style={{ borderWidth: 2, borderColor: submissionImg ? '#0055d4' : '#e2e8f0', borderStyle: 'dashed', borderRadius: 20, padding: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20, backgroundColor: submissionImg ? '#eff6ff' : '#f8fafc', minHeight: 100 }}>
                {uploadingImg ? <ActivityIndicator color="#0055d4" /> : submissionImg ? (
                  <View style={{ alignItems: 'center' }}>
                    <Image source={{ uri: submissionImg }} style={{ width: 120, height: 120, borderRadius: 12 }} resizeMode="cover" />
                    <Text style={{ color: '#0055d4', fontWeight: '700', marginTop: 8, fontSize: 13 }}>Tap to change photo</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Camera size={32} color="#94a3b8" />
                    <Text style={{ color: '#94a3b8', fontWeight: '700', marginTop: 8, fontSize: 14 }}>Tap to attach a photo of your work</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity disabled={isCompleted || submitting} onPress={handleMarkAsDone} style={{ backgroundColor: isCompleted ? '#10b981' : '#0055d4', borderRadius: 24, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: isCompleted ? '#10b981' : '#0055d4', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? <ActivityIndicator size="small" color="#ffffff" /> : (
              <>
                <CheckCircle2 size={24} color="#ffffff" strokeWidth={2.5} style={{ marginRight: 12 }} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#ffffff' }}>{isCompleted ? 'Completed ✓' : 'Mark as Complete'}</Text>
              </>
            )}
          </TouchableOpacity>
          {!isCompleted && <Text style={{ textAlign: 'center', color: '#adb5bd', fontSize: 13, marginTop: 12, fontWeight: '600' }}>Marking this as complete will notify your teacher.</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};


