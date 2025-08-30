import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import PermissionsService, { UserCategory } from '../services/permissions';

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
        Alert.alert('Success', 'Friend request sent successfully!');
        setHasPendingRequest(true);
      } else {
        Alert.alert('Error', 'Failed to send friend request. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const sendTrackerRequest = async () => {
    if (!currentUser) return;
    
    try {
      const success = await PermissionsService.sendTrackerRequest(userId);
      if (success) {
        Alert.alert('Success', 'Tracker request sent successfully!');
        setHasPendingTrackerRequest(true);
      } else {
        Alert.alert('Error', 'Failed to send tracker request. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send tracker request');
    }
  };

  const openChat = () => {
    navigation.navigate('Chat', {
      friendUid: userId,
      friendName: userProfile?.driverName || userProfile?.vehicleName || 'Friend',
      friendPhoto: userProfile?.photoURL,
    });
  };

  const getCategoryInfo = (category: UserCategory) => {
    switch (category) {
      case 'stranger':
        return {
          title: 'Stranger',
          description: 'Limited visibility - basic vehicle information only',
          color: '#E5E7EB',
          textColor: '#6B7280',
          icon: '👤'
        };
      case 'friend':
        return {
          title: 'Friend',
          description: 'Trusted connection - can chat and join groups',
          color: '#10B981',
          textColor: 'white',
          icon: '👥'
        };
      case 'tracker':
        return {
          title: 'Trusted Tracker',
          description: 'Maximum trust - location sharing and route tracking',
          color: '#8B5CF6',
          textColor: 'white',
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
          <View style={styles.buttonGroup}>
            <TouchableOpacity onPress={openChat} style={[styles.primaryButton, { flex: 1 }]}>
              <Text style={styles.primaryButtonText}>Chat</Text>
            </TouchableOpacity>
            
            {!hasPendingTrackerRequest ? (
              <TouchableOpacity onPress={sendTrackerRequest} style={[styles.secondaryButton, { flex: 1 }]}>
                <Text style={styles.secondaryButtonText}>Trust</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.secondaryButton, { flex: 1, backgroundColor: '#F59E0B' }]}>
                <Text style={styles.secondaryButtonText}>Pending</Text>
              </View>
            )}
          </View>
        )}

        {relationshipStatus === 'tracker' && (
          <View style={styles.buttonGroup}>
            <TouchableOpacity onPress={openChat} style={[styles.primaryButton, { flex: 1 }]}>
              <Text style={styles.primaryButtonText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Map', { routeTo: userProfile.location })}
              style={[styles.secondaryButton, { flex: 1 }]}
            >
              <Text style={styles.secondaryButtonText}>Track Route</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: '#111827',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  profileSection: {
    backgroundColor: 'white',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  avatarText: {
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 48,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  vehicleName: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  distance: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    width: '100%',
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryText: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 14,
    opacity: 0.9,
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  locationIconText: {
    fontSize: 20,
  },
  locationInfo: {
    flex: 1,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  locationSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  permissionsDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  permissionsList: {
    gap: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 12,
  },
  permissionText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  secondaryButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  bottomSpacing: {
    height: 32,
  },
});
