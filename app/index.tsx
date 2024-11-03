// app/index.tsx
import React from 'react';
import {
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
  Image,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getGradeInfo, getTextColor } from '@/utils/gradeUtils';
import GreenCheckSvg17 from '@/assets/images/greenCheckSvg_17.svg';
import { useImagePicker } from '@/hooks/useImagePicker';
import { useScans } from '@/hooks/useScans';
import type { Scan } from '@/hooks/useScans';

export default function Home() {
  const router = useRouter();
  const { pickImage, isLoading: isPickerLoading } = useImagePicker();
  const { 
    scans, 
    isLoading: isRefreshing, 
    onRefresh,
    canRefresh 
  } = useScans({
    refreshLimit: 10, // 10 refreshes per minute
    refreshCooldown: 60000, // 1 minute cooldown
  });

  const handleShare = (id: string) => {
    console.log('Share scan:', id);
  };

  const openCamera = () => {
    router.push('/camera');
  };

  const renderScanCard = ({ item }: { item: Scan }) => {
    const { grade, badgeBackgroundColor, backgroundColor } = getGradeInfo(item.overall_grade);
    const textColor = getTextColor(item.overall_grade);

    return (
      <TouchableOpacity
        onPress={() => {
          router.push({
            pathname: '/ScanResults',
            params: { scanId: item.id },
          });
        }}>
        <View style={[styles.card, { backgroundColor }]}>
          <View style={styles.cardShareWrapper}>
            <TouchableOpacity onPress={() => handleShare(item.id)}>
              <View style={styles.cardShare}>
                <Ionicons name="share-outline" size={24} color="#000" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.cardTop}>
            <Image
              resizeMode="cover"
              style={styles.cardImageUrl}
              source={{ uri: item.image_url }}
            />
          </View>

          <View style={styles.cardBody}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardScanTitle, { color: textColor }]}>
                {item.scan_title || 'Untitled'}
              </Text>

              <View style={styles.cardGradeContainer}>
                {grade === 'A+' ? (
                  <GreenCheckSvg17
                    width={15}
                    height={15}
                    style={{ marginRight: 4 }}
                  />
                ) : (
                  <Text style={[styles.cardGradeLetter, { color: textColor }]}>
                    {grade}
                  </Text>
                )}
                <Text style={[styles.cardOverallGrade, { color: textColor, marginLeft: 4 }]}>
                  • {item.overall_grade.toFixed(2)}
                </Text>
              </View>
            </View>

            <Text style={[styles.cardCreatedAt, { color: textColor }]}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>

            <Text style={[styles.cardGradeDescription, { color: textColor }]}>
              {item.overall_grade_description}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }} />
          <View style={styles.headerActions}>
            <View style={styles.headerAction}>
              <TouchableOpacity onPress={pickImage} disabled={isPickerLoading}>
                <Ionicons 
                  name="cloud-upload-outline" 
                  size={24} 
                  color={isPickerLoading ? '#999' : '#000'} 
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.headerAction, { marginLeft: 16 }]}>
              <TouchableOpacity onPress={openCamera}>
                <Ionicons name="scan" size={24} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <Text style={styles.headerTitle}>My Scans</Text>
      </View>

      <FlatList
        data={scans}
        renderItem={renderScanCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#000000"
          />
        }
        ListHeaderComponent={
          isRefreshing && !canRefresh ? (
            <View style={styles.refreshLimitIndicator}>
              <Text style={styles.refreshLimitText}>
                Please wait before refreshing again
              </Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  content: {
    padding: 16,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1d1d1d',
  },
  refreshLimitIndicator: {
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshLimitText: {
    color: '#666',
    fontSize: 14,
  },
  card: {
    position: 'relative',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  cardShareWrapper: {
    position: 'absolute',
    zIndex: 1,
    top: 12,
    right: 12,
  },
  cardShare: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTop: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  cardImageUrl: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  cardBody: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardScanTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 'auto',
  },
  cardGradeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardGradeLetter: {
    fontSize: 15,
    fontWeight: '900',
  },
  cardOverallGrade: {
    fontSize: 15,
    fontWeight: '500',
  },
  cardCreatedAt: {
    marginTop: 4,
    fontSize: 12,
  },
  cardGradeDescription: {
    marginTop: 6,
    fontSize: 14,
  },
});