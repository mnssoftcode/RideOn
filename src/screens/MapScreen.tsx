import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Platform, PermissionsAndroid, Alert, Pressable, Image, TouchableHighlight, TouchableOpacity } from 'react-native';
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

  const sendRequest = async (otherUid: string) => {
    console.log('[Map] sendRequest:start', otherUid);
    const me = auth().currentUser;
    if (!me) return;
    const myRef = firestore().collection('connections').doc(otherUid).collection('friends').doc(me.uid);
    await myRef.set({ status: 'pending', createdAt: firestore.FieldValue.serverTimestamp() });
    console.log('[Map] sendRequest:done');
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
          
          return (
            <Marker
              key={u.id}
              coordinate={{ latitude: u.location.latitude, longitude: u.location.longitude }}
              title={`${u.vehicleName || 'Vehicle'}`}
              description={`${u.driverName || ''} • ${(u.distance / 1000).toFixed(1)} km`}
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
            renderItem={({ item }) => (
              <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F3F4F6' }}>
                <Text style={{ fontWeight: '700', color: '#111827' }}>{item.vehicleName || 'Vehicle'} <Text style={{ fontWeight: '400', color: '#6B7280' }}>— {item.driverName || ''}</Text></Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                  <Text style={{ color: '#6B7280' }}>{(item.distance/1000).toFixed(2)} km away</Text>
                  <TouchableOpacity onPress={() => sendRequest(item.id)} style={{ backgroundColor: '#111827', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
                    <Text style={{ color: 'white', fontWeight: '700' }}>Send Request</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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


