import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, TextInput, Alert, ScrollView } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';

type UserDoc = {
  phone?: string;
  driverName?: string;
  photoURL?: string | null;
  vehicleName?: string;
  vehicleNumber?: string;
};

export default function ProfileScreen() {
  const [data, setData] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigation = useNavigation<any>();

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }
    const unsub = firestore().collection('users').doc(uid).onSnapshot((snap) => {
      setData((snap.data() as UserDoc) || {});
      setLoading(false);
    });
    return unsub;
  }, []);

  const onLogout = async () => {
    try {
      await auth().signOut();
    } finally {
      navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
    }
  };

  const onSave = async () => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;
    if (!data?.driverName || !data?.vehicleName || !data?.vehicleNumber) {
      Alert.alert('Please fill all fields');
      return;
    }
    setSaving(true);
    try {
      await firestore().collection('users').doc(uid).set({
        driverName: data.driverName,
        vehicleName: data.vehicleName,
        vehicleNumber: data.vehicleNumber,
      }, { merge: true });
      Alert.alert('Saved');
    } catch (e: any) {
      Alert.alert('Failed to save', e?.message || '');
    } finally {
      setSaving(false);
    }
  };

  const onDeleteAccount = async () => {
    const user = auth().currentUser;
    if (!user) return;
    Alert.alert('Delete Account', 'This will permanently delete your account and profile. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            // Best-effort: delete profile doc
            await firestore().collection('users').doc(user.uid).delete().catch(() => {});
            // Optionally remove connections root doc (subcollections remain unless you set up a Cloud Function)
            await firestore().collection('connections').doc(user.uid).delete().catch(() => {});
            await user.delete();
            navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
          } catch (e: any) {
            Alert.alert('Delete failed', e?.message || 'You may need to re-login to delete.');
          }
        } },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.containerCenter}> 
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Manage your account settings</Text>
      </View>

      {/* Profile Photo Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {data?.photoURL ? (
            <Image source={{ uri: data.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}> 
              <Text style={styles.avatarText}>{(data?.driverName || 'U').slice(0,1).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <Text style={styles.userName}>{data?.driverName || 'Driver Name'}</Text>
        <Text style={styles.userPhone}>{data?.phone || auth().currentUser?.phoneNumber || 'Phone Number'}</Text>
      </View>

      {/* Personal Information Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Driver Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#9CA3AF"
            value={data?.driverName || ''}
            onChangeText={(t) => setData((d) => ({ ...(d || {}), driverName: t }))}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={styles.readOnlyInput}>
            <Text style={styles.readOnlyText}>{data?.phone || auth().currentUser?.phoneNumber || '—'}</Text>
          </View>
        </View>
      </View>

      {/* Vehicle Information Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Vehicle Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Vehicle Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Swift, Scorpio, Creta"
            placeholderTextColor="#9CA3AF"
            value={data?.vehicleName || ''}
            onChangeText={(t) => setData((d) => ({ ...(d || {}), vehicleName: t }))}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Vehicle Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., DL01AB1234"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            value={data?.vehicleNumber || ''}
            onChangeText={(t) => setData((d) => ({ ...(d || {}), vehicleNumber: t }))}
          />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          disabled={saving} 
          onPress={onSave} 
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        >
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => navigation.navigate('PrivacySettings')} 
          style={[styles.saveBtn, { backgroundColor: '#8B5CF6', marginBottom: 12 }]}
        >
          <Text style={styles.saveText}>Privacy Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Image source={require('../assets/logout.png')} style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onDeleteAccount} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 16,
  },
  containerCenter: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#F3F4F6' 
  },
  header: {
    paddingTop: 10,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: { 
    width: 100, 
    height: 100, 
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  avatarPlaceholder: { 
    width: 100, 
    height: 100, 
    borderRadius: 50,
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
    fontSize: 32,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: { 
    color: '#374151', 
    fontWeight: '600', 
    marginBottom: 8,
    fontSize: 14,
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    backgroundColor: '#F9FAFB', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    color: '#111827',
    fontSize: 16,
  },
  readOnlyInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  readOnlyText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  actionsContainer: {
    marginTop: 8,
  },
  saveBtn: { 
    backgroundColor: '#2563EB', 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveText: { 
    color: 'white', 
    fontWeight: '700',
    fontSize: 16,
  },
  logoutBtn: { 
    backgroundColor: '#EF4444', 
    paddingVertical: 16, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#EF4444',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  logoutIcon: {
    width: 20, 
    height: 20, 
    tintColor: 'white', 
    marginRight: 8,
  },
  logoutText: { 
    color: 'white', 
    fontWeight: '700',
    fontSize: 16,
  },
  deleteBtn: { 
    backgroundColor: '#111827', 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  deleteText: { 
    color: 'white', 
    fontWeight: '700',
    fontSize: 16,
  },
  bottomSpacing: {
    height: 32,
  },
});


