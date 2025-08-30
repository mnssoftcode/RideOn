import { BleManager, Device } from 'react-native-ble-plx';
import { useEffect, useMemo, useState } from 'react';

const manager = new BleManager();

export function useBleScan() {
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    const seen = new Map<string, Device>();
    const sub = manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) return;
      if (device && device.id && !seen.has(device.id)) {
        seen.set(device.id, device);
        setDevices(Array.from(seen.values()));
      }
    });
    return () => manager.stopDeviceScan();
  }, []);

  return useMemo(() => ({ devices }), [devices]);
}


