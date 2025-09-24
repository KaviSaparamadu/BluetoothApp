import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Switch, TouchableOpacity, Alert, NativeEventEmitter, NativeModules } from 'react-native';
import BleManager from 'react-native-ble-manager';
import { PermissionsAndroid, Platform } from 'react-native';

export default function BluetoothScreen() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [devices, setDevices] = useState([]);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [scanning, setScanning] = useState(false);

  const BleManagerModule = NativeModules.BleManager;
  const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

  useEffect(() => {
    BleManager.start({ showAlert: false });

    if (Platform.OS === 'android') {
      requestPermissions();
    }

    const handleDiscoverPeripheral = (peripheral) => {
      if (peripheral.name) { -
        setDevices(prev => {
          const exists = prev.find(device => device.id === peripheral.id);
          if (!exists) {
            return [...prev, {
              id: peripheral.id,
              name: peripheral.name,
              connected: false,
              rssi: peripheral.rssi
            }];
          }
          return prev;
        });
      }
    };

    const handleDisconnect = (args) => {
      const { peripheral } = args;
      setDevices(prev => prev.map(device => 
        device.id === peripheral ? { ...device, connected: false } : device
      ));
      setConnectedDevices(prev => prev.filter(id => id !== peripheral));
    };

    const handleConnect = (args) => {
      const { peripheral } = args;
      setDevices(prev => prev.map(device => 
        device.id === peripheral ? { ...device, connected: true } : device
      ));
      setConnectedDevices(prev => {
        if (!prev.includes(peripheral)) {
          return [...prev, peripheral];
        }
        return prev;
      });
    };

    // Add event listeners using NativeEventEmitter
    let discoverListener, disconnectListener, connectListener;
    
    try {
      discoverListener = bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
      disconnectListener = bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', handleDisconnect);
      connectListener = bleManagerEmitter.addListener('BleManagerConnectPeripheral', handleConnect);
    } catch (error) {
      console.error('Failed to add BLE listeners:', error);
    }
    
    // Start scanning when component mounts
    startScan();

    return () => {
      // Clean up listeners
      if (discoverListener) {
        discoverListener.remove();
      }
      if (disconnectListener) {
        disconnectListener.remove();
      }
      if (connectListener) {
        connectListener.remove();
      }
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        
        const allGranted = Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );
        
        if (!allGranted) {
          Alert.alert('Permissions Required', 'Please grant all permissions to use Bluetooth features');
        }
      } catch (error) {
        console.error('Permission request failed:', error);
      }
    }
  };

  const startScan = () => {
    if (!scanning && isEnabled) {
      setScanning(true);
      
      BleManager.scan([], 10, true).then(() => {
        console.log('Scanning started');
        setTimeout(() => {
          setScanning(false);
          console.log('Scanning stopped');
        }, 10000);
      }).catch(error => {
        console.error('Scan failed:', error);
        setScanning(false);
      });
    }
  };

  const connectToDevice = async (deviceId) => {
    try {
      await BleManager.connect(deviceId);
      
      // Update device status
      setDevices(prev => prev.map(device => 
        device.id === deviceId ? { ...device, connected: true } : device
      ));
      setConnectedDevices(prev => {
        if (!prev.includes(deviceId)) {
          return [...prev, deviceId];
        }
        return prev;
      });
      
      Alert.alert('Success', 'Device connected successfully');
      
    } catch (error) {
      console.error('Connection failed:', error);
      Alert.alert('Error', 'Failed to connect to device');
    }
  };

  const disconnectFromDevice = async (deviceId) => {
    try {
      await BleManager.disconnect(deviceId);
      
      // Update device status
      setDevices(prev => prev.map(device => 
        device.id === deviceId ? { ...device, connected: false } : device
      ));
      setConnectedDevices(prev => prev.filter(id => id !== deviceId));
      
      Alert.alert('Success', 'Device disconnected successfully');
      
    } catch (error) {
      console.error('Disconnection failed:', error);
      Alert.alert('Error', 'Failed to disconnect from device');
    }
  };

  const handleDevicePress = (device) => {
    if (device.connected) {
      disconnectFromDevice(device.id);
    } else {
      connectToDevice(device.id);
    }
  };

  const toggleBluetooth = (value) => {
    setIsEnabled(value);
    if (value) {
      startScan();
    } else {
      // Disconnect all devices when Bluetooth is disabled
      connectedDevices.forEach(deviceId => {
        disconnectFromDevice(deviceId);
      });
      setDevices([]);
      setScanning(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bluetooth</Text>
        <Text style={styles.cardText}>
          Connect to accessories you can use for activities such as streaming music,
          making phone calls and gaming.
        </Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Bluetooth</Text>
          <Switch value={isEnabled} onValueChange={toggleBluetooth} />
        </View>
      </View>

      {/* My Devices */}
      <Text style={styles.subtitle}>
        My Devices {scanning && isEnabled ? '(Scanning...)' : ''}
      </Text>
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.deviceCard}
            onPress={() => handleDevicePress(item)}
            disabled={!isEnabled}
          >
            <View>
              <Text style={styles.deviceName}>{item.name}</Text>
              <Text style={styles.status}>
                {item.connected ? 'Connected' : 'Not Connected'}
              </Text>
            </View>
            <Text style={styles.infoText}>
              {item.connected ? 'Disconnect' : 'Connect'}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isEnabled ? (
            <Text style={[styles.status, { textAlign: 'center', marginTop: 20 }]}>
              Bluetooth is disabled
            </Text>
          ) : (
            <Text style={[styles.status, { textAlign: 'center', marginTop: 20 }]}>
              {scanning ? 'Scanning for devices...' : 'No devices found'}
            </Text>
          )
        }
      />
      
      {/* Refresh Button */}
      {isEnabled && !scanning && (
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={startScan}
        >
          <Text style={styles.refreshButtonText}>Refresh Scan</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 16 },
  card: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: { fontSize: 20, fontWeight: '600', color: '#fff', marginBottom: 8 },
  cardText: { fontSize: 14, color: '#aaa', textAlign: 'center', marginBottom: 16 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  switchLabel: { color: '#fff', fontSize: 16 },
  subtitle: { marginVertical: 12, fontSize: 16, fontWeight: '600', color: '#aaa' },
  deviceCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  deviceName: { fontSize: 16, color: '#fff', marginBottom: 4 },
  status: { fontSize: 13, color: '#888' },
  infoText: { fontSize: 13, color: '#3b82f6' },
  refreshButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});