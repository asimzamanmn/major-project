import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";

interface Device {
    id: string;
    name: string;
    icon: any;
    status: boolean;
    category: string;
    level?: number;
}

interface DeviceControlPanelProps {
    device: Device;
    onUpdateLevel: (id: string, level: number) => void;
    selectedControl: number;
}

export const DeviceControlPanel = ({ device, onUpdateLevel, selectedControl }: DeviceControlPanelProps) => {
    const Icon = device.icon;
    const level = device.level || 0;

    const controls = [
        { id: "increase", label: "Increase", action: () => onUpdateLevel(device.id, Math.min(100, level + 10)) },
        { id: "decrease", label: "Decrease", action: () => onUpdateLevel(device.id, Math.max(0, level - 10)) },
    ];

    const showLevelControl = device.category === "fans" || device.category === "climate";

    return (
        <div className="h-full flex flex-col">
            <Card className="flex-1 p-6 bg-card/60 border-border flex flex-col">
                {/* Device Header */}
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
                    <div className={`
            w-16 h-16 rounded-2xl flex items-center justify-center
            ${device.status ? "bg-gradient-to-br from-blue-600 to-cyan-400 shadow-lg" : "bg-secondary"}
          `}>
                        <Icon className={`w-8 h-8 ${device.status ? "text-white" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">{device.name}</h3>
                        <p className={`text-sm ${device.status ? "text-green-400" : "text-muted-foreground"}`}>
                            {device.status ? "ON" : "OFF"}
                        </p>
                    </div>
                </div>

                {device.status && showLevelControl && (
                    <>
                        {/* Level Display */}
                        <div className="mb-6">
                            <div className="text-center mb-4">
                                <div className="text-5xl font-bold text-primary">{level}%</div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {device.category === "fans" ? "Fan Speed" : "Temperature"}
                                </p>
                            </div>
                        </div>

                        {/* Control Buttons */}
                        <div className="flex-1 space-y-4">
                            {controls.map((control, index) => {
                                const isSelected = index === selectedControl % controls.length;

                                return (
                                    <Button
                                        key={control.id}
                                        variant="outline"
                                        className={`w-full h-20 text-lg transition-all ${isSelected
                                                ? "border-primary bg-primary/20 scale-105"
                                                : "border-border hover:border-primary/50"
                                            }`}
                                        onClick={control.action}
                                    >
                                        {control.id === "increase" ? (
                                            <Plus className="w-6 h-6 mr-3" />
                                        ) : (
                                            <Minus className="w-6 h-6 mr-3" />
                                        )}
                                        <span>{control.label}</span>
                                    </Button>
                                );
                            })}
                        </div>
                    </>
                )}

                {!device.status && (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-muted-foreground text-center">
                            Device is off. Turn it on to see controls.
                        </p>
                    </div>
                )}
            </Card>
        </div>
    );
};
