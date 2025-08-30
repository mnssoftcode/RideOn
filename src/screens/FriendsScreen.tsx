import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, TextInput, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

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
    }
  }, [searchQuery, friends, getFriendsWithDistance]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadFriends(), loadUserLocation()]);
    setRefreshing(false);
  }, [loadFriends, loadUserLocation]);

  const accept = async (friendUid: string) => {
    if (!user) return;
    try {
      await firestore().collection('connections').doc(user.uid).collection('friends').doc(friendUid)
        .set({ status: 'accepted', createdAt: firestore.FieldValue.serverTimestamp() }, { merge: true });
      await firestore().collection('connections').doc(friendUid).collection('friends').doc(user.uid)
        .set({ status: 'accepted', createdAt: firestore.FieldValue.serverTimestamp() }, { merge: true });
    } catch (error) {
      console.error('Error accepting friend:', error);
    }
  };

  const reject = async (friendUid: string) => {
    if (!user) return;
    try {
      await firestore().collection('connections').doc(user.uid).collection('friends').doc(friendUid).delete();
      await firestore().collection('connections').doc(friendUid).collection('friends').doc(user.uid).delete();
    } catch (error) {
      console.error('Error rejecting friend:', error);
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
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      {/* Header */}
      <View style={{ backgroundColor: 'white', paddingTop: 10, paddingBottom: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8 }}>Friends</Text>
        
        {/* Friends Count */}
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
          <View style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>{acceptedFriendsCount} Connected</Text>
          </View>
          {pendingFriendsCount > 0 && (
            <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>{pendingFriendsCount} Pending</Text>
            </View>
          )}
        </View>

        {/* Search Bar */}
        <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
          <TextInput
            placeholder="Search friends..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ fontSize: 16, color: '#111827' }}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Friends List */}
      <FlatList
        data={filteredFriends}
        keyExtractor={(i) => i.uid}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
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
              backgroundColor: 'white', 
              borderRadius: 16, 
              padding: 16, 
              marginBottom: 12, 
              shadowColor: '#000', 
              shadowOpacity: 0.08, 
              shadowRadius: 12, 
              elevation: 3,
              borderWidth: 1,
              borderColor: '#F3F4F6'
            }}
          >
            {/* Profile Section */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ 
                width: 50, 
                height: 50, 
                borderRadius: 25, 
                backgroundColor: '#E5E7EB', 
                justifyContent: 'center', 
                alignItems: 'center',
                marginRight: 12
              }}>
                {item.photoURL ? (
                  <Image 
                    source={{ uri: item.photoURL }} 
                    style={{ width: 50, height: 50, borderRadius: 25 }}
                  />
                ) : (
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#6B7280' }}>
                    {(item.driverName?.charAt(0) || 'U').toUpperCase()}
                  </Text>
                )}
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: '#111827', fontSize: 16 }}>
                  {item.vehicleName || 'Vehicle'}
                </Text>
                <Text style={{ color: '#6B7280', marginTop: 2, fontSize: 14 }}>
                  {item.driverName || 'Unknown Driver'}
                </Text>
                {item.vehicleNumber && (
                  <Text style={{ color: '#9CA3AF', marginTop: 2, fontSize: 12, fontWeight: '600' }}>
                    {item.vehicleNumber}
                  </Text>
                )}
                {item.distance && (
                  <Text style={{ color: '#6B7280', marginTop: 2, fontSize: 12 }}>
                    {(item.distance/1000).toFixed(2)} km away
                  </Text>
                )}
              </View>
            </View>

            {/* Status and Actions */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ 
                backgroundColor: item.status === 'accepted' ? '#D1FAE5' : '#FEF3C7',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20
              }}>
                <Text style={{ 
                  color: item.status === 'accepted' ? '#065F46' : '#92400E', 
                  fontWeight: '700',
                  fontSize: 12
                }}>
                  {item.status === 'accepted' ? 'CONNECTED' : 'PENDING'}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {item.status === 'pending' && (
                  <>
                    <TouchableOpacity 
                      onPress={() => accept(item.uid)} 
                      style={{ 
                        backgroundColor: '#10B981', 
                        paddingHorizontal: 16, 
                        paddingVertical: 8, 
                        borderRadius: 12 
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Accept</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => reject(item.uid)} 
                      style={{ 
                        backgroundColor: '#EF4444', 
                        paddingHorizontal: 16, 
                        paddingVertical: 8, 
                        borderRadius: 12 
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Reject</Text>
                    </TouchableOpacity>
                  </>
                )}
                
                {item.status === 'accepted' && item.location && (
                  <TouchableOpacity 
                    onPress={() => navigateToFriend(item)} 
                    style={{ 
                      backgroundColor: '#2563EB', 
                      paddingHorizontal: 16, 
                      paddingVertical: 8, 
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Image source={require('../assets/distance.png')} style={{ width: 16, height: 16, tintColor: 'white' }} />
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Go</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ color: '#6B7280', fontSize: 16, textAlign: 'center' }}>
              {searchQuery ? 'No friends found matching your search' : 'No friends yet'}
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 8 }}>
              {searchQuery ? 'Try adjusting your search terms' : 'Find nearby vehicles on the Map tab to connect'}
            </Text>
          </View>
        }
      />
    </View>
  );
}


