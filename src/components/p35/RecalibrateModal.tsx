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

function FormattedMessage({ text }: { text: string }) {
  const cleanedText = text
    .replace(/---/g, "")
    .replace(/([.!?])\s+(\*\*\d+\.)/g, "$1\n\n$2")
    .replace(/\s+\*\s+(\*\*)/g, "\n\n• $1")
    .replace(/\s+-\s+(\*\*)/g, "\n\n• $1");

  const lines = cleanedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const subItems = line
          .split(/(?=\*\*\d+\.)|\s+\*\s+(?=\*\*)/)
          .map((s) => s.trim())
          .filter(Boolean);

        return (
          <div key={idx} className="space-y-1.5">
            {subItems.map((sub, sIdx) => {
              const isNumberedHeader = /^\*\*\d+\./.test(sub);

              const isBullet =
                sub.startsWith("* ") ||
                sub.startsWith("- ") ||
                sub.startsWith("• ");

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
                  {isBullet && (
                    <span className="text-primary mt-1">•</span>
                  )}

                  <span className="flex-1">
                    {cleanSub
                      .split(/(\*\*[^*]+\*\*)/g)
                      .map((part, i) =>
                        part.startsWith("**") &&
                        part.endsWith("**") ? (
                          <strong
                            key={i}
                            className="text-primary font-semibold"
                          >
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

export function RecalibrateModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    { role: "user" | "model"; text: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /*
   * ============================================================
   * KEYBOARD / VISUAL VIEWPORT HANDLING
   * ============================================================
   *
   * Android's keyboard changes the Visual Viewport height.
   * We use that value to resize the dialog while the keyboard
   * is open so the input box remains above the keyboard.
   */
  const [viewportHeight, setViewportHeight] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (!isOpen) {
      setViewportHeight(null);
      return;
    }

    const viewport = window.visualViewport;

    if (!viewport) {
      return;
    }

    const updateViewport = () => {
      setViewportHeight(viewport.height);
    };

    updateViewport();

    viewport.addEventListener("resize", updateViewport);
    viewport.addEventListener("scroll", updateViewport);

    return () => {
      viewport.removeEventListener("resize", updateViewport);
      viewport.removeEventListener("scroll", updateViewport);
    };
  }, [isOpen]);

  /*
   * Keep the newest message visible.
   */
  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop =
            scrollRef.current.scrollHeight;
        }
      });
    }
  }, [messages, isTyping]);

  /*
   * When the input receives focus, make sure Android has
   * scrolled the textbox into the visible viewport.
   */
  const handleInputFocus = () => {
    setTimeout(() => {
      inputRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 250);
  };

  const getSystemPrompt = () => {
    const currentProfile =
      localStorage.getItem("ascension_user_profile") || "{}";

    return `You are the Project Ascension performance coach. The user wants to recalibrate their existing 12-month protocol.

Here is their CURRENT protocol configuration (JSON):
${currentProfile}

The user will tell you what they want to change (e.g., 'drop my calories to 2000', 'shift my Phase 2 start date to December', 'change habits to actual daily behavioral actions instead of macro targets').

Discuss the changes with them briefly and directly.

CRITICAL FORMATTING RULE:
Never squash lists, numbers, or section headers onto the same line. Every section header, every numbered point, and every bullet point MUST be on its own brand-new line separated by a blank line.

Once the changes are agreed upon and finalized, you MUST output the completely updated raw JSON object wrapped in \`\`\`json tags.

CRITICAL RULES:
1. Maintain the EXACT SAME JSON SCHEMA as the current profile.
2. Do not omit any existing data unless the user explicitly asked to remove it.
3. Habits must be daily actionable behaviors (e.g., "10 mins mobility", "Read 10 pages"), NOT macro splits or protein counts.
4. After outputting the JSON, say nothing else.`;
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    if (open && messages.length === 0) {
      setMessages([
        {
          role: "model",
          text: "Coach online. What are we recalibrating today?",
        },
      ]);
    }

    if (!open) {
      setViewportHeight(null);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const apiKey = localStorage.getItem("p35_gemini_api_key");

    if (!apiKey) {
      toast.error("Gemini API key missing.");
      return;
    }

    const newMsgs = [
      ...messages,
      {
        role: "user" as const,
        text,
      },
    ];

    setMessages(newMsgs);
    setInput("");
    setIsTyping(true);

    const models = [
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite",
      "gemini-2.5-flash",
    ];

    let reply = "";
    let success = false;

    try {
      const contents = newMsgs.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: getSystemPrompt() }],
            },
            contents,
          }),
        });

        if (res.ok) {
          const data = await res.json();

          reply =
            data.candidates?.[0]?.content?.parts?.[0]?.text || "";

          success = true;
          break;
        }
      }

      if (!success) {
        throw new Error("All model endpoints failed.");
      }

      if (reply.includes("```json") && reply.includes("```")) {
        const jsonString = reply
          .split("```json")[1]
          .split("```")[0]
          .trim();

        try {
          const updatedProfile = JSON.parse(jsonString);

          localStorage.setItem(
            "ascension_user_profile",
            JSON.stringify(updatedProfile),
          );

          toast.success(
            "Protocol Recalibrated. Reloading Command Centre.",
          );

          setIsOpen(false);

          setTimeout(() => {
            window.location.reload();
          }, 1500);

          return;
        } catch (e) {
          console.error("Failed to parse AI JSON", e);

          toast.error(
            "AI generated invalid data. Tell it to try again.",
          );
        }
      }

      setMessages([
        ...newMsgs,
        {
          role: "model",
          text: reply,
        },
      ]);
    } catch (err) {
      console.error(err);

      toast.error(
        "Failed to connect to Coach. Check your API key.",
      );
    } finally {
      setIsTyping(false);
    }
  };

  /*
   * Work out the dialog height.
   *
   * Normally it gets most of the screen.
   * When Android's keyboard opens, visualViewport.height
   * becomes much smaller, so the dialog shrinks with it.
   */
  const dialogHeight = viewportHeight
    ? `${Math.max(viewportHeight - 16, 280)}px`
    : "min(85dvh, 700px)";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs"
        >
          <Settings2 className="size-4" />
          Recalibrate Plan
        </Button>
      </DialogTrigger>

      <DialogContent
        style={{
          height: dialogHeight,
          maxHeight: viewportHeight
            ? `${Math.max(viewportHeight - 16, 280)}px`
            : "calc(100dvh - 2rem)",
        }}
        className="
          w-[calc(100vw-1rem)]
          max-w-lg
          flex
          flex-col
          overflow-hidden
          p-0
          gap-0
        "
      >
        {/* =====================================================
            HEADER
            ===================================================== */}

        <DialogHeader
          className="
            shrink-0
            px-4
            pt-4
            pb-3
            border-b
            border-border
            bg-background
            z-20
          "
        >
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Settings2 className="size-5 shrink-0" />

            <span>
              AI Protocol Recalibration
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* =====================================================
            CHAT AREA
            ===================================================== */}

        <div
          ref={scrollRef}
          className="
            flex-1
            min-h-0
            overflow-y-auto
            overscroll-contain
            px-4
            py-4
            space-y-4
          "
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`
                  max-w-[90%]
                  rounded-xl
                  px-4
                  py-3
                  text-sm
                  break-words
                  ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-2/60 text-foreground"
                  }
                `}
              >
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
              <div
                className="
                  bg-surface-2/60
                  text-muted-foreground
                  rounded-xl
                  px-4
                  py-3
                  flex
                  items-center
                  gap-2
                  text-sm
                "
              >
                <Loader2 className="size-4 animate-spin" />

                Coach is analyzing...
              </div>
            </div>
          )}
        </div>

        {/* =====================================================
            INPUT AREA
            ===================================================== */}

        <div
          className="
            shrink-0
            w-full
            border-t
            border-border
            bg-background
            px-4
            pt-3
            pb-3
            z-20
          "
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={handleInputFocus}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();

                  sendMessage(input);
                }
              }}
              placeholder="E.g., 'Fix my habits...'"
              autoComplete="off"
              className="
                flex-1
                min-w-0
                h-11
                rounded-full
                border
                border-border
                bg-surface-2/50
                px-4
                text-sm
                text-foreground
                placeholder:text-muted-foreground
                focus:border-primary
                focus:outline-none
                focus:ring-1
                focus:ring-primary
              "
            />

            <Button
              size="icon"
              className="size-11 shrink-0 rounded-full"
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