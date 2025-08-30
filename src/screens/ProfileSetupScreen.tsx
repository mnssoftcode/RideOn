import React, { useState } from 'react';
import { View, Text, TextInput, Image, StyleSheet, Alert, Pressable, TouchableOpacity } from 'react-native';
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { launchImageLibrary } from 'react-native-image-picker';

export default function ProfileSetupScreen() {
  const user = auth().currentUser;
  const [driverName, setDriverName] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const pickPhoto = async () => {
    const res = await launchImageLibrary({ mediaType: 'photo' });
    const uri = res.assets?.[0]?.uri;
    if (uri) setPhotoUri(uri);
  };

  const save = async () => {
    if (!user) return;
    if (!driverName || !vehicleName || !vehicleNumber) {
      Alert.alert('Please fill all fields');
      return;
    }
    setSaving(true);
    // let photoURL: string | undefined = undefined;
    try 
      // if (photoUri) {
      //   const ref = storage().ref(`profiles/${user.uid}.jpg`);
      //   await ref.putFile(photoUri);
      //   photoURL = await ref.getDownloadURL();
      
      {firestore().collection('users').doc(user.uid).set({
        phone: user.phoneNumber,
        driverName,
        // photoURL: photoURL || null,
        vehicleName,
        vehicleNumber,
        createdAt: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create your profile</Text>
        {/* Photo picking temporarily disabled */}
        {/* <Pressable style={styles.photoButton} onPress={pickPhoto} android_ripple={{ color: '#2563eb22' }}>
          <Text style={styles.photoButtonText}>{photoUri ? 'Change Photo' : 'Pick Photo'}</Text>
        </Pressable>
        {!!photoUri && <Image source={{ uri: photoUri }} style={styles.photo} />} */}
        <TextInput placeholder="Driver name" placeholderTextColor="#9AA0A6" style={styles.input} value={driverName} onChangeText={setDriverName} />
        <TextInput placeholder="Vehicle name" placeholderTextColor="#9AA0A6" style={styles.input} value={vehicleName} onChangeText={setVehicleName} />
        <TextInput placeholder="Vehicle number" placeholderTextColor="#9AA0A6" style={styles.input} autoCapitalize="characters" value={vehicleNumber} onChangeText={setVehicleNumber} />
        <TouchableOpacity style={[styles.primaryButton, saving && { opacity: 0.6 }]} onPress={save} disabled={saving} android_ripple={{ color: '#2563eb33' }}>
          <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F3F4F6' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 16, color: '#111827', textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    color: '#111827',
  },
  photo: { width: 120, height: 120, borderRadius: 60, alignSelf: 'center', marginVertical: 12 },
  photoButton: { alignSelf: 'center', backgroundColor: '#EEF2FF', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 8 },
  photoButtonText: { color: '#4F46E5', fontWeight: '700' },
  primaryButton: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: 'white', fontWeight: '700', fontSize: 16 },
});


