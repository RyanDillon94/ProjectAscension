import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Key, Send, Loader2, Dumbbell } from "lucide-react";
import { toast } from "sonner";

const SYSTEM_PROMPT = `[PASTE THE UPDATED PROMPT FROM ABOVE HERE]`;

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [apiKey, setApiKey] = useState("");
  const [hevyKey, setHevyKey] = useState("");
  const [step, setStep] = useState<"keys" | "chat">("keys");
  
  const [messages, setMessages] = useState<{role: "user" | "model", text: string}[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleStartChat = () => {
    if (!apiKey.trim()) {
      toast.error("Gemini API key is required.");
      return;
    }
    localStorage.setItem("p35_gemini_api_key", apiKey.trim());
    if (hevyKey.trim()) localStorage.setItem("p35_hevy_api_key", hevyKey.trim());
    
    setStep("chat");
    
    // Kick off the interview
    sendMessage("Hello Coach. I am ready to set up my 12-month protocol.");
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const newMsgs = [...messages, { role: "user" as const, text }];
    setMessages(newMsgs);
    setInput("");
    setIsTyping(true);

    try {
      // Format history for Gemini
      const contents = newMsgs.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const url = `[https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=$](https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=$){localStorage.getItem("p35_gemini_api_key")}`;
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: contents,
        }),
      });

      if (!res.ok) throw new Error("API failed");
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Check if the AI outputted the final JSON block
      if (reply.includes("```json") && reply.includes("```")) {
        const jsonString = reply.split("```json")[1].split("```")[0].trim();
        try {
          const profile = JSON.parse(jsonString);
          localStorage.setItem("ascension_user_profile", JSON.stringify(profile));
          localStorage.setItem("p35_setup_complete", "true");
          
          toast.success("Protocol Locked. Initiating Command Centre.");
          onComplete();
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

  if (step === "keys") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/20 text-primary mb-4">
              <Key className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Ignition Sequence</h1>
            <p className="text-sm text-muted-foreground">Provide your API keys to bring the AI Coach online.</p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-primary">Gemini API Key</label>
              <input 
                type="password" 
                value={apiKey} 
                onChange={e => setApiKey(e.target.value)}
                className="w-full rounded-md border border-border bg-surface-2/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" 
              />
            </div>
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-primary">Hevy API Key (Optional)</label>
              <input 
                type="password" 
                value={hevyKey} 
                onChange={e => setHevyKey(e.target.value)}
                className="w-full rounded-md border border-border bg-surface-2/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" 
              />
            </div>
            <Button className="w-full h-12 mt-6 font-bold" onClick={handleStartChat}>
              Boot AI Coach
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col p-4 max-w-xl mx-auto animate-in slide-in-from-right-4">
      <div className="py-4 flex items-center gap-3 border-b border-border/40">
        <Dumbbell className="size-5 text-primary" />
        <div>
          <h2 className="text-sm font-bold">Coach Setup Protocol</h2>
          <p className="text-xs text-muted-foreground">Answer the questions to build your roadmap.</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
        {messages.filter(m => !m.text.includes("Hello Coach")).map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-surface-2/60 text-foreground"}`}>
              {m.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-surface-2/60 text-muted-foreground rounded-xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Coach is typing...
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 pb-4">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Type your answer..."
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
    </div>
  );
}
