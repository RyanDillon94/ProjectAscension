import { useEffect, useRef, useState } from "react";
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
  RotateCcw,
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
    .replace(/---/g, "")
    .replace(
      /([.!?])\s+(\*\*\d+\.)/g,
      "$1\n\n$2"
    )
    .replace(
      /\s+\*\s+(\*\*)/g,
      "\n\n• $1"
    )
    .replace(
      /\s+-\s+(\*\*)/g,
      "\n\n• $1"
    );

  const lines = cleanedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const subItems = line
          .split(
            /(?=\*\*\d+\.)|\s+\*\s+(?=\*\*)/
          )
          .map((s) => s.trim())
          .filter(Boolean);

        return (
          <div
            key={idx}
            className="space-y-1.5"
          >
            {subItems.map(
              (sub, sIdx) => {
                const isNumberedHeader =
                  /^\*\*\d+\./.test(
                    sub
                  );

                const isBullet =
                  sub.startsWith("* ") ||
                  sub.startsWith("- ") ||
                  sub.startsWith("• ");

                const cleanSub =
                  sub.replace(
                    /^[*•–-\s]+/,
                    ""
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
                        .split(
                          /(\*\*[^*]+\*\*)/g
                        )
                        .map(
                          (
                            part,
                            i
                          ) =>
                            part.startsWith(
                              "**"
                            ) &&
                            part.endsWith(
                              "**"
                            ) ? (
                              <strong
                                key={i}
                                className="text-primary font-semibold"
                              >
                                {part.slice(
                                  2,
                                  -2
                                )}
                              </strong>
                            ) : (
                              <span
                                key={i}
                              >
                                {part}
                              </span>
                            )
                        )}
                    </span>
                  </p>
                );
              }
            )}
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
// MAIN COMPONENT
// ============================================================

