// import React from 'react';
// import { View, Text, StyleSheet ,Image} from 'react-native';

// export default function SplashScreen() {
//   return (
//     <View style={styles.container}>
//       <View style={styles.card}>
//         <Image source={require('../assets/logo.png')} style={styles.logo} />
//         <Text style={styles.subtitle}>Let’s Ride Together</Text>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
//   card: { alignItems: 'center' },
//   logo: { width: 100, height: 100 ,resizeMode:'contain'},
//   subtitle: { marginTop: 8, fontSize: 14, color: 'black', opacity: 0.9 },
// });


import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthState } from '../services/auth';
import Toast from 'react-native-toast-message';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Layout, CommonStyles, Responsive } from '../design/DesignSystem';

export default function SplashScreen() {
  const navigation = useNavigation();
  const { isAuthenticated, needsProfile, loading } = useAuthState();

  useEffect(() => {
    if (loading) return; // still checking auth
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        Toast.show({
          type: 'info',
          text1: 'Welcome to RideOn',
          text2: 'Please sign in to continue',
          position: 'top',
          visibilityTime: 2000,
        });
        navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
      } else if (needsProfile) {
        Toast.show({
          type: 'info',
          text1: 'Complete Your Profile',
          text2: 'Let\'s set up your account',
          position: 'top',
          visibilityTime: 2000,
        });
        navigation.reset({ index: 0, routes: [{ name: 'ProfileSetup' }] });
      } else {
        Toast.show({
          type: 'success',
          text1: 'Welcome Back!',
          text2: 'Loading your dashboard...',
          position: 'top',
          visibilityTime: 2000,
        });
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      }
    }, 1200); // show splash at least 1.2s
    return () => clearTimeout(timer);
  }, [loading, isAuthenticated, needsProfile]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image source={require('../assets/logo.png')} style={styles.logo} />
        <Text style={styles.subtitle}>Let’s Ride Together</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: Colors.background 
  },
  card: { 
    alignItems: 'center',
    padding: Spacing.xl,
  },
  logo: { 
    width: Responsive.scale(100), 
    height: Responsive.scale(100), 
    resizeMode: 'contain' 
  },
  subtitle: { 
    marginTop: Spacing.sm, 
    fontSize: Typography.base, 
    color: Colors.textPrimary, 
    opacity: 0.9,
    fontWeight: '500',
  },
});
