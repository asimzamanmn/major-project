import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// Client-side word dictionary for instant predictions (no backend needed)
const COMMON_WORDS: Record<string, number> = {
    "THE": 1000, "A": 950, "AN": 900, "I": 980, "YOU": 900, "IT": 800,
    "IS": 950, "AM": 700, "ARE": 800, "WAS": 750, "BE": 600,
    "HAVE": 800, "HAS": 600, "DO": 700, "DOES": 400, "DID": 450,
    "WILL": 600, "WOULD": 500, "CAN": 550, "COULD": 450,
    "NEED": 500, "WANT": 550, "LIKE": 500, "LOVE": 400,
    "KNOW": 550, "THINK": 500, "FEEL": 400, "SEE": 450,
    "SAY": 500, "TELL": 400, "ASK": 350, "GET": 600,
    "GIVE": 400, "GO": 650, "COME": 500, "TAKE": 450,
    "MAKE": 550, "HELP": 500, "CALL": 350, "THANK": 350,
    "PLEASE": 500, "SORRY": 400, "YES": 600, "NO": 500,
    "OK": 500, "HELLO": 500, "HI": 450, "BYE": 350,
    "GOOD": 500, "BAD": 350, "HAPPY": 350, "SAD": 300,
    "IN": 900, "ON": 800, "AT": 700, "TO": 950, "FOR": 800,
    "WITH": 750, "FROM": 600, "AND": 950, "OR": 700, "BUT": 600,
    "NOT": 750, "IF": 500, "SO": 500, "VERY": 400,
    "JUST": 400, "NOW": 450, "HERE": 400, "THERE": 400,
    "HOME": 450, "WATER": 400, "FOOD": 400, "PAIN": 350,
    "MEDICINE": 300, "BATHROOM": 300, "BED": 300, "HUNGRY": 300,
    "THIRSTY": 250, "TIRED": 350, "SICK": 300, "COLD": 300,
    "HOT": 250, "COMFORTABLE": 200, "EMERGENCY": 400,
    "PEOPLE": 400, "FAMILY": 350, "FRIEND": 300, "DOCTOR": 250,
    "MOTHER": 300, "FATHER": 300, "BROTHER": 250, "SISTER": 250,
    "TIME": 500, "DAY": 400, "NIGHT": 300, "MORNING": 300,
    "TODAY": 350, "TOMORROW": 250, "WORK": 500, "PHONE": 350,
    "MORE": 400, "BACK": 350, "RIGHT": 400, "LEFT": 300,
    "NEW": 400, "OLD": 300, "BIG": 350, "SMALL": 300,
    "FIRST": 350, "LAST": 300, "NEXT": 300, "WHAT": 500,
    "WHERE": 350, "WHEN": 400, "HOW": 400, "WHO": 350, "WHY": 300,
    "THANKS": 400, "WELCOME": 250, "FINE": 300, "BETTER": 300,
    "WORSE": 150, "OPEN": 300, "CLOSE": 280, "STOP": 300,
    "START": 350, "LOOK": 450, "WATCH": 300, "LISTEN": 280,
    "EAT": 300, "DRINK": 300, "SLEEP": 300, "WALK": 300, "TALK": 350,
    "WAIT": 300, "SEND": 300, "READ": 350, "WRITE": 300,
};

function getLocalPredictions(text: string, maxResults = 5): string[] {
    if (!text || !text.trim()) {
        // Return most common starter words
        return Object.entries(COMMON_WORDS)
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxResults)
            .map(([word]) => word);
    }

    const textUpper = text.toUpperCase();

    if (textUpper.endsWith(" ")) {
        // New word — suggest most common words
        return Object.entries(COMMON_WORDS)
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxResults)
            .map(([word]) => word);
    }

    // Mid-word — get prefix
    const words = textUpper.split(" ");
    const prefix = words[words.length - 1] || "";

    if (!prefix) {
        return Object.entries(COMMON_WORDS)
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxResults)
            .map(([word]) => word);
    }

    // Find matches
    const matches = Object.entries(COMMON_WORDS)
        .filter(([word]) => word.startsWith(prefix) && word !== prefix)
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxResults)
        .map(([word]) => word);

    // Pad with common words if needed
    if (matches.length < maxResults) {
        const top = Object.entries(COMMON_WORDS)
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxResults - matches.length)
            .map(([word]) => word);
        matches.push(...top);
    }

    return matches.slice(0, maxResults);
}

