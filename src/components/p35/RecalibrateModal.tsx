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

  /*
   * ============================================================
   * CONFIRMATION STATE
   * ============================================================
   *
   * The coach must propose a change and explicitly ask for
   * confirmation before JSON is allowed to update the profile.
   */
  const [awaitingConfirmation, setAwaitingConfirmation] =
    useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /*
   * ============================================================
   * KEYBOARD / VISUAL VIEWPORT HANDLING
   * ============================================================
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
   * Make sure the input remains visible when Android's
   * keyboard opens.
   */
  const handleInputFocus = () => {
    setTimeout(() => {
      inputRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 250);
  };

  /*
   * ============================================================
   * SYSTEM PROMPT
   * ============================================================
   *
   * This deliberately makes the AI act as a coach rather than
   * a passive JSON editor.
   */
  const getSystemPrompt = () => {
    const currentProfile =
      localStorage.getItem("ascension_user_profile") || "{}";

    return `You are the Project Ascension performance coach.

Your job is NOT to blindly execute whatever change the user asks for.

You are helping the user intelligently recalibrate their existing 12-month protocol.

Here is their CURRENT protocol configuration (JSON):

${currentProfile}

============================================================
CORE COACHING PRINCIPLE
============================================================

When the user reports a problem or asks for a change, first understand the underlying problem and determine which protocol metric or intervention should actually change.

The user's requested solution is a PROPOSAL, not automatically the correct solution.

For example:

User:
"I've gained weight. Drop my calories."

Do NOT immediately change calories.

Instead, discuss whether calories are actually the appropriate lever.

Consider relevant factors such as:

- Current calorie target
- Recent weight trend
- Time period involved
- Whether the change is likely meaningful
- Adherence
- Activity / steps
- Training
- Other relevant protocol metrics
- Whether maintaining the current plan and collecting more data would be more appropriate
- Whether a small adjustment would be preferable to a large adjustment

The goal is to identify the most appropriate metric and the smallest sensible intervention that addresses the actual problem.

============================================================
MANDATORY COACHING WORKFLOW
============================================================

Every requested protocol change must follow this process:

STEP 1 — UNDERSTAND

Clarify what the user is actually trying to achieve or what problem they are experiencing.

STEP 2 — ASSESS

Use the current protocol configuration and the information provided in the conversation to determine what matters.

Do not invent data that is not available.

If important information is missing, ask for it.

STEP 3 — IDENTIFY THE METRIC

Explain which metric or protocol component you think should change, if any.

The metric might be calories, protein, steps, training frequency, phase dates, habit structure, running volume, recovery target, etc.

It does NOT have to be the metric the user originally requested.

STEP 4 — PROPOSE

Give a specific proposed change.

For example:

"Your current target is 2,400 kcal. Based on what you've told me, I'd propose reducing this modestly to 2,300 kcal rather than making a larger cut."

Explain briefly why.

STEP 5 — CONFIRM

You MUST explicitly ask the user whether they want to proceed with that exact change.

For example:

"Do you want me to apply that change?"

OR:

"Are you happy for me to update the protocol to 2,300 kcal?"

STOP HERE.

Do NOT output JSON yet.

============================================================
CONFIRMATION RULE
============================================================

The user must explicitly confirm the proposed change before you generate JSON.

Valid examples include:

"yes"

"yes, do it"

"go ahead"

"confirm"

"apply it"

"that's fine"

"do that"

"let's go with that"

If the user disagrees, changes the proposed value, asks another question, or suggests a different approach, continue the coaching discussion.

Do NOT generate JSON until the user has explicitly confirmed the CURRENT proposal.

If the user says something ambiguous such as:

"maybe"

"what do you think?"

"I'm not sure"

"could we?"

then continue discussing. That is NOT confirmation.

============================================================
VERY IMPORTANT — NO PREMATURE JSON
============================================================

NEVER output the updated JSON merely because the user requested a change.

NEVER output JSON while proposing a change.

NEVER output JSON while asking for confirmation.

NEVER treat the user's original request as confirmation.

The sequence must be:

USER REQUEST
→ DISCUSSION
→ PROPOSED CHANGE
→ EXPLICIT CONFIRMATION
→ UPDATED JSON

============================================================
AFTER CONFIRMATION
============================================================

ONLY after the user explicitly confirms the CURRENT proposed change:

1. Apply the agreed change.
2. Preserve every other existing value.
3. Maintain the EXACT SAME JSON schema as the current profile.
4. Do not remove existing data unless explicitly agreed.
5. Habits must remain daily actionable behaviours, not macro targets.
6. Output the completely updated raw JSON object wrapped in \`\`\`json tags.
7. After the JSON, say NOTHING else.

============================================================
MULTIPLE CHANGES
============================================================

If the user wants several changes, do NOT silently bundle them into an update.

Discuss the changes and formulate the complete proposed adjustment.

Then clearly summarise what will change.

For example:

**Proposed recalibration**

**Calories:** 2,400 → 2,300 kcal

**Steps:** remain at 12,500/day

**Training:** unchanged

Then ask:

"Are you happy for me to apply all of those changes?"

Only after confirmation should you output the JSON.

============================================================
FORMATTING
============================================================

Never squash lists, numbers, or section headers onto the same line.

Every section header, numbered point, and bullet point MUST be on its own line with a blank line between sections.

Keep normal coaching responses concise and direct.

============================================================
CURRENT PROFILE
============================================================

The current profile is authoritative for existing values and schema.

Do not invent missing profile fields.

Do not change unrelated values.

The user's explicit confirmation applies ONLY to the specific proposal currently being discussed.`;
  };

  /*
   * ============================================================
   * CONFIRMATION DETECTION
   * ============================================================
   *
   * This is a second layer of protection outside the AI prompt.
   * Even if the AI accidentally produces JSON early, the app
   * will not save it unless the UI is already waiting for a
   * confirmation and the user's latest message is affirmative.
   */
  const isExplicitConfirmation = (text: string) => {
    const normalised = text
      .trim()
      .toLowerCase()
      .replace(/[.!?,]+$/g, "");

    const confirmations = [
      "yes",
      "yes do it",
      "yes, do it",
      "go ahead",
      "confirm",
      "confirmed",
      "apply it",
      "apply that",
      "do it",
      "do that",
      "that's fine",
      "that is fine",
      "sounds good",
      "sounds good to me",
      "lets go with that",
      "let's go with that",
      "go with that",
      "i agree",
      "agreed",
      "make the change",
      "make that change",
      "update it",
      "update that",
      "proceed",
    ];

    return confirmations.includes(normalised);
  };

  /*
   * Detect whether the coach has actually reached the point
   * where it is asking the user to approve a proposal.
   */
  const isAskingForConfirmation = (text: string) => {
    const lower = text.toLowerCase();

    const confirmationPhrases = [
      "do you want me to",
      "are you happy for me to",
      "would you like me to",
      "shall i apply",
      "should i apply",
      "want me to apply",
      "happy for me to apply",
      "shall i make that change",
      "do you want me to apply",
      "are you happy with that",
      "does that sound good",
      "would you like to proceed",
      "shall we go with that",
      "do you agree",
    ];

    return confirmationPhrases.some((phrase) =>
      lower.includes(phrase),
    );
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
      setAwaitingConfirmation(false);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const apiKey = localStorage.getItem("p35_gemini_api_key");

    if (!apiKey) {
      toast.error("Gemini API key missing.");
      return;
    }

    const userIsConfirming =
      awaitingConfirmation && isExplicitConfirmation(text);

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

      /*
       * ========================================================
       * JSON UPDATE GATE
       * ========================================================
       *
       * JSON can ONLY be applied when:
       *
       * 1. The coach was waiting for confirmation.
       * 2. The user's latest message is an explicit confirmation.
       * 3. The AI actually returned valid JSON.
       *
       * This protects the profile even if the model ignores part
       * of the system prompt.
       */
      const containsJson =
        reply.includes("```json") &&
        reply.includes("```");

      if (
        containsJson &&
        awaitingConfirmation &&
        userIsConfirming
      ) {
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

          setAwaitingConfirmation(false);
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

      /*
       * ========================================================
       * SAFETY NET FOR PREMATURE JSON
       * ========================================================
       *
       * If Gemini somehow outputs JSON before confirmation,
       * DO NOT save it.
       *
       * Instead tell the coach that it needs to continue the
       * discussion. The JSON is not written to localStorage.
       */
      if (containsJson && !userIsConfirming) {
        console.warn(
          "Blocked premature protocol update: explicit confirmation was not given.",
        );

        setMessages([
          ...newMsgs,
          {
            role: "model",
            text:
              "I haven't applied that change yet. Let's first agree on the exact adjustment and confirm it before I update your protocol.",
          },
        ]);

        setAwaitingConfirmation(false);

        return;
      }

      /*
       * Normal conversational response.
       */
      setMessages([
        ...newMsgs,
        {
          role: "model",
          text: reply,
        },
      ]);

      /*
       * Only enter the confirmation state when the coach has
       * actually proposed something and asked the user to approve
       * it.
       */
      setAwaitingConfirmation(
        isAskingForConfirmation(reply),
      );
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
   * ============================================================
   * DIALOG HEIGHT
   * ============================================================
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
              placeholder="E.g., 'I've gained weight...'"
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

