import { useEffect, useState, useRef, useCallback } from 'react';
import { useSignalStore } from '@/services/signalService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { LineChart, Line, YAxis, ResponsiveContainer, XAxis } from 'recharts';

/**
 * Interactive threshold bar — replicating the CHORDS tkinter canvas bars.
 * Shows real-time signal value as a filled bar, with a draggable threshold marker.
 */
function ThresholdBar({
    label,
    value,
    threshold,
    maxValue = 300,
    onThresholdChange,
    colorBelow,
    colorAbove,
    directionIndicator,
}: {
    label: string;
    value: number;
    threshold: number;
    maxValue?: number;
    onThresholdChange: (newThreshold: number) => void;
    colorBelow: string;
    colorAbove: string;
    directionIndicator?: string;
}) {
    const barRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        isDragging.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        updateThreshold(e);
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging.current) return;
        updateThreshold(e);
    }, []);

    const handlePointerUp = useCallback(() => {
        isDragging.current = false;
    }, []);

    const updateThreshold = (e: React.PointerEvent) => {
        if (!barRef.current) return;
        const rect = barRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = Math.max(0.05, Math.min(1, x / rect.width));
        const newThreshold = Math.round(ratio * maxValue);
        onThresholdChange(newThreshold);
    };

    const clampedValue = Math.min(Math.abs(value), maxValue);
    const fillPercent = (clampedValue / maxValue) * 100;
    const thresholdPercent = (threshold / maxValue) * 100;
    const isAbove = clampedValue >= threshold;
    const fillColor = isAbove ? colorAbove : colorBelow;

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">{label}</span>
                <div className="flex items-center gap-2">
                    {directionIndicator && (
                        <span className="text-xs font-bold" style={{ color: colorAbove }}>
                            {directionIndicator}
                        </span>
                    )}
                    <span className="font-mono text-xs" style={{ color: isAbove ? colorAbove : 'inherit' }}>
                        {clampedValue.toFixed(0)}
                    </span>
                </div>
            </div>
            <div
                ref={barRef}
                className="relative h-8 rounded-md overflow-hidden cursor-pointer select-none"
                style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {/* Filled bar */}
                <div
                    className="absolute top-0 left-0 h-full transition-all duration-75"
                    style={{
                        width: `${fillPercent}%`,
                        background: fillColor,
                        opacity: 0.8,
                    }}
                />
                {/* Threshold marker (draggable) */}
                <div
                    className="absolute top-0 h-full flex items-center justify-center"
                    style={{
                        left: `${thresholdPercent}%`,
                        transform: 'translateX(-50%)',
                        width: '36px',
                    }}
                >
                    <div
                        className="h-full flex items-center justify-center rounded-sm"
                        style={{
                            width: '36px',
                            background: '#e67e22',
                            border: '2px solid #d35400',
                            cursor: 'ew-resize',
                        }}
                    >
                        <span className="text-white text-[10px] font-bold select-none">
                            {threshold}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function SignalMonitor() {
    const signalBatch = useSignalStore(state => state.signalBatch);
    const envelope = useSignalStore(state => state.envelope);
    const horizontalDev = useSignalStore(state => state.horizontalDev);
    const blinkThreshold = useSignalStore(state => state.blinkThreshold);
    const eyeThreshold = useSignalStore(state => state.eyeThreshold);
    const setThresholds = useSignalStore(state => state.setThresholds);
    const [data, setData] = useState<any[]>([]);

    // Debounce threshold changes to avoid flooding the backend
    const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        if (signalBatch && signalBatch.length > 0) {
            setData(prev => {
                const newPoints = signalBatch.map(s => ({
                    time: Date.now(),
                    vertical: s.raw[0] || 0,
                    horizontal: s.raw[1] || 0,
                    eeg: s.raw[2] || 0
                }));
                const combined = [...prev, ...newPoints];
                if (combined.length > 500) return combined.slice(-500);
                return combined;
            });
        }
    }, [signalBatch]);

    const handleBlinkThresholdChange = useCallback((value: number) => {
        // Update local state immediately for responsive feel
        useSignalStore.setState({ blinkThreshold: value });
        // Debounce the API call
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setThresholds(value, undefined);
        }, 150);
    }, [setThresholds]);

    const handleEyeThresholdChange = useCallback((value: number) => {
        useSignalStore.setState({ eyeThreshold: value });
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setThresholds(undefined, value);
        }, 150);
    }, [setThresholds]);

    // Direction indicator for eye movement
    const eyeDirection = horizontalDev < -eyeThreshold ? '← LEFT' :
        horizontalDev > eyeThreshold ? 'RIGHT →' : '';

    return (
        <div className="space-y-4">
            {/* Line chart */}
            <Card className="w-full h-[200px] bg-background">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Live Biosignals</CardTitle>
                </CardHeader>
                <CardContent className="h-[140px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <YAxis domain={['auto', 'auto']} hide />
                            <XAxis hide />
                            <Line type="monotone" dataKey="vertical" stroke="#10b981" dot={false} strokeWidth={2} />
                            <Line type="monotone" dataKey="horizontal" stroke="#3b82f6" dot={false} strokeWidth={2} />
                            <Line type="monotone" dataKey="eeg" stroke="#8b5cf6" dot={false} strokeWidth={1} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Sensitivity Adjustment Bars */}
            <Card className="w-full bg-background">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                        Sensitivity Adjustment
                        <span className="text-xs font-normal text-muted-foreground ml-2">
                            Drag the orange markers to adjust
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ThresholdBar
                        label="👁 Blink Detection"
                        value={envelope}
                        threshold={blinkThreshold}
                        maxValue={300}
                        onThresholdChange={handleBlinkThresholdChange}
                        colorBelow="#27ae60"
                        colorAbove="#e74c3c"
                    />
                    <ThresholdBar
                        label="↔ Eye Movement"
                        value={Math.abs(horizontalDev)}
                        threshold={eyeThreshold}
                        maxValue={300}
                        onThresholdChange={handleEyeThresholdChange}
                        colorBelow="#3498db"
                        colorAbove="#9b59b6"
                        directionIndicator={eyeDirection}
                    />
                    <p className="text-[10px] text-muted-foreground text-center mt-1">
                        Lower threshold = more sensitive · Higher threshold = less sensitive
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
