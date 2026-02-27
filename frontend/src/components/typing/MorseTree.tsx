import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface TreeNode {
    char: string;
    left?: TreeNode;
    right?: TreeNode;
    morse: string;
}

// Morse tree structure - optimized for frequency
const buildMorseTree = (): TreeNode => {
    return {
        char: "START",
        morse: "",
        left: {
            char: "E",
            morse: ".",
            left: {
                char: "I",
                morse: "..",
                left: {
                    char: "S",
                    morse: "...",
                    left: { char: "H", morse: "....", left: { char: "5", morse: "....." } },
                    right: { char: "V", morse: "...-" },
                },
                right: {
                    char: "U",
                    morse: "..-",
                    left: { char: "F", morse: "..-." },
                    right: { char: "4", morse: "....-" },
                },
            },
            right: {
                char: "A",
                morse: ".-",
                left: {
                    char: "R",
                    morse: ".-.",
                    left: { char: "L", morse: ".-.." },
                    right: { char: "P", morse: ".--." },
                },
                right: {
                    char: "W",
                    morse: ".--",
                    left: { char: "J", morse: ".---" },
                    right: { char: "1", morse: ".----" },
                },
            },
        },
        right: {
            char: "T",
            morse: "-",
            left: {
                char: "N",
                morse: "-.",
                left: {
                    char: "D",
                    morse: "-..",
                    left: { char: "B", morse: "-..." },
                    right: { char: "X", morse: "-..-", left: { char: "6", morse: "-...." } },
                },
                right: {
                    char: "K",
                    morse: "-.-",
                    left: { char: "C", morse: "-.-." },
                    right: { char: "Y", morse: "-.--" },
                },
            },
            right: {
                char: "M",
                morse: "--",
                left: {
                    char: "G",
                    morse: "--.",
                    left: { char: "Z", morse: "--.." },
                    right: { char: "Q", morse: "--.-", left: { char: "7", morse: "--..." } },
                },
                right: {
                    char: "O",
                    morse: "---",
                    left: { char: "8", morse: "---.", left: { char: "0", morse: "-----" } },
                    right: { char: "9", morse: "----", right: { char: "SPACE", morse: "" } },
                },
            },
        },
    };
};

interface MorseTreeProps {
    mode: "typing" | "prediction";
    onModeSwitch: () => void;
    typedText: string;
    onTypedTextChange: (text: string) => void;
}

// Confirmation dialog types
type ConfirmAction = "go_home" | "clear_text" | null;

