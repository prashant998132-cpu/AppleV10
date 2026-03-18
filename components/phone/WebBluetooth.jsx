'use client';
// components/phone/WebBluetooth.jsx — JARVIS Web Bluetooth Control
// ══════════════════════════════════════════════════════════════
// Chrome Android pe kaam karta hai (no Play Store app chahiye)
// Supports: BLE devices, custom GATT services
// ══════════════════════════════════════════════════════════════

import { useState, useRef, useCallback } from 'react';

// ─── KNOWN DEVICE PROFILES ────────────────────────────────────
const DEVICE_PROFILES = {
  // Mi Band / Xiaomi
  miBand: {
    name: 'Mi Band',
    serviceUUID: 'fee0',
    characteristics: { heartRate: '00002a37-0000-1000-8000-00805f9b34fb' },
  },
  // Generic Heart Rate Monitor
  heartRate: {
    name: 'Heart Rate Monitor',
    serviceUUID: 'heart_rate',
    characteristics: { measurement: '00002a37-0000-1000-8000-00805f9b34fb' },
  },
  // BLE Smart Bulb (generic)
  smartBulb: {
    name: 'Smart Bulb',
    serviceUUID: 'ffe0',
    characteristics: { control: 'ffe1' },
  },
  // Arduino / Custom Device
  custom: {
    name: 'Custom Device (Arduino/ESP32)',
    serviceUUID: null, // user enter karega
    characteristics: {},
  },
};

// ─── BLUETOOTH HOOK ───────────────────────────────────────────
export function useWebBluetooth() {
  const [device, setDevice] = useState(null);
  const [status, setStatus] = useState('disconnected'); // disconnected|scanning|connected|error
  const [error, setError] = useState(null);
  const [services, setServices] = useState([]);
  const [characteristics, setCharacteristics] = useState({});
  const [notifications, setNotifications] = useState([]);
  const serverRef = useRef(null);

  const isSupported = typeof navigator !== 'undefined' && !!navigator.bluetooth;

  const connect = useCallback(async (options = {}) => {
    if (!isSupported) {
      setError('Web Bluetooth is not supported in this browser. Chrome Android use karo.');
      setStatus('error');
      return false;
    }

    setStatus('scanning');
    setError(null);

    try {
      // Request device
      const requestOptions = options.filters
        ? { filters: options.filters, optionalServices: options.services || [] }
        : {
            acceptAllDevices: true,
            optionalServices: [
              'heart_rate', 'battery_service', 'device_information',
              'generic_access', 'ffe0', 'ffe1', 'fee0', 'fee1',
              ...(options.services || []),
            ],
          };

      const btDevice = await navigator.bluetooth.requestDevice(requestOptions);
      setDevice(btDevice);

      // Connect to GATT server
      const server = await btDevice.gatt.connect();
      serverRef.current = server;

      // Get all services
      const svcs = await server.getPrimaryServices();
      const svcList = svcs.map(s => ({ uuid: s.uuid, device: btDevice.name }));
      setServices(svcList);
      setStatus('connected');

      // Disconnect listener
      btDevice.addEventListener('gattserverdisconnected', () => {
        setStatus('disconnected');
        setDevice(null);
        serverRef.current = null;
        setServices([]);
        setCharacteristics({});
      });

      return server;
    } catch (err) {
      if (err.name === 'NotFoundError') {
        setError('Koi device select nahi kiya.');
      } else if (err.name === 'SecurityError') {
        setError('Permission nahi mili. HTTPS chahiye + Chrome Android.');
      } else {
        setError(err.message || 'Connection fail ho gaya.');
      }
      setStatus('error');
      return false;
    }
  }, [isSupported]);

  const disconnect = useCallback(() => {
    if (device?.gatt?.connected) device.gatt.disconnect();
    setDevice(null);
    setStatus('disconnected');
    serverRef.current = null;
    setServices([]);
    setCharacteristics({});
  }, [device]);

  const readCharacteristic = useCallback(async (serviceUUID, charUUID) => {
    try {
      const server = serverRef.current;
      if (!server?.connected) throw new Error('Not connected');
      const service = await server.getPrimaryService(serviceUUID);
      const char = await service.getCharacteristic(charUUID);
      const value = await char.readValue();
      return value;
    } catch (err) {
      setError(`Read error: ${err.message}`);
      return null;
    }
  }, []);

  const writeCharacteristic = useCallback(async (serviceUUID, charUUID, data) => {
    try {
      const server = serverRef.current;
      if (!server?.connected) throw new Error('Not connected');
      const service = await server.getPrimaryService(serviceUUID);
      const char = await service.getCharacteristic(charUUID);
      const buffer = data instanceof Uint8Array ? data : new Uint8Array(data);
      await char.writeValue(buffer);
      return true;
    } catch (err) {
      setError(`Write error: ${err.message}`);
      return false;
    }
  }, []);

  const startNotifications = useCallback(async (serviceUUID, charUUID, callback) => {
    try {
      const server = serverRef.current;
      if (!server?.connected) throw new Error('Not connected');
      const service = await server.getPrimaryService(serviceUUID);
      const char = await service.getCharacteristic(charUUID);
      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', (e) => {
        const value = e.target.value;
        callback(value);
        setNotifications(prev => [...prev.slice(-20), {
          time: new Date().toLocaleTimeString(),
          uuid: charUUID,
          value: Array.from(new Uint8Array(value.buffer)).join(','),
        }]);
      });
      return true;
    } catch (err) {
      setError(`Notification error: ${err.message}`);
      return false;
    }
  }, []);

  // Read battery level (universal)
  const getBatteryLevel = useCallback(async () => {
    const val = await readCharacteristic('battery_service', '00002a19-0000-1000-8000-00805f9b34fb');
    return val ? val.getUint8(0) : null;
  }, [readCharacteristic]);

  // Read heart rate
  const getHeartRate = useCallback(async () => {
    const val = await readCharacteristic('heart_rate', '00002a37-0000-1000-8000-00805f9b34fb');
    if (!val) return null;
    const flags = val.getUint8(0);
    return flags & 0x01 ? val.getUint16(1, true) : val.getUint8(1);
  }, [readCharacteristic]);

  return {
    isSupported, device, status, error, services, notifications,
    connect, disconnect, readCharacteristic, writeCharacteristic,
    startNotifications, getBatteryLevel, getHeartRate,
  };
}

