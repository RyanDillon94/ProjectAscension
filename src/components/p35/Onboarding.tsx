import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Key, Send, Loader2, Dumbbell } from "lucide-react";
import { toast } from "sonner";

// ============================================================
// AI COACH SYSTEM PROMPT
// ============================================================

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

// ============================================================
// PREFERRED GEMINI MODELS
//
// These are only preferences.
// The app DOES NOT assume that the API key has access to them.
// It first asks Google's API which models are actually available.
// ============================================================

const PREFERRED_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

// ============================================================
// FORMATTED AI MESSAGE
// ============================================================

function FormattedMessage({ text }: { text: string }) {
  const cleanedText = text
    .replace(/---/g, "")
    .replace(/([.!?])\s+(\*\*\d+\.)/g, "$1\n\n$2")
    .replace(/\s+\*\s+(\*\*)/g, "\n\n• $1")
    .replace(/\s+-\s+(\*\*)/g, "\n\n• $1");

  const lines = cleanedText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const subItems = line
          .split(/(?=\*\*\d+\.)|\s+\*\s+(?=\*\*)/)
          .map(s => s.trim())
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
// ONBOARDING
// ============================================================

export function Onboarding({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [hevyKey, setHevyKey] = useState("");

  const [step, setStep] = useState<"keys" | "chat">("keys");

  const [messages, setMessages] = useState<
    {
      role: "user" | "model";
      text: string;
    }[]
  >([]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

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
  }, [messages, isTyping]);

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
  // START CHAT
  // ============================================================

  const handleStartChat = () => {
    const cleanApiKey = apiKey.replace(/\s+/g, "");
    const cleanHevyKey = hevyKey.replace(/\s+/g, "");

    if (!cleanApiKey) {
      toast.error("Gemini API key is required.");
      return;
    }

    localStorage.setItem(
      "p35_gemini_api_key",
      cleanApiKey,
    );

    if (cleanHevyKey) {
      localStorage.setItem(
        "p35_hevy_api_key",
        cleanHevyKey,
      );
    }

    setStep("chat");

    sendMessage(
      "Hello Coach. Let's map out my 12-month protocol.",
    );
  };

  // ============================================================
  // DISCOVER AVAILABLE GEMINI MODELS
  // ============================================================

  const getAvailableModels = async (
    activeKey: string,
  ): Promise<string[]> => {
    const availableModels: {
      baseModelId?: string;
      name?: string;
      supportedGenerationMethods?: string[];
    }[] = [];

    let pageToken = "";

    // Google returns up to 50 models by default.
    // We support pagination as well, so this isn't dependent
    // on the current number of available models.
    do {
      const query = new URLSearchParams({
        key: activeKey,
        pageSize: "1000",
      });

      if (pageToken) {
        query.set("pageToken", pageToken);
      }

      const listUrl =
        `https://generativelanguage.googleapis.com/v1beta/models?${query.toString()}`;

      const listRes = await fetch(listUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const listData = await listRes
        .json()
        .catch(() => ({}));

      if (!listRes.ok) {
        throw new Error(
          listData.error?.message ||
            `Unable to list Gemini models (HTTP ${listRes.status}).`,
        );
      }

      if (Array.isArray(listData.models)) {
        availableModels.push(...listData.models);
      }

      pageToken = listData.nextPageToken || "";
    } while (pageToken);

    // ==========================================================
    // ONLY KEEP MODELS THAT SUPPORT generateContent
    // ==========================================================

    const modelIds = availableModels
      .filter(model =>
        Array.isArray(
          model.supportedGenerationMethods,
        ),
      )
      .filter(model =>
        model.supportedGenerationMethods!.includes(
          "generateContent",
        ),
      )
      .map(model => {
        // Google provides baseModelId specifically for
        // generation requests.
        //
        // Example:
        // name = models/gemini-3.8-flash
        // baseModelId = gemini-3.8-flash

        if (model.baseModelId) {
          return model.baseModelId;
        }

        if (model.name) {
          return model.name.replace(/^models\//, "");
        }

        return "";
      })
      .filter(Boolean);

    // Remove duplicates.
    return Array.from(new Set(modelIds));
  };

  // ============================================================
  // SORT MODELS
  // ============================================================

  const rankModels = (
    availableModels: string[],
  ): string[] => {
    const preferred = PREFERRED_MODELS.filter(model =>
      availableModels.includes(model),
    );

    const otherModels = availableModels.filter(
      model => !PREFERRED_MODELS.includes(model),
    );

    return [
      ...preferred,
      ...otherModels,
    ];
  };

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) {
      return;
    }

    const rawKey =
      localStorage.getItem(
        "p35_gemini_api_key",
      ) || "";

    const activeKey = rawKey.replace(/\s+/g, "");

    if (!activeKey) {
      toast.error("Gemini API key missing.");
      setStep("keys");
      return;
    }

    // ==========================================================
    // ADD USER MESSAGE
    // ==========================================================

    const newMsgs = [
      ...messages,
      {
        role: "user" as const,
        text,
      },
    ];

    setMessages(newMsgs);
    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setIsTyping(true);

    let reply = "";
    let success = false;

    let lastErrorMsg =
      "Gemini request failed.";

    try {
      // ========================================================
      // BUILD CONVERSATION HISTORY
      // ========================================================

      const contents = newMsgs.map(m => ({
        role: m.role,
        parts: [
          {
            text: m.text,
          },
        ],
      }));

      // ========================================================
      // DISCOVER MODELS AVAILABLE TO THIS API KEY
      // ========================================================

      console.log(
        "Discovering Gemini models available to API key...",
      );

      const availableModels =
        await getAvailableModels(activeKey);

      console.log(
        "Gemini models supporting generateContent:",
        availableModels,
      );

      if (availableModels.length === 0) {
        throw new Error(
          "This Gemini API key has no available models that support generateContent.",
        );
      }

      // ========================================================
      // RANK MODELS
      // ========================================================

      const rankedModels =
        rankModels(availableModels);

      console.log(
        "Gemini fallback order:",
        rankedModels,
      );

      // ========================================================
      // TRY EACH AVAILABLE MODEL
      // ========================================================

      for (const model of rankedModels) {
        try {
          console.log(
            `Trying Gemini model: ${model}`,
          );

          const url =
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

          const res = await fetch(url, {
            method: "POST",

            headers: {
              "Content-Type": "application/json",

              // Use Google's recommended API-key header
              // instead of putting the key into the URL.
              "x-goog-api-key": activeKey,
            },

            body: JSON.stringify({
              systemInstruction: {
                parts: [
                  {
                    text: SYSTEM_PROMPT,
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

          // ====================================================
          // SUCCESS
          // ====================================================

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

              console.log(
                `Gemini success using ${model}`,
              );

              break;
            }

            lastErrorMsg =
              `Model ${model} returned an empty response.`;

            console.warn(
              lastErrorMsg,
            );

            continue;
          }

          // ====================================================
          // MODEL FAILED
          // ====================================================

          lastErrorMsg =
            data.error?.message ||
            `HTTP ${res.status} from ${model}`;

          console.warn(
            `Gemini model ${model} failed:`,
            lastErrorMsg,
          );

        } catch (modelErr) {
          lastErrorMsg =
            modelErr instanceof Error
              ? modelErr.message
              : `Unknown error from ${model}`;

          console.warn(
            `Gemini model ${model} threw an error:`,
            lastErrorMsg,
          );
        }
      }

      // ========================================================
      // ALL MODELS FAILED
      // ========================================================

      if (!success) {
        throw new Error(
          `All available Gemini models failed. Last error: ${lastErrorMsg}`,
        );
      }

      // ========================================================
      // CHECK FOR FINAL JSON PROTOCOL
      // ========================================================

      const codeMarker =
        "`" + "`" + "`";

      if (
        reply.includes(
          `${codeMarker}json`,
        ) &&
        reply.includes(codeMarker)
      ) {
        const jsonString = reply
          .split(
            `${codeMarker}json`,
          )[1]
          .split(codeMarker)[0]
          .trim();

        try {
          const profile =
            JSON.parse(jsonString);

          // ====================================================
          // PRESERVE API KEYS
          // ====================================================

          const currentApiKey =
            localStorage.getItem(
              "p35_gemini_api_key",
            );

          const currentHevyKey =
            localStorage.getItem(
              "p35_hevy_api_key",
            );

          // ====================================================
          // CLEAR OLD SETUP DATA
          // ====================================================

          localStorage.clear();

          // ====================================================
          // RESTORE API KEYS
          // ====================================================

          if (currentApiKey) {
            localStorage.setItem(
              "p35_gemini_api_key",
              currentApiKey,
            );
          }

          if (currentHevyKey) {
            localStorage.setItem(
              "p35_hevy_api_key",
              currentHevyKey,
            );
          }

          // ====================================================
          // SAVE PROFILE
          // ====================================================

          localStorage.setItem(
            "ascension_user_profile",
            JSON.stringify(profile),
          );

          localStorage.setItem(
            "p35_setup_complete",
            "true",
          );

          toast.success(
            "Protocol Locked. Initiating Command Centre.",
          );

          onComplete();

          return;

        } catch (e) {
          console.error(
            "Failed to parse AI JSON",
            e,
            reply,
          );

          toast.error(
            "AI generated invalid data. Tell it to try again.",
          );
        }
      }

      // ========================================================
      // NORMAL COACH RESPONSE
      // ========================================================

      setMessages([
        ...newMsgs,
        {
          role: "model",
          text: reply,
        },
      ]);

    } catch (err) {
      // ========================================================
      // REQUEST FAILURE
      // ========================================================

      console.error(
        "Gemini request failed:",
        err,
      );

      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to connect to Coach. Check your API key.",
      );

    } finally {
      setIsTyping(false);
    }
  };

  // ============================================================
  // API KEY SCREEN
  // ============================================================

  if (step === "keys") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="w-full max-w-md space-y-8">

          <div className="text-center space-y-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/20 text-primary mb-4">
              <Key className="size-6" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Ignition Sequence
            </h1>

            <p className="text-sm text-muted-foreground">
              Provide your API keys to bring the AI Coach online.
            </p>
          </div>

          <div className="space-y-4">

            {/* ==================================================
                GEMINI API KEY
                ================================================== */}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">

                <label className="text-xs font-semibold text-primary">
                  Gemini API Key
                </label>

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
                onChange={e =>
                  setApiKey(e.target.value)
                }
                placeholder="AIzaSy..."
                className="w-full rounded-md border border-border bg-surface-2/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {/* ==================================================
                HEVY API KEY
                ================================================== */}

            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">

                <label className="text-xs font-semibold text-primary">
                  Hevy API Key (Optional)
                </label>

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
                onChange={e =>
                  setHevyKey(e.target.value)
                }
                className="w-full rounded-md border border-border bg-surface-2/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {/* ==================================================
                START BUTTON
                ================================================== */}

            <Button
              className="w-full h-12 mt-6 font-bold"
              onClick={handleStartChat}
            >
              Boot AI Coach
            </Button>

          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // COACH CHAT SCREEN
  // ============================================================

  return (
    <div className="flex h-screen flex-col p-4 max-w-xl mx-auto animate-in slide-in-from-right-4">

      {/* ========================================================
          HEADER
          ======================================================== */}

      <div className="py-4 flex items-center gap-3 border-b border-border/40">

        <Dumbbell className="size-5 text-primary" />

        <div>
          <h2 className="text-sm font-bold">
            Coach Setup Protocol
          </h2>

          <p className="text-xs text-muted-foreground">
            Collaborate with your coach to build your roadmap.
          </p>
        </div>

      </div>

      {/* ========================================================
          CHAT
          ======================================================== */}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 py-4 pr-2"
      >

        {messages
          .filter(
            m =>
              !m.text.includes(
                "Hello Coach",
              ),
          )
          .map((m, i) => (

            <div
              key={i}
              className={`flex ${
                m.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >

              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-2/60 text-foreground"
                }`}
              >

                {m.role === "model" ? (
                  <FormattedMessage
                    text={m.text}
                  />
                ) : (
                  m.text
                )}

              </div>

            </div>

          ))}

        {/* ======================================================
            TYPING INDICATOR
            ====================================================== */}

        {isTyping && (
          <div className="flex justify-start">

            <div className="bg-surface-2/60 text-muted-foreground rounded-xl px-4 py-3 flex items-center gap-2 text-sm">

              <Loader2 className="size-4 animate-spin" />

              Coach is thinking...

            </div>

          </div>
        )}

      </div>

      {/* ========================================================
          MESSAGE INPUT
          ======================================================== */}

      <div className="pt-2 pb-4">

        <div className="flex items-end gap-2 bg-surface-2/50 border border-border rounded-xl p-2 focus-within:border-primary transition-colors">

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleInputResize}
            onKeyDown={e => {
              if (
                e.key === "Enter" &&
                !e.shiftKey
              ) {
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
            onClick={() =>
              sendMessage(input)
            }
            disabled={
              !input.trim() ||
              isTyping
            }
          >
            <Send className="size-4" />
          </Button>

        </div>

      </div>

    </div>
  );
}