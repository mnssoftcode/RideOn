import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Platform, PermissionsAndroid, Alert, Pressable, Image, TouchableHighlight, TouchableOpacity } from 'react-native';
import PermissionsService from '../services/permissions';
import { useNavigation, useRoute } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { queryNearbyVehicles, updateUserLocationOnce } from '../services/location';
import { useBleScan } from '../services/ble';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
// Simplified permission flow: use native APIs only to avoid crashes

const DEFAULT_REGION = { latitude: 37.78825, longitude: -122.4324, latitudeDelta: 0.05, longitudeDelta: 0.05 };

export default function MapScreen() {
  const [region, setRegion] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }>(DEFAULT_REGION);
  const [nearby, setNearby] = useState<any[]>([]);
  const [routeTo, setRouteTo] = useState<any>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const { devices } = useBleScan();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  useEffect(() => {
    // Check if we have route parameters from FriendsScreen
    if (route.params?.routeTo) {
      console.log('MapScreen: Received route params:', route.params.routeTo);
      const routeData = route.params.routeTo;
      
      // Validate the route data
      if (routeData && typeof routeData.latitude === 'number' && typeof routeData.longitude === 'number') {
        setRouteTo(routeData);
        const { latitude, longitude } = routeData;
        
        // Set a valid region with proper deltas
        const newRegion = { 
          latitude, 
          longitude, 
          latitudeDelta: 0.01, 
          longitudeDelta: 0.01 
        };
        
        console.log('MapScreen: Setting region to:', newRegion);
        setRegion(newRegion);
        
        // Set route coordinates with current user location as start point
        // For now, use a default start point if we don't have user location
        const startPoint = { latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude };
        const endPoint = { latitude, longitude };
        
        setRouteCoordinates([startPoint, endPoint]);
        console.log('MapScreen: Route coordinates set:', [startPoint, endPoint]);
      } else {
        console.error('MapScreen: Invalid route data received:', routeData);
      }
    }
  }, [route.params]);

  useEffect(() => {
    const ensurePermissionAndLocate = async () => {
      console.log('ensurePermissionAndLocate');
      try {
        let hasPermission = false;

        if (Platform.OS === 'android') {
          console.log('[Map] checking ACCESS_FINE_LOCATION');
          const granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );
          if (granted) {
            console.log('[Map] already granted');
            hasPermission = true;
          } else {
            console.log('[Map] requesting ACCESS_FINE_LOCATION');
            const request = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            );
            hasPermission = request === PermissionsAndroid.RESULTS.GRANTED;
          }
        } else {
          // iOS
          console.log('[Map] requesting iOS authorization check');
          const auth = await Geolocation.requestAuthorization('whenInUse');
          hasPermission = auth === 'granted';
        }
  
        if (!hasPermission) {
          console.log('[Map] Permission denied, using DEFAULT_REGION');
          setRegion(DEFAULT_REGION);
          return;
        }
        console.log('[Map] calling getCurrentPosition');
        updateUserLocationOnce(DEFAULT_REGION?.latitude, DEFAULT_REGION?.longitude);
        // Geolocation.getCurrentPosition(
        //   async (pos) => {
        //     const { latitude, longitude } = pos.coords;
        //     console.log('[Map] Location success', latitude, longitude);

        //       setRegion({ latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
            
        //             try {
        //       await updateUserLocationOnce(latitude, longitude);
        //     } catch (e) {
        //       console.error('[Map] updateUserLocationOnce failed', e);
        //     }
        //   },
        //   (err) => {
        //     console.log('[Map] Error getting location', err);
        //     setRegion(DEFAULT_REGION);
        //   },
        //  { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
        // );
      } catch (e) {
        console.log('[Map] Exception', e);
        setRegion(DEFAULT_REGION);
      }
    }
    ensurePermissionAndLocate();
  }, []);

  const refreshNearby = async () => {
    console.log('[Map] refreshNearby:start');
    if (!region) return;
    const items = await queryNearbyVehicles(region?.latitude, region?.longitude);
    const me = auth().currentUser?.uid;
    const filtered = me ? items.filter((u: any) => u.id !== me) : items;
    console.log('[Map] refreshNearby:items', filtered?.length);
    setNearby(filtered);
  };

  const sendFriendRequest = async (otherUid: string) => {
    console.log('[Map] sendFriendRequest:start', otherUid);
    const success = await PermissionsService.sendFriendRequest(otherUid);
    if (success) {
      Alert.alert('Success', 'Friend request sent successfully!');
    } else {
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    }
    console.log('[Map] sendFriendRequest:done');
  };

  const sendTrackerRequest = async (otherUid: string) => {
    console.log('[Map] sendTrackerRequest:start', otherUid);
    const success = await PermissionsService.sendTrackerRequest(otherUid);
    if (success) {
      Alert.alert('Success', 'Tracker request sent successfully!');
    } else {
      Alert.alert('Error', 'Failed to send tracker request. Please try again.');
    }
    console.log('[Map] sendTrackerRequest:done');
  };

  const onMapReady = () => {
    console.log('MapScreen: Map is ready');
    setMapReady(true);
  };

  const clearRoute = () => {
    console.log('MapScreen: Clearing route');
    setRouteTo(null);
    setRouteCoordinates([]);
    setRegion(DEFAULT_REGION);
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView 
        style={{ flex: 1 }} 
        initialRegion={region} 
        region={region}
        showsUserLocation={true} 
        provider={PROVIDER_GOOGLE}
        onMapReady={onMapReady}
        onLayout={() => console.log('MapView layout completed')}
      >
        {mapReady && nearby.map((u) => {
          // Validate marker coordinates
          if (!u.location || typeof u.location.latitude !== 'number' || typeof u.location.longitude !== 'number') {
            console.warn('Invalid marker coordinates:', u);
            return null;
          }
          
          // Get user category and permissions
          const userCategory = PermissionsService.getUserCategory(u.id);
          const permissions = PermissionsService.getPermissions(u.id);
          
          // Only show location if user has permission to see it
          if (!permissions.canSeeLocation) {
            return null;
          }
          
          // Filter user data based on permissions
          const filteredData = PermissionsService.getFilteredUserData(u, u.id);
          
          return (
            <Marker
              key={u.id}
              coordinate={{ latitude: u.location.latitude, longitude: u.location.longitude }}
              title={`${filteredData.vehicleName || 'Vehicle'}`}
              description={`${filteredData.driverName || ''} • ${(u.distance / 1000).toFixed(1)} km`}
            />
          );
        })}
        
        {/* Route destination marker */}
        {mapReady && routeTo && typeof routeTo.latitude === 'number' && typeof routeTo.longitude === 'number' && (
          <Marker
            coordinate={{ latitude: routeTo.latitude, longitude: routeTo.longitude }}
            title={routeTo.title || 'Destination'}
            description={routeTo.description || ''}
            pinColor="red"
          />
        )}
        
        {/* Route polyline */}
        {mapReady && routeCoordinates.length >= 2 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#2563EB"
            strokeWidth={3}
            lineDashPattern={[1]}
          />
        )}
      </MapView>

      {/* Top bar with title */}
      <View style={{ position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 }}>
          <Text style={{ fontWeight: '800', color: '#111827' }}>RideOn</Text>
        </View>
      </View>

      {/* Route Info Panel */}
      {routeTo && (
        <View style={{ position: 'absolute', top: 80, left: 16, right: 16 }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 }}>
            <Text style={{ fontWeight: '800', color: '#111827', fontSize: 16, marginBottom: 4 }}>
              {routeTo.title || 'Destination'}
            </Text>
            <Text style={{ color: '#6B7280', fontSize: 14, marginBottom: 8 }}>
              {routeTo.description || ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity 
                onPress={clearRoute}
                style={{ backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Clear Route</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Bottom sheet-ish panel */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <View style={{ margin: 12, backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 16, padding: 12, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontWeight: '800', color: '#111827' }}>Nearby</Text>
            <TouchableOpacity onPress={refreshNearby} style={{ backgroundColor: '#2563EB', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 }}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Refresh</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={nearby}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => {
              // Get user category and permissions
              const userCategory = PermissionsService.getUserCategory(item.id);
              const permissions = PermissionsService.getPermissions(item.id);
              
              // Filter user data based on permissions
              const filteredData = PermissionsService.getFilteredUserData(item, item.id);
              
              return (
                <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F3F4F6' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: '#111827' }}>
                        {filteredData.vehicleName || 'Vehicle'}
                        {filteredData.driverName && (
                          <Text style={{ fontWeight: '400', color: '#6B7280' }}> — {filteredData.driverName}</Text>
                        )}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Text style={{ color: '#6B7280' }}>{(item.distance/1000).toFixed(2)} km away</Text>
                        <View style={{ 
                          backgroundColor: userCategory === 'stranger' ? '#E5E7EB' : userCategory === 'friend' ? '#10B981' : '#8B5CF6',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 8,
                          marginLeft: 8
                        }}>
                          <Text style={{ 
                            color: userCategory === 'stranger' ? '#6B7280' : 'white',
                            fontSize: 10,
                            fontWeight: '700'
                          }}>
                            {userCategory.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {userCategory === 'stranger' && (
                        <TouchableOpacity 
                          onPress={() => sendFriendRequest(item.id)} 
                          style={{ backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
                        >
                          <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>Add Friend</Text>
                        </TouchableOpacity>
                      )}
                      
                      {userCategory === 'friend' && !PermissionsService.hasPendingTrackerRequest(item.id) && (
                        <TouchableOpacity 
                          onPress={() => sendTrackerRequest(item.id)} 
                          style={{ backgroundColor: '#8B5CF6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
                        >
                          <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>Trust</Text>
                        </TouchableOpacity>
                      )}
                      
                      {userCategory === 'friend' && PermissionsService.hasPendingTrackerRequest(item.id) && (
                        <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
                          <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>Pending</Text>
                        </View>
                      )}
                      
                      {userCategory === 'tracker' && (
                        <TouchableOpacity 
                          onPress={() => navigation.navigate('Chat', { 
                            friendUid: item.id,
                            friendName: filteredData.driverName || filteredData.vehicleName || 'Friend',
                            friendPhoto: filteredData.photoURL,
                          })} 
                          style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
                        >
                          <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>Chat</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={<Text style={{ color: '#6B7280' }}>No vehicles found</Text>}
          />
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontWeight: '700', color: '#111827', marginBottom: 6 }}>BLE devices (ids)</Text>
            <FlatList
              data={devices}
              keyExtractor={(d) => d.id}
              renderItem={({ item }) => <Text style={{ paddingVertical: 4, color: '#6B7280' }}>{item.id}</Text>}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          </View>
        </View>
      </View>
    </View>
  );
}


