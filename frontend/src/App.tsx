import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Typing from "./pages/Typing";
import IoT from "./pages/IoT";
import Emergency from "./pages/Emergency";
import YouTubeShorts from "./pages/YouTubeShorts";
import ChatsList from "./pages/ChatsList";
import ChatHistory from "./pages/ChatHistory";
import { GlobalSignalNavigator } from "./components/GlobalSignalNavigator";

function App() {
  return (
    <BrowserRouter>
      <GlobalSignalNavigator />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/chats" element={<ChatsList />} />
        <Route path="/chats/:contactId" element={<ChatHistory />} />
        <Route path="/typing" element={<Typing />} />
        <Route path="/iot" element={<IoT />} />
        <Route path="/emergency" element={<Emergency />} />
        <Route path="/youtube" element={<YouTubeShorts />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
