import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, Share, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Share2, Bookmark, Clock, Megaphone, FileText, Download } from 'lucide-react-native';
import { downloadAndPreviewPDF } from '../utils/fileUtils';

export const AnnouncementDetailScreen = ({ route, navigation }: any) => {
  const { announcement } = route.params;

  const [downloading, setDownloading] = React.useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${announcement.title}\n\n${announcement.content}`,
        title: announcement.title,
      });
    } catch (error) {
      console.error('Error sharing announcement:', error);
    }
  };

  const handleDownload = async () => {
    if (announcement.pdfUrl) {
      setDownloading(true);
      try {
        await downloadAndPreviewPDF(announcement.pdfUrl, `${announcement.title}.pdf`);
      } finally {
        setDownloading(false);
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingHorizontal: 20, 
        paddingVertical: 16, 
        borderBottomWidth: 1, 
        borderBottomColor: '#f1f4f6' 
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={{ 
              width: 40, 
              height: 40, 
              alignItems: 'center', 
              justifyContent: 'center', 
              borderRadius: 12, 
              backgroundColor: '#f8f9fa' 
            }}
          >
            <ChevronLeft color="#2b3437" size={24} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b3437', marginLeft: 12 }}>Details</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity 
            onPress={handleShare}
            style={{ 
              width: 40, 
              height: 40, 
              alignItems: 'center', 
              justifyContent: 'center', 
              borderRadius: 12, 
              backgroundColor: '#f8f9fa' 
            }}
          >
            <Share2 color="#2b3437" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Main Image */}
        <Image 
          source={{ uri: announcement.image }} 
          style={{ width: '100%', height: 280 }} 
          resizeMode="cover"
        />

        <View style={{ padding: 24 }}>
          {/* Metadata */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ 
              backgroundColor: announcement.category === 'URGENT' || announcement.category === 'Urgent' ? '#fee2e2' : '#0055d410', 
              paddingHorizontal: 12, 
              paddingVertical: 6, 
              borderRadius: 8 
            }}>
              <Text style={{ 
                fontSize: 11, 
                fontWeight: 'bold', 
                color: announcement.category === 'URGENT' || announcement.category === 'Urgent' ? '#ef4444' : '#0055d4', 
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}>
                {announcement.category}
              </Text>
            </View>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', marginHorizontal: 12 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Clock size={14} color="#737c7f" />
              <Text style={{ fontSize: 13, color: '#737c7f', marginLeft: 6 }}>{announcement.date}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={{ 
            fontSize: 28, 
            fontWeight: 'black', 
            color: '#2b3437', 
            lineHeight: 36,
            marginBottom: 24,
            letterSpacing: -0.5
          }}>
            {announcement.title}
          </Text>

          {/* Overview Section */}
          <View style={{ 
            backgroundColor: '#f0f9ff', 
            borderRadius: 20, 
            padding: 20, 
            marginBottom: 32,
            borderWidth: 1,
            borderColor: '#e0f2fe'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <FileText size={16} color="#0369a1" />
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#0369a1', textTransform: 'uppercase', marginLeft: 8, letterSpacing: 0.5 }}>Quick Overview</Text>
            </View>
            <Text style={{ fontSize: 14, color: '#0c4a6e', lineHeight: 20, fontWeight: '500' }}>
              {announcement.excerpt}
            </Text>
          </View>

          {/* Download Button Component */}
          {announcement.pdfUrl && (
            <TouchableOpacity 
              onPress={handleDownload}
              style={{
                backgroundColor: '#ffffff',
                borderWidth: 2,
                borderColor: '#0055d4',
                padding: 20,
                borderRadius: 24,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 32,
                shadowColor: '#0055d4',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 4
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
                  <Download color="#0055d4" size={24} />
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#2b3437' }}>Download Attachment</Text>
                  <Text style={{ fontSize: 12, color: '#737c7f', marginTop: 2 }}>{downloading ? 'Preparing document...' : 'Official PDF Document'}</Text>
                </View>
              </View>
              <View style={{ backgroundColor: '#0055d4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, minWidth: 70, alignItems: 'center' }}>
                {downloading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#ffffff', textTransform: 'uppercase' }}>GET PDF</Text>
                )}
              </View>
            </TouchableOpacity>
          )}

          {/* Icon Divider */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: 32,
            backgroundColor: '#f8f9fa',
            padding: 16,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#f1f4f6'
          }}>
            <View style={{ 
              width: 44, 
              height: 44, 
              borderRadius: 14, 
              backgroundColor: '#0055d4', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Megaphone color="#ffffff" size={22} />
            </View>
            <View style={{ marginLeft: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2b3437' }}>Official Announcement</Text>
              <Text style={{ fontSize: 12, color: '#737c7f', marginTop: 1 }}>SnapSchool Administration</Text>
            </View>
          </View>

          {/* Long Content */}
          <View style={{ marginBottom: 40 }}>
            <Text style={{ 
              fontSize: 16, 
              color: '#4b5563', 
              lineHeight: 28,
              textAlign: 'justify'
            }}>
              {announcement.content}
            </Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={{
              backgroundColor: '#0055d4',
              height: 56,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#0055d4',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
              elevation: 8
            }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#ffffff' }}>Back to Comm Center</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
