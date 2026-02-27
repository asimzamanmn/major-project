import { useState } from "react";
import { MorseTree } from "@/components/typing/MorseTree";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Typing = () => {
    const [typedText, setTypedText] = useState("");
    const [mode, setMode] = useState<"typing" | "prediction">("typing");
    const navigate = useNavigate();

    // We can also visualize signal status here if needed
    // const lastSignal = useSignalStore(state => state.lastSignal);

    return (
        <div className="h-screen w-full bg-background flex flex-col">
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
