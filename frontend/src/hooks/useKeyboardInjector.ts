import { useEffect, useRef } from "react";
import { useSignalStore } from "@/services/signalService";

/**
 * Converts backend EOG/EEG command events into synthetic keyboard events.
 * 
 * Mapping:
 *   LEFT      → ArrowLeft
 *   RIGHT     → ArrowRight  
 *   ENTER     → Enter
 *   BACKSPACE → Backspace
 *   FOCUS     → Tab (toggles typing/prediction mode)
 * 
 * Includes a 700ms cooldown between injected keys to prevent
 * the UI from being overwhelmed by rapid signal events.
 */
export const useKeyboardInjector = (enabled: boolean) => {
    const lastCommand = useSignalStore(state => state.lastCommand);
    const commandTimestamp = useSignalStore(state => state.commandTimestamp);
    const lastProcessedTimestamp = useRef(0);
    const lastInjectedTime = useRef(0);

    useEffect(() => {
        if (!enabled || !lastCommand || commandTimestamp <= lastProcessedTimestamp.current) return;

        lastProcessedTimestamp.current = commandTimestamp;

        // Cooldown: prevent injecting keys faster than every 700ms
        const now = Date.now();
        if (now - lastInjectedTime.current < 700) {
            console.log("🚫 Key injection cooldown (too fast)");
            return;
        }

        const { action } = lastCommand;

        // Map command action to keyboard key
        const keyMap: Record<string, string> = {
            "LEFT": "ArrowLeft",
            "RIGHT": "ArrowRight",
            "ENTER": "Enter",
            "BACKSPACE": "Backspace",
            "FOCUS": "Tab"
        };

        const key = keyMap[action];
        if (!key) {
            console.warn("⚠️ Unknown command action:", action);
            return;
        }

        lastInjectedTime.current = now;
        console.log(`⌨️ Injecting key: ${key} (from ${lastCommand.type}: ${action})`);

        // Dispatch a synthetic keyboard event
        const event = new KeyboardEvent("keydown", {
            key: key,
            code: key,
            bubbles: true,
            cancelable: true
        });
        window.dispatchEvent(event);

    }, [enabled, lastCommand, commandTimestamp]);
};
