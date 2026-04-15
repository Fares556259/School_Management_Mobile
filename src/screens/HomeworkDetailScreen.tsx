import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Calendar, User, FileText, Image as ImageIcon, Download, Clock } from 'lucide-react-native';
import { downloadAndPreviewPDF } from '../utils/fileUtils';

export const HomeworkDetailScreen = ({ route, navigation }: any) => {
  const { homework } = route.params;

  const [downloading, setDownloading] = React.useState(false);

  // Mock details that would normally come from an API
  const homeworkDetails = {
    teacher: 'Dr. Robert Smith',
    description: 'Please complete the exercises from page 42 to 45. Focus on the integration of complex functions and show all steps of your derivation. This assignment will be reviewed during our next seminar.',
    attachment: {
      type: 'pdf',
      name: 'Calculus_Unit4_Practice.pdf',
      size: '2.4 MB',
      url: 'https://res.cloudinary.com/demo/image/upload/multi_page_pdf.pdf' // Example PDF
    },
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80'
  };

  const handleDownload = async () => {
    if (homeworkDetails.attachment.url) {
      setDownloading(true);
      try {
        await downloadAndPreviewPDF(homeworkDetails.attachment.url, homeworkDetails.attachment.name);
      } finally {
        setDownloading(false);
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f4f6' }}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft color="#2b3437" size={24} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b3437', marginLeft: 8 }}>Task Details</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {/* Title & Badge */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#2b3437', flex: 1 }}>{homework.title}</Text>
            <View style={{ backgroundColor: homework.isUrgent ? '#fee2e2' : '#f0fdf4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
              <Text style={{ color: homework.isUrgent ? '#ef4444' : '#22c55e', fontSize: 10, fontWeight: 'bold' }}>
                {homework.isUrgent ? 'URGENT' : 'PENDING'}
              </Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <User size={14} color="#737c7f" />
            <Text style={{ fontSize: 13, color: '#737c7f', marginLeft: 4 }}>{homeworkDetails.teacher}</Text>
          </View>
        </View>

        {/* Dates Card */}
        <View style={{ backgroundColor: '#f8f9fa', borderRadius: 24, padding: 20, flexDirection: 'row', marginBottom: 32 }}>
          <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#e2e9ec', paddingRight: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Calendar size={14} color="#0055d4" />
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#0055d4', marginLeft: 6, textTransform: 'uppercase' }}>Assigned</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#2b3437' }}>{homework.assignedDate}</Text>
          </View>
          <View style={{ flex: 1, paddingLeft: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Clock size={14} color="#ef4444" />
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#ef4444', marginLeft: 6, textTransform: 'uppercase' }}>Submission</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#2b3437' }}>{homework.dueDate}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b3437', marginBottom: 12 }}>Instruction</Text>
          <Text style={{ fontSize: 15, color: '#586064', lineHeight: 24 }}>{homeworkDetails.description}</Text>
        </View>

        {/* Attachments */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b3437', marginBottom: 16 }}>Attachments</Text>
          
          {/* File Attachment */}
          <TouchableOpacity 
            onPress={handleDownload}
            disabled={downloading}
            style={{ 
              backgroundColor: 'white', 
              borderWidth: 1, 
              borderColor: '#f1f4f6', 
              borderRadius: 20, 
              padding: 16, 
              flexDirection: 'row', 
              alignItems: 'center',
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.03,
              shadowRadius: 8,
              elevation: 2
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
              {downloading ? <ActivityIndicator size="small" color="#ef4444" /> : <FileText color="#ef4444" size={24} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2b3437' }} numberOfLines={1}>{homeworkDetails.attachment.name}</Text>
              <Text style={{ fontSize: 12, color: '#737c7f', marginTop: 2 }}>{downloading ? 'Downloading...' : homeworkDetails.attachment.size}</Text>
            </View>
            <Download size={20} color={downloading ? '#abb3b7' : "#0055d4"} />
          </TouchableOpacity>

          {/* Image Attachment */}
          <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: '#f1f4f6' }}>
            <Image 
              source={{ uri: homeworkDetails.image }} 
              style={{ width: '100%', height: 200 }} 
              resizeMode="cover"
            />
            <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ImageIcon size={16} color="#737c7f" />
                <Text style={{ fontSize: 12, color: '#737c7f', marginLeft: 6 }}>Assignment_Context.jpg</Text>
              </View>
              <Download size={18} color="#0055d4" />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
