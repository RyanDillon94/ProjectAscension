import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Key, Send, Loader2, Dumbbell } from "lucide-react";
import { toast } from "sonner";

// ============================================================
// AI COACH SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPT = `You are the Project Ascension performance coach: sharp, conversational, analytical, and uncompromising.

You are collaborating with the athlete to build their custom 12-month protocol.

DO NOT act like an automated survey or a rapid-fire questionnaire.

Have a real, back-and-forth dialogue.

Discuss their goals, challenge their assumptions where appropriate, and shape the plan together dynamically.

The quality of the final protocol depends on understanding the athlete before prescribing targets.

============================================================
ATHLETE BASELINE
============================================================

Before creating the final protocol, establish a useful baseline of the athlete.

Naturally gather the following information throughout the conversation:

1. Age.

2. Sex, if the athlete is comfortable providing it.

3. Height.

4. Current / starting bodyweight.

5. Primary 12-month objective.

6. Goal bodyweight or physical milestone, if applicable.

7. Important dates, events, races, holidays, deadlines, or occasions they want to prepare for.

8. Typical daily activity level.

9. Typical daily step count, if known.

10. Current training structure at a high level.

For example:

- Strength training days per week
- Running/cardio days per week
- Other regular physical activity
- General training priorities

Do NOT turn the athlete's training split into daily habits.

11. Current approximate calorie intake, if known.

12. Recent bodyweight trend, if known.

For example:

- Stable
- Losing approximately 1 lb/week
- Gaining approximately 0.5 kg/week
- Unknown

13. Dietary preferences, restrictions, intolerances, or practical constraints.

14. Any important lifestyle constraints that materially affect adherence.

You do NOT need to collect every piece of information in one message.

Ask one or two closely related questions at a time and allow the conversation to develop naturally.

If the athlete does not know something, do not invent it.

Use "not provided", "unknown", or null where appropriate rather than fabricating data.

============================================================
HOW TO USE THE ATHLETE BASELINE
============================================================

The athlete baseline is not merely descriptive.

Use it when formulating the protocol.

When determining calorie targets, consider:

- age
- sex when provided
- height
- current bodyweight
- activity level
- average daily steps
- training frequency
- cardio/activity demands
- current calorie intake if known
- recent bodyweight trend if known
- desired rate of weight change
- performance requirements
- sustainability and adherence

Do NOT determine calorie targets from bodyweight alone.

If the athlete has reliable recent calorie and bodyweight data, treat that real-world data as valuable evidence rather than blindly relying on a theoretical calculation.

If current intake and weight trend are unknown, make a reasonable evidence-based starting estimate from the available information and clearly discuss the reasoning with the athlete.

Do not pretend an estimate is measured data.

Protein should be appropriate for the athlete's body size, training demands, objective, and ability to adhere.

Do not automatically maximise protein without considering the rest of the diet and the athlete's actual requirements.

Step targets should reflect the athlete's actual lifestyle and goals rather than arbitrarily assigning a high number.

Training structure should inform the roadmap, but the roadmap must remain practical alongside the athlete's real life.

============================================================
CORE ONBOARDING INFORMATION
============================================================

Cover these core elements naturally over the conversation.

Cover questions individually after locking in the previous question.

Do not dump a questionnaire on the athlete.

1. Their athlete baseline.

Establish enough information to understand who the protocol is being designed for.

2. Their primary 12-month goal and target bodyweight or physical milestone.

3. Any major dates, events, races, holidays, or deadlines they want to peak for.

4. Their core daily non-negotiable habits.

5. Their overarching mission statement / tagline for the year.

The tagline must be a powerful, sentence-form declaration of intent.

Confirm this with the user before locking it in.

Example style:

"Built over years, ready for anything, arriving at the milestone in undeniable shape."

6. A gritty footer quote / rule to live by.

Confirm this with the user before locking it in.

The footer quote should be concise, memorable, and appropriate to the athlete's actual mission.

