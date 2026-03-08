import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import io from "socket.io-client";

interface Message {
    id: number;
    sender: "user" | "contact";
    text: string;
    timestamp: number;
}

interface ChatDetails {
    id: string;
    name: string;
    chat_id: string;
}

const API_BASE = "http://localhost:5000";

const ChatHistory = () => {
    const { contactId } = useParams<{ contactId: string }>();
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([]);
    const [contact, setContact] = useState<ChatDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch contact details and messages
    useEffect(() => {
        if (!contactId) return;

        const loadChat = async () => {
            try {
                // Fetch contact details
                const contactRes = await fetch(`${API_BASE}/telegram/contacts`);
                const contactData = await contactRes.json();
                const matchedContact = contactData.contacts?.find((c: any) => c.id === contactId);

                if (matchedContact) {
                    setContact(matchedContact);
                } else {
                    navigate("/chats"); // Contact not found
                    return;
                }

                // Fetch messages
                const msgRes = await fetch(`${API_BASE}/telegram/messages/${contactId}`);
                const msgData = await msgRes.json();
                setMessages(msgData.messages || []);
            } catch (e) {
                console.error("Failed to load chat", e);
            } finally {
                setLoading(false);
            }
        };

        loadChat();
    }, [contactId, navigate]);

    // Socket Setup for Live Incoming Messages
    useEffect(() => {
        if (!contactId) return;

        const socket = io(API_BASE);
        socket.on("telegram_message", (data: { contact_id: string, message: Message }) => {
            if (data.contact_id === contactId) {
                setMessages((prev) => [...prev, data.message]);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [contactId]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Keyboard Navigation for this screen
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.code === "Enter") {
                e.preventDefault();
                // Reply action
                navigate(`/typing?replyTo=${contact?.id}`);
            } else if (e.key === "Backspace" || e.code === "Backspace") {
                e.preventDefault();
                // Go back
                navigate("/chats");
            } else if (e.key === "ArrowUp" || e.code === "ArrowUp") {
                e.preventDefault();
                window.scrollBy({ top: -200, behavior: 'smooth' });
            } else if (e.key === "ArrowDown" || e.code === "ArrowDown") {
                e.preventDefault();
                window.scrollBy({ top: 200, behavior: 'smooth' });
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate, contact]);

    const formatTime = (ts: number) => {
        return new Date(ts * 1000).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div className="h-screen w-full bg-background flex flex-col max-w-5xl mx-auto shadow-2xl overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b bg-card z-10 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/chats")} className="shrink-0">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    {contact && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                                {contact.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">{contact.name}</h1>
                                <p className="text-xs text-muted-foreground">Telegram Contact</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-xs text-muted-foreground">😉😉 Double blink to reply</p>
                    <p className="text-xs text-muted-foreground">😉😉😉 Triple blink to go back</p>
                </div>
            </header>

            {/* Messages Area */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-accent/5">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center">
                        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
                        <p className="text-muted-foreground">Loading messages...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
                        <div className="text-6xl mb-4">💬</div>
                        <p className="text-lg">No messages yet with {contact?.name}</p>
                        <p className="text-sm mt-2">Double blink to send the first message!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg, idx) => {
                            const isUser = msg.sender === "user";
                            const showAvatar = !isUser && (idx === messages.length - 1 || messages[idx + 1].sender === "user");

                            return (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                                        isUser ? "justify-end" : "justify-start"
                                    )}
                                >
                                    <div className={cn("flex max-w-[75%] gap-2 items-end", isUser ? "flex-row-reverse" : "flex-row")}>

                                        {!isUser && (
                                            <div className="w-8 shrink-0">
                                                {showAvatar && (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                                                        {contact?.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className={cn(
                                            "relative px-4 py-2.5 rounded-2xl shadow-sm text-[15px] leading-relaxed",
                                            isUser
                                                ? "bg-blue-600 text-white rounded-br-sm"
                                                : "bg-card border border-border text-card-foreground rounded-bl-sm"
                                        )}>
                                            <p className="whitespace-pre-wrap word-break">{msg.text}</p>
                                            <span className={cn(
                                                "block text-[10px] mt-1.5 text-right font-medium",
                                                isUser ? "text-blue-200" : "text-muted-foreground"
                                            )}>
                                                {formatTime(msg.timestamp)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                )}
            </main>

            {/* Bottom Action Bar */}
            <div className="p-4 border-t bg-card shrink-0 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
                <Button
                    size="lg"
                    className="w-full h-14 text-lg font-bold gap-3 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg"
                    onClick={() => navigate(`/typing?replyTo=${contact?.id}`)}
                >
                    <Send className="h-5 w-5" />
                    Reply
                </Button>
            </div>
        </div>
    );
};

export default ChatHistory;
