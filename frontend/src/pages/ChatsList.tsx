import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Plus } from "lucide-react";
import { TelegramAddContact } from "@/components/typing/TelegramAddContact";
import { cn } from "@/lib/utils";

interface ChatOverview {
    id: string;
    name: string;
    chat_id: string;
    last_message: string | null;
    timestamp: number | null;
    last_sender: "user" | "contact" | null;
    unread_count: number;
}

const API_BASE = "http://localhost:5000";

const ChatsList = () => {
    const navigate = useNavigate();
    const [chats, setChats] = useState<ChatOverview[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [addContactOpen, setAddContactOpen] = useState(false);

    const fetchChats = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/telegram/chats`);
            const data = await res.json();
            setChats(data.chats || []);
        } catch (e) {
            console.error("Failed to fetch chats", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchChats();
        // Set up polling just for the list view to stay fresh
        const interval = setInterval(fetchChats, 3000);
        return () => clearInterval(interval);
    }, [fetchChats]);

    const totalItems = chats.length;

    // Handle Keyboard Navigation (Arrow Keys / Enter)
    useEffect(() => {
        if (addContactOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft" || e.code === "ArrowLeft") {
                e.preventDefault();
                setSelectedIndex((prev) => Math.max(0, prev - 1));
            } else if (e.key === "ArrowRight" || e.code === "ArrowRight") {
                e.preventDefault();
                setSelectedIndex((prev) => Math.min(Math.max(0, totalItems - 1), prev + 1));
            } else if (e.key === "Enter" || e.code === "Enter") {
                e.preventDefault();
                if (chats[selectedIndex]) {
                    navigate(`/chats/${chats[selectedIndex].id}`);
                }
            } else if (e.key === "Backspace" || e.code === "Backspace") {
                e.preventDefault();
                navigate("/");
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedIndex, chats, totalItems, navigate, addContactOpen]);

    const formatTime = (ts: number | null) => {
        if (!ts) return "";
        const d = new Date(ts * 1000);
        if (Date.now() - d.getTime() > 86400000) {
            return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        }
        return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="h-screen w-full bg-background flex flex-col p-6">
            <header className="flex items-center justify-between mb-8 border-b pb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <MessageSquare className="h-8 w-8 text-blue-500" />
                            Messages
                        </h1>
                        <p className="text-muted-foreground text-sm">Select a contact to view chat</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setAddContactOpen(true)}
                >
                    <Plus className="h-4 w-4" />
                    Add Contact
                </Button>
            </header>

            <main className="flex-1 overflow-hidden flex flex-col items-center">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                ) : chats.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                        <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
                        <h2 className="text-xl font-semibold text-foreground mb-2">No Contacts Yet</h2>
                        <p className="max-w-md text-center">Add a contact using the button above to start chatting via Telegram.</p>
                    </div>
                ) : (
                    <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max overflow-y-auto p-2">
                        {chats.map((chat, idx) => (
                            <Card
                                key={chat.id}
                                onClick={() => navigate(`/chats/${chat.id}`)}
                                className={cn(
                                    "cursor-pointer transition-all hover:scale-105 active:scale-95 duration-200 border-2",
                                    selectedIndex === idx
                                        ? "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)] ring-2 ring-blue-500/40"
                                        : "border-border/50 hover:border-primary/50"
                                )}
                            >
                                <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl shrink-0">
                                            {chat.name.charAt(0).toUpperCase()}
                                        </div>
                                        <CardTitle className="text-lg line-clamp-1">{chat.name}</CardTitle>
                                    </div>
                                    {chat.unread_count > 0 && (
                                        <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                                            {chat.unread_count}
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    {chat.last_message ? (
                                        <div className="flex flex-col gap-1">
                                            <p className={cn(
                                                "text-sm line-clamp-2",
                                                chat.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                                            )}>
                                                {chat.last_sender === "user" && "You: "}{chat.last_message}
                                            </p>
                                            <span className="text-[10px] text-muted-foreground self-end">
                                                {formatTime(chat.timestamp)}
                                            </span>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">No messages yet</p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>

            {/* Navigation Guide */}
            <div className="mt-6 text-sm text-muted-foreground text-center space-x-6 border-t pt-4">
                <span>👀 ← → <br />Navigate</span>
                <span>😉😉 Double blink <br />Open Chat</span>
                <span>😉😉😉 Triple blink <br />Go Back</span>
            </div>

            <TelegramAddContact
                open={addContactOpen}
                onClose={() => setAddContactOpen(false)}
                onAdded={() => {
                    setAddContactOpen(false);
                    fetchChats();
                }}
            />
        </div>
    );
};

export default ChatsList;
