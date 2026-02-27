import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bell, MessageSquare, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const EMERGENCY_ACTIONS = [
    { id: "sms", label: "Send SMS", description: "Notify family members", icon: MessageSquare, color: "red" },
    { id: "alarm", label: "Sound Alarm", description: "Play loud sound on device", icon: Volume2, color: "orange" },
];

const Emergency = () => {
    const navigate = useNavigate();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [triggered, setTriggered] = useState<string | null>(null);

    // Keyboard navigation (works with both physical keyboard and EOG-injected keys)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight" || e.code === "ArrowRight") {
                setSelectedIndex(prev => (prev + 1) % EMERGENCY_ACTIONS.length);
            } else if (e.key === "ArrowLeft" || e.code === "ArrowLeft") {
                setSelectedIndex(prev => (prev - 1 + EMERGENCY_ACTIONS.length) % EMERGENCY_ACTIONS.length);
            } else if (e.key === "Enter" || e.code === "Enter") {
                // Trigger the selected emergency action
                const action = EMERGENCY_ACTIONS[selectedIndex];
                setTriggered(action.id);
                console.log(`🚨 EMERGENCY: ${action.label} triggered!`);
                // Auto-reset after 3 seconds
                setTimeout(() => setTriggered(null), 3000);
            } else if (e.key === "Backspace" || e.code === "Backspace") {
                navigate("/");
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedIndex, navigate]);

    return (
        <div className="h-screen w-full bg-background flex flex-col">
            <header className="p-4 border-b flex items-center justify-between">
                <Button variant="ghost" onClick={() => navigate("/")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Button>
                <h1 className="font-bold text-lg text-red-500">Emergency Mode</h1>
                <div className="w-24"></div>
            </header>

            <main className="flex-1 p-8 flex flex-col items-center justify-center gap-8">
                <div className="text-center space-y-4">
                    <Bell className="w-24 h-24 text-red-500 mx-auto animate-bounce" />
                    <h2 className="text-3xl font-bold">Emergency Actions</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Look left/right to select an action. Double blink to trigger.
                    </p>
                </div>

                {triggered && (
                    <div className="bg-red-500 text-white px-8 py-4 rounded-lg animate-pulse text-xl font-bold">
                        🚨 {EMERGENCY_ACTIONS.find(a => a.id === triggered)?.label} TRIGGERED!
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                    {EMERGENCY_ACTIONS.map((action, index) => {
                        const isSelected = index === selectedIndex;
                        const Icon = action.icon;
                        const colorClasses = action.color === "red"
                            ? "bg-red-500/10 border-red-500 hover:bg-red-500/20"
                            : "bg-orange-500/10 border-orange-500 hover:bg-orange-500/20";

                        return (
                            <Card
                                key={action.id}
                                className={cn(
                                    "p-6 cursor-pointer transition-all text-center",
                                    colorClasses,
                                    isSelected && "ring-4 ring-primary scale-105 shadow-xl"
                                )}
                            >
                                <Icon className={cn(
                                    "w-12 h-12 mx-auto mb-3",
                                    action.color === "red" ? "text-red-500" : "text-orange-500"
                                )} />
                                <h3 className="font-bold text-xl mb-2">{action.label}</h3>
                                <p className="text-muted-foreground">{action.description}</p>
                                {isSelected && (
                                    <div className="mt-3 text-sm font-medium text-primary animate-pulse">
                                        ▶ Selected — Double Blink to trigger
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            </main>
        </div>
    );
};

export default Emergency;
