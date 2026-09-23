import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Send, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";

export function RecalibrateModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const getSystemPrompt = () => {
    const currentProfile = localStorage.getItem("ascension_user_profile") || "{}";
    
    return `You are the Project Ascension performance coach. The user wants to recalibrate their existing 12-month protocol.

Here is their CURRENT protocol configuration (JSON):
${currentProfile}

The user will tell you what they want to change (e.g., 'drop my calories to 2000', 'shift my Phase 2 start date to December', 'change habit 3 to drink 3L of water').

Discuss the changes with them briefly and directly. 
Once the changes are agreed upon and finalized, you MUST output the completely updated raw JSON object wrapped in \`\`\`json tags. 

CRITICAL RULES:
1. Maintain the EXACT SAME JSON SCHEMA as the current profile. 
2. Do not omit any existing data unless the user explicitly asked to remove it. 
3. After outputting the JSON, say nothing else.`;
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && messages.length === 0) {
      setMessages([{ role: "model", text: "Coach online. What are we recalibrating today?" }]);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const apiKey = localStorage.getItem("p35_gemini_api_key");
    if (!apiKey) {
      toast.error("Gemini API key missing.");
      return;
    }

    const newMsgs = [...messages, { role: "user" as const, text }];
    setMessages(newMsgs);
    setInput("");
    setIsTyping(true);

    try {
      const contents = newMsgs.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: getSystemPrompt() }] },
          contents: contents,
        }),
      });

      if (!res.ok) throw new Error("API failed");
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Check if the AI outputted the updated JSON block
      if (reply.includes("```json") && reply.includes("```")) {
        const jsonString = reply.split("```json")[1].split("```")[0].trim();
        try {
          const updatedProfile = JSON.parse(jsonString);
          localStorage.setItem("ascension_user_profile", JSON.stringify(updatedProfile));
          
          toast.success("Protocol Recalibrated. Reloading Command Centre.");
          setIsOpen(false);
          
          // Slight delay to let the toast show, then reload the page to apply changes
          setTimeout(() => window.location.reload(), 1500);
          return;
        } catch (e) {
          console.error("Failed to parse AI JSON", e);
          toast.error("AI generated invalid data. Tell it to try again.");
        }
      }

      setMessages([...newMsgs, { role: "model", text: reply }]);
    } catch (err) {
      toast.error("Failed to connect to Coach.");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {/* You can drop this button anywhere on the dashboard, like a settings header */}
        <Button variant="outline" size="sm" className="gap-2 text-xs">
          <Settings2 className="size-4" />
          Recalibrate Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md h-[80vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Settings2 className="size-5" />
            AI Protocol Recalibration
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2" ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-surface-2/60 text-foreground"}`}>
                {m.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-surface-2/60 text-muted-foreground rounded-xl px-4 py-3 flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" /> Coach is analyzing...
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              placeholder="E.g., 'Drop my calories to 2000'..."
              className="w-full rounded-full border border-border bg-surface-2/50 pl-4 pr-12 py-3 text-sm focus:border-primary focus:outline-none"
            />
            <Button
              size="icon"
              className="absolute right-1 top-1 size-9 rounded-full"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
