import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Keyboard, Home, AlertTriangle, Activity, Play, MessageSquare } from "lucide-react";
import { SignalMonitor } from "@/components/SignalMonitor";
import { ConnectionPanel } from "@/components/ConnectionPanel";

const Index = () => {
    return (
        <div className="min-h-screen bg-background p-8 space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-primary">NeuroAssist</h1>
                    <p className="text-muted-foreground mt-1">Select a module to begin</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium">System Online</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Modules Grid */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link to="/typing" className="block h-full">
                        <Card className="h-full hover:border-primary/50 hover:bg-accent/5 transition-all cursor-pointer group">
                            <CardHeader>
                                <Keyboard className="w-12 h-12 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                                <CardTitle>Communication</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    Type messages locally using blink codes or eye movements.
                                </p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link to="/chats" className="block h-full">
                        <Card className="h-full border-blue-200 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer group">
                            <CardHeader>
                                <MessageSquare className="w-12 h-12 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                                <CardTitle className="text-blue-500">Telegram Messages</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    Read and reply to your Telegram chats.
                                </p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link to="/iot" className="block h-full">
                        <Card className="h-full hover:border-primary/50 hover:bg-accent/5 transition-all cursor-pointer group">
                            <CardHeader>
                                <Home className="w-12 h-12 text-green-500 mb-2 group-hover:scale-110 transition-transform" />
                                <CardTitle>Smart Home</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    Control lights, fans, and appliances.
                                </p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link to="/emergency" className="block h-full">
                        <Card className="h-full border-red-200 hover:border-red-500/50 hover:bg-red-500/5 transition-all cursor-pointer group">
                            <CardHeader>
                                <AlertTriangle className="w-12 h-12 text-red-500 mb-2 group-hover:scale-110 transition-transform" />
                                <CardTitle className="text-red-500">Emergency</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    Quickly alert contacts or sound an alarm.
                                </p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link to="/youtube" className="block h-full">
                        <Card className="h-full hover:border-red-500/50 hover:bg-red-500/5 transition-all cursor-pointer group">
                            <CardHeader>
                                <Play className="w-12 h-12 text-red-500 fill-red-500 mb-2 group-hover:scale-110 transition-transform" />
                                <CardTitle>YouTube Shorts</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    Watch and scroll through Shorts with blinks.
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Sidebar Status */}
                <div className="space-y-6">
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Activity className="h-5 w-5 text-primary" />
                            <h2 className="font-semibold">Live Signals</h2>
                        </div>
                        <SignalMonitor />
                    </section>

                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="font-semibold">Connection</h2>
                        </div>
                        <ConnectionPanel />
                    </section>
                </div>

            </div>
        </div>
    );
};

export default Index;
