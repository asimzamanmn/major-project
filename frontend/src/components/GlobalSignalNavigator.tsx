import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useKeyboardInjector } from "@/hooks/useKeyboardInjector";

export const GlobalSignalNavigator = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Inject keyboard events from EOG commands on ALL pages
    // This converts command events → ArrowLeft/ArrowRight/Enter/Backspace keyboard events
    // Each page has its own keydown handler that interprets these keys
    useKeyboardInjector(true);

    // Define menu items for the Home page
    const menuItems = [
        { path: "/", label: "Home" },
        { path: "/typing", label: "Communication" },
        { path: "/iot", label: "Smart Home" },
        { path: "/emergency", label: "Emergency" },
        { path: "/youtube", label: "YouTube" }
    ];

    // Track selection state (only relevant on Home page)
    const [selectedMenuIndex, setSelectedMenuIndex] = useState(1); // Start on first real item

    // Sync selected index when path changes
    useEffect(() => {
        const index = menuItems.findIndex(item => item.path === location.pathname);
        if (index !== -1 && index !== 0) {
            setSelectedMenuIndex(index);
        } else if (index === -1 || index === 0) {
            setSelectedMenuIndex(1); // Default to first real item
        }
    }, [location.pathname]);

    // Handle keyboard navigation ONLY on Home page
    // Sub-pages (Typing, IoT, Emergency) have their own keydown handlers
    useEffect(() => {
        if (location.pathname !== "/") return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight" || e.code === "ArrowRight") {
                setSelectedMenuIndex(prev => {
                    const next = (prev + 1) % menuItems.length;
                    return next === 0 ? 1 : next; // Skip Home
                });
            } else if (e.key === "ArrowLeft" || e.code === "ArrowLeft") {
                setSelectedMenuIndex(prev => {
                    const next = (prev - 1 + menuItems.length) % menuItems.length;
                    return next === 0 ? menuItems.length - 1 : next; // Skip Home
                });
            } else if (e.key === "Enter" || e.code === "Enter") {
                const target = menuItems[selectedMenuIndex];
                if (target && target.path !== "/") {
                    navigate(target.path);
                }
            }
            // Backspace on Home = no action (already at Home)
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [location.pathname, selectedMenuIndex, navigate]);

    // Visual feedback: only show the selection bar on Home page
    if (location.pathname !== "/") return null;

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/90 text-white px-6 py-4 rounded-full flex gap-6 backdrop-blur-md border border-white/20 shadow-2xl z-50 animate-in slide-in-from-bottom duration-500">
            {menuItems.slice(1).map((item, idx) => {
                const realIndex = idx + 1;
                const isSelected = realIndex === selectedMenuIndex;

                return (
                    <div
                        key={item.path}
                        className={cn(
                            "px-4 py-2 rounded-full transition-all duration-300 flex items-center gap-2",
                            isSelected ? "bg-primary text-primary-foreground font-bold scale-110 ring-2 ring-primary/50" : "text-muted-foreground hover:bg-white/10"
                        )}
                    >
                        {isSelected && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                        {item.label}
                    </div>
                );
            })}
        </div>
    );
};
