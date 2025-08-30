import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import PermissionsService, { UserCategory } from '../services/permissions';

type PrivacySettings = {
  shareMobileNumber: boolean;
  shareLocation: boolean;
  allowFriendRequests: boolean;
  allowTrackerRequests: boolean;
  showOnlineStatus: boolean;
  allowSOSAlerts: boolean;
};

export default function PrivacySettingsScreen() {
  const [settings, setSettings] = useState<PrivacySettings>({
    shareMobileNumber: false,
    shareLocation: true,
    allowFriendRequests: true,
    allowTrackerRequests: true,
    showOnlineStatus: true,
    allowSOSAlerts: true,
  });
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();
  const user = auth().currentUser;

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    if (!user) return;

    try {
      const userDoc = await firestore().collection('users').doc(user.uid).get();
      const userData = userDoc.data();
      
      if (userData?.privacySettings) {
        setSettings({
          ...settings,
          ...userData.privacySettings,
        });
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof PrivacySettings, value: boolean) => {
    if (!user) return;

    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);

      await firestore().collection('users').doc(user.uid).update({
        privacySettings: newSettings,
      });

      // Show confirmation for important changes
      if (key === 'shareMobileNumber' && value) {
        Alert.alert(
          'Mobile Number Sharing',
          'Your mobile number will now be visible to trusted trackers. You can change this anytime.',
          [{ text: 'OK' }]
        );
      } else if (key === 'allowSOSAlerts' && value) {
        Alert.alert(
          'SOS Alerts Enabled',
          'You will now receive SOS alerts from your trusted trackers in emergency situations.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating privacy setting:', error);
      Alert.alert('Error', 'Failed to update setting. Please try again.');
      
      // Revert the change
      setSettings({ ...settings });
    }
  };

  const getCategoryDescription = (category: UserCategory): string => {
    switch (category) {
      case 'stranger':
        return 'Public users can only see your vehicle name and number';
      case 'friend':
        return 'Friends can see your profile photo, name, and vehicle details';
      case 'tracker':
        return 'Trusted trackers can see your location and track your routes';
      default:
        return '';
    }
  };

  const getCategoryIcon = (category: UserCategory): string => {
    switch (category) {
      case 'stranger':
        return '👤';
      case 'friend':
        return '👥';
      case 'tracker':
        return '🔒';
      default:
        return '❓';
    }
  };

  const renderSettingItem = (
    title: string,
    description: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    icon?: string
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingContent}>
        {icon && <Text style={styles.settingIcon}>{icon}</Text>}
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E5E7EB', true: '#2563EB' }}
        thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
      />
    </View>
  );

  const renderCategorySection = (category: UserCategory) => (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryIcon}>{getCategoryIcon(category)}</Text>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryTitle}>
            {category.charAt(0).toUpperCase() + category.slice(1)}s
          </Text>
          <Text style={styles.categoryDescription}>
            {getCategoryDescription(category)}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image 
              source={require('../assets/left-arrow.png')} 
              style={styles.backIcon}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Settings</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image 
            source={require('../assets/left-arrow.png')} 
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* User Categories Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Categories</Text>
        <Text style={styles.sectionDescription}>
          Different users have different levels of access to your information
        </Text>
        
        {renderCategorySection('stranger')}
        {renderCategorySection('friend')}
        {renderCategorySection('tracker')}
      </View>

      {/* Privacy Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy Controls</Text>
        <Text style={styles.sectionDescription}>
          Manage what information you share with trusted users
        </Text>

        {renderSettingItem(
          'Share Mobile Number',
          'Allow trusted trackers to see your mobile number',
          settings.shareMobileNumber,
          (value) => updateSetting('shareMobileNumber', value),
          '📱'
        )}

        {renderSettingItem(
          'Share Location',
          'Allow friends and trackers to see your location',
          settings.shareLocation,
          (value) => updateSetting('shareLocation', value),
          '📍'
        )}

        {renderSettingItem(
          'Show Online Status',
          'Let others know when you are online',
          settings.showOnlineStatus,
          (value) => updateSetting('showOnlineStatus', value),
          '🟢'
        )}
      </View>

      {/* Request Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Request Controls</Text>
        <Text style={styles.sectionDescription}>
          Control who can send you friend and tracker requests
        </Text>

        {renderSettingItem(
          'Allow Friend Requests',
          'Let others send you friend requests',
          settings.allowFriendRequests,
          (value) => updateSetting('allowFriendRequests', value),
          '👥'
        )}

        {renderSettingItem(
          'Allow Tracker Requests',
          'Let friends send you tracker requests',
          settings.allowTrackerRequests,
          (value) => updateSetting('allowTrackerRequests', value),
          '🔒'
        )}
      </View>

      {/* Safety Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safety Controls</Text>
        <Text style={styles.sectionDescription}>
          Emergency and safety-related settings
        </Text>

        {renderSettingItem(
          'SOS Alerts',
          'Receive emergency alerts from trusted trackers',
          settings.allowSOSAlerts,
          (value) => updateSetting('allowSOSAlerts', value),
          '🚨'
        )}
      </View>

      {/* Information */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Privacy Information</Text>
        <Text style={styles.infoText}>
          • Strangers can only see your vehicle name and number{'\n'}
          • Friends can see your profile photo, name, and vehicle details{'\n'}
          • Trusted trackers can see your location and track your routes{'\n'}
          • You can change these settings anytime{'\n'}
          • Your mobile number is never shared with strangers
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
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
  backIcon: {
    width: 24,
    height: 24,
    tintColor: '#111827',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  infoSection: {
    backgroundColor: 'white',
    marginTop: 16,
    marginBottom: 32,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});
