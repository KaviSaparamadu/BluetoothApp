import * as React from 'react';
import BluetoothScreen from './android/app/src/screen/Bluetooth';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <BluetoothScreen />
    </SafeAreaProvider>
  );
}
