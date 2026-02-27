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
    // Actions
    connect: (url: string) => void;
    disconnect: () => void;
    scanDevices: () => Promise<any[]>;
    connectDevice: (protocol: string, address?: string) => Promise<boolean>;
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

    connect: (url: string) => {
        if (get().socket) return;

        const socket = io(url, {
            transports: ['websocket'],
            autoConnect: true,
        });

        socket.on('connect', () => {
            console.log('Signal Service Connected');
            set({ isConnected: true });
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
            set({ lastSignal: data });
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
    }
}));
