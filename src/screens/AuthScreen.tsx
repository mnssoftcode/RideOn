import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { getAuth, signInWithPhoneNumber, ConfirmationResult } from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';

export default function AuthScreen() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const navigation = useNavigation<any>();

  const sendCode = async () => {
    if (sending) return;
    const formatted = phone.trim();
    if (!/^\+\d{7,15}$/.test(formatted)) {
      setError('Enter phone with country code, e.g. +16505553434');
      return;
    }
    setError(null);
    setSending(true);
    try {
      const confirmation = await signInWithPhoneNumber(getAuth(), formatted);
      confirmationRef.current = confirmation;
      setStep('code');
    } catch (e: any) {
      setError(e?.message || 'Failed to send code');
    } finally {
      setSending(false);
    }
  };

  const confirm = async () => {
    if (!confirmationRef.current) return;
    await confirmationRef.current.confirm(code);
    navigation.navigate('Main')
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
              onChangeText={setPhone}
              placeholderTextColor="#9AA0A6"
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity style={[styles.primaryButton, sending && { opacity: 0.6 }]} onPress={sendCode} disabled={sending}>
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
              onChangeText={setCode}
              placeholderTextColor="#9AA0A6"
            />
            <TouchableOpacity style={styles.primaryButton} onPress={confirm}>
              <Text style={styles.primaryButtonText}>Verify</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={() => setStep('phone')}>
              <Text style={styles.linkText}>Edit phone</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F3F4F6' },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 16, color: '#111827', textAlign: 'center' },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    color: '#111827',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: 'white', fontWeight: '700', fontSize: 16 },
  linkButton: { alignItems: 'center', paddingVertical: 10 },
  linkText: { color: '#2563EB', fontWeight: '600' },
  errorText: { color: '#DC2626', marginBottom: 8, textAlign: 'center' },
});