export const MorseTree = ({ mode, typedText, onTypedTextChange }: MorseTreeProps) => {
    const navigate = useNavigate();
    const [currentNode, setCurrentNode] = useState<TreeNode>(buildMorseTree());
    const [path, setPath] = useState<string[]>([]);
    const tree = buildMorseTree();

    // Confirmation dialog state
    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
    const [confirmSelection, setConfirmSelection] = useState<"yes" | "no">("no"); // Default to No (safe)

    const handleLeft = () => {
        if (currentNode.left) {
            setCurrentNode(currentNode.left);
            setPath((prev) => [...prev, "LEFT"]);
        }
    };

    const handleRight = () => {
        if (currentNode.right) {
            setCurrentNode(currentNode.right);
            setPath((prev) => [...prev, "RIGHT"]);
        }
    };

    const resetToRoot = () => {
        setCurrentNode(tree);
        setPath([]);
    };

    const handleSelect = () => {
        if (currentNode.char !== "START") {
            const char = currentNode.char === "SPACE" ? " " : currentNode.char;
            onTypedTextChange(typedText + char);
            resetToRoot();
        }
    };

    // Keyboard handler
    useEffect(() => {
        if (mode !== "typing") return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
                e.preventDefault();
            }

            // If a confirmation dialog is active, handle it separately
            if (confirmAction !== null) {
                if (e.key === "ArrowLeft" || e.code === "ArrowLeft") {
                    setConfirmSelection("no");
                } else if (e.key === "ArrowRight" || e.code === "ArrowRight") {
                    setConfirmSelection("yes");
                } else if (e.key === "Enter" || e.code === "Enter") {
                    // Execute the confirmed action
                    if (confirmSelection === "yes") {
                        if (confirmAction === "go_home") {
                            navigate("/");
                        } else if (confirmAction === "clear_text") {
                            onTypedTextChange("");
                            resetToRoot();
                        }
                    }
                    // Always dismiss the dialog
                    setConfirmAction(null);
                    setConfirmSelection("no");
                } else if (e.key === "Backspace" || e.code === "Backspace") {
                    // Dismiss dialog (cancel)
                    setConfirmAction(null);
                    setConfirmSelection("no");
                }
                return; // Don't process tree navigation while dialog is open
            }

            // Normal tree navigation
            if (e.key === "ArrowLeft" || e.code === "ArrowLeft") {
                handleLeft();
            } else if (e.key === "ArrowRight" || e.code === "ArrowRight") {
                handleRight();
            } else if (e.key === "Enter" || e.code === "Enter") {
                handleSelect();
            } else if (e.key === "Backspace" || e.code === "Backspace") {
                if (currentNode.char !== "START") {
                    // Not at root → go back to root
                    resetToRoot();
                } else if (typedText.length > 0) {
                    // At root with text → delete last character
                    onTypedTextChange(typedText.slice(0, -1));
                } else {
                    // At root + empty text → show confirm "Go Home?"
                    setConfirmAction("go_home");
                    setConfirmSelection("no");
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mode, currentNode, typedText, confirmAction, confirmSelection]);

    const TreeNodeDisplay = ({ node, depth = 0 }: { node?: TreeNode; depth?: number }) => {
        if (!node) return null;
        const isCurrent = node.morse === currentNode.morse && node.char === currentNode.char;
        const isInPath = path.length > depth;

        return (
            <div className="flex flex-col items-center gap-1">
                <div
                    className={cn(
                        "px-2.5 py-1.5 rounded-md border-2 min-w-[48px] text-center transition-all",
                        isCurrent ? "bg-accent text-accent-foreground border-accent scale-110 shadow-lg" :
                            isInPath ? "bg-primary/30 border-primary/50" : "bg-card/40 border-border/50"
                    )}
                >
                    <div className="text-lg font-bold">{node.char === "START" ? "🌳" : node.char}</div>
                    <div className="text-[10px] text-muted-foreground leading-none mt-0.5">{node.morse || "ROOT"}</div>
                </div>

                {(node.left || node.right) && (
                    <div className="flex gap-3 mt-0.5">
                        {node.left && (
                            <div className="flex flex-col items-center">
                                <div className="text-xs text-blue-400 font-bold mb-0.5">←</div>
                                <TreeNodeDisplay node={node.left} depth={depth + 1} />
                            </div>
                        )}
                        {node.right && (
                            <div className="flex flex-col items-center">
                                <div className="text-xs text-green-400 font-bold mb-0.5">→</div>
                                <TreeNodeDisplay node={node.right} depth={depth + 1} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col p-3 overflow-hidden relative">
            {/* Confirmation Dialog Overlay */}
            {confirmAction && (
                <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <Card className="p-6 bg-card border-2 border-primary shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
                        <div className="text-center mb-6">
                            <div className="text-4xl mb-3">
                                {confirmAction === "go_home" ? "🏠" : "🗑️"}
                            </div>
                            <h3 className="text-xl font-bold mb-2">
                                {confirmAction === "go_home"
                                    ? "Go back to Home?"
                                    : "Clear all text?"}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {confirmAction === "go_home"
                                    ? "You will leave the Communication page."
                                    : `This will delete all ${typedText.length} characters.`}
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <div
                                className={cn(
                                    "flex-1 p-4 rounded-lg border-2 text-center cursor-pointer transition-all",
                                    confirmSelection === "no"
                                        ? "border-blue-500 bg-blue-500/20 scale-105 shadow-lg ring-2 ring-blue-500/50"
                                        : "border-border bg-card/50"
                                )}
                            >
                                <div className="text-xs text-blue-400 font-bold mb-1">← LEFT</div>
                                <div className="text-2xl font-bold">No</div>
                                <div className="text-xs text-muted-foreground mt-1">Cancel</div>
                            </div>
                            <div
                                className={cn(
                                    "flex-1 p-4 rounded-lg border-2 text-center cursor-pointer transition-all",
                                    confirmSelection === "yes"
                                        ? "border-red-500 bg-red-500/20 scale-105 shadow-lg ring-2 ring-red-500/50"
                                        : "border-border bg-card/50"
                                )}
                            >
                                <div className="text-xs text-green-400 font-bold mb-1">RIGHT →</div>
                                <div className="text-2xl font-bold">Yes</div>
                                <div className="text-xs text-muted-foreground mt-1">Confirm</div>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground text-center mt-4">
                            😉😉 Double blink to confirm selection
                        </p>
                    </Card>
                </div>
            )}

            {/* Header with Clear All button */}
            <div className="flex items-center justify-between mb-3 gap-2">
                {typedText.length > 0 && (
                    <button
                        onClick={() => { setConfirmAction("clear_text"); setConfirmSelection("no"); }}
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-400/30 hover:border-red-400/60 transition-all"
                    >
                        🗑️ Clear All
                    </button>
                )}
            </div>

            {/* Text Display */}
            <Card className="p-3 bg-card/60 border-2 border-accent/30 mb-3">
                <div className="min-h-[50px] text-lg font-mono">
                    {typedText}
                    <span className="inline-block w-1 h-5 bg-accent animate-pulse ml-1" />
                </div>
            </Card>

            <div className="flex-1 flex gap-3 overflow-hidden min-h-0">
                <Card className="flex-[3] p-3 bg-card/60 border-border flex flex-col overflow-hidden">
                    <h3 className="text-base font-semibold text-center mb-2 text-primary">Morse Tree Navigation</h3>
                    <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
                        <div className="scale-[0.85] origin-center">
                            <TreeNodeDisplay node={tree} depth={0} />
                        </div>
                    </div>
                </Card>

                {/* Right side: Current node + Next choices + Controls */}
                <div className="flex-[1] flex flex-col gap-2 overflow-hidden min-h-0">
                    {/* Current position */}
                    <Card className="p-3 bg-accent/10 border-2 border-accent">
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">Current</p>
                            <div className="text-4xl font-bold mb-1">{currentNode.char === "START" ? "🌳" : currentNode.char}</div>
                            <p className="text-xs text-muted-foreground">{currentNode.morse || "ROOT"}</p>
                        </div>
                    </Card>

                    {/* Next choices */}
                    <Card className="p-3 bg-card/60 border-border">
                        <p className="text-xs text-muted-foreground mb-2 text-center font-semibold">Next Choices</p>
                        <div className="flex justify-between gap-2">
                            <div className={cn(
                                "flex-1 text-center p-2 rounded-md border-2",
                                currentNode.left ? "border-blue-400/50 bg-blue-500/10" : "border-border/30 opacity-40"
                            )}>
                                <div className="text-xs text-blue-400 font-bold">← LEFT</div>
                                <div className="text-xl font-bold mt-1">
                                    {currentNode.left?.char === "SPACE" ? "⎵" : currentNode.left?.char || "—"}
                                </div>
                            </div>
                            <div className={cn(
                                "flex-1 text-center p-2 rounded-md border-2",
                                currentNode.right ? "border-green-400/50 bg-green-500/10" : "border-border/30 opacity-40"
                            )}>
                                <div className="text-xs text-green-400 font-bold">RIGHT →</div>
                                <div className="text-xl font-bold mt-1">
                                    {currentNode.right?.char === "SPACE" ? "⎵" : currentNode.right?.char || "—"}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Controls guide */}
                    <Card className="p-2 bg-card/40 border-border/50">
                        <div className="text-[10px] text-muted-foreground space-y-1">
                            <div>👀 ← → Navigate tree</div>
                            <div>😉😉 Double blink = Select</div>
                            <div>😉😉😉 Triple blink = Back/Delete</div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
