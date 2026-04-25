import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Calendar, FileText, Image as ImageIcon, Download, Clock, ArrowUp, MoreHorizontal } from 'lucide-react-native';
import { downloadAndPreviewPDF } from '../utils/fileUtils';

const { width } = Dimensions.get('window');

export const HomeworkDetailScreen = ({ route, navigation }: any) => {
  const { homework: initialHomework } = route.params;
  const [homework, setHomework] = React.useState(initialHomework);
  const [loading, setLoading] = React.useState(!initialHomework.title);
  const [downloading, setDownloading] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!homework.title && homework.id) {
      const fetchTask = async () => {
        try {
          setLoading(true);
          // We can fetch from the mobile home API or a specialized endpoint
          // For now, let's assume we can get it from the home data for today
          const { studentService } = await import('../services/api');
          const studentId = route.params.studentId || 'student1'; // Fallback to student1 if not provided
          const data = await studentService.fetchDayData(studentId, new Date().toISOString().split('T')[0]);
          const found = [...(data.homeworkGiven || []), ...(data.homeworkDue || [])].find(h => h.id === homework.id);
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

  if (loading) {
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
  const attachmentUrls = homework.img ? homework.img.split(',') : [];

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
          backgroundColor: '#fff7ed', 
          paddingHorizontal: 12, 
          paddingVertical: 6, 
          borderRadius: 100, 
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 20,
          borderWidth: 1,
          borderColor: '#ffedd5'
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b', marginRight: 8 }} />
          <Text style={{ color: '#f59e0b', fontSize: 13, fontWeight: '700' }}>Pending</Text>
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

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <View style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: 24, padding: 18, borderWidth: 1.5, borderColor: '#f1f3f5' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Calendar size={14} color="#0055d4" strokeWidth={2.5} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#0055d4', marginLeft: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Assigned</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1a1d1e' }}>{assignedDate.main}</Text>
            <Text style={{ fontSize: 12, color: '#adb5bd', marginTop: 2, fontWeight: '500' }}>{assignedDate.sub}</Text>
          </View>

          <View style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: 24, padding: 18, borderWidth: 1.5, borderColor: '#f1f3f5' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Clock size={14} color="#ef4444" strokeWidth={2.5} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#ef4444', marginLeft: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Due</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1a1d1e' }}>{dueDate.main}</Text>
            <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 2, fontWeight: '600' }}>{dueDate.sub}</Text>
          </View>
        </View>

        <View style={{ 
          backgroundColor: urgency.color === '#ef4444' ? '#fef2f2' : '#fff7ed', 
          borderRadius: 24, 
          padding: 20, 
          marginBottom: 32, 
          flexDirection: 'row', 
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: urgency.color === '#ef4444' ? '#fee2e2' : '#ffedd5'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 24, marginRight: 12 }}>{urgency.color === '#ef4444' ? '🚫' : '⌛'}</Text>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: urgency.color }}>
                {urgency.label.split(' ')[0]} <Text style={{ color: '#9a3412', fontWeight: '500' }}>{urgency.label.split(' ').slice(1).join(' ')}</Text>
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '500', color: '#9a3412' }}>submit</Text>
            </View>
          </View>
          <View style={{ width: 120, height: 8, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ width: `${urgency.percent}%`, height: '100%', backgroundColor: urgency.color, borderRadius: 4 }} />
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
            attachmentUrls.map((url, index) => {
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
      </ScrollView>
    </SafeAreaView>
  );
};


