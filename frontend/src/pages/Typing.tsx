import { useState, useEffect } from "react";
import { MorseTree } from "@/components/typing/MorseTree";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSignalStore } from "@/services/signalService";

const Typing = () => {
    const [typedText, setTypedText] = useState("");
    const [mode, setMode] = useState<"typing" | "prediction">("typing");
    const navigate = useNavigate();
    const lastSignal = useSignalStore(state => state.lastSignal);

    // Focus level for the visual indicator (0.0 to 1.0)
    const focusLevel = lastSignal?.focus ?? 0;

    // Listen for Tab key (injected by useKeyboardInjector when FOCUS command arrives)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Tab" || e.code === "Tab") {
                e.preventDefault();
                setMode(prev => prev === "typing" ? "prediction" : "typing");
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <div className="h-screen w-full bg-background flex flex-col">
            {/* Focus Indicator Bar */}
            <div className={`px-4 py-2 flex items-center gap-3 border-b transition-colors duration-500 ${mode === "prediction"
                    ? "bg-purple-500/10 border-purple-500/30"
                    : "bg-card border-border"
                }`}>
                <Brain className={`h-5 w-5 transition-all duration-500 ${mode === "prediction"
                        ? "text-purple-400 animate-pulse"
                        : "text-muted-foreground"
                    }`} />
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold transition-colors duration-500 ${mode === "prediction" ? "text-purple-400" : "text-muted-foreground"
                            }`}>
                            {mode === "prediction" ? "🧠 Prediction Mode" : "⌨️ Typing Mode"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            Focus: {Math.round(focusLevel * 100)}%
                        </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${mode === "prediction"
                                    ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                                    : "bg-blue-500/60"
                                }`}
                            style={{ width: `${Math.min(100, Math.round(focusLevel * 100))}%` }}
                        />
                    </div>
                </div>
            </div>

            <header className="p-4 border-b flex items-center justify-between">
                <Button variant="ghost" onClick={() => navigate("/")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Button>
                <h1 className="font-bold text-lg">Communication Board</h1>
                <div className="w-24">
                    {/* Placeholder for status */}
                </div>
            </header>

            <main className="flex-1 overflow-hidden">
                <MorseTree
                    mode={mode}
                    onModeSwitch={() => setMode(prev => prev === "typing" ? "prediction" : "typing")}
                    typedText={typedText}
                    onTypedTextChange={setTypedText}
                />
            </main>
        </div>
    );
};

export default Typing;
