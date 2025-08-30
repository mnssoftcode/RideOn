import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Layout, CommonStyles, Responsive } from '../design/DesignSystem';

export default function AuthScreen() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [sending, setSending] = useState(false);
  const confirmationRef = useRef<any | null>(null);
  const navigation = useNavigation<any>();

  const sendCode = async () => {
    if (sending) return;
    const formatted = phone.trim();
    if (!/^\+\d{7,15}$/.test(formatted)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Phone Number',
        text2: 'Enter phone with country code, e.g. +16505553434',
        position: 'top',
        visibilityTime: 4000,
      });
      return;
    }
    setSending(true);
    try {
      const confirmation = await signInWithPhoneNumber(getAuth(), formatted);
      confirmationRef.current = confirmation;
      setStep('code');
      Toast.show({
        type: 'success',
        text1: 'Code Sent!',
        text2: `Verification code sent to ${formatted}`,
        position: 'top',
        visibilityTime: 3000,
      });
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Send Code',
        text2: e?.message || 'Please try again later',
        position: 'top',
        visibilityTime: 4000,
      });
    } finally {
      setSending(false);
    }
  };

  const confirm = async () => {
    if (!confirmationRef.current) return;
    if (!code.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Code Required',
        text2: 'Please enter the verification code',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }
    
    try {
      await confirmationRef.current.confirm(code);
      Toast.show({
        type: 'success',
        text1: 'Welcome to RideOn!',
        text2: 'Phone number verified successfully',
        position: 'top',
        visibilityTime: 3000,
      });
      navigation.navigate('Main');
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: e?.message || 'Invalid code. Please try again',
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>RideOn</Text>
        {step === 'phone' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (text.length === 1) {
                  Toast.show({
                    type: 'info',
                    text1: 'Phone Number',
                    text2: 'Include country code (e.g., +1 for US)',
                    position: 'top',
                    visibilityTime: 3000,
                  });
                }
              }}
              placeholderTextColor="#9AA0A6"
            />

            <TouchableOpacity style={[styles.primaryButton, sending && { opacity: 0.6 }]} onPress={() => {
              if (phone.trim()) {
                Toast.show({
                  type: 'info',
                  text1: 'Sending Code',
                  text2: 'Please wait while we send the verification code...',
                  position: 'top',
                  visibilityTime: 2000,
                });
              }
              sendCode();
            }} disabled={sending}>
              <Text style={styles.primaryButtonText}>{sending ? 'Sending...' : 'Send Code'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Enter verification code"
              keyboardType="number-pad"
              value={code}
              onChangeText={(text) => {
                setCode(text);
                if (text.length === 1) {
                  Toast.show({
                    type: 'info',
                    text1: 'Enter Code',
                    text2: 'Please enter the 6-digit code sent to your phone',
                    position: 'top',
                    visibilityTime: 3000,
                  });
                }
              }}
              placeholderTextColor="#9AA0A6"
            />
            <TouchableOpacity style={styles.primaryButton} onPress={() => {
              if (code.trim()) {
                Toast.show({
                  type: 'info',
                  text1: 'Verifying Code',
                  text2: 'Please wait while we verify your code...',
                  position: 'top',
                  visibilityTime: 2000,
                });
              }
              confirm();
            }}>
              <Text style={styles.primaryButtonText}>Verify</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={() => {
              setStep('phone');
              Toast.show({
                type: 'info',
                text1: 'Edit Phone Number',
                text2: 'You can now modify your phone number',
                position: 'top',
                visibilityTime: 2000,
              });
            }}>
              <Text style={styles.linkText}>Edit phone</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: Layout.screenPadding, 
    backgroundColor: Colors.background 
  },
  card: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Layout.cardPadding,
    ...Shadows.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { 
    fontSize: Typography['4xl'], 
    fontWeight: '800', 
    marginBottom: Spacing.lg, 
    color: Colors.textPrimary, 
    textAlign: 'center' 
  },
  input: {
    width: '100%',
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
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Responsive.verticalScale(12),
    alignItems: 'center',
    marginTop: Responsive.verticalScale(4),
    ...Shadows.md,
  },
  primaryButtonText: { 
    color: Colors.textInverse, 
    fontWeight: '700', 
    fontSize: Typography.lg 
  },
  linkButton: { 
    alignItems: 'center', 
    paddingVertical: Responsive.verticalScale(10) 
  },
  linkText: { 
    color: Colors.primary, 
    fontWeight: '600',
    fontSize: Typography.base,
  },
});


