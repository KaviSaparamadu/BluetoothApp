import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import BleManager from 'react-native-ble-manager';
import { PermissionsAndroid, Platform } from 'react-native';

const BluetoothScreen = () => {
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState(new Set());

  useEffect(() => {
    const checkPermissions = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission Required',
            message: 'This app needs access to your location to find Bluetooth devices.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Bluetooth scanning requires location permission.');
        }
      }
    };

    checkPermissions();
    BleManager.start({ showAlert: false });

    const handleDiscoverPeripheral = (peripheral) => {
      if (peripheral.name) {
        setDevices(prevDevices => {
          // Check if device is already in the list
          const index = prevDevices.findIndex(dev => dev.id === peripheral.id);
          if (index === -1) {
            // Device not found, add it
            return [...prevDevices, peripheral];
          } else {
            // Device found, update its RSSI
            const updatedDevices = [...prevDevices];
            updatedDevices[index].rssi = peripheral.rssi;
            return updatedDevices;
          }
        });
      }
    };

    const handleStopScan = () => {
      setScanning(false);
    };

    const handleStartScan = () => {
      setScanning(true);
    };

    const subscription = BleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
    const stopScanSubscription = BleManagerEmitter.addListener('BleManagerStopScan', handleStopScan);
    const startScanSubscription = BleManagerEmitter.addListener('BleManagerStartScan', handleStartScan);

    return () => {
      subscription.remove();
      stopScanSubscription.remove();
      startScanSubscription.remove();
    };
  }, []);

  const startScan = () => {
    setDevices([]);
    BleManager.scan([], 5, true)
      .then(() => {
        console.log('Scanning...');
      })
      .catch(err => {
        console.log(err);
      });
  };

  const connectToDevice = async (deviceId) => {
    try {
      await BleManager.connect(deviceId);
      setConnectedDevices(prev => new Set(prev).add(deviceId));
      Alert.alert('Success', `Connected to device: ${deviceId}`);
      
      // Retrieve services
      const services = await BleManager.retrieveServices(deviceId);
      console.log('Services:', services);
      
    } catch (error) {
      console.error('Connection failed:', error);
      Alert.alert('Error', 'Failed to connect to device');
    }
  };

  const disconnectFromDevice = async (deviceId) => {
    try {
      await BleManager.disconnect(deviceId);
      setConnectedDevices(prev => {
        const newSet = new Set(prev);
        newSet.delete(deviceId);
        return newSet;
      });
      Alert.alert('Success', `Disconnected from device: ${deviceId}`);
    } catch (error) {
      console.error('Disconnection failed:', error);
      Alert.alert('Error', 'Failed to disconnect from device');
    }
  };

  const renderDevice = ({ item }) => {
    const isConnected = connectedDevices.has(item.id);
    
    return (
      <View style={styles.deviceContainer}>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>
            {item.name || 'Unknown Device'}
          </Text>
          <Text style={styles.deviceId}>
            {item.id}
          </Text>
          <Text style={styles.rssi}>
            RSSI: {item.rssi}
          </Text>
        </View>
        <TouchableOpacity 
          style={[
            styles.connectButton,
            { backgroundColor: isConnected ? '#FF3B30' : '#007AFF' }
          ]}
          onPress={() => {
            if (isConnected) {
              disconnectFromDevice(item.id);
            } else {
              connectToDevice(item.id);
            }
          }}
        >
          <Text style={styles.connectButtonText}>
            {isConnected ? 'Disconnect' : 'Connect'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[
          styles.scanButton,
          { backgroundColor: scanning ? '#ccc' : '#007AFF' }
        ]}
        onPress={startScan}
        disabled={scanning}
      >
        <Text style={styles.scanButtonText}>
          {scanning ? 'Scanning...' : 'Start Scan'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.headerText}>
        Found Devices ({devices.length})
      </Text>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={renderDevice}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No devices found. Press "Start Scan" to search for devices.
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scanButton: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  scanButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  deviceContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceId: {
    fontSize: 14,
    color: '#666',
  },
  rssi: {
    fontSize: 12,
    color: '#999',
  },
  connectButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 10,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 50,
  },
});

export default BluetoothScreen;