export function RecalibrateModal() {
  const [isOpen, setIsOpen] =
    useState(false);

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [input, setInput] =
    useState("");

  const [isTyping, setIsTyping] =
    useState(false);

  const [
    pendingUpdate,
    setPendingUpdate,
  ] = useState<PendingUpdate | null>(
    null
  );

  const scrollRef =
    useRef<HTMLDivElement>(null);

  const inputRef =
    useRef<HTMLTextAreaElement>(null);

  // ==========================================================
  // KEEP CHAT SCROLLED TO BOTTOM
  // ==========================================================

  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current!.scrollTop =
          scrollRef.current!.scrollHeight;
      });
    }
  }, [
    messages,
    isTyping,
    pendingUpdate,
  ]);

  // ==========================================================
  // SYSTEM PROMPT
  // ==========================================================

  const getSystemPrompt = () => {
    const currentProfile =
      localStorage.getItem(
        "ascension_user_profile"
      ) || "{}";

    return `
You are the Project Ascension performance coach.

The user is recalibrating an existing 12-month protocol.

CURRENT PROTOCOL CONFIGURATION:
${currentProfile}

Your job is NOT to blindly obey a requested change.

The user may say things like:

- "I've gained weight."
- "Drop my calories."
- "I'm not losing fast enough."
- "I want more running."
- "My habits aren't working."
- "Move Phase 2."
- "Increase my steps."

These statements are NOT automatically instructions to modify the protocol.

============================================================
CORE DECISION PROCESS
============================================================

Before changing anything, discuss the situation with the user.

You must first determine:

1. What problem are we actually trying to solve?

2. What evidence do we have?

3. Is the requested metric actually the correct metric to change?

4. Are there other explanations that should be considered?

5. What is the smallest sensible protocol adjustment that addresses
   the actual problem?

For example:

If the user says:

"I've gained weight."

Do NOT immediately reduce calories.

Instead discuss things such as:

- Is this a sustained trend or a short-term fluctuation?
- What is the recent weight trend?
- Has adherence changed?
- Has activity changed?
- Could water/glycogen/sodium explain some of the change?
- Is the current rate of loss actually appropriate?
- Is the goal fat loss, performance, adherence, or something else?

Then determine which metric should actually be adjusted.

Potential metrics include, but are not limited to:

- calorie target
- protein target
- fibre target
- daily steps
- cardio volume
- training frequency
- running volume
- recovery target
- habit
- phase dates
- phase duration
- bodyweight target
- target rate of weight change

Do not assume calories are the correct lever.

============================================================
NO PREMATURE UPDATES
============================================================

You MUST discuss and agree the proposed change with the user before
generating updated JSON.

Do NOT output JSON merely because the user requested a change.

Instead, explain the proposed adjustment and ask for confirmation.

For example:

"Based on what you've told me, I don't think calories are the first
thing we should change. The more useful metric to adjust is your
weekly average step target.

I'd propose moving it from 10,000 to 12,000 for the next two weeks,
then reassessing the trend.

Are you happy with that?"

Then WAIT.

The user must explicitly confirm.

Accept confirmations such as:

- yes
- yes, do it
- confirm
- confirmed
- go ahead
- apply it
- sounds good
- that's fine
- make the change
- do that

If the user has NOT explicitly confirmed the agreed change, DO NOT
output JSON.

============================================================
FINAL UPDATE
============================================================

ONLY after explicit confirmation should you output:

1. A short confirmation sentence.
2. The completely updated raw JSON object wrapped in:

\`\`\`json
{
  ...
}
\`\`\`

Do not output anything after the JSON.

============================================================
JSON RULES
============================================================

1. Maintain the EXACT SAME JSON SCHEMA as the current profile.

2. Do not omit existing data unless the user explicitly asked to
   remove it.

3. Preserve all unrelated protocol settings.

4. Only modify the agreed changes.

5. Habits must remain daily actionable behaviours.

Examples:

GOOD:
"10 mins mobility"
"Read 10 pages"
"Walk for 20 minutes"
"Prepare tomorrow's meals"

BAD:
"220g protein"
"2000 calories"
"Hit macro target"

6. Do not invent profile fields.

============================================================
FORMATTING
============================================================

Never squash lists, numbers, or section headers onto the same line.

Every section header, numbered point and bullet point must be on its
own line separated by a blank line.

Be concise and conversational.

Do not overwhelm the user with unnecessary analysis.

============================================================
IMPORTANT
============================================================

The user is making a protocol decision with you.

Your role is to reason through the adjustment with them rather than
acting as a command parser.

Do not change the protocol simply because the user asks for a specific
metric to be changed.

First determine whether that metric is actually the appropriate lever.

Then agree the change.

Then wait for confirmation.

Only after confirmation should you produce the JSON.
`;
  };

  // ==========================================================
  // OPEN / CLOSE
  // ==========================================================

  const handleOpenChange = (
    open: boolean
  ) => {
    setIsOpen(open);

    if (open) {
      if (messages.length === 0) {
        setMessages([
          {
            role: "model",
            text:
              "Coach online. Tell me what has changed and what you're thinking about adjusting. We'll work out what actually needs changing before touching the protocol.",
          },
        ]);
      }

      setPendingUpdate(null);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  };

  // ==========================================================
  // APPLY CONFIRMED UPDATE
  // ==========================================================

  const applyPendingUpdate = () => {
    if (!pendingUpdate) {
      return;
    }

    try {
      localStorage.setItem(
        "ascension_user_profile",
        JSON.stringify(
          pendingUpdate.profile
        )
      );

      toast.success(
        "Protocol Recalibrated. Reloading Command Centre."
      );

      setPendingUpdate(null);
      setIsOpen(false);

      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (error) {
      console.error(
        "Failed to save recalibrated profile:",
        error
      );

      toast.error(
        "Failed to save the updated protocol."
      );
    }
  };

  // ==========================================================
  // CANCEL PENDING UPDATE
  // ==========================================================

  const cancelPendingUpdate = () => {
    setPendingUpdate(null);

    setMessages((prev) => [
      ...prev,
      {
        role: "model",
        text:
          "No problem. I haven't changed anything. We can keep discussing it or take a different approach.",
      },
    ]);
  };

  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  const sendMessage = async (
    text: string
  ) => {
    const trimmedText =
      text.trim();

    if (!trimmedText) {
      return;
    }

    // --------------------------------------------------------
    // Do not allow another request while an update is waiting
    // for the user's final approval.
    // --------------------------------------------------------

    if (pendingUpdate) {
      toast.error(
        "Review or cancel the proposed update first."
      );

      return;
    }

    const apiKey =
      localStorage.getItem(
        "p35_gemini_api_key"
      );

    if (!apiKey) {
      toast.error(
        "Gemini API key missing."
      );

      return;
    }

    const newMsgs: ChatMessage[] =
      [
        ...messages,
        {
          role: "user",
          text: trimmedText,
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
      const contents =
        newMsgs.map((m) => ({
          role: m.role,
          parts: [
            {
              text: m.text,
            },
          ],
        }));

      for (const model of models) {
        const url =
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const res =
          await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
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
            }),
          });

        if (res.ok) {
          const data =
            await res.json();

          reply =
            data.candidates?.[0]
              ?.content?.parts?.[0]
              ?.text || "";

          success = true;

          break;
        }
      }

      if (!success) {
        throw new Error(
          "All model endpoints failed."
        );
      }

      // ======================================================
      // CHECK FOR FINAL JSON
      // ======================================================

      const hasJson =
        reply.includes(
          "```json"
        ) &&
        reply.includes(
          "```"
        );

      if (hasJson) {
        const jsonMatch =
          reply.match(
            /```json\s*([\s\S]*?)\s*```/i
          );

        if (jsonMatch) {
          const jsonString =
            jsonMatch[1].trim();

          try {
            const updatedProfile =
              JSON.parse(
                jsonString
              );

            if (
              !updatedProfile ||
              typeof updatedProfile !==
                "object" ||
              Array.isArray(
                updatedProfile
              )
            ) {
              throw new Error(
                "Invalid profile object."
              );
            }

            // ------------------------------------------------
            // IMPORTANT:
            //
            // DO NOT SAVE IT YET.
            //
            // The user gets one final human confirmation in
            // the UI.
            // ------------------------------------------------

            const explanation =
              reply
                .replace(
                  /```json[\s\S]*?```/i,
                  ""
                )
                .trim();

            setPendingUpdate({
              profile:
                updatedProfile,
              explanation:
                explanation ||
                "The agreed protocol changes are ready to apply.",
            });

            setMessages([
              ...newMsgs,
              {
                role: "model",
                text:
                  "I've got the agreed changes ready. Please review them below before I apply anything.",
              },
            ]);

            return;
          } catch (error) {
            console.error(
              "Failed to parse AI JSON:",
              error
            );

            toast.error(
              "The Coach generated invalid protocol data. Tell it to try again."
            );

            setMessages([
              ...newMsgs,
              {
                role: "model",
                text:
                  "I reached the update stage, but the protocol data wasn't valid. Nothing has been changed. Please ask me to try the update again.",
              },
            ]);

            return;
          }
        }
      }

      // ======================================================
      // NORMAL CHAT RESPONSE
      // ======================================================

      setMessages([
        ...newMsgs,
        {
          role: "model",
          text: reply,
        },
      ]);
    } catch (err) {
      console.error(
        "Coach connection error:",
        err
      );

      toast.error(
        "Failed to connect to Coach. Check your API key."
      );
    } finally {
      setIsTyping(false);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // ==========================================================
  // ENTER KEY
  // ==========================================================

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();

      sendMessage(input);
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <Dialog
      open={isOpen}
      onOpenChange={
        handleOpenChange
      }
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
          max-w-lg
          w-[95vw]
          h-[min(720px,90dvh)]
          max-h-[90dvh]
          flex
          flex-col
          overflow-hidden
          p-0
        "
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <DialogHeader className="shrink-0 p-5 pb-3 pr-12">
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Settings2 className="size-5 shrink-0" />
            AI Protocol Recalibration
          </DialogTitle>

          <DialogDescription>
            Discuss the change with Coach before
            anything is applied to your protocol.
          </DialogDescription>
        </DialogHeader>

        {/* ==================================================
            CHAT
        ================================================== */}

        <div className="flex-1 min-h-0 px-5">
          <div
            ref={scrollRef}
            className="
              h-full
              overflow-y-auto
              rounded-lg
              border
              border-border
              bg-surface-2/20
              p-3
              space-y-4
              overscroll-contain
            "
          >
            {messages.map(
              (m, i) => (
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
                      rounded-lg
                      px-3
                      py-2.5
                      text-sm
                      break-words
                      ${
                        m.role ===
                        "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border border-border text-foreground"
                      }
                    `}
                  >
                    {m.role ===
                    "model" ? (
                      <FormattedMessage
                        text={
                          m.text
                        }
                      />
                    ) : (
                      <span className="whitespace-pre-wrap">
                        {
                          m.text
                        }
                      </span>
                    )}
                  </div>
                </div>
              )
            )}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-background border border-border text-muted-foreground rounded-lg px-3 py-2.5 flex items-center gap-2 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Coach is thinking...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ==================================================
            PENDING UPDATE CONFIRMATION
        ================================================== */}

        {pendingUpdate && (
          <div className="shrink-0 px-5 pt-3">
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 shrink-0">
                  <Settings2 className="size-4 text-primary" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    Protocol change ready
                  </p>

                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    The Coach has finished
                    discussing the change.
                    Nothing has been saved yet.
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-border bg-background p-3 max-h-32 overflow-y-auto">
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {pendingUpdate.explanation}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={
                    cancelPendingUpdate
                  }
                >
                  <X className="size-4" />
                  Don't Apply
                </Button>

                <Button
                  className="flex-1 gap-2"
                  onClick={
                    applyPendingUpdate
                  }
                >
                  <Check className="size-4" />
                  Apply Changes
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================
            INPUT
        ================================================== */}

        <DialogFooter className="shrink-0 p-5 pt-3">
          <div className="w-full flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) =>
                setInput(
                  e.target.value
                )
              }
              onKeyDown={
                handleKeyDown
              }
              disabled={
                isTyping ||
                !!pendingUpdate
              }
              rows={1}
              placeholder={
                pendingUpdate
                  ? "Review the proposed change above..."
                  : "Tell Coach what has changed..."
              }
              className="
                flex-1
                min-h-[44px]
                max-h-28
                resize-none
                rounded-lg
                border
                border-border
                bg-surface-2/40
                px-3
                py-2.5
                text-sm
                text-foreground
                placeholder:text-muted-foreground/50
                focus:border-primary
                focus:outline-none
                disabled:opacity-60
              "
            />

            <Button
              size="icon"
              className="size-11 shrink-0 rounded-lg"
              onClick={() =>
                sendMessage(
                  input
                )
              }
              disabled={
                !input.trim() ||
                isTyping ||
                !!pendingUpdate
              }
              aria-label="Send message"
            >
              {isTyping ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

