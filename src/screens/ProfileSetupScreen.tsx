import React, { useState } from 'react';
import { View, Text, TextInput, Image, StyleSheet, Alert, Pressable, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { launchImageLibrary } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Layout, CommonStyles, Responsive } from '../design/DesignSystem';

export default function ProfileSetupScreen() {
  const user = auth().currentUser;
  const navigation = useNavigation<any>();
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
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please fill all required fields',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }
    setSaving(true);
    try {
      await firestore().collection('users').doc(user.uid).set({
        phone: user.phoneNumber,
        driverName,
        vehicleName,
        vehicleNumber,
        createdAt: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      
      Toast.show({
        type: 'success',
        text1: 'Profile Created!',
        text2: 'Your profile has been saved successfully',
        position: 'top',
        visibilityTime: 3000,
      });
      
      navigation.navigate('Main');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: 'Unable to save profile. Please try again.',
        position: 'top',
        visibilityTime: 4000,
      });
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
        <TouchableOpacity style={[styles.primaryButton, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: Layout.screenPadding, 
    backgroundColor: Colors.background 
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Layout.cardPadding,
    ...Shadows.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { 
    fontSize: Typography['3xl'], 
    fontWeight: '800', 
    marginBottom: Spacing.lg, 
    color: Colors.textPrimary, 
    textAlign: 'center' 
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Responsive.verticalScale(12),
    marginBottom: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.base,
  },
  photo: { 
    width: Layout.avatarXLarge, 
    height: Layout.avatarXLarge, 
    borderRadius: BorderRadius.full, 
    alignSelf: 'center', 
    marginVertical: Spacing.md 
  },
  photoButton: { 
    alignSelf: 'center', 
    backgroundColor: Colors.surface, 
    borderRadius: BorderRadius.full, 
    paddingHorizontal: Spacing.lg, 
    paddingVertical: Responsive.verticalScale(8), 
    marginBottom: Responsive.verticalScale(8),
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoButtonText: { 
    color: Colors.primary, 
    fontWeight: '700',
    fontSize: Typography.base,
  },
  primaryButton: { 
    backgroundColor: Colors.primary, 
    borderRadius: BorderRadius.lg, 
    paddingVertical: Responsive.verticalScale(12), 
    alignItems: 'center', 
    marginTop: Responsive.verticalScale(8),
    ...Shadows.md,
  },
  primaryButtonText: { 
    color: Colors.textInverse, 
    fontWeight: '700', 
    fontSize: Typography.lg 
  },
});


