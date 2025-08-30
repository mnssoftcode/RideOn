/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { initFirebaseIfNeeded } from './src/config/firebase';
import Toast from 'react-native-toast-message';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  initFirebaseIfNeeded();

  return (
    <NavigationContainer>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <RootNavigator />
      <Toast />
    </NavigationContainer>
  );
}

export default App;
