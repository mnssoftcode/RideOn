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

export default function SplashScreen() {
  const navigation = useNavigation();
  const { isAuthenticated, needsProfile, loading } = useAuthState();

  useEffect(() => {
    if (loading) return; // still checking auth
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
      } else if (needsProfile) {
        navigation.reset({ index: 0, routes: [{ name: 'ProfileSetup' }] });
      } else {
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
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
  card: { alignItems: 'center' },
  logo: { width: 100, height: 100, resizeMode: 'contain' },
  subtitle: { marginTop: 8, fontSize: 14, color: 'black', opacity: 0.9 },
});