interface PredictionPanelProps {
    typedText: string;
    active: boolean;
    onSelectWord: (word: string) => void;
    onCancel: () => void;
}

export const PredictionPanel = ({
    typedText,
    active,
    onSelectWord,
    onCancel,
}: PredictionPanelProps) => {
    const [predictions, setPredictions] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Generate predictions locally whenever text changes (instant, no backend needed)
    useEffect(() => {
        const results = getLocalPredictions(typedText);
        setPredictions(results);
        setSelectedIndex(0);
    }, [typedText]);

    // Also try backend for richer predictions (non-blocking)
    useEffect(() => {
        if (!typedText || !typedText.trim()) return;

        const controller = new AbortController();
        fetch("http://localhost:5000/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: typedText }),
            signal: controller.signal,
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.predictions && data.predictions.length > 0) {
                    setPredictions(data.predictions);
                    setSelectedIndex(0);
                }
            })
            .catch(() => {
                // Backend unavailable — local predictions are already shown
            });

        return () => controller.abort();
    }, [typedText]);

    // Keyboard navigation — only when prediction mode is active
    useEffect(() => {
        if (!active || predictions.length === 0) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft" || e.code === "ArrowLeft") {
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev > 0 ? prev - 1 : predictions.length - 1
                );
            } else if (e.key === "ArrowRight" || e.code === "ArrowRight") {
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev < predictions.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === "Enter" || e.code === "Enter") {
                e.preventDefault();
                onSelectWord(predictions[selectedIndex]);
            } else if (e.key === "Backspace" || e.code === "Backspace") {
                e.preventDefault();
                onCancel();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [active, predictions, selectedIndex, onSelectWord, onCancel]);

    if (predictions.length === 0) return null;

    // Get the current partial word being typed
    const words = typedText.trimEnd().split(" ");
    const currentPartial = typedText.endsWith(" ") ? "" : (words[words.length - 1] || "");

    return (
        <div
            className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300",
                active
                    ? "bg-purple-500/10 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.15)]"
                    : "bg-card/40 border-border/50"
            )}
        >
            {/* Mode indicator */}
            <span
                className={cn(
                    "text-xs font-bold shrink-0 transition-colors duration-300",
                    active ? "text-purple-400" : "text-muted-foreground/60"
                )}
            >
                {active ? "🔮" : "💡"}
            </span>

            {/* Current partial word indicator */}
            {currentPartial && active && (
                <span className="text-xs text-purple-300 font-mono shrink-0 border-r border-purple-500/30 pr-2">
                    {currentPartial}
                </span>
            )}

            {/* Prediction chips */}
            <div className="flex gap-1.5 overflow-x-auto flex-1">
                {predictions.map((word, index) => (
                    <button
                        key={word + index}
                        className={cn(
                            "px-3 py-1.5 rounded-md text-sm font-semibold whitespace-nowrap transition-all duration-200 border",
                            active && index === selectedIndex
                                ? "bg-purple-500/30 border-purple-500 text-purple-200 scale-105 shadow-md shadow-purple-500/20 ring-1 ring-purple-400/50"
                                : active
                                    ? "bg-card/60 border-border/60 text-muted-foreground hover:border-purple-500/30"
                                    : "bg-card/40 border-transparent text-muted-foreground/70"
                        )}
                        tabIndex={-1}
                        onClick={() => active && onSelectWord(word)}
                    >
                        {word}
                    </button>
                ))}
            </div>

            {/* Active mode hint */}
            {active && (
                <span className="text-[10px] text-purple-400/70 shrink-0 hidden sm:inline">
                    ← → select · ↵ confirm
                </span>
            )}
        </div>
    );
};
