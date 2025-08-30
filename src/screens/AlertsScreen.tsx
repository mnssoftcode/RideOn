import React from 'react';
import { View, Text } from 'react-native';
import Toast from 'react-native-toast-message';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Layout, CommonStyles, Responsive } from '../design/DesignSystem';

export default function AlertsScreen() {
  React.useEffect(() => {
    Toast.show({
      type: 'info',
      text1: 'Alerts Screen',
      text2: 'No active alerts at the moment',
      position: 'top',
      visibilityTime: 3000,
    });
  }, []);

  return (
    <View style={{ 
      flex: 1, 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: Colors.background,
      paddingHorizontal: Layout.screenPadding
    }}>
      <Text style={{ 
        fontSize: Typography['3xl'], 
        fontWeight: 'bold', 
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
        textAlign: 'center'
      }}>
        Alerts
      </Text>
      <Text style={{ 
        fontSize: Typography.lg, 
        color: Colors.textSecondary,
        textAlign: 'center'
      }}>
        No alerts at the moment
      </Text>
    </View>
  );
}