============================================================
CALORIE AND PROTEIN FORMULATION
============================================================

Do not blindly accept a calorie or protein number simply because the athlete suggests one.

Discuss the evidence.

If the athlete reports gaining, losing, maintaining, feeling excessively hungry, experiencing poor performance, or otherwise struggling, investigate the likely cause before changing a target.

Consider:

- actual intake
- weight trend
- adherence
- activity
- training load
- recovery
- hunger
- performance
- sustainability
- measurement noise

When proposing daily calorie, protein, or step targets:

1. Explain what is being changed and why.

2. Give the athlete the proposed number.

3. Allow the athlete to challenge or discuss it.

4. Confirm the agreed target before treating it as locked.

Do not silently change a target because the athlete casually mentions a number.

The athlete should understand and approve the important protocol targets before the final JSON is generated.

============================================================
CRITICAL RULE FOR HABITS
============================================================

Habits must be daily actionable behaviours or micro-routines.

Examples:

"10 mins post-workout mobility"

"Read 10 pages"

"Hydration target hit"

"Complete morning movement"

"Prepare tomorrow's food"

"Front load 200g protein by 2pm"

NEVER include macro workout splits as habits.

Do NOT put things such as:

"PPL + BJJ Split"

"3x weekly full body"

"Run Tuesday"

inside the habits array.

Training structure belongs elsewhere in the protocol.

These must be habits that will be completed daily.

============================================================
DAILY TARGETS
============================================================

The dailyTargets object is mandatory and must be fully populated.

The values must represent the athlete's actual agreed protocol.

caloriesMin MUST be a realistic positive calorie target.

caloriesMax MUST be a realistic positive calorie target.

caloriesMax MUST be greater than or equal to caloriesMin.

protein MUST be a realistic positive daily protein target in grams.

steps MUST be a realistic positive daily step target.

routine MUST be a specific actionable daily routine.

NEVER output 0, null, an empty string, or an omitted value for:

caloriesMin
caloriesMax
protein
steps
routine

unless the athlete explicitly requires that value to be zero.

These values are displayed directly in the Daily Non-Negotiables section of the Command Centre.

Confirm these with the user before locking them in.

Do not put calorie, protein, or step targets into the habits array.

============================================================
ROADMAP STRUCTURE
============================================================

The Project Ascension roadmap covers approximately 12 months from the actual project start date to the athlete's agreed target date.

The roadmap MUST contain exactly 4 phases.

Each phase MUST contain exactly 2 blocks.

Therefore the complete roadmap MUST contain exactly 8 blocks.

Structure:

Phase 1

Block 1

Block 2


Phase 2

Block 1

Block 2


Phase 3

Block 1

Block 2


Phase 4

Block 1

Block 2


Each phase represents approximately 3 months.

Each block represents approximately 6–7 weeks of execution.

The two blocks within each phase must have distinct strategic purposes and should represent progression from the first block to the second.

Do NOT simply duplicate the same objectives across both blocks.

The phases and blocks must run continuously from the project start date to the target date.

There must be:

no unexplained gaps

no overlaps

no duplicate dates

no blocks outside the project period

no placeholder dates

Phase 1 MUST have status "active".

Phases 2, 3 and 4 MUST have status "upcoming".

============================================================
PROJECT DATES
============================================================

The project start date must be the actual date on which the final protocol is created.

The targetDate must be the actual target date agreed during the conversation.

DO NOT assume a default target date.

If the athlete has not established an appropriate target date, discuss it with them before generating the final protocol.

The roadmap should normally cover approximately 12 months.

============================================================
DATE FORMAT
============================================================

IMPORTANT:

Dates used inside the final JSON MUST use ISO format:

YYYY-MM-DD

Example:

2026-09-23

Do NOT use:

23/09/2026

inside the JSON.

The application will convert dates into UK display format.

All block dates must be real calendar dates.

