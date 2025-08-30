// import React from 'react';
// import { Image } from 'react-native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import AuthScreen from '../screens/AuthScreen';
// import ProfileSetupScreen from '../screens/ProfileSetupScreen';
// import MapScreen from '../screens/MapScreen';
// import FriendsScreen from '../screens/FriendsScreen';
// import MessagesScreen from '../screens/MessagesScreen';
// import AlertsScreen from '../screens/AlertsScreen';
// import { useAuthState } from '../services/auth';
// import SplashScreen from '../screens/SplashScreen';

// const Stack = createNativeStackNavigator();
// const Tabs = createBottomTabNavigator();

// function TabsNavigator() {
//   return (
//     <Tabs.Navigator
//       screenOptions={({ route }) => ({
//         tabBarIcon: ({ focused }) => {
//           const tintColor = focused ? 'black' : '#9CA3AF';
//           let src: any = null;
//           if (route.name === 'Map') src = require('../assets/map.png');
//           if (route.name === 'Friends') src = require('../assets/friend.png');
//           if (route.name === 'Messages') src = require('../assets/message.png');
//           if (route.name === 'Alerts') src = require('../assets/alert.png');
//           return <Image source={src} style={{ width: 22, height: 22, tintColor }} />;
//         },
//         tabBarActiveTintColor: 'black',
//         tabBarInactiveTintColor: '#9CA3AF',
//         headerShown: false,
//       })}
//     >
//       <Tabs.Screen name="Map" component={MapScreen} />
//       <Tabs.Screen name="Friends" component={FriendsScreen} />
//       <Tabs.Screen name="Messages" component={MessagesScreen} />
//       <Tabs.Screen name="Alerts" component={AlertsScreen} />
//     </Tabs.Navigator>
//   );
// }

// export default function RootNavigator() {
//   const { isAuthenticated, needsProfile, loading } = useAuthState();

//   return (
//     <Stack.Navigator screenOptions={{ headerShown: false }}>
//       {loading ? (
//         <Stack.Screen name="Splash" component={SplashScreen} />
//       ) : !isAuthenticated ? (
//         <Stack.Screen name="Auth" component={AuthScreen} />
//       ) : needsProfile ? (
//         <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
//       ) : (
//         <Stack.Screen name="Main" component={TabsNavigator} />
//       )}
//     </Stack.Navigator>
//   );
// }


import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthScreen from '../screens/AuthScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import MapScreen from '../screens/MapScreen';
import FriendsScreen from '../screens/FriendsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import AlertsScreen from '../screens/AlertsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import SplashScreen from '../screens/SplashScreen';
import { useAuthState } from '../services/auth';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image } from 'react-native';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function TabsNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          const tintColor = focused ? 'black' : '#9CA3AF';
          let src: any = null;
          if (route.name === 'Map') src = require('../assets/map2.png');
          if (route.name === 'Friends') src = require('../assets/friend.png');
          if (route.name === 'Messages') src = require('../assets/message.png');
          if (route.name === 'Profile') src = require('../assets/user.png');
          return <Image source={src} style={{ width: 22, height: 22, tintColor }} />;
        },
        headerShown: false,
      })}
    >
      <Tabs.Screen name="Map" component={MapScreen} />
      <Tabs.Screen name="Friends" component={FriendsScreen} />
      <Tabs.Screen name="Messages" component={MessagesScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="Main" component={TabsNavigator} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}
