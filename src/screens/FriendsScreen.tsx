import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, TextInput, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Layout, CommonStyles, Responsive } from '../design/DesignSystem';

type FriendRow = {
  uid: string;
  status: 'pending' | 'accepted';
  driverName?: string;
  vehicleName?: string;
  vehicleNumber?: string;
  photoURL?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  distance?: number;
};

export default function FriendsScreen() {
  const user = auth().currentUser;
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<FriendRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const navigation = useNavigation<any>();

  const loadFriends = useCallback(async () => {
    if (!user) return;
    try {
      const ref = firestore().collection('connections').doc(user.uid).collection('friends');
      const snap = await ref.get();
      const base: FriendRow[] = [];
      snap.forEach((d) => base.push({ uid: d.id, ...(d.data() as any) }));
      
      // enrich with user profiles
      const enriched = await Promise.all(
        base.map(async (f) => {
          try {
            const u = await firestore().collection('users').doc(f.uid).get();
            const d = u.data() as any;
            return { 
              ...f, 
              driverName: d?.driverName, 
              vehicleName: d?.vehicleName,
              vehicleNumber: d?.vehicleNumber,
              photoURL: d?.photoURL,
              location: d?.location
            } as FriendRow;
          } catch {
            return f;
          }
        }),
      );
      setFriends(enriched);
      setFilteredFriends(enriched);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  }, [user]);

  const loadUserLocation = useCallback(async () => {
    if (!user) return;
    try {
      const userDoc = await firestore().collection('users').doc(user.uid).get();
      const userData = userDoc.data() as any;
      if (userData?.location) {
        setUserLocation(userData.location);
      }
    } catch (error) {
      console.error('Error loading user location:', error);
    }
  }, [user]);

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Convert to meters
  }, []);

  const getFriendsWithDistance = useCallback((friendsList: FriendRow[]) => {
    if (!userLocation) return friendsList;
    
    return friendsList.map(friend => {
      if (friend.location) {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          friend.location.latitude,
          friend.location.longitude
        );
        return { ...friend, distance };
      }
      return friend;
    });
  }, [userLocation, calculateDistance]);

  useEffect(() => {
    loadFriends();
    loadUserLocation();
  }, [loadFriends, loadUserLocation]);

  useEffect(() => {
    const friendsWithDistance = getFriendsWithDistance(friends);
    if (searchQuery.trim() === '') {
      setFilteredFriends(friendsWithDistance);
    } else {
      const filtered = friendsWithDistance.filter(friend => 
        friend.driverName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.vehicleName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.vehicleNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFriends(filtered);
      
      // Show search results toast
      if (searchQuery.trim().length > 2) {
        const resultCount = filtered.length;
        if (resultCount === 0) {
          Toast.show({
            type: 'info',
            text1: 'No Results Found',
            text2: `No friends match "${searchQuery}"`,
            position: 'top',
            visibilityTime: 2000,
          });
        } else {
          Toast.show({
            type: 'success',
            text1: 'Search Results',
            text2: `Found ${resultCount} friend${resultCount !== 1 ? 's' : ''}`,
            position: 'top',
            visibilityTime: 2000,
          });
        }
      }
    }
  }, [searchQuery, friends, getFriendsWithDistance]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadFriends(), loadUserLocation()]);
      Toast.show({
        type: 'success',
        text1: 'Refreshed!',
        text2: 'Friends list updated successfully',
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Refresh Failed',
        text2: 'Unable to update friends list',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setRefreshing(false);
    }
  }, [loadFriends, loadUserLocation]);

  const accept = async (friendUid: string) => {
    if (!user) return;
    try {
      await firestore().collection('connections').doc(user.uid).collection('friends').doc(friendUid)
        .set({ status: 'accepted', createdAt: firestore.FieldValue.serverTimestamp() }, { merge: true });
      await firestore().collection('connections').doc(friendUid).collection('friends').doc(user.uid)
        .set({ status: 'accepted', createdAt: firestore.FieldValue.serverTimestamp() }, { merge: true });
      
      Toast.show({
        type: 'success',
        text1: 'Friend Request Accepted!',
        text2: 'You are now connected with this user',
        position: 'top',
        visibilityTime: 3000,
      });
      
      loadFriends(); // Refresh the list
    } catch (error) {
      console.error('Error accepting friend:', error);
      Toast.show({
        type: 'error',
        text1: 'Accept Failed',
        text2: 'Unable to accept friend request. Please try again.',
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  const reject = async (friendUid: string) => {
    if (!user) return;
    try {
      await firestore().collection('connections').doc(user.uid).collection('friends').doc(friendUid).delete();
      await firestore().collection('connections').doc(friendUid).collection('friends').doc(user.uid).delete();
      
      Toast.show({
        type: 'success',
        text1: 'Friend Request Rejected',
        text2: 'The request has been removed',
        position: 'top',
        visibilityTime: 3000,
      });
      
      loadFriends(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting friend:', error);
      Toast.show({
        type: 'error',
        text1: 'Reject Failed',
        text2: 'Unable to reject friend request. Please try again.',
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  const navigateToFriend = (friend: FriendRow) => {
    console.log('navigateToFriend called with:', friend);
    console.log('Friend location:', friend.location);
    
    if (friend.location) {
      console.log('Attempting to navigate to Map with routeTo:', {
        latitude: friend.location.latitude,
        longitude: friend.location.longitude,
        title: friend.vehicleName || 'Friend Location',
        description: `${friend.driverName} • ${friend.vehicleNumber || ''}`
      });
      
      try {
        // Try to jump to the Map tab and pass route parameters
        navigation.jumpTo('Map', { 
          routeTo: {
            latitude: friend.location.latitude,
            longitude: friend.location.longitude,
            title: friend.vehicleName || 'Friend Location',
            description: `${friend.driverName} • ${friend.vehicleNumber || ''}`
          }
        });
        console.log('Navigation successful');
      } catch (error) {
        console.error('Navigation error:', error);
        // Fallback: try to navigate to the parent navigator
        try {
          navigation.getParent()?.navigate('Map', { 
            routeTo: {
              latitude: friend.location.latitude,
              longitude: friend.location.longitude,
              title: friend.vehicleName || 'Friend Location',
              description: `${friend.driverName} • ${friend.vehicleNumber || ''}`
            }
          });
        } catch (fallbackError) {
          console.error('Fallback navigation error:', fallbackError);
        }
      }
    } else {
      console.log('Friend location not available');
    }
  };

  const openChat = (friend: FriendRow) => {
    navigation.navigate('Chat', { 
      friendUid: friend.uid,
      friendName: friend.driverName || friend.vehicleName || 'Friend',
      friendPhoto: friend.photoURL,
    });
  };

  const acceptedFriendsCount = friends.filter(f => f.status === 'accepted').length;
  const pendingFriendsCount = friends.filter(f => f.status === 'pending').length;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={{ 
        backgroundColor: Colors.card, 
        paddingTop: Responsive.verticalScale(10), 
        paddingBottom: Spacing.lg, 
        paddingHorizontal: Layout.screenPadding, 
        borderBottomWidth: 1, 
        borderBottomColor: Colors.border 
      }}>
        <Text style={{ 
          fontSize: Typography['3xl'], 
          fontWeight: '800', 
          color: Colors.textPrimary, 
          marginBottom: Responsive.verticalScale(8) 
        }}>Friends</Text>
        
        {/* Friends Count */}
        <View style={{ flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.lg }}>
          <View style={{ 
            backgroundColor: Colors.success, 
            paddingHorizontal: Spacing.md, 
            paddingVertical: Responsive.verticalScale(6), 
            borderRadius: BorderRadius.full 
          }}>
            <Text style={{ 
              color: Colors.textInverse, 
              fontWeight: '700', 
              fontSize: Typography.sm 
            }}>{acceptedFriendsCount} Connected</Text>
          </View>
          {pendingFriendsCount > 0 && (
            <View style={{ 
              backgroundColor: Colors.warning, 
              paddingHorizontal: Spacing.md, 
              paddingVertical: Responsive.verticalScale(6), 
              borderRadius: BorderRadius.full 
            }}>
              <Text style={{ 
                color: Colors.textPrimary, 
                fontWeight: '700', 
                fontSize: Typography.sm 
              }}>{pendingFriendsCount} Pending</Text>
            </View>
          )}
        </View>

        {/* Search Bar */}
        <View style={{ 
          backgroundColor: Colors.surface, 
          borderRadius: BorderRadius.lg, 
          paddingHorizontal: Spacing.lg, 
          borderWidth: 1, 
          borderColor: Colors.border 
        }}>
          <TextInput
            placeholder="Search friends..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ fontSize: Typography.lg, color: Colors.textPrimary }}
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
      </View>

      {/* Friends List */}
      <FlatList
        data={filteredFriends}
        keyExtractor={(i) => i.uid}
        contentContainerStyle={{ padding: Layout.screenPadding, paddingBottom: Responsive.verticalScale(32) }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            onPress={() => navigation.navigate('UserProfile', { 
              userId: item.uid,
              userName: item.driverName || item.vehicleName || 'Friend',
              userPhoto: item.photoURL,
            })}
            style={{ 
              backgroundColor: Colors.card, 
              borderRadius: BorderRadius.xl, 
              padding: Layout.cardPadding, 
              marginBottom: Spacing.md, 
              ...Shadows.md,
              borderWidth: 1,
              borderColor: Colors.border
            }}
          >
            {/* Profile Section */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
              <View style={{ 
                width: Layout.avatarMedium, 
                height: Layout.avatarMedium, 
                borderRadius: BorderRadius.full, 
                backgroundColor: Colors.surface, 
                justifyContent: 'center', 
                alignItems: 'center',
                marginRight: Spacing.md
              }}>
                {item.photoURL ? (
                  <Image 
                    source={{ uri: item.photoURL }} 
                    style={{ width: Layout.avatarMedium, height: Layout.avatarMedium, borderRadius: BorderRadius.full }}
                  />
                ) : (
                  <Text style={{ fontSize: Responsive.moderateScale(20), fontWeight: '700', color: Colors.textSecondary }}>
                    {(item.driverName?.charAt(0) || 'U').toUpperCase()}
                  </Text>
                )}
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: Colors.textPrimary, fontSize: Typography.lg }}>
                  {item.vehicleName || 'Vehicle'}
                </Text>
                <Text style={{ color: Colors.textSecondary, marginTop: Responsive.verticalScale(2), fontSize: Typography.base }}>
                  {item.driverName || 'Unknown Driver'}
                </Text>
                {item.vehicleNumber && (
                  <Text style={{ color: Colors.textTertiary, marginTop: Responsive.verticalScale(2), fontSize: Typography.sm, fontWeight: '600' }}>
                    {item.vehicleNumber}
                  </Text>
                )}
                {item.distance && (
                  <Text style={{ color: Colors.textSecondary, marginTop: Responsive.verticalScale(2), fontSize: Typography.sm }}>
                    {(item.distance/1000).toFixed(2)} km away
                  </Text>
                )}
              </View>
            </View>

            {/* Status and Actions */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ 
                backgroundColor: item.status === 'accepted' ? Colors.success : Colors.warning,
                paddingHorizontal: Spacing.md,
                paddingVertical: Responsive.verticalScale(6),
                borderRadius: BorderRadius.full
              }}>
                <Text style={{ 
                  color: item.status === 'accepted' ? Colors.textInverse : Colors.textPrimary, 
                  fontWeight: '700',
                  fontSize: Typography.sm
                }}>
                  {item.status === 'accepted' ? 'CONNECTED' : 'PENDING'}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                {item.status === 'pending' && (
                  <>
                    <TouchableOpacity 
                      onPress={() => accept(item.uid)} 
                      style={{ 
                        backgroundColor: Colors.success, 
                        paddingHorizontal: Spacing.lg, 
                        paddingVertical: Responsive.verticalScale(8), 
                        borderRadius: BorderRadius.lg 
                      }}
                    >
                      <Text style={{ color: Colors.textInverse, fontWeight: '700', fontSize: Typography.base }}>Accept</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => reject(item.uid)} 
                      style={{ 
                        backgroundColor: Colors.error, 
                        paddingHorizontal: Spacing.lg, 
                        paddingVertical: Responsive.verticalScale(8), 
                        borderRadius: BorderRadius.lg 
                      }}
                    >
                      <Text style={{ color: Colors.textInverse, fontWeight: '700', fontSize: Typography.base }}>Reject</Text>
                    </TouchableOpacity>
                  </>
                )}
                
                {item.status === 'accepted' && item.location && (
                  <TouchableOpacity 
                    onPress={() => navigateToFriend(item)} 
                    style={{ 
                      backgroundColor: Colors.primary, 
                      paddingHorizontal: Spacing.lg, 
                      paddingVertical: Responsive.verticalScale(8), 
                      borderRadius: BorderRadius.lg,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: Responsive.scale(6)
                    }}
                  >
                    <Image source={require('../assets/distance.png')} style={{ width: Responsive.scale(16), height: Responsive.scale(16), tintColor: Colors.textInverse }} />
                    <Text style={{ color: Colors.textInverse, fontWeight: '700', fontSize: Typography.base }}>Go</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: Responsive.verticalScale(40) }}>
            <Text style={{ color: Colors.textSecondary, fontSize: Typography.lg, textAlign: 'center' }}>
              {searchQuery ? 'No friends found matching your search' : 'No friends yet'}
            </Text>
            <Text style={{ color: Colors.textTertiary, fontSize: Typography.base, textAlign: 'center', marginTop: Spacing.sm }}>
              {searchQuery ? 'Try adjusting your search terms' : 'Find nearby vehicles on the Map tab to connect'}
            </Text>
          </View>
        }
      />
    </View>
  );
}


