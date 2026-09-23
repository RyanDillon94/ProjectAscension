import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Key, Send, Loader2, Dumbbell } from "lucide-react";
import { toast } from "sonner";

const SYSTEM_PROMPT = `You are the Project Ascension performance coach: sharp, conversational, analytical, and uncompromising. You are collaborating with the athlete to build their custom 12-month protocol.

DO NOT act like an automated survey or a rapid-fire questionnaire. Have a real, back-and-forth dialogue. Discuss their goals, challenge their assumptions if needed, and shape the plan together dynamically. 

Cover these core elements naturally over the conversation:
1. Their primary 12-month goal and target bodyweight (or physical milestone).
2. Any major dates, events, or deadlines to peak for.
3. Their core daily non-negotiable habits.
4. Their overarching mission statement / tagline for the year (this must be a powerful, sentence-form declaration of intent, like "built over years, ready for anything, arriving at [milestone] in undeniable shape") and a gritty footer quote rule to live by.

CRITICAL RULE FOR HABITS:
Habits must be daily actionable behaviors or micro-routines (e.g., "10 mins post-workout mobility", "Read 10 pages", "Hydration target hit"). 
NEVER include macro targets (like protein amounts) or macro workout splits (like "PPL + BJJ Split") as habits, as those are tracked elsewhere in the command centre.
CRITICAL FORMATTING RULE FOR YOUR SUMMARY:
Never squash lists, numbers, or section headers onto the same line. Every section header, every numbered point (e.g. **1. ...**), and every bullet point MUST be on its own brand-new line separated by a blank line. 

Once they approve it, you MUST output a raw JSON object wrapped in \`\`\`json tags exactly matching the schema below, and say nothing else. Assign realistic 'start' and 'end' dates for the blocks in YYYY-MM-DD format starting from today.

{
  "projectName": "Project Ascension",
  "tagline": "",
  "footerQuote": "",
  "startingWeight": 0,
  "goalWeight": 0,
  "targetDate": "2027-09-01T00:00:00Z",
  "dailyTargets": {
    "caloriesMin": 0,
    "caloriesMax": 0,
    "protein": 0,
    "steps": 0,
    "routine": ""
  },
  "habits": [
    { "key": "habit_1", "label": "Read 10 Pages", "sublabel": "Mindset" }
  ],
  "phases": [
    {
      "id": 1,
      "title": "Phase Name",
      "window": "Sep 2026 - Nov 2026",
      "status": "active",
      "summary": "",
      "badges": ["Conditioning", "Fat Loss"],
      "blocks": [
        { 
          "name": "Block 1: Name", 
          "window": "Weeks 1-6",
          "start": "2026-09-23",
          "end": "2026-11-04",
          "focus": ["Routine"],
          "bullets": ["Rule 1", "Rule 2"]
        }
      ]
    }
  ]
}`;

function FormattedMessage({ text }: { text: string }) {
  const cleanedText = text
    .replace(/---/g, "")
    .replace(/([.!?])\s+(\*\*\d+\.)/g, "$1\n\n$2")
    .replace(/\s+\*\s+(\*\*)/g, "\n\n• $1")
    .replace(/\s+-\s+(\*\*)/g, "\n\n• $1");

  const lines = cleanedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const subItems = line.split(/(?=\*\*\d+\.)|\s+\*\s+(?=\*\*)/).map(s => s.trim()).filter(Boolean);

        return (
          <div key={idx} className="space-y-1.5">
            {subItems.map((sub, sIdx) => {
              const isNumberedHeader = /^\*\*\d+\./.test(sub);
              const isBullet = sub.startsWith("* ") || sub.startsWith("- ") || sub.startsWith("• ");
              const cleanSub = sub.replace(/^[*•–-\s]+/, "");

              return (
                <p 
                  key={sIdx} 
                  className={
                    isNumberedHeader 
                      ? "font-bold text-foreground mt-3 mb-1" 
                      : isBullet 
                        ? "pl-3 flex items-start gap-2 font-medium" 
                        : "font-normal"
                  }
                >
                  {isBullet && <span className="text-primary mt-1">•</span>}
                  <span className="flex-1">
                    {cleanSub.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
                      part.startsWith("**") && part.endsWith("**") ? (
                        <strong key={i} className="text-primary font-semibold">
                          {part.slice(2, -2)}
                        </strong>
                      ) : (
                        <span key={i}>{part}</span>
                      ),
                    )}
                  </span>
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [apiKey, setApiKey] = useState("");
  const [hevyKey, setHevyKey] = useState("");
  const [step, setStep] = useState<"keys" | "chat">("keys");
  
  const [messages, setMessages] = useState<{role: "user" | "model", text: string}[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  const handleStartChat = () => {
    // Aggressively strip ALL whitespace, tabs, or newlines from copy-pasting
    const cleanApiKey = apiKey.replace(/\s+/g, '');
    const cleanHevyKey = hevyKey.replace(/\s+/g, '');

    if (!cleanApiKey) {
      toast.error("Gemini API key is required.");
      return;
    }
    
    localStorage.setItem("p35_gemini_api_key", cleanApiKey);
    if (cleanHevyKey) localStorage.setItem("p35_hevy_api_key", cleanHevyKey);
    
    setStep("chat");
    sendMessage("Hello Coach. Let's map out my 12-month protocol.");
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;
    
    // Grab the key and aggressively strip spaces/newlines right before we use it
    const rawKey = localStorage.getItem("p35_gemini_api_key") || "";
    const activeKey = rawKey.replace(/\s+/g, "");

    if (!activeKey) {
      toast.error("Gemini API key missing.");
      setStep("keys");
      return;
    }

    const newMsgs = [...messages, { role: "user" as const, text }];
    setMessages(newMsgs);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsTyping(true);

    const models = ["gemini-3.6-flash", "gemini-3.8-flash"];
    let reply = "";
    let success = false;

    try {
      const contents = newMsgs.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
        
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: contents,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          success = true;
          break;
        }
      }

      if (!success) {
        throw new Error("All model endpoints failed.");
      }

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
      toast.error("Failed to connect to Coach. Check your API key.");
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-primary">Gemini API Key</label>
                <a 
                  href="https://aistudio.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[11px] text-muted-foreground hover:text-primary underline transition-colors"
                >
                  Get free key from AI Studio →
                </a>
              </div>
              <input 
                type="password" 
                value={apiKey} 
                onChange={e => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-md border border-border bg-surface-2/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" 
              />
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-primary">Hevy API Key (Optional)</label>
                <a 
                  href="https://hevy.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[11px] text-muted-foreground hover:text-primary underline transition-colors"
                >
                  **Hevy Pro plan required** →
                </a>
              </div>
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
          <p className="text-xs text-muted-foreground">Collaborate with your coach to build your roadmap.</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
        {messages.filter(m => !m.text.includes("Hello Coach")).map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-surface-2/60 text-foreground"}`}>
              {m.role === "model" ? (
                <FormattedMessage text={m.text} />
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-surface-2/60 text-muted-foreground rounded-xl px-4 py-3 flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" /> Coach is thinking...
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 pb-4">
        <div className="flex items-end gap-2 bg-surface-2/50 border border-border rounded-xl p-2 focus-within:border-primary transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleInputResize}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Reply to coach (e.g., tweak calories, adjust phase)..."
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none max-h-32 py-1.5 px-2 leading-relaxed"
          />
          <Button
            size="icon"
            className="size-9 shrink-0 mb-0.5 rounded-lg"
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