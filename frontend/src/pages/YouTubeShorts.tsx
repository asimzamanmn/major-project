import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Play, ChevronUp, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// Curated list of popular YouTube Shorts video IDs
const SHORTS_LIST = [
    { id: "dQw4w9WgXcQ", title: "Short 1" },
    { id: "jNQXAC9IVRw", title: "Short 2" },
    { id: "9bZkp7q19f0", title: "Short 3" },
    { id: "kJQP7kiw5Fk", title: "Short 4" },
    { id: "3JZ_D3ELwOQ", title: "Short 5" },
    { id: "RgKAFK5djSk", title: "Short 6" },
    { id: "OPf0YbXqDm0", title: "Short 7" },
    { id: "fRh_vgS2dFE", title: "Short 8" },
];

const YouTubeShorts = () => {
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [direction, setDirection] = useState<"up" | "down" | null>(null);

    const goNext = () => {
        if (isTransitioning) return;
        setDirection("down");
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex(prev => (prev + 1) % SHORTS_LIST.length);
            setIsTransitioning(false);
            setDirection(null);
        }, 300);
    };

    const goPrevious = () => {
        if (isTransitioning) return;
        setDirection("up");
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex(prev => (prev - 1 + SHORTS_LIST.length) % SHORTS_LIST.length);
            setIsTransitioning(false);
            setDirection(null);
        }, 300);
    };

    // Keyboard navigation — BLINK ONLY (no eye movement)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.code === "Enter") {
                // Double blink = scroll down (next short)
                goNext();
            } else if (e.key === "Backspace" || e.code === "Backspace") {
                // Triple blink = scroll up (previous short)
                goPrevious();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentIndex, isTransitioning]);

    const currentShort = SHORTS_LIST[currentIndex];

    return (
        <div className="h-screen w-full bg-black flex flex-col">
            {/* Header */}
            <header className="p-3 flex items-center justify-between bg-black/80 backdrop-blur-sm z-10 border-b border-white/10">
                <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => navigate("/")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <h1 className="font-bold text-lg text-white flex items-center gap-2">
                    <Play className="h-5 w-5 text-red-500 fill-red-500" />
                    YouTube Shorts
                </h1>
                <div className="text-sm text-white/60">
                    {currentIndex + 1} / {SHORTS_LIST.length}
                </div>
            </header>

            {/* Main content area */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                {/* Navigation hints - left side */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-20">
                    <button
                        onClick={goPrevious}
                        className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all border border-white/20"
                    >
                        <ChevronUp className="h-6 w-6" />
                    </button>
                    <button
                        onClick={goNext}
                        className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all border border-white/20"
                    >
                        <ChevronDown className="h-6 w-6" />
                    </button>
                </div>

                {/* Video player */}
                <div
                    className={cn(
                        "w-[360px] h-[640px] max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10 transition-all duration-300",
                        isTransitioning && direction === "down" && "translate-y-4 opacity-0",
                        isTransitioning && direction === "up" && "-translate-y-4 opacity-0",
                        !isTransitioning && "translate-y-0 opacity-100"
                    )}
                >
                    <iframe
                        key={currentShort.id}
                        src={`https://www.youtube.com/embed/${currentShort.id}?autoplay=1&loop=1&mute=0&controls=1&rel=0`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={`YouTube Short ${currentIndex + 1}`}
                    />
                </div>

                {/* Controls guide - right side */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
                    <Card className="p-3 bg-black/60 backdrop-blur-md border-white/20 text-white">
                        <div className="text-xs space-y-2 whitespace-nowrap">
                            <div className="font-bold text-sm mb-2 text-center">Controls</div>
                            <div className="flex items-center gap-2">
                                <span className="text-green-400">😉😉</span>
                                <span>Next ↓</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-red-400">😉😉😉</span>
                                <span>Previous ↑</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Bottom progress bar */}
            <div className="h-1 bg-white/10">
                <div
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / SHORTS_LIST.length) * 100}%` }}
                />
            </div>
        </div>
    );
};

export default YouTubeShorts;
