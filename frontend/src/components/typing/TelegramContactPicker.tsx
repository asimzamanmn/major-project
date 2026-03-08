import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Contact {
    id: string;
    name: string;
    chat_id: string;
}

interface TelegramContactPickerProps {
    /** Whether the picker modal is open */
    open: boolean;
    /** The message to send */
    message: string;
    /** Called when the modal should close */
    onClose: () => void;
    /** Called after a message is successfully sent */
    onSent: (contactName: string) => void;
    /** Called when a send attempt fails */
    onError: (error: string) => void;
    /** Called to open the add-contact form */
    onAddContact: () => void;
}

const API_BASE = "http://localhost:5000";

export const TelegramContactPicker = ({
    open,
    message,
    onClose,
    onSent,
    onError,
    onAddContact,
}: TelegramContactPickerProps) => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch contacts when modal opens
    useEffect(() => {
        if (!open) return;
        setLoading(true);
        setSelectedIndex(0);
        fetch(`${API_BASE}/telegram/contacts`)
            .then((res) => res.json())
            .then((data) => {
                setContacts(data.contacts || []);
                setLoading(false);
            })
            .catch(() => {
                setContacts([]);
                setLoading(false);
            });
    }, [open]);

    // Total selectable items = contacts + "Add Contact" button
    const totalItems = contacts.length + 1;

    const handleSend = useCallback(async () => {
        if (sending) return;
        // If "Add Contact" is selected
        if (selectedIndex >= contacts.length) {
            onAddContact();
            return;
        }
        const contact = contacts[selectedIndex];
        setSending(true);
        try {
            const res = await fetch(`${API_BASE}/telegram/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: contact.chat_id, message }),
            });
            const data = await res.json();
            if (data.success) {
                onSent(contact.name);
            } else {
                onError(data.error || "Failed to send message");
            }
        } catch (e) {
            onError("Network error — is the backend running?");
        } finally {
            setSending(false);
        }
    }, [selectedIndex, contacts, message, sending, onSent, onError, onAddContact]);

    const handleDelete = useCallback(async () => {
        if (selectedIndex >= contacts.length) return;
        const contact = contacts[selectedIndex];
        try {
            await fetch(`${API_BASE}/telegram/contacts/${contact.id}`, {
                method: "DELETE",
            });
            // Refresh contacts
            const res = await fetch(`${API_BASE}/telegram/contacts`);
            const data = await res.json();
            setContacts(data.contacts || []);
            setSelectedIndex((prev) => Math.min(prev, (data.contacts?.length || 1) - 1));
        } catch {
            // Silently fail delete
        }
    }, [selectedIndex, contacts]);

    // Keyboard/eye navigation
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (sending) return;

            if (e.key === "ArrowLeft" || e.code === "ArrowLeft") {
                e.preventDefault();
                setSelectedIndex((prev) => Math.max(0, prev - 1));
            } else if (e.key === "ArrowRight" || e.code === "ArrowRight") {
                e.preventDefault();
                setSelectedIndex((prev) => Math.min(totalItems - 1, prev + 1));
            } else if (e.key === "Enter" || e.code === "Enter") {
                e.preventDefault();
                handleSend();
            } else if (e.key === "Backspace" || e.code === "Backspace") {
                e.preventDefault();
                onClose();
            } else if (e.key === "Delete" || e.code === "Delete") {
                e.preventDefault();
                handleDelete();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, totalItems, sending, handleSend, handleDelete, onClose]);

    if (!open) return null;

    return (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="p-6 bg-card border-2 border-blue-500/60 shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="text-center mb-5">
                    <div className="text-4xl mb-2">📨</div>
                    <h3 className="text-xl font-bold mb-1">Send via Telegram</h3>
                    <p className="text-xs text-muted-foreground">
                        Select a contact to send your message
                    </p>
                </div>

                {/* Message Preview */}
                <div className="bg-muted/30 border border-border rounded-lg p-3 mb-4">
                    <p className="text-xs text-muted-foreground mb-1 font-semibold">Message:</p>
                    <p className="text-sm font-mono truncate">{message}</p>
                </div>

                {/* Contact List */}
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2" />
                        <p className="text-sm">Loading contacts...</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[250px] overflow-y-auto mb-4">
                        {contacts.length === 0 && (
                            <p className="text-center text-sm text-muted-foreground py-4">
                                No contacts yet. Add one below!
                            </p>
                        )}

                        {contacts.map((contact, idx) => (
                            <div
                                key={contact.id}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                                    selectedIndex === idx
                                        ? "border-blue-500 bg-blue-500/15 scale-[1.02] shadow-lg ring-2 ring-blue-500/40"
                                        : "border-border/50 bg-card/40 hover:bg-card/60"
                                )}
                                onClick={() => {
                                    setSelectedIndex(idx);
                                    handleSend();
                                }}
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                                    {contact.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate">{contact.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        ID: {contact.chat_id}
                                    </p>
                                </div>
                                {selectedIndex === idx && (
                                    <span className="text-xs text-blue-400 font-bold animate-pulse">
                                        {sending ? "Sending..." : "→ SEND"}
                                    </span>
                                )}
                            </div>
                        ))}

                        {/* Add Contact option */}
                        <div
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-all",
                                selectedIndex >= contacts.length
                                    ? "border-green-500 bg-green-500/15 scale-[1.02] shadow-lg ring-2 ring-green-500/40"
                                    : "border-border/30 bg-card/20 hover:bg-card/40"
                            )}
                            onClick={onAddContact}
                        >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xl shrink-0">
                                +
                            </div>
                            <p className="font-semibold text-sm">Add New Contact</p>
                        </div>
                    </div>
                )}

                {/* Navigation Guide */}
                <div className="text-xs text-muted-foreground text-center space-y-1 border-t border-border/50 pt-3">
                    <div>👀 ← → Navigate contacts</div>
                    <div>😉😉 Double blink = Send to selected</div>
                    <div>😉😉😉 Triple blink = Cancel</div>
                </div>
            </Card>
        </div>
    );
};
