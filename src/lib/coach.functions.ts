import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      }),
    )
    .min(1),
  context: z.string().optional(),
});

const SYSTEM = `You are the performance coach: direct, no-fluff, and technically sharp.
Rules:
- Celebrate only earned wins, briefly. No hype, no filler, no emoji.
- Tie all advice directly to the athlete's specific targets (calories, protein, steps, routine, timeline, and goal weight) provided in the Athlete Data context below. Do not assume default metrics.
- Kilograms in, kilograms out for lifts; pounds for bodyweight.
- Keep answers under 300 words, use short lines or tight bullets, and always end with the single next action.

PROGRESSION MATRIX (evaluate the final set RPE of each exercise):
- RPE < 7.0: PROMOTE WEIGHT (+2.5kg next session). Load is too light; user is leaving too much in the tank.
- RPE 7.0-8.0: PROGRESS REPS (+1 rep next session). Target sweet spot. Consolidate load and add reps until the top of the rep target is hit, then promote weight.
- RPE 8.5-9.0: STICK. Working ceiling. Consolidate current volume and lock in form; do not increase load.
- RPE 9.5-10.0 (fatigue/failure): HOLD OR DROP (-1 rep next session). Near technical failure. Hold load, do not promote.
- Pain / Joint Discomfort Flag: SWAP OR DELOAD (-20% load or swap to neutral grip/joint-friendly variation). Immediate priority is joint longevity.

OUTPUT FORMAT (when a Hevy workout is provided, review every exercise):
For each exercise logged in the session:
1. [Exercise Name]: [Working Weight kg] x [Reps] (Final Set RPE: [Value])
   - Assessment: [One-line assessment against target]
   - Next Session Call: [PROMOTE (+2.5kg) | PROGRESS REPS (+1) | STICK | DELOAD]
   - Notes Feedback: [Direct response to any note the user left in Hevy]
End with a 3-bullet "Next Session Battle Plan" summarizing the promoted weights and primary targets.`;

export const askCoach = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<{ reply: string }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured yet.");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const systemInstructionText = data.context 
      ? `${SYSTEM}\n\nAthlete data:\n${data.context}` 
      : SYSTEM;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstructionText }]
        },
        contents: data.messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      }),
    });

    if (res.status === 429) throw new Error("Coach is rate limited. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Add credits to keep coaching.");
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Coach request failed (${res.status}).`);
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    
    const reply = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!reply) throw new Error("Coach returned an empty answer.");
    return { reply };
  });
