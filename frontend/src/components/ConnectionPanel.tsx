import { useState, useEffect } from 'react';
import { useSignalStore } from '@/services/signalService';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Wifi, Bluetooth, Usb, RefreshCw, Power } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ConnectionPanel() {
    const { isConnected, connect, connectionStatus, scanDevices, connectDevice, disconnect } = useSignalStore();
    const [devices, setDevices] = useState<any[]>([]);
    const [scanning, setScanning] = useState(false);
    const [selectedProtocol, setSelectedProtocol] = useState<'ble' | 'wifi' | 'usb'>('ble');
    const [keyboardEnabled, setKeyboardEnabled] = useState(false);

    useEffect(() => {
        // Connect to Socket.IO server on mount
        connect('http://localhost:5000');
        // Check keyboard status
        fetch('http://localhost:5000/keyboard/status')
            .then(res => res.json())
            .then(data => setKeyboardEnabled(data.enabled))
            .catch(err => console.error("Failed to fetch keyboard status", err));
    }, [connect]);

    const toggleKeyboard = async () => {
        try {
            const newState = !keyboardEnabled;
            const res = await fetch('http://localhost:5000/keyboard/enable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: newState })
            });
            const data = await res.json();
            setKeyboardEnabled(data.enabled);
        } catch (err) {
            console.error("Failed to toggle keyboard", err);
        }
    };

    const handleScan = async () => {
        setScanning(true);
        const results = await scanDevices();
        setDevices(results);
        setScanning(false);
    };

    const [connectingId, setConnectingId] = useState<string | null>(null);

    const handleConnect = async (address?: string) => {
        if (!address) return;
        setConnectingId(address);
        try {
            await connectDevice(selectedProtocol, address);
        } catch (e) {
            console.error(e);
        } finally {
            setConnectingId(null);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Device Connection</span>
                    <div className={cn("h-3 w-3 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")} />
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Button
                        variant={selectedProtocol === 'ble' ? 'default' : 'outline'}
                        onClick={() => setSelectedProtocol('ble')}
                        className="flex-1"
                    >
                        <Bluetooth className="mr-2 h-4 w-4" /> BLE
                    </Button>
                    <Button
                        variant={selectedProtocol === 'wifi' ? 'default' : 'outline'}
                        onClick={() => setSelectedProtocol('wifi')}
                        className="flex-1"
                    >
                        <Wifi className="mr-2 h-4 w-4" /> WiFi
                    </Button>
                    <Button
                        variant={selectedProtocol === 'usb' ? 'default' : 'outline'}
                        onClick={() => setSelectedProtocol('usb')}
                        className="flex-1"
                    >
                        <Usb className="mr-2 h-4 w-4" /> USB
                    </Button>
                </div>

                {selectedProtocol === 'ble' && (
                    <div className="space-y-2">
                        <Button
                            variant="secondary"
                            className="w-full"
                            onClick={handleScan}
                            disabled={scanning || connectionStatus.running}
                        >
                            <RefreshCw className={cn("mr-2 h-4 w-4", scanning && "animate-spin")} />
                            {scanning ? 'Scanning...' : 'Scan Devices'}
                        </Button>

                        <div className="space-y-1 max-h-[150px] overflow-y-auto">
                            {devices.map((dev, i) => (
                                <div key={i}
                                    className={cn(
                                        "flex items-center justify-between p-2 border rounded cursor-pointer transition-colors",
                                        connectingId === dev.address ? "bg-accent/50" : "hover:bg-accent"
                                    )}
                                    onClick={() => !connectingId && handleConnect(dev.address)}>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{dev.name || 'Unknown'}</span>
                                        <span className="text-xs text-muted-foreground">{dev.address}</span>
                                    </div>
                                    {connectingId === dev.address && <RefreshCw className="h-4 w-4 animate-spin text-primary" />}
                                </div>
                            ))}
                            {devices.length === 0 && !scanning && <p className="text-center text-muted-foreground text-xs py-2">No devices found</p>}
                        </div>
                    </div>
                )}

                {selectedProtocol !== 'ble' && (
                    <Button
                        className="w-full"
                        onClick={() => handleConnect()}
                        disabled={connectionStatus.running}
                    >
                        Connect {selectedProtocol.toUpperCase()}
                    </Button>
                )}

                <div className="pt-4 border-t mt-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Keyboard Control
                            </label>
                            <p className="text-xs text-muted-foreground">
                                Simulate key presses (Arrows, Enter)
                            </p>
                        </div>
                        <Button
                            variant={keyboardEnabled ? "default" : "outline"}
                            size="sm"
                            onClick={toggleKeyboard}
                            className={cn(keyboardEnabled && "bg-green-600 hover:bg-green-700")}
                        >
                            {keyboardEnabled ? "ON" : "OFF"}
                        </Button>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                {connectionStatus.running && (
                    <Button variant="destructive" className="w-full" onClick={disconnect}>
                        <Power className="mr-2 h-4 w-4" /> Disconnect
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
