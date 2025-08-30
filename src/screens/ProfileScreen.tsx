import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, TextInput, Alert, ScrollView } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Layout, CommonStyles, Responsive } from '../design/DesignSystem';

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
      Toast.show({
        type: 'success',
        text1: 'Logged Out',
        text2: 'You have been successfully logged out',
        position: 'top',
        visibilityTime: 2000,
      });
    } finally {
      navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
    }
  };

  const onSave = async () => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;
    if (!data?.driverName || !data?.vehicleName || !data?.vehicleNumber) {
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
      await firestore().collection('users').doc(uid).set({
        driverName: data.driverName,
        vehicleName: data.vehicleName,
        vehicleNumber: data.vehicleNumber,
      }, { merge: true });
      
      Toast.show({
        type: 'success',
        text1: 'Profile Updated!',
        text2: 'Your profile has been saved successfully',
        position: 'top',
        visibilityTime: 3000,
      });
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: e?.message || 'Unable to save profile. Please try again.',
        position: 'top',
        visibilityTime: 4000,
      });
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
            
            Toast.show({
              type: 'success',
              text1: 'Account Deleted',
              text2: 'Your account has been permanently removed',
              position: 'top',
              visibilityTime: 3000,
            });
            
            navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
          } catch (e: any) {
            Toast.show({
              type: 'error',
              text1: 'Delete Failed',
              text2: e?.message || 'You may need to re-login to delete.',
              position: 'top',
              visibilityTime: 4000,
            });
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
          style={[styles.saveBtn, { backgroundColor: Colors.surface, marginBottom: Spacing.md }]}
        >
          <Text style={[styles.saveText, { color: Colors.textPrimary }]}>Privacy Settings</Text>
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
    backgroundColor: Colors.background,
    paddingHorizontal: Layout.screenPadding,
  },
  containerCenter: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: Colors.background 
  },
  header: {
    paddingTop: Responsive.verticalScale(10),
    paddingBottom: Spacing['2xl'],
    alignItems: 'center',
  },
  title: { 
    fontSize: Typography['4xl'], 
    fontWeight: '800', 
    color: Colors.textPrimary,
    marginBottom: Responsive.verticalScale(4),
  },
  subtitle: {
    fontSize: Typography.lg,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  avatarContainer: {
    marginBottom: Spacing.lg,
  },
  avatar: { 
    width: Layout.avatarLarge, 
    height: Layout.avatarLarge, 
    borderRadius: BorderRadius.full,
    borderWidth: 4,
    borderColor: Colors.background,
    ...Shadows.lg,
  },
  avatarPlaceholder: { 
    width: Layout.avatarLarge, 
    height: Layout.avatarLarge, 
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
    fontWeight: '700',
    fontSize: Responsive.moderateScale(32),
  },
  userName: {
    fontSize: Typography['2xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Responsive.verticalScale(4),
  },
  userPhone: {
    fontSize: Typography.lg,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Layout.cardPadding,
    marginBottom: Spacing.lg,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: Typography.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  inputLabel: { 
    color: Colors.textPrimary, 
    fontWeight: '600', 
    marginBottom: Responsive.verticalScale(8),
    fontSize: Typography.sm,
  },
  input: { 
    borderWidth: 1, 
    borderColor: Colors.border, 
    backgroundColor: Colors.surface, 
    borderRadius: BorderRadius.lg, 
    paddingHorizontal: Spacing.lg, 
    paddingVertical: Responsive.verticalScale(14), 
    color: Colors.textPrimary,
    fontSize: Typography.lg,
  },
  readOnlyInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Responsive.verticalScale(14),
    borderWidth: 1,
    borderColor: Colors.border,
  },
  readOnlyText: {
    color: Colors.textSecondary,
    fontSize: Typography.lg,
    fontWeight: '500',
  },
  actionsContainer: {
    marginTop: Responsive.verticalScale(8),
  },
  saveBtn: { 
    backgroundColor: Colors.primary, 
    paddingVertical: Spacing.lg, 
    borderRadius: BorderRadius.lg, 
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveText: { 
    color: Colors.textInverse, 
    fontWeight: '700',
    fontSize: Typography.lg,
  },
  logoutBtn: { 
    backgroundColor: Colors.error, 
    paddingVertical: Spacing.lg, 
    borderRadius: BorderRadius.lg, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  logoutIcon: {
    width: Responsive.scale(20), 
    height: Responsive.scale(20), 
    tintColor: Colors.textInverse, 
    marginRight: Spacing.sm,
  },
  logoutText: { 
    color: Colors.textInverse, 
    fontWeight: '700',
    fontSize: Typography.lg,
  },
  deleteBtn: { 
    backgroundColor: Colors.textPrimary, 
    paddingVertical: Spacing.lg, 
    borderRadius: BorderRadius.lg, 
    alignItems: 'center',
    ...Shadows.md,
  },
  deleteText: { 
    color: Colors.textInverse, 
    fontWeight: '700',
    fontSize: Typography.lg,
  },
  bottomSpacing: {
    height: Responsive.verticalScale(32),
  },
});