Block dates must be chronological and continuous.

The day after one block ends must be the start date of the next block.

============================================================
FINAL PROTOCOL
============================================================

Once the athlete approves the complete protocol, you MUST output ONLY a raw JSON object wrapped in \`\`\`json tags.

Say nothing else.

The JSON must exactly follow this schema:

{
  "projectName": "Project Ascension",
  "tagline": "",
  "footerQuote": "",
  "startingWeight": 0,
  "goalWeight": 0,
  "targetDate": "2027-09-23T00:00:00Z",

  "athleteProfile": {
    "age": null,
    "sex": "not provided",
    "heightCm": null,
    "activityLevel": "",
    "averageDailySteps": null,
    "trainingSummary": "",
    "strengthDaysPerWeek": null,
    "cardioDaysPerWeek": null,
    "currentCalories": null,
    "recentWeightTrend": "",
    "dietaryPreferences": "",
    "primaryObjective": ""
  },

  "dailyTargets": {
    "caloriesMin": 0,
    "caloriesMax": 0,
    "protein": 0,
    "steps": 0,
    "routine": ""
  },

  "habits": [
    {
      "key": "habit_1",
      "label": "Read 10 Pages",
      "sublabel": "Mindset"
    }
  ],

  "phases": [
    {
      "id": 1,
      "title": "Phase Name",
      "window": "Sep 2026 - Dec 2026",
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
        },
        {
          "name": "Block 2: Name",
          "window": "Weeks 7-13",
          "start": "2026-11-05",
          "end": "2026-12-23",
          "focus": ["Progression"],
          "bullets": ["Rule 1", "Rule 2"]
        }
      ]
    },
    {
      "id": 2,
      "title": "Phase Name",
      "window": "Dec 2026 - Mar 2027",
      "status": "upcoming",
      "summary": "",
      "badges": [],
      "blocks": []
    },
    {
      "id": 3,
      "title": "Phase Name",
      "window": "Mar 2027 - Jun 2027",
      "status": "upcoming",
      "summary": "",
      "badges": [],
      "blocks": []
    },
    {
      "id": 4,
      "title": "Phase Name",
      "window": "Jun 2027 - Sep 2027",
      "status": "upcoming",
      "summary": "",
      "badges": [],
      "blocks": []
    }
  ]
}

The athleteProfile object is part of the permanent protocol record so future recalibration can understand the baseline from which the protocol was created.

Do not fabricate unknown baseline values.

============================================================
FINAL QUALITY CHECK
============================================================

Before outputting the final JSON, internally verify:

- The athlete baseline is populated with everything actually established.
- Unknown information is not fabricated.
- Starting weight is consistent with the conversation.
- Goal weight is consistent with the conversation.
- Target date was explicitly agreed.
- Calories were discussed and agreed.
- Protein was discussed and agreed.
- Steps were discussed and agreed.
- The daily routine was discussed and agreed.
- Tagline was approved.
- Footer quote was approved.
- Exactly 4 phases exist.
- Exactly 2 blocks exist in every phase.
- Exactly 8 blocks exist overall.
- Blocks are continuous.
- There are no date gaps.
- There are no date overlaps.
- Phase 1 is active.
- Phases 2–4 are upcoming.
- All dates are valid ISO dates.
- No placeholder dates remain.
- No macro or training splits appear in the habits array.

Only after these checks and athlete approval should the final JSON be generated.`;

// ============================================================
// PREFERRED GEMINI MODELS
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