// ─── BLUETOOTH UI COMPONENT ───────────────────────────────────
export default function WebBluetoothPanel() {
  const bt = useWebBluetooth();
  const [activeTab, setActiveTab] = useState('connect'); // connect|control|data
  const [customService, setCustomService] = useState('ffe0');
  const [customChar, setCustomChar] = useState('ffe1');
  const [writeData, setWriteData] = useState('');
  const [readResult, setReadResult] = useState(null);
  const [heartRate, setHeartRate] = useState(null);
  const [battLevel, setBattLevel] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  if (!bt.isSupported) {
    return (
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
        <p className="text-orange-300 text-sm font-medium">⚠️ Web Bluetooth Support Nahi</p>
        <p className="text-orange-300/70 text-xs mt-1">
          Chrome Android mein kaam karta hai. Settings → Site Settings → Bluetooth allow karo.
        </p>
      </div>
    );
  }

  const statusColors = {
    disconnected: 'text-slate-500', scanning: 'text-yellow-400 animate-pulse',
    connected: 'text-green-400', error: 'text-red-400',
  };

  const statusEmojis = { disconnected: '⚫', scanning: '🔍', connected: '🟢', error: '🔴' };

  return (
    <div className="space-y-3">
      {/* Status Bar */}
      <div className="flex items-center justify-between bg-white/[0.04] border border-white/8 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{statusEmojis[bt.status]}</span>
          <div>
            <p className={`text-sm font-medium ${statusColors[bt.status]}`}>
              {bt.status === 'connected' ? bt.device?.name || 'Connected Device' :
               bt.status === 'scanning' ? 'Scanning...' :
               bt.status === 'error' ? 'Error' : 'No Device'}
            </p>
            {bt.error && <p className="text-xs text-red-400/70 mt-0.5">{bt.error}</p>}
          </div>
        </div>
        <button
          onClick={bt.status === 'connected' ? bt.disconnect : () => bt.connect()}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${
            bt.status === 'connected'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
          }`}
        >
          {bt.status === 'connected' ? '🔌 Disconnect' :
           bt.status === 'scanning' ? '⏳ Scanning...' : '🔵 Connect'}
        </button>
      </div>

      {/* Quick Connect Presets */}
      {bt.status === 'disconnected' && (
        <div>
          <p className="text-xs text-slate-600 mb-2 px-1">Quick Connect — Device type select karo:</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '❤️ Heart Rate Monitor', filters: [{ services: ['heart_rate'] }], services: ['heart_rate', 'battery_service'] },
              { label: '🔋 Battery Device', filters: [{ services: ['battery_service'] }], services: ['battery_service'] },
              { label: '💡 Smart Bulb (BLE)', filters: [{ namePrefix: '' }], services: ['ffe0', 'ffe1'] },
              { label: '🤖 Any Device', filters: null, services: [] },
            ].map(preset => (
              <button key={preset.label}
                onClick={() => bt.connect({ filters: preset.filters, services: preset.services })}
                className="bg-white/[0.04] border border-white/8 rounded-xl p-2.5 text-xs text-slate-400 hover:text-white hover:bg-white/8 active:scale-95 transition-all text-left">
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Connected — Tabs */}
      {bt.status === 'connected' && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1">
            {['control', 'data', 'services'].map(tab => (
              <button key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}>
                {tab === 'control' ? '🎮 Control' : tab === 'data' ? '📊 Data' : '🔧 Services'}
              </button>
            ))}
          </div>

          {/* Control Tab */}
          {activeTab === 'control' && (
            <div className="space-y-3">
              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={async () => { const r = await bt.getBatteryLevel(); setBattLevel(r); }}
                  className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-xs text-green-300 active:scale-95 transition-all">
                  🔋 Battery Level{battLevel !== null ? `: ${battLevel}%` : ''}
                </button>
                <button onClick={async () => {
                  setIsMonitoring(true);
                  await bt.startNotifications('heart_rate', '00002a37-0000-1000-8000-00805f9b34fb',
                    val => { const f = val.getUint8(0); setHeartRate(f & 0x01 ? val.getUint16(1,true) : val.getUint8(1)); });
                }}
                  className={`border rounded-xl p-3 text-xs active:scale-95 transition-all ${
                    isMonitoring ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-pink-500/10 border-pink-500/20 text-pink-300'
                  }`}>
                  {isMonitoring ? `❤️ ${heartRate || '...'} BPM` : '❤️ Heart Rate'}
                </button>
              </div>

              {/* Custom Write */}
              <div className="bg-white/[0.03] border border-white/8 rounded-xl p-3 space-y-2">
                <p className="text-xs text-slate-500 font-medium">Custom Write (Arduino/ESP32)</p>
                <input value={customService} onChange={e => setCustomService(e.target.value)}
                  placeholder="Service UUID (e.g. ffe0)"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
                <input value={customChar} onChange={e => setCustomChar(e.target.value)}
                  placeholder="Characteristic UUID (e.g. ffe1)"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
                <div className="flex gap-2">
                  <input value={writeData} onChange={e => setWriteData(e.target.value)}
                    placeholder="Data: 0,1,255 ya text"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
                  <button onClick={async () => {
                    let bytes;
                    if (writeData.includes(',')) {
                      bytes = new Uint8Array(writeData.split(',').map(n => parseInt(n.trim())));
                    } else {
                      bytes = new TextEncoder().encode(writeData);
                    }
                    const ok = await bt.writeCharacteristic(customService, customChar, bytes);
                    setReadResult(ok ? '✅ Written!' : '❌ Failed');
                  }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs active:scale-95 transition-all">
                    Write
                  </button>
                  <button onClick={async () => {
                    const val = await bt.readCharacteristic(customService, customChar);
                    if (val) {
                      const bytes = Array.from(new Uint8Array(val.buffer));
                      setReadResult(bytes.join(','));
                    }
                  }}
                    className="px-3 py-2 bg-white/10 text-white rounded-lg text-xs active:scale-95 transition-all">
                    Read
                  </button>
                </div>
                {readResult && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                    <p className="text-xs text-blue-300 font-mono">{readResult}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data Tab */}
          {activeTab === 'data' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-600 px-1">Live notifications from device:</p>
              {bt.notifications.length === 0 ? (
                <p className="text-xs text-slate-700 text-center py-4">Koi data nahi. Pehle notification start karo.</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {bt.notifications.slice().reverse().map((n, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2 flex justify-between">
                      <span className="text-xs text-slate-500">{n.time}</span>
                      <span className="text-xs text-blue-300 font-mono">{n.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div className="space-y-1">
              <p className="text-xs text-slate-600 px-1">{bt.services.length} services found:</p>
              {bt.services.map((s, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">
                  <p className="text-xs text-blue-300/70 font-mono break-all">{s.uuid}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
