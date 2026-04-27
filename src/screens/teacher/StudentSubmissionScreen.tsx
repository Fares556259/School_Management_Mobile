import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StatusBar, Dimensions, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CheckCircle2, Calendar, Camera, Maximize2 } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export const StudentSubmissionScreen = ({ route, navigation }: any) => {
  const { student, task } = route.params;
  const [imgExpanded, setImgExpanded] = React.useState(false);

  const submittedDate = student.submittedAt
    ? new Date(student.submittedAt).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
      })
    : null;

  const submittedTime = student.submittedAt
    ? new Date(student.submittedAt).toLocaleTimeString('en-US', {
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
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}
        >
          <ChevronLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: 17, fontWeight: '900', color: '#1e293b' }}>Submission</Text>
          <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '700', marginTop: 1 }} numberOfLines={1}>{task?.title}</Text>
        </View>
        {/* Completed Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0' }}>
          <CheckCircle2 size={14} color="#16a34a" />
          <Text style={{ fontSize: 12, fontWeight: '900', color: '#16a34a', marginLeft: 6 }}>Completed</Text>
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
          <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#dcfce7', flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
              <Calendar size={22} color="#16a34a" />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.5 }}>Submitted</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginTop: 2 }}>{submittedDate}</Text>
              <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '600', marginTop: 1 }}>at {submittedTime}</Text>
            </View>
          </View>
        )}

        {/* Work Photo */}
        <Text style={{ fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Work Submitted
        </Text>

        {student.submissionImg ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setImgExpanded(true)}
            style={{ backgroundColor: 'white', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', position: 'relative' }}
          >
            <Image
              source={{ uri: student.submissionImg }}
              style={{ width: '100%', height: width - 40, borderRadius: 24 }}
              resizeMode="cover"
            />
            {/* Expand hint */}
            <View style={{ position: 'absolute', bottom: 14, right: 14, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, padding: 8, flexDirection: 'row', alignItems: 'center' }}>
              <Maximize2 size={14} color="white" />
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', marginLeft: 6 }}>Tap to expand</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#f1f5f9', borderStyle: 'dashed' }}>
            <Camera size={40} color="#d1d5db" />
            <Text style={{ color: '#94a3b8', fontWeight: '700', marginTop: 12, fontSize: 15 }}>No photo submitted</Text>
            <Text style={{ color: '#cbd5e1', fontWeight: '500', marginTop: 4, fontSize: 13, textAlign: 'center' }}>The student marked as done without attaching a photo</Text>
          </View>
        )}
      </ScrollView>

      {/* Full-screen Image Viewer */}
      <Modal visible={imgExpanded} transparent animationType="fade" onRequestClose={() => setImgExpanded(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setImgExpanded(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}
        >
          {student.submissionImg && (
            <Image
              source={{ uri: student.submissionImg }}
              style={{ width: width, height: width * 1.2 }}
              resizeMode="contain"
            />
          )}
          <Text style={{ color: 'white', marginTop: 24, fontSize: 13, fontWeight: '600', opacity: 0.6 }}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};
