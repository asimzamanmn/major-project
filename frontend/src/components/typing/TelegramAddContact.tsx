import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";

interface TelegramAddContactProps {
    open: boolean;
    onClose: () => void;
    onAdded: () => void;
}

const API_BASE = "http://localhost:5000";

export const TelegramAddContact = ({ open, onClose, onAdded }: TelegramAddContactProps) => {
    const [name, setName] = useState("");
    const [chatId, setChatId] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);

    // Auto-focus name input when opened
    useEffect(() => {
        if (open) {
            setName("");
            setChatId("");
            setError("");
            setTimeout(() => nameRef.current?.focus(), 100);
        }
    }, [open]);

    const handleSave = async () => {
        if (!name.trim() || !chatId.trim()) {
            setError("Both name and chat ID are required");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const res = await fetch(`${API_BASE}/telegram/contacts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), chat_id: chatId.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                onAdded();
            } else {
                setError(data.error || "Failed to save contact");
            }
        } catch {
            setError("Network error — is the backend running?");
        } finally {
            setSaving(false);
        }
    };

    // Handle Escape and Enter keys
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="absolute inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="p-6 bg-card border-2 border-green-500/60 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
                <div className="text-center mb-5">
                    <div className="text-4xl mb-2">➕</div>
                    <h3 className="text-xl font-bold mb-1">Add Telegram Contact</h3>
                    <p className="text-xs text-muted-foreground">
                        Ask a caregiver to enter the contact details
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Name Input */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                            Contact Name
                        </label>
                        <input
                            ref={nameRef}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Mom, Doctor, Nurse"
                            className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                        />
                    </div>

                    {/* Chat ID Input */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                            Telegram Chat ID
                        </label>
                        <input
                            type="text"
                            value={chatId}
                            onChange={(e) => setChatId(e.target.value)}
                            placeholder="e.g. 123456789"
                            className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            💡 The recipient must first message your bot on Telegram.
                            Then get their chat ID from{" "}
                            <code className="text-[10px] bg-muted px-1 rounded">
                                api.telegram.org/bot&lt;TOKEN&gt;/getUpdates
                            </code>
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                            ❌ {error}
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/30 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? "Saving..." : "Save Contact"}
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
