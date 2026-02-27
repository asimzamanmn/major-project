import { useEffect, useState } from 'react';
import { useSignalStore } from '@/services/signalService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { LineChart, Line, YAxis, ResponsiveContainer, XAxis } from 'recharts';

export function SignalMonitor() {
    const signalBatch = useSignalStore(state => state.signalBatch);
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        if (signalBatch && signalBatch.length > 0) {
            setData(prev => {
                const newPoints = signalBatch.map(s => ({
                    time: Date.now(),
                    vertical: s.raw[0] || 0,
                    horizontal: s.raw[1] || 0,
                    eeg: s.raw[2] || 0
                }));
                // Combine and keep last 500 points (1 second @ 500Hz)
                const combined = [...prev, ...newPoints];
                if (combined.length > 500) return combined.slice(-500);
                return combined;
            });
        }
    }, [signalBatch]);

    return (
        <Card className="w-full h-[300px] bg-background">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Live Biosignals</CardTitle>
            </CardHeader>
            <CardContent className="h-[240px]">
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
    );
}
