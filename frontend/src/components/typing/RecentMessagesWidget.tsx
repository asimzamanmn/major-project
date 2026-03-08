import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import io from "socket.io-client";

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

export const RecentMessagesWidget = () => {
    const [chats, setChats] = useState<ChatOverview[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchChats = async () => {
        try {
            const res = await fetch(`${API_BASE}/telegram/chats`);
            const data = await res.json();
            // Only show the top 3 most recent chats with messages
            const activeChats = (data.chats || [])
                .filter((c: ChatOverview) => c.last_message !== null)
                .slice(0, 3);
            setChats(activeChats);
        } catch (e) {
            console.error("Failed to fetch chats for widget", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChats();

        // Listen for live updates so the widget updates instantly
        const socket = io(API_BASE);
        socket.on("telegram_message", () => {
            fetchChats(); // Refresh on new message
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const formatTimeShort = (ts: number) => {
        const d = new Date(ts * 1000);
        if (Date.now() - d.getTime() > 86400000) {
            return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        }
        return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    };

    if (loading) {
        return (
            <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4 flex justify-center">
                    <div className="animate-pulse w-full space-y-3">
                        <div className="h-10 bg-muted rounded-md w-full" />
                        <div className="h-10 bg-muted rounded-md w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (chats.length === 0) {
        return (
            <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4 text-center">
                    <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">No recent messages</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border shadow-sm overflow-hidden">
            <div className="divide-y divide-border">
                {chats.map((chat) => (
                    <Link
                        key={chat.id}
                        to={`/chats/${chat.id}`}
                        className="flex items-start gap-3 p-3 hover:bg-accent/10 transition-colors group relative"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {chat.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <p className="font-semibold text-sm truncate">{chat.name}</p>
                                {chat.timestamp && (
                                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                        {formatTimeShort(chat.timestamp)}
                                    </span>
                                )}
                            </div>
                            <p className={`text-xs truncate ${chat.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                                {chat.last_sender === "user" ? "You: " : ""}{chat.last_message}
                            </p>
                        </div>
                        {chat.unread_count > 0 && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {chat.unread_count}
                            </div>
                        )}
                    </Link>
                ))}
            </div>
            <Link
                to="/chats"
                className="block w-full text-center p-2 text-xs font-medium text-blue-500 hover:text-blue-400 bg-accent/5 hover:bg-accent/10 transition-colors border-t border-border"
            >
                View All Chats →
            </Link>
        </Card>
    );
};