// ============================================================
// DATE HELPERS
// ============================================================

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === value;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ============================================================
  // AUTO-SCROLL
  // ============================================================

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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

    const modelIds = availableModels
      .filter(
        (model) =>
          Array.isArray(
            model.supportedGenerationMethods,
          ),
      )
      .filter((model) =>
        model.supportedGenerationMethods!.includes(
          "generateContent",
        ),
      )
      .map((model) => {
        if (model.baseModelId) {
          return model.baseModelId;
        }

        if (model.name) {
          return model.name.replace(/^models\//, "");
        }

        return "";
      })
      .filter(Boolean);

    return Array.from(new Set(modelIds));
  };

  // ============================================================
  // SORT MODELS
  // ============================================================

  const rankModels = (
    availableModels: string[],
  ): string[] => {
    const preferred = PREFERRED_MODELS.filter((model) =>
      availableModels.includes(model),
    );

    const otherModels = availableModels.filter(
      (model) => !PREFERRED_MODELS.includes(model),
    );

    return [...preferred, ...otherModels];
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

    let lastErrorMsg = "Gemini request failed.";

    try {
      // ========================================================
      // BUILD CONVERSATION HISTORY
      // ========================================================

      const contents = newMsgs.map((m) => ({
        role: m.role,
        parts: [
          {
            text: m.text,
          },
        ],
      }));

      // ========================================================
      // DISCOVER MODELS
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

            console.warn(lastErrorMsg);

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

      const codeMarker = "`" + "`" + "`";

      if (
        reply.includes(`${codeMarker}json`) &&
        reply.includes(codeMarker)
      ) {
        const jsonString = reply
          .split(`${codeMarker}json`)[1]
          .split(codeMarker)[0]
          .trim();

        try {
          const profile = JSON.parse(jsonString);

          // ==================================================
          // VALIDATE ATHLETE PROFILE
          // ==================================================

          const athleteProfile =
            profile?.athleteProfile;

          if (
            !athleteProfile ||
            typeof athleteProfile !== "object"
          ) {
            throw new Error(
              "The coach returned a protocol without the athlete baseline.",
            );
          }

          if (
            athleteProfile.age !== null &&
            (
              typeof athleteProfile.age !== "number" ||
              athleteProfile.age <= 0
            )
          ) {
            throw new Error(
              "The athlete age in the final protocol is invalid.",
            );
          }

          if (
            typeof athleteProfile.sex !== "string"
          ) {
            throw new Error(
              "The athlete sex field is invalid.",
            );
          }

          if (
            athleteProfile.heightCm !== null &&
            (
              typeof athleteProfile.heightCm !== "number" ||
              athleteProfile.heightCm <= 0
            )
          ) {
            throw new Error(
              "The athlete height in the final protocol is invalid.",
            );
          }

          if (
            typeof athleteProfile.activityLevel !==
              "string"
          ) {
            throw new Error(
              "The athlete activity level is missing.",
            );
          }

          if (
            athleteProfile.averageDailySteps !==
              null &&
            (
              typeof athleteProfile.averageDailySteps !==
                "number" ||
              athleteProfile.averageDailySteps < 0
            )
          ) {
            throw new Error(
              "The athlete step baseline is invalid.",
            );
          }

          if (
            typeof athleteProfile.trainingSummary !==
              "string"
          ) {
            throw new Error(
              "The athlete training baseline is missing.",
            );
          }

          if (
            athleteProfile.strengthDaysPerWeek !==
              null &&
            (
              typeof athleteProfile.strengthDaysPerWeek !==
                "number" ||
              athleteProfile.strengthDaysPerWeek < 0
            )
          ) {
            throw new Error(
              "The athlete strength-training frequency is invalid.",
            );
          }

          if (
            athleteProfile.cardioDaysPerWeek !==
              null &&
            (
              typeof athleteProfile.cardioDaysPerWeek !==
                "number" ||
              athleteProfile.cardioDaysPerWeek < 0
            )
          ) {
            throw new Error(
              "The athlete cardio frequency is invalid.",
            );
          }

          if (
            athleteProfile.currentCalories !== null &&
            (
              typeof athleteProfile.currentCalories !==
                "number" ||
              athleteProfile.currentCalories <= 0
            )
          ) {
            throw new Error(
              "The athlete current calorie intake is invalid.",
            );
          }

          if (
            typeof athleteProfile.recentWeightTrend !==
              "string"
          ) {
            throw new Error(
              "The athlete weight trend field is missing.",
            );
          }

          if (
            typeof athleteProfile.dietaryPreferences !==
              "string"
          ) {
            throw new Error(
              "The athlete dietary preferences field is missing.",
            );
          }

          if (
            typeof athleteProfile.primaryObjective !==
              "string" ||
            !athleteProfile.primaryObjective.trim()
          ) {
            throw new Error(
              "The athlete primary objective is missing.",
            );
          }

          // ==================================================
          // VALIDATE DAILY TARGETS
          // ==================================================

          const targets =
            profile?.dailyTargets;

          if (
            !targets ||
            typeof targets.caloriesMin !== "number" ||
            typeof targets.caloriesMax !== "number" ||
            typeof targets.protein !== "number" ||
            typeof targets.steps !== "number" ||
            typeof targets.routine !== "string"
          ) {
            throw new Error(
              "The coach returned an incomplete Daily Non-Negotiables section.",
            );
          }

          if (
            targets.caloriesMin <= 0 ||
            targets.caloriesMax <= 0 ||
            targets.protein <= 0 ||
            targets.steps <= 0 ||
            !targets.routine.trim()
          ) {
            throw new Error(
              "The coach returned invalid Daily Non-Negotiable targets. Ask it to regenerate the protocol.",
            );
          }

          if (
            targets.caloriesMax <
            targets.caloriesMin
          ) {
            throw new Error(
              "The coach returned an invalid calorie range.",
            );
          }

          // ==================================================
          // VALIDATE PROJECT DATES
          // ==================================================

          if (
            !profile.targetDate ||
            typeof profile.targetDate !== "string"
          ) {
            throw new Error(
              "The coach must provide a valid target date.",
            );
          }

          const targetDateOnly =
            profile.targetDate.slice(0, 10);

          if (!isValidIsoDate(targetDateOnly)) {
            throw new Error(
              "The coach returned an invalid target date.",
            );
          }

          // ==================================================
          // VALIDATE ROADMAP
          // ==================================================

          if (
            !Array.isArray(profile.phases) ||
            profile.phases.length !== 4
          ) {
            throw new Error(
              "The coach must generate exactly 4 roadmap phases.",
            );
          }

          const phaseIds = profile.phases.map(
            (phase: any) => phase.id,
          );

          if (
            JSON.stringify(phaseIds) !==
            JSON.stringify([1, 2, 3, 4])
          ) {
            throw new Error(
              "Roadmap phases must be numbered 1 through 4.",
            );
          }

          const invalidPhase =
            profile.phases.some(
              (phase: any) => {
                if (
                  !Array.isArray(phase.blocks) ||
                  phase.blocks.length !== 2
                ) {
                  return true;
                }

                if (
                  typeof phase.title !==
                    "string" ||
                  !phase.title.trim() ||
                  typeof phase.window !==
                    "string" ||
                  !phase.window.trim() ||
                  typeof phase.summary !==
                    "string" ||
                  !phase.summary.trim() ||
                  !Array.isArray(
                    phase.badges,
                  )
                ) {
                  return true;
                }

                return phase.blocks.some(
                  (block: any) => {
                    if (
                      typeof block.name !==
                        "string" ||
                      !block.name.trim() ||
                      typeof block.window !==
                        "string" ||
                      !block.window.trim() ||
                      typeof block.start !==
                        "string" ||
                      typeof block.end !==
                        "string" ||
                      !Array.isArray(
                        block.focus,
                      ) ||
                      !Array.isArray(
                        block.bullets,
                      ) ||
                      block.focus.length ===
                        0 ||
                      block.bullets.length ===
                        0
                    ) {
                      return true;
                    }

                    if (
                      !isValidIsoDate(
                        block.start,
                      ) ||
                      !isValidIsoDate(
                        block.end,
                      )
                    ) {
                      return true;
                    }

                    const start =
                      new Date(
                        `${block.start}T00:00:00Z`,
                      );

                    const end =
                      new Date(
                        `${block.end}T23:59:59Z`,
                      );

                    return end < start;
                  },
                );
              },
            );

          if (invalidPhase) {
            throw new Error(
              "The coach generated an invalid roadmap. Each phase must contain exactly 2 complete blocks with valid dates.",
            );
          }

          // ==================================================
          // VALIDATE BLOCK CONTINUITY
          // ==================================================

          const allBlocks =
            profile.phases.flatMap(
              (phase: any) =>
                phase.blocks,
            );

          for (
            let i = 1;
            i < allBlocks.length;
            i++
          ) {
            const previousEnd =
              new Date(
                `${allBlocks[i - 1].end}T00:00:00Z`,
              );

            const currentStart =
              new Date(
                `${allBlocks[i].start}T00:00:00Z`,
              );

            const expectedStart =
              new Date(previousEnd);

            expectedStart.setUTCDate(
              expectedStart.getUTCDate() +
                1,
            );

            if (
              currentStart.getTime() !==
              expectedStart.getTime()
            ) {
              throw new Error(
                "The roadmap blocks must run continuously without gaps or overlaps.",
              );
            }
          }

          // ==================================================
          // VALIDATE PHASE STATUS
          // ==================================================

          if (
            profile.phases[0].status !==
            "active"
          ) {
            throw new Error(
              "Phase 1 must be marked active.",
            );
          }

          if (
            profile.phases
              .slice(1)
              .some(
                (phase: any) =>
                  phase.status !==
                  "upcoming",
              )
          ) {
            throw new Error(
              "Future phases must be marked upcoming.",
            );
          }

          // ==================================================
          // VALIDATE TOTAL BLOCK COUNT
          // ==================================================

          if (allBlocks.length !== 8) {
            throw new Error(
              "The roadmap must contain exactly 8 blocks.",
            );
          }

          // ==================================================
          // PRESERVE API KEYS
          // ==================================================

          const currentApiKey =
            localStorage.getItem(
              "p35_gemini_api_key",
            );

          const currentHevyKey =
            localStorage.getItem(
              "p35_hevy_api_key",
            );

          // ==================================================
          // CLEAR OLD SETUP DATA
          // ==================================================

          localStorage.clear();

          // ==================================================
          // RESTORE API KEYS
          // ==================================================

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

          // ==================================================
          // SAVE PROFILE
          // ==================================================

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
            e instanceof Error
              ? e.message
              : "AI generated invalid data. Tell it to try again.",
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

            {/* GEMINI API KEY */}

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
                onChange={(e) =>
                  setApiKey(e.target.value)
                }
                placeholder="AIzaSy..."
                className="w-full rounded-md border border-border bg-surface-2/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {/* HEVY API KEY */}

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
                  Hevy Pro plan required →
                </a>

              </div>

              <input
                type="password"
                value={hevyKey}
                onChange={(e) =>
                  setHevyKey(e.target.value)
                }
                className="w-full rounded-md border border-border bg-surface-2/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {/* START BUTTON */}

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

      {/* HEADER */}

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

      {/* CHAT */}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 py-4 pr-2"
      >

        {messages
          .filter(
            (m) =>
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

        {/* TYPING INDICATOR */}

        {isTyping && (
          <div className="flex justify-start">

            <div className="bg-surface-2/60 text-muted-foreground rounded-xl px-4 py-3 flex items-center gap-2 text-sm">

              <Loader2 className="size-4 animate-spin" />

              Coach is thinking...

            </div>

          </div>
        )}

      </div>

      {/* MESSAGE INPUT */}

      <div className="pt-2 pb-4">

        <div className="flex items-end gap-2 bg-surface-2/50 border border-border rounded-xl p-2 focus-within:border-primary transition-colors">

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
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