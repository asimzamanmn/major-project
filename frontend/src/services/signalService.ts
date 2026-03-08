import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';

// Define the shape of our signal data
export interface SignalData {
    raw: number[];  // [Vertical, Horizontal, EEG?]
    events: {
        type?: string;     // 'blink', 'direction'
        action?: string;   // 'LEFT', 'RIGHT', 'ENTER', 'BACKSPACE'
        count?: number;    // Blink count
    };
    focus: number;  // 0.0 to 1.0
    envelope?: number;       // Blink envelope value
    horizontal_dev?: number; // Horizontal deviation from baseline
}

// Command event from backend EOG processing
export interface CommandEvent {
    type: string;      // 'blink' or 'direction'
    action: string;    // 'LEFT', 'RIGHT', 'ENTER', 'BACKSPACE'
    count?: number;    // Blink count (for blink events)
    value?: number;    // Deviation value (for direction events)
}

interface SignalState {
    socket: Socket | null;
    isConnected: boolean;
    lastSignal: SignalData | null;
    lastCommand: CommandEvent | null;  // Dedicated command state
    commandTimestamp: number;           // To trigger re-renders on same command
    connectionStatus: {
        running: boolean;
        recording: boolean;
        device: string | null;
    };
    signalBatch: SignalData[]; // Array of signals
    // Real-time sensitivity values (from signal_data)
    envelope: number;
    horizontalDev: number;
    // User-adjustable thresholds
    blinkThreshold: number;
    eyeThreshold: number;
    // Actions
    connect: (url: string) => void;
    disconnect: () => void;
    scanDevices: () => Promise<any[]>;
    connectDevice: (protocol: string, address?: string) => Promise<boolean>;
    setThresholds: (blink?: number, eye?: number) => Promise<void>;
    fetchThresholds: () => Promise<void>;
}

export const useSignalStore = create<SignalState>((set, get) => ({
    socket: null,
    isConnected: false,
    lastSignal: null,
    lastCommand: null,
    commandTimestamp: 0,
    signalBatch: [],
    connectionStatus: {
        running: false,
        recording: false,
        device: null
    },
    envelope: 0,
    horizontalDev: 0,
    blinkThreshold: 200,
    eyeThreshold: 250,

    connect: (url: string) => {
        if (get().socket) return;

        const socket = io(url, {
            transports: ['websocket'],
            autoConnect: true,
        });

        socket.on('connect', () => {
            console.log('Signal Service Connected');
            set({ isConnected: true });
            // Fetch current thresholds from backend on connect
            get().fetchThresholds();
        });

        socket.on('disconnect', () => {
            console.log('Signal Service Disconnected');
            set({ isConnected: false });
        });

        socket.on('signal_batch', (batch: SignalData[]) => {
            if (batch && batch.length > 0) {
                set({
                    signalBatch: batch,
                    lastSignal: batch[batch.length - 1]
                });
            }
        });

        // CRITICAL: Listen for 'command' events from backend EOG processing
        // These are emitted separately from signal_batch when blinks/eye movements are detected
        socket.on('command', (data: CommandEvent) => {
            console.log('🎯 COMMAND received:', data);
            set({
                lastCommand: data,
                commandTimestamp: Date.now()
            });
        });

        socket.on('signal_data', (data: any) => {
            set({
                lastSignal: data,
                // Extract envelope and deviation for real-time bars
                envelope: data.envelope ?? 0,
                horizontalDev: data.horizontal_dev ?? 0,
            });
        });

        set({ socket });
    },

    disconnect: () => {
        const { socket } = get();
        if (socket) {
            socket.disconnect();
            set({ socket: null, isConnected: false });
        }
    },

    scanDevices: async () => {
        try {
            const response = await fetch('http://localhost:5000/scan');
            const data = await response.json();
            return data.devices || [];
        } catch (error) {
            console.error('Scan failed:', error);
            return [];
        }
    },

    connectDevice: async (protocol: string, address?: string) => {
        try {
            const response = await fetch('http://localhost:5000/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ protocol, address })
            });
            const data = await response.json();
            if (data.status === 'connected') {
                set(state => ({
                    connectionStatus: { ...state.connectionStatus, running: true, device: address || protocol }
                }));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Connection failed:', error);
            return false;
        }
    },

    setThresholds: async (blink?: number, eye?: number) => {
        try {
            const body: any = {};
            if (blink !== undefined) body.blink_threshold = blink;
            if (eye !== undefined) body.eye_threshold = eye;

            const response = await fetch('http://localhost:5000/set-thresholds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (data.status === 'ok') {
                set({
                    blinkThreshold: data.blink_threshold,
                    eyeThreshold: data.eye_threshold
                });
            }
        } catch (error) {
            console.error('Failed to set thresholds:', error);
        }
    },

    fetchThresholds: async () => {
        try {
            const response = await fetch('http://localhost:5000/get-thresholds');
            const data = await response.json();
            set({
                blinkThreshold: data.blink_threshold ?? 200,
                eyeThreshold: data.eye_threshold ?? 250
            });
        } catch (error) {
            console.error('Failed to fetch thresholds:', error);
        }
    }
}));
