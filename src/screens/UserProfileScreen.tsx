import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import PermissionsService, { UserCategory } from '../services/permissions';
import Toast from 'react-native-toast-message';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Layout, CommonStyles, Responsive } from '../design/DesignSystem';

type UserProfile = {
  uid: string;
  phone?: string;
  driverName?: string;
  photoURL?: string;
  vehicleName?: string;
  vehicleNumber?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  createdAt?: any;
  lastSeen?: any;
  isOnline?: boolean;
};

export default function UserProfileScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [relationshipStatus, setRelationshipStatus] = useState<'stranger' | 'friend' | 'tracker'>('stranger');
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [hasPendingTrackerRequest, setHasPendingTrackerRequest] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const currentUser = auth().currentUser;
  
  const { userId, userName, userPhoto } = route.params;

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    if (!userId || !currentUser) return;

    try {
      // Get user category and permissions
      const category = PermissionsService.getUserCategory(userId);
      setRelationshipStatus(category);
      
      // Check for pending requests
      setHasPendingTrackerRequest(PermissionsService.hasPendingTrackerRequest(userId));

      // Load user data
      const userDoc = await firestore().collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data() as UserProfile;
        userData.uid = userId;
        
        // Filter data based on permissions
        const permissions = PermissionsService.getPermissions(userId);
        const filteredData = PermissionsService.getFilteredUserData(userData, userId);
        
        setUserProfile(filteredData);
        
        // Calculate distance if location is available
        if (filteredData.location && currentUser.uid) {
          const currentUserDoc = await firestore().collection('users').doc(currentUser.uid).get();
          const currentUserData = currentUserDoc.data();
          
          if (currentUserData?.location) {
            const dist = calculateDistance(
              currentUserData.location.latitude,
              currentUserData.location.longitude,
              filteredData.location.latitude,
              filteredData.location.longitude
            );
            setDistance(dist);
          }
        }
        
        // Check online status (simplified - in real app would use presence system)
        setIsOnline(true); // Placeholder
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Convert to meters
  };

  const sendFriendRequest = async () => {
    if (!currentUser) return;
    
    try {
      const success = await PermissionsService.sendFriendRequest(userId);
      if (success) {
        Toast.show({
          type: 'success',
          text1: 'Friend Request Sent!',
          text2: 'Your friend request has been sent successfully',
          position: 'top',
          visibilityTime: 3000,
        });
        setHasPendingRequest(true);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Request Failed',
          text2: 'Unable to send friend request. Please try again.',
          position: 'top',
          visibilityTime: 4000,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Request Failed',
        text2: 'Unable to send friend request. Please try again.',
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  const sendTrackerRequest = async () => {
    if (!currentUser) return;
    
    try {
      const success = await PermissionsService.sendTrackerRequest(userId);
      if (success) {
        Toast.show({
          type: 'success',
          text1: 'Tracker Request Sent!',
          text2: 'Your tracker request has been sent successfully',
          position: 'top',
          visibilityTime: 3000,
        });
        setHasPendingTrackerRequest(true);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Request Failed',
          text2: 'Unable to send tracker request. Please try again.',
          position: 'top',
          visibilityTime: 4000,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Request Failed',
        text2: 'Unable to send tracker request. Please try again.',
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  const openChat = () => {
    Toast.show({
      type: 'info',
      text1: 'Opening Chat',
      text2: 'Starting conversation with friend',
      position: 'top',
      visibilityTime: 2000,
    });
    navigation.navigate('Chat', {
      friendUid: userId,
      friendName: userProfile?.driverName || userProfile?.vehicleName || 'Friend',
      friendPhoto: userProfile?.photoURL,
    });
  };

  const removeFriend = async () => {
    if (!currentUser) return;
    
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${userProfile?.driverName || userProfile?.vehicleName || 'this friend'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await PermissionsService.removeFriend(userId);
              if (success) {
                Toast.show({
                  type: 'success',
                  text1: 'Friend Removed',
                  text2: 'Friend has been removed successfully',
                  position: 'top',
                  visibilityTime: 3000,
                });
                navigation.goBack();
              } else {
                Toast.show({
                  type: 'error',
                  text1: 'Remove Failed',
                  text2: 'Unable to remove friend. Please try again.',
                  position: 'top',
                  visibilityTime: 4000,
                });
              }
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Remove Failed',
                text2: 'Unable to remove friend. Please try again.',
                position: 'top',
                visibilityTime: 4000,
              });
            }
          }
        }
      ]
    );
  };

  const goToFriend = () => {
    if (userProfile?.location) {
      Toast.show({
        type: 'success',
        text1: 'Navigating to Friend',
        text2: 'Opening map with route to friend\'s location',
        position: 'top',
        visibilityTime: 2000,
      });
      navigation.navigate('Map', { 
        routeTo: userProfile.location,
        friendName: userProfile?.driverName || userProfile?.vehicleName || 'Friend'
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Location Unavailable',
        text2: 'This friend\'s location is not currently available',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const getCategoryInfo = (category: UserCategory) => {
    switch (category) {
      case 'stranger':
        return {
          title: 'Stranger',
          description: 'Limited visibility - basic vehicle information only',
          color: Colors.surface,
          textColor: Colors.textSecondary,
          icon: '👤'
        };
      case 'friend':
        return {
          title: 'Friend',
          description: 'Trusted connection - can chat and join groups',
          color: Colors.surface,
          textColor: Colors.textPrimary,
          icon: '👥'
        };
      case 'tracker':
        return {
          title: 'Trusted Tracker',
          description: 'Maximum trust - location sharing and route tracking',
          color: Colors.primary,
          textColor: Colors.textInverse,
          icon: '🔒'
        };
    }
  };

  const getPermissionInfo = () => {
    const permissions = PermissionsService.getPermissions(userId);
    const info = [];
    
    if (permissions.canSeePhoto) info.push('Profile Photo');
    if (permissions.canSeeDriverName) info.push('Driver Name');
    if (permissions.canSeeVehicleName) info.push('Vehicle Name');
    if (permissions.canSeeVehicleNumber) info.push('Vehicle Number');
    if (permissions.canSeeLocation) info.push('Location');
    if (permissions.canChat) info.push('Chat');
    if (permissions.canTrackRoute) info.push('Route Tracking');
    if (permissions.canReceiveSOS) info.push('SOS Alerts');
    
    return info;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>User not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.errorButton}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const categoryInfo = getCategoryInfo(relationshipStatus);
  const permissions = getPermissionInfo();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image 
            source={require('../assets/left-arrow.png')} 
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        {/* Profile Photo */}
        <View style={styles.avatarContainer}>
          {userProfile.photoURL ? (
            <Image source={{ uri: userProfile.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {(userProfile.driverName || userProfile.vehicleName || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          
          {/* Online Status */}
          {isOnline && (
            <View style={styles.onlineIndicator}>
              <View style={styles.onlineDot} />
            </View>
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {userProfile.driverName || userProfile.vehicleName || 'Unknown User'}
          </Text>
          
          {userProfile.vehicleName && userProfile.driverName && (
            <Text style={styles.vehicleName}>{userProfile.vehicleName}</Text>
          )}
          
          {distance && (
            <Text style={styles.distance}>{(distance/1000).toFixed(2)} km away</Text>
          )}
        </View>

        {/* Relationship Status */}
        <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color }]}>
          <Text style={styles.categoryIcon}>{categoryInfo.icon}</Text>
          <View style={styles.categoryText}>
            <Text style={[styles.categoryTitle, { color: categoryInfo.textColor }]}>
              {categoryInfo.title}
            </Text>
            <Text style={[styles.categoryDescription, { color: categoryInfo.textColor }]}>
              {categoryInfo.description}
            </Text>
          </View>
        </View>
      </View>

      {/* Vehicle Information */}
      {userProfile.vehicleName && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vehicle Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vehicle:</Text>
            <Text style={styles.infoValue}>{userProfile.vehicleName}</Text>
          </View>
          {userProfile.vehicleNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Number:</Text>
              <Text style={styles.infoValue}>{userProfile.vehicleNumber}</Text>
            </View>
          )}
        </View>
      )}

      {/* Location Information */}
      {userProfile.location && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location</Text>
          <View style={styles.locationContainer}>
            <View style={styles.locationIcon}>
              <Text style={styles.locationIconText}>📍</Text>
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>Location Available</Text>
              <Text style={styles.locationSubtext}>Real-time location sharing enabled</Text>
            </View>
          </View>
        </View>
      )}

      {/* Permissions Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Access Permissions</Text>
        <Text style={styles.permissionsDescription}>
          Based on your relationship level, you can see:
        </Text>
        <View style={styles.permissionsList}>
          {permissions.map((permission, index) => (
            <View key={index} style={styles.permissionItem}>
              <View style={styles.permissionDot} />
              <Text style={styles.permissionText}>{permission}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {relationshipStatus === 'stranger' && (
          <TouchableOpacity onPress={sendFriendRequest} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Send Friend Request</Text>
          </TouchableOpacity>
        )}

        {relationshipStatus === 'friend' && (
          <>
            <View style={styles.buttonGroup}>
              <TouchableOpacity onPress={openChat} style={[styles.primaryButton, { flex: 1 }]}>
                <Text style={styles.primaryButtonText}>Chat</Text>
              </TouchableOpacity>
              
              {!hasPendingTrackerRequest ? (
                <TouchableOpacity onPress={sendTrackerRequest} style={[styles.secondaryButton, { flex: 1 }]}>
                  <Text style={styles.secondaryButtonText}>Trust</Text>
                </TouchableOpacity>
                          ) : (
              <View style={[styles.secondaryButton, { flex: 1, backgroundColor: Colors.warning }]}>
                <Text style={[styles.secondaryButtonText, { color: Colors.textPrimary }]}>Pending</Text>
              </View>
            )}
            </View>
            
            <View style={styles.buttonGroup}>
              <TouchableOpacity onPress={goToFriend} style={[styles.tertiaryButton, { flex: 1 }]}>
                <Text style={styles.tertiaryButtonText}>Go</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={removeFriend} style={[styles.dangerButton, { flex: 1 }]}>
                <Text style={styles.dangerButtonText}>Remove Friend</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {relationshipStatus === 'tracker' && (
          <>
            <View style={styles.buttonGroup}>
              <TouchableOpacity onPress={openChat} style={[styles.primaryButton, { flex: 1 }]}>
                <Text style={styles.primaryButtonText}>Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={goToFriend}
                style={[styles.secondaryButton, { flex: 1 }]}
              >
                <Text style={styles.secondaryButtonText}>Go</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Map', { routeTo: userProfile.location })}
                style={[styles.tertiaryButton, { flex: 1 }]}
              >
                <Text style={styles.tertiaryButtonText}>Track Route</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={removeFriend} style={[styles.dangerButton, { flex: 1 }]}>
                <Text style={styles.dangerButtonText}>Remove Friend</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.lg,
    fontSize: Typography.lg,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: Typography.xl,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  errorButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  errorButtonText: {
    color: Colors.textInverse,
    fontWeight: Typography.bold,
    fontSize: Typography.lg,
  },
  header: {
    backgroundColor: Colors.background,
    paddingTop: Responsive.verticalScale(10),
    paddingBottom: Spacing.lg,
    paddingHorizontal: Layout.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: Responsive.scale(40),
    height: Responsive.scale(40),
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  backIcon: {
    width: Responsive.scale(20),
    height: Responsive.scale(20),
    tintColor: Colors.textPrimary,
  },
  headerTitle: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  profileSection: {
    backgroundColor: Colors.card,
    padding: Spacing['2xl'],
    alignItems: 'center',
    marginBottom: Spacing.lg,
    marginHorizontal: Layout.screenPadding,
    borderRadius: BorderRadius.xl,
    ...Shadows.md,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: Layout.avatarXLarge,
    height: Layout.avatarXLarge,
    borderRadius: BorderRadius.full,
    borderWidth: 4,
    borderColor: Colors.background,
    ...Shadows.lg,
  },
  avatarPlaceholder: {
    width: Layout.avatarXLarge,
    height: Layout.avatarXLarge,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.background,
    ...Shadows.lg,
  },
  avatarText: {
    color: Colors.textSecondary,
    fontWeight: Typography.bold,
    fontSize: Responsive.moderateScale(48),
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: Responsive.scale(8),
    right: Responsive.scale(8),
    width: Responsive.scale(24),
    height: Responsive.scale(24),
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.success,
    ...Shadows.sm,
  },
  onlineDot: {
    width: Responsive.scale(12),
    height: Responsive.scale(12),
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.success,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  userName: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.extrabold,
    color: Colors.textPrimary,
    marginBottom: Responsive.verticalScale(4),
  },
  vehicleName: {
    fontSize: Typography.lg,
    color: Colors.textSecondary,
    fontWeight: Typography.semibold,
    marginBottom: Responsive.verticalScale(4),
  },
  distance: {
    fontSize: Typography.sm,
    color: Colors.textTertiary,
    fontWeight: Typography.medium,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    width: '100%',
    ...Shadows.sm,
  },
  categoryIcon: {
    fontSize: Responsive.moderateScale(24),
    marginRight: Spacing.md,
  },
  categoryText: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    marginBottom: Responsive.verticalScale(2),
  },
  categoryDescription: {
    fontSize: Typography.sm,
    opacity: 0.9,
  },
  card: {
    backgroundColor: Colors.card,
    marginHorizontal: Layout.screenPadding,
    marginBottom: Spacing.lg,
    padding: Layout.cardPadding,
    borderRadius: BorderRadius.xl,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Responsive.verticalScale(8),
  },
  infoLabel: {
    fontSize: Typography.lg,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  infoValue: {
    fontSize: Typography.lg,
    color: Colors.textPrimary,
    fontWeight: Typography.semibold,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    width: Responsive.scale(48),
    height: Responsive.scale(48),
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  locationIconText: {
    fontSize: Responsive.moderateScale(20),
  },
  locationInfo: {
    flex: 1,
  },
  locationText: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    marginBottom: Responsive.verticalScale(2),
  },
  locationSubtext: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  permissionsDescription: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: Typography.normal * Typography.sm,
  },
  permissionsList: {
    gap: Spacing.md,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionDot: {
    width: Responsive.scale(8),
    height: Responsive.scale(8),
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.success,
    marginRight: Spacing.md,
  },
  permissionText: {
    fontSize: Typography.lg,
    color: Colors.textPrimary,
    fontWeight: Typography.medium,
  },
  actionsContainer: {
    paddingHorizontal: Layout.screenPadding,
    marginBottom: Spacing.lg,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    flex: 1,
    ...Shadows.md,
  },
  primaryButtonText: {
    color: Colors.textInverse,
    fontWeight: Typography.bold,
    fontSize: Typography.lg,
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  secondaryButtonText: {
    color: Colors.textPrimary,
    fontWeight: Typography.bold,
    fontSize: Typography.lg,
  },
  tertiaryButton: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  tertiaryButtonText: {
    color: Colors.textPrimary,
    fontWeight: Typography.bold,
    fontSize: Typography.lg,
  },
  dangerButton: {
    backgroundColor: Colors.error,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    flex: 1,
    ...Shadows.md,
  },
  dangerButtonText: {
    color: Colors.textInverse,
    fontWeight: Typography.bold,
    fontSize: Typography.lg,
  },
  bottomSpacing: {
    height: Responsive.verticalScale(32),
  },
});
