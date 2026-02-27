import { IoTControl } from "@/components/iot/IoTControl";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const IoT = () => {
    const navigate = useNavigate();

    return (
        <div className="h-screen w-full bg-background flex flex-col">
            <header className="p-4 border-b flex items-center justify-between">
                <Button variant="ghost" onClick={() => navigate("/")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Button>
                <h1 className="font-bold text-lg">Smart Home Control</h1>
                <div className="w-24"></div>
            </header>

            <main className="flex-1 overflow-hidden p-4">
                <IoTControl />
            </main>
        </div>
    );
};

export default IoT;
