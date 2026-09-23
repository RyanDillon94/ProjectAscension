import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Check,
  Loader2,
  Send,
  Settings2,
  X,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================
// FORMATTED AI MESSAGE
// ============================================================

function FormattedMessage({ text }: { text: string }) {
  const cleanedText = text
    .replace(/```json[\s\S]*?```/g, "")
    .replace(/```[\s\S]*?```/g, "")
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
              const isNumberedHeader =
                /^\*\*\d+\./.test(sub);

              const isBullet =
                sub.startsWith("* ") ||
                sub.startsWith("- ") ||
                sub.startsWith("• ");

              const cleanSub = sub.replace(
                /^[*•–-\s]+/,
                "",
              );

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
                    <span className="text-primary mt-1">
                      •
                    </span>
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

// ============================================================
// TYPES
// ============================================================

type ChatMessage = {
  role: "user" | "model";
  text: string;
};

type PendingUpdate = {
  profile: Record<string, any>;
  explanation: string;
};

// ============================================================
// COMPONENT
// ============================================================

export function RecalibrateModal() {
  const [isOpen, setIsOpen] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(
    [],
  );

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [pendingUpdate, setPendingUpdate] =
    useState<PendingUpdate | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  // ============================================================
  // AUTO-SCROLL
  // ============================================================

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop =
        scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, pendingUpdate]);

  // ============================================================
  // TEXTAREA RESIZE
  // ============================================================

  const handleInputResize = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setInput(e.target.value);

    const target = e.target;

    target.style.height = "auto";

    target.style.height = `${Math.min(
      target.scrollHeight,
      120,
    )}px`;
  };

  // ============================================================
  // RESET TEXTAREA HEIGHT
  // ============================================================

  const resetTextarea = () => {
    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // ============================================================
  // SYSTEM PROMPT
  // ============================================================

  const getSystemPrompt = () => {
    const currentProfile =
      localStorage.getItem(
        "ascension_user_profile",
      ) || "{}";

    return `You are the Project Ascension performance coach.

You are helping the athlete recalibrate their existing 12-month protocol.

Your job is NOT to blindly obey requests.

You are a coach collaborating with the athlete.

CURRENT PROTOCOL:
${currentProfile}

============================================================
CORE BEHAVIOUR
============================================================

When the athlete asks to change something, first discuss WHY.

Do not automatically change calories because the athlete says they gained weight.

Do not automatically change steps because the athlete says progress is slow.

Do not automatically change dates because the athlete asks for them.

Instead:

1. Understand the actual problem.

2. Consider the relevant evidence and current protocol.

3. Identify which metric, behaviour, target, or structural element is actually appropriate to adjust.

4. Explain your reasoning clearly.

5. Propose a specific change.

6. Ask the athlete to explicitly confirm the proposed change.

Do NOT generate JSON until the athlete has explicitly confirmed the proposed change.

Examples of explicit confirmation include:

"Yes"

"Do it"

"Apply that"

"Sounds good"

"Go ahead"

"Make that change"

If the athlete has NOT confirmed the proposed change, continue the conversation normally.

============================================================
IMPORTANT
============================================================

The user is allowed to disagree with your recommendation.

If they disagree, discuss the alternative rather than immediately applying it.

The goal is to formulate the appropriate change together.

============================================================
FINAL JSON
============================================================

ONLY after the athlete has explicitly confirmed the proposed change should you output the complete updated protocol.

The updated protocol MUST:

- Maintain the exact same JSON schema.
- Preserve all existing information unless the athlete explicitly requested a change.
- Preserve all unrelated values.
- Keep habits as daily actionable behaviours.
- Keep dailyTargets fully populated.
- Keep the roadmap structure intact unless the athlete explicitly requested a structural change.

When producing the final update:

1. Briefly state what has been agreed.

2. Immediately afterwards output the COMPLETE updated JSON object inside:

\`\`\`json
{
  ...
}
\`\`\`

Do not make changes to localStorage yourself. The application will handle saving after the athlete reviews the proposed update.

============================================================
FORMATTING
============================================================

Keep normal coaching responses conversational and easy to read.

Use blank lines between sections.

Do not squash numbered points together.

Do not output JSON unless the athlete has explicitly confirmed the proposed change.`;
  };

  // ============================================================
  // OPEN / CLOSE
  // ============================================================

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    if (open && messages.length === 0) {
      setMessages([
        {
          role: "model",
          text:
            "Coach online. What are we recalibrating today?",
        },
      ]);
    }

    if (!open) {
      setPendingUpdate(null);
      setInput("");

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping || pendingUpdate) {
      return;
    }

    const apiKey =
      localStorage.getItem(
        "p35_gemini_api_key",
      ) || "";

    if (!apiKey) {
      toast.error("Gemini API key missing.");
      return;
    }

    const newMsgs: ChatMessage[] = [
      ...messages,
      {
        role: "user",
        text: text.trim(),
      },
    ];

    setMessages(newMsgs);
    resetTextarea();
    setIsTyping(true);

    const models = [
      "gemini-3.8-flash",
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
    ];

    let reply = "";
    let success = false;

    try {
      const contents = newMsgs.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      for (const model of models) {
        try {
          const url =
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [
                  {
                    text: getSystemPrompt(),
                  },
                ],
              },
              contents,
              generationConfig: {
                temperature: 0.7,
              },
            }),
          });

          const data = await res
            .json()
            .catch(() => ({}));

          if (res.ok) {
            const candidateText =
              data.candidates?.[0]?.content?.parts
                ?.map(
                  (part: any) =>
                    part.text || "",
                )
                .join("")
                .trim() || "";

            if (candidateText) {
              reply = candidateText;
              success = true;
              break;
            }
          }
        } catch (modelError) {
          console.warn(
            `Gemini model ${model} failed`,
            modelError,
          );
        }
      }

      if (!success) {
        throw new Error(
          "All Gemini model endpoints failed.",
        );
      }

      // ========================================================
      // CHECK FOR JSON UPDATE
      // ========================================================

      const jsonMatch = reply.match(
        /```json\s*([\s\S]*?)```/,
      );

      if (jsonMatch) {
        const jsonString =
          jsonMatch[1].trim();

        try {
          const updatedProfile =
            JSON.parse(jsonString);

          const explanation =
            reply
              .replace(
                /```json\s*[\s\S]*?```/g,
                "",
              )
              .trim();

          setPendingUpdate({
            profile: updatedProfile,
            explanation:
              explanation ||
              "The agreed protocol changes are ready for review.",
          });

          setMessages([
            ...newMsgs,
            {
              role: "model",
              text:
                "I've got the agreed changes ready. Review them below before applying anything.",
            },
          ]);

          return;
        } catch (error) {
          console.error(
            "Failed to parse AI JSON",
            error,
            reply,
          );

          toast.error(
            "The coach generated invalid protocol data. Ask it to try again.",
          );
        }
      }

      // ========================================================
      // NORMAL RESPONSE
      // ========================================================

      setMessages([
        ...newMsgs,
        {
          role: "model",
          text: reply,
        },
      ]);
    } catch (error) {
      console.error(
        "Gemini request failed:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to connect to Coach. Check your API key.",
      );
    } finally {
      setIsTyping(false);
    }
  };

  // ============================================================
  // APPLY UPDATE
  // ============================================================

  const applyPendingUpdate = () => {
    if (!pendingUpdate) {
      return;
    }

    try {
      localStorage.setItem(
        "ascension_user_profile",
        JSON.stringify(
          pendingUpdate.profile,
        ),
      );

      toast.success(
        "Protocol Recalibrated. Reloading Command Centre.",
      );

      setPendingUpdate(null);
      setIsOpen(false);

      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error(
        "Failed to save protocol",
        error,
      );

      toast.error(
        "Could not save the protocol changes.",
      );
    }
  };

  // ============================================================
  // CANCEL UPDATE
  // ============================================================

  const cancelPendingUpdate = () => {
    setPendingUpdate(null);

    setMessages((current) => [
      ...current,
      {
        role: "model",
        text:
          "No changes applied. The existing protocol remains untouched. What would you like to reconsider?",
      },
    ]);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
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
        className="
          w-[95vw]
          max-w-lg
          h-[100dvh]
          max-h-[100dvh]
          sm:h-[90dvh]
          sm:max-h-[90dvh]
          flex
          flex-col
          overflow-hidden
          p-0
          gap-0
        "
      >
        {/* ====================================================
            HEADER
        ==================================================== */}

        <DialogHeader className="shrink-0 px-4 pt-5 pb-4 pr-12 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Settings2 className="size-5" />
            AI Protocol Recalibration
          </DialogTitle>

          <DialogDescription>
            Collaborate with your coach before making any
            changes to the protocol.
          </DialogDescription>
        </DialogHeader>

        {/* ====================================================
            CHAT
        ==================================================== */}

        <div
          ref={scrollRef}
          className="
            flex-1
            min-h-0
            overflow-y-auto
            overscroll-contain
            space-y-4
            px-4
            py-4
          "
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`
                  max-w-[85%]
                  rounded-xl
                  px-4
                  py-3
                  text-sm
                  ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-2/60 text-foreground"
                  }
                `}
              >
                {message.role === "model" ? (
                  <FormattedMessage
                    text={message.text}
                  />
                ) : (
                  message.text
                )}
              </div>
            </div>
          ))}

          {/* ==================================================
              PENDING UPDATE
          ================================================== */}

          {pendingUpdate && (
            <div className="rounded-lg border border-primary/30 bg-surface-2/40 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Check className="size-4 text-primary" />

                <p className="text-sm font-semibold text-foreground">
                  Protocol change ready
                </p>
              </div>

              <div className="text-sm text-muted-foreground leading-relaxed">
                <FormattedMessage
                  text={
                    pendingUpdate.explanation
                  }
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={
                    cancelPendingUpdate
                  }
                >
                  <X className="size-4 mr-1.5" />
                  Don't Apply
                </Button>

                <Button
                  size="sm"
                  className="flex-1"
                  onClick={
                    applyPendingUpdate
                  }
                >
                  <Check className="size-4 mr-1.5" />
                  Apply Changes
                </Button>
              </div>
            </div>
          )}

          {/* ==================================================
              TYPING INDICATOR
          ================================================== */}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-surface-2/60 text-muted-foreground rounded-xl px-4 py-3 flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Coach is analyzing...
              </div>
            </div>
          )}
        </div>

        {/* ====================================================
            MESSAGE INPUT

            This intentionally mirrors the working Onboarding
            component so Android keyboard behaviour matches.
        ==================================================== */}

        <DialogFooter
          className="
            shrink-0
            p-0
            border-t
            border-border/40
          "
        >
          <div className="w-full pt-2 pb-4 px-4">
            <div
              className="
                flex
                items-end
                gap-2
                bg-surface-2/50
                border
                border-border
                rounded-xl
                p-2
                focus-within:border-primary
                transition-colors
              "
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                disabled={
                  isTyping ||
                  !!pendingUpdate
                }
                onChange={handleInputResize}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey
                  ) {
                    e.preventDefault();

                    sendMessage(input);
                  }
                }}
                placeholder={
                  pendingUpdate
                    ? "Apply or discard the proposed change above..."
                    : "Reply to coach (e.g. tweak calories, adjust phase)..."
                }
                className="
                  flex-1
                  resize-none
                  bg-transparent
                  text-sm
                  text-foreground
                  placeholder:text-muted-foreground/50
                  focus:outline-none
                  max-h-32
                  py-1.5
                  px-2
                  leading-relaxed
                  disabled:opacity-50
                "
              />

              <Button
                size="icon"
                className="size-9 shrink-0 mb-0.5 rounded-lg"
                onClick={() =>
                  sendMessage(input)
                }
                disabled={
                  !input.trim() ||
                  isTyping ||
                  !!pendingUpdate
                }
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

