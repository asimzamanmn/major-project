import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Lightbulb, Fan, Tv, Thermometer } from "lucide-react";
import { DeviceControlPanel } from "./DeviceControlPanel";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";


const INITIAL_DEVICES = [
    { id: "light-1", name: "Living Room Light", icon: Lightbulb, status: false, category: "lights" },
    { id: "fan-1", name: "Ceiling Fan", icon: Fan, status: false, category: "fans", level: 0 },
    { id: "tv-1", name: "Smart TV", icon: Tv, status: false, category: "entertainment" },
    { id: "ac-1", name: "Thermostat", icon: Thermometer, status: false, category: "climate", level: 24 },
];

export const IoTControl = () => {
    const navigate = useNavigate();
    const [devices, setDevices] = useState(INITIAL_DEVICES);
    const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);
    const [view, setView] = useState<"grid" | "control">("grid");
    const [selectedControlIndex, setSelectedControlIndex] = useState(0);

    // const lastSignal = useSignalStore(state => state.lastSignal); // Refactored to use Keyboard Events

    // Signal Control Logic (Now Keyboard Driven)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Navigation logic based on view
            if (view === "grid") {
                if (e.key === "ArrowRight" || e.code === "ArrowRight") {
                    // Next device
                    setSelectedDeviceIndex((prev) => (prev + 1) % devices.length);
                } else if (e.key === "ArrowLeft" || e.code === "ArrowLeft") {
                    // Previous device
                    setSelectedDeviceIndex((prev) => (prev - 1 + devices.length) % devices.length);
                } else if (e.key === "Enter" || e.code === "Enter") {
                    // Toggle/Select
                    if (devices[selectedDeviceIndex].category === "lights" || devices[selectedDeviceIndex].category === "entertainment") {
                        toggleDevice(devices[selectedDeviceIndex].id);
                    } else {
                        toggleDevice(devices[selectedDeviceIndex].id); // Turn on first
                        setView("control"); // Enter control mode
                    }
                } else if (e.key === "Backspace" || e.code === "Backspace") {
                    // Go back to Home from Grid view
                    navigate("/");
                }
            } else if (view === "control") {
                if (e.key === "ArrowRight" || e.code === "ArrowRight") {
                    // Next control (toggle between increase/decrease)
                    setSelectedControlIndex((prev) => (prev + 1) % 2);
                } else if (e.key === "ArrowLeft" || e.code === "ArrowLeft") {
                    // Previous control (toggle between increase/decrease)
                    setSelectedControlIndex((prev) => (prev - 1 + 2) % 2);
                } else if (e.key === "Enter" || e.code === "Enter") {
                    // Execute control
                    const device = devices[selectedDeviceIndex];
                    const isIncrease = selectedControlIndex === 0;
                    const delta = isIncrease ? 10 : -10;
                    updateDeviceLevel(device.id, Math.min(100, Math.max(0, (device.level || 0) + delta)));
                } else if (e.key === "Backspace" || e.code === "Backspace") {
                    // Back to grid
                    setView("grid");
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [view, devices, selectedDeviceIndex, selectedControlIndex]);


    const toggleDevice = (id: string) => {
        setDevices(devices.map(d => d.id === id ? { ...d, status: !d.status } : d));
    };

    const updateDeviceLevel = (id: string, level: number) => {
        setDevices(devices.map(d => d.id === id ? { ...d, level } : d));
    };

    return (
        <div className="h-full flex gap-4 p-4">
            {/* Device Grid - Always visible on left, maybe smaller if in control mode */}
            <div className={cn("grid grid-cols-2 gap-4 transition-all duration-300", view === "control" ? "w-1/3" : "w-full")}>
                {devices.map((device, index) => {
                    const isSelected = index === selectedDeviceIndex;
                    const Icon = device.icon;

                    return (
                        <Card
                            key={device.id}
                            className={cn(
                                "p-4 flex flex-col items-center justify-center gap-3 transition-all",
                                isSelected ? "border-primary border-2 scale-105 shadow-md bg-accent/10" : "border-border bg-card/50",
                                device.status ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            <div className={cn("p-3 rounded-full", device.status ? "bg-primary/20 text-primary" : "bg-muted")}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-center">{device.name}</span>
                            <span className="text-xs">{device.status ? "ON" : "OFF"}</span>
                        </Card>
                    );
                })}
            </div>

            {/* Control Panel - Visible only in control mode */}
            {view === "control" && (
                <div className="flex-1 animate-in slide-in-from-right duration-300">
                    <DeviceControlPanel
                        device={devices[selectedDeviceIndex]}
                        onUpdateLevel={updateDeviceLevel}
                        selectedControl={selectedControlIndex}
                    />
                </div>
            )}
        </div>
    );
};
