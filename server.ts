import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// 1. [안전한 서버 연동 (보안)] - Lazy Client Initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다. AI Studio 설정에서 API 키를 확인해 주세요.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 2. [자동 복구 듀얼 모델 (안정성)] - Primary: gemini-3.6-flash, Fallback: gemini-3.7-flash
const PRIMARY_MODEL = "gemini-3.6-flash";
const FALLBACK_MODEL = "gemini-3.7-flash";

interface DualModelOptions {
  contents: string | any;
  systemInstruction?: string;
  responseMimeType?: string;
  temperature?: number;
}

async function generateWithDualModelFallback(options: DualModelOptions): Promise<{
  text: string;
  modelUsed: string;
  isFallback: boolean;
  latencyMs: number;
}> {
  const ai = getGeminiClient();
  const startTime = Date.now();

  const config: any = {};
  if (options.systemInstruction) {
    config.systemInstruction = options.systemInstruction;
  }
  if (options.responseMimeType) {
    config.responseMimeType = options.responseMimeType;
  }
  if (typeof options.temperature === "number") {
    config.temperature = options.temperature;
  }

  // 1차 시도: 메인 모델 (gemini-3.6-flash)
  try {
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: options.contents,
      config,
    });

    const latencyMs = Date.now() - startTime;
    return {
      text: response.text || "",
      modelUsed: PRIMARY_MODEL,
      isFallback: false,
      latencyMs,
    };
  } catch (primaryError: any) {
    console.warn(
      `[Gemini Dual-Model Failover] 주 모델(${PRIMARY_MODEL}) 호출 실패: ${primaryError?.message}. 보조 모델(${FALLBACK_MODEL})로 자동 전환합니다.`
    );

    // 2차 시도: 백업 모델 (gemini-3.7-flash)
    try {
      const response = await ai.models.generateContent({
        model: FALLBACK_MODEL,
        contents: options.contents,
        config,
      });

      const latencyMs = Date.now() - startTime;
      return {
        text: response.text || "",
        modelUsed: FALLBACK_MODEL,
        isFallback: true,
        latencyMs,
      };
    } catch (fallbackError: any) {
      console.error(
        `[Gemini Dual-Model Failover] 주 모델(${PRIMARY_MODEL}) 및 보조 모델(${FALLBACK_MODEL}) 모두 실패:`,
        fallbackError
      );
      throw new Error(
        `Gemini AI 통신 오류 (주 모델: ${primaryError?.message || "오류"} / 보조 모델: ${fallbackError?.message || "오류"})`
      );
    }
  }
}

// 3. [오류 없는 깔끔한 응답 (정확성)] - Markdown JSON Sanitizer & Robust Parser
function cleanAndParseJson<T = any>(rawText: string, fallbackDefault?: T): T {
  if (!rawText || typeof rawText !== "string") {
    if (fallbackDefault !== undefined) return fallbackDefault;
    throw new Error("빈 응답이 전달되었습니다.");
  }

  let cleaned = rawText.trim();

  // 마크다운 코드 블록 (```json ... ``` 또는 ``` ... ```) 제거
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/, "");
    cleaned = cleaned.replace(/\n?```\s*$/, "");
    cleaned = cleaned.trim();
  }

  const codeFenceMatch = cleaned.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/);
  if (codeFenceMatch && codeFenceMatch[1]) {
    cleaned = codeFenceMatch[1].trim();
  }

  // 1차 일반 파싱 시도
  try {
    return JSON.parse(cleaned);
  } catch (_firstErr) {
    // 2차: 중괄호 {} 또는 대괄호 [] 구간 추출 파싱
    const firstCurly = cleaned.indexOf("{");
    const lastCurly = cleaned.lastIndexOf("}");
    if (firstCurly !== -1 && lastCurly > firstCurly) {
      try {
        return JSON.parse(cleaned.substring(firstCurly, lastCurly + 1));
      } catch (_curlyErr) {
        // continue
      }
    }

    const firstSquare = cleaned.indexOf("[");
    const lastSquare = cleaned.lastIndexOf("]");
    if (firstSquare !== -1 && lastSquare > firstSquare) {
      try {
        return JSON.parse(cleaned.substring(firstSquare, lastSquare + 1));
      } catch (_squareErr) {
        // continue
      }
    }

    if (fallbackDefault !== undefined) {
      console.warn("[cleanAndParseJson] JSON 파싱 실패로 기본값 반환:", rawText.slice(0, 100));
      return fallbackDefault;
    }
    throw new Error(`JSON 변환 실패: ${rawText.slice(0, 150)}...`);
  }
}

// 4. [연결 점검] - Health Check & Real Gemini Connection Test
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    primaryModel: PRIMARY_MODEL,
    fallbackModel: FALLBACK_MODEL,
  });
});

app.post("/api/gemini/test-connection", async (_req, res) => {
  try {
    const result = await generateWithDualModelFallback({
      contents: "Respond with the word 'OK' only to verify system connectivity.",
      systemInstruction: "You are a connectivity test assistant. Return 'OK'.",
    });

    res.json({
      success: true,
      latencyMs: result.latencyMs,
      modelUsed: result.modelUsed,
      isFallback: result.isFallback,
      primaryModel: PRIMARY_MODEL,
      fallbackModel: FALLBACK_MODEL,
      text: result.text.trim() || "OK",
    });
  } catch (error: any) {
    console.error("Gemini test error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Failed to communicate with Gemini API",
      primaryModel: PRIMARY_MODEL,
      fallbackModel: FALLBACK_MODEL,
    });
  }
});

// 하위 호환성을 위한 /api/test-gemini 별칭 라우트
app.post("/api/test-gemini", async (_req, res) => {
  try {
    const result = await generateWithDualModelFallback({
      contents: "Respond with the word 'OK' only to verify system connectivity.",
      systemInstruction: "You are a connectivity test assistant. Return 'OK'.",
    });

    res.json({
      success: true,
      latencyMs: result.latencyMs,
      modelUsed: result.modelUsed,
      isFallback: result.isFallback,
      primaryModel: PRIMARY_MODEL,
      fallbackModel: FALLBACK_MODEL,
      text: result.text.trim() || "OK",
    });
  } catch (error: any) {
    console.error("Gemini test error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Failed to communicate with Gemini API",
      primaryModel: PRIMARY_MODEL,
      fallbackModel: FALLBACK_MODEL,
    });
  }
});

// 5. Generate Writing Topics (Grade 7 / 중1 수준)
app.post("/api/gemini/generate-topic", async (req, res) => {
  try {
    const { category, customTheme } = req.body;

    const prompt = `
당신은 대한민국 중학교 1학년 영어 교과 지도 전문가입니다.
중학교 1학년 학생들이 친근하고 부담 없이 영작할 수 있는 일상/학교생활/취미/상상 주제를 1개 생성해 주세요.

${category ? `선택된 카테고리: ${category}` : ""}
${customTheme ? `선생님이 희망하는 테마/키워드: ${customTheme}` : ""}

반드시 아래 JSON 형식으로만 응답하세요:
\`\`\`json
{
  "title": "주제 제목 (예: My Favorite Season and Why / 내가 가장 좋아하는 계절)",
  "englishTitle": "영문 제목",
  "koreanTitle": "한글 제목",
  "category": "Daily Life / School / Hobby / Food / Future / Emotion 중 하나",
  "description": "학생에게 흥미를 유발하는 1-2문장의 친절한 안내문 (한국어)",
  "guidePrompt": "영작할 때 생각해보면 좋은 질문 가이드 3가지 (한국어)",
  "recommendedVocab": ["단어1(뜻)", "단어2(뜻)", "단어3(뜻)", "단어4(뜻)", "단어5(뜻)"],
  "sentenceStarters": ["I like...", "My favorite...", "Because..."],
  "minWords": 20
}
\`\`\`
`;

    const result = await generateWithDualModelFallback({
      contents: prompt,
      systemInstruction: "You are a middle school English writing curriculum expert. Always output strictly valid JSON.",
      responseMimeType: "application/json",
      temperature: 0.7,
    });

    const parsed = cleanAndParseJson(result.text, {});
    res.json({ success: true, topic: parsed, modelUsed: result.modelUsed, isFallback: result.isFallback });
  } catch (error: any) {
    console.error("Generate topic error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Korean Idea to English Writing Hints (한글 기반 단어/구문 힌트)
app.post("/api/gemini/hints", async (req, res) => {
  try {
    const { koreanIdea, topicTitle } = req.body;
    if (!koreanIdea) {
      return res.status(400).json({ success: false, error: "koreanIdea is required" });
    }

    const prompt = `
당신은 대한민국 중학교 1학년 학생을 돕는 친절한 영어 글쓰기 튜터입니다.
학생이 쓴 한글 생각 내용을 바탕으로, 학생이 직접 기초 영작을 시도할 수 있도록 쉬운 단어와 기초 문장 패턴 힌트를 제공하세요.

[규칙]
- 절대로 전체 완성된 영어 문장을 통째로 번역해주지 마세요! 학생이 스스로 조합할 수 있도록 힌트만 줍니다.
- 중1 수준(중학 필수 기본 어휘 및 be동사, 일반동사 현재/과거시제, like to V 등)에 맞추세요.

[글쓰기 주제]
${topicTitle || "자유 주제"}

[학생의 한글 생각]
${koreanIdea}

반드시 아래 JSON 형식으로 응답하세요:
\`\`\`json
{
  "cheeringMessage": "학생을 응원하는 친절한 한마디 (예: 멋진 생각이에요! 차근차근 쉬운 단어로 시작해봐요.)",
  "vocabHints": [
    {"korean": "한글 표현", "english": "easy English word", "example": "간단 예문/조합 팁"},
    {"korean": "한글 표현", "english": "easy English word", "example": "간단 예문/조합 팁"},
    {"korean": "한글 표현", "english": "easy English word", "example": "간단 예문/조합 팁"}
  ],
  "sentencePatterns": [
    {"pattern": "I usually [동사] with my friends.", "meaning": "나는 보통 친구들과 ~해요."},
    {"pattern": "It makes me [형용사: happy/excited].", "meaning": "그것은 나를 ~하게 만들어요."}
  ]
}
\`\`\`
`;

    const result = await generateWithDualModelFallback({
      contents: prompt,
      systemInstruction: "You are a supportive middle school English tutor. Always output strictly valid JSON.",
      responseMimeType: "application/json",
      temperature: 0.6,
    });

    const parsed = cleanAndParseJson(result.text, {});
    res.json({ success: true, hints: parsed, modelUsed: result.modelUsed, isFallback: result.isFallback });
  } catch (error: any) {
    console.error("Hints error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Step 1 AI Grammar Check (1차 문법 오류 교정)
app.post("/api/gemini/grammar-check", async (req, res) => {
  try {
    const { draftText, koreanIdea, topicTitle } = req.body;
    if (!draftText) {
      return res.status(400).json({ success: false, error: "draftText is required" });
    }

    const prompt = `
당신은 중학교 1학년 영어 선생님입니다.
학생이 쓴 기초 영어 글을 읽고 문법과 철자(스펠링), 대소문자, 문장부호를 검토해 주세요.

[핵심 규칙 - 중1 대상]
- 학생의 원본 글을 AI가 알아서 완전히 재작성하거나 어려운 고급 어휘로 바꾸지 마세요.
- 학생이 쓴 원래 문장 구조를 최대한 살려서 친절하게 교정합니다.
- 교정 설명은 반드시 한국어로 친근하게 작성하세요.
- 설명 형식: "이 부분은 ~게 바꾸면 문법이 맞아요. (이유 설명)"
- 격려의 메시지를 꼭 포함하세요.

[주제]: ${topicTitle || "주제"}
[학생의 한글 생각]: ${koreanIdea || "(없음)"}
[학생의 영작 초고]:
${draftText}

반드시 아래 JSON 형식으로 응답하세요:
\`\`\`json
{
  "praiseMessage": "학생의 노력에 대한 칭찬 한마디",
  "corrections": [
    {
      "original": "학생이 쓴 틀린 부분",
      "corrected": "바르게 고친 부분",
      "explanation": "이 부분은 ~게 바꾸면 문법이 맞아요. (예: 3인칭 단수 주어 he 뒤에는 likes처럼 -s를 붙여요.)"
    }
  ],
  "improvedDraft": "문법과 스펠링 오류만 바르게 수정한 학생 수준의 글"
}
\`\`\`
`;

    const result = await generateWithDualModelFallback({
      contents: prompt,
      systemInstruction: "You are a gentle middle school English teacher. Always output strictly valid JSON.",
      responseMimeType: "application/json",
      temperature: 0.3,
    });

    const parsed = cleanAndParseJson(result.text, {});
    res.json({ success: true, feedback: parsed, modelUsed: result.modelUsed, isFallback: result.isFallback });
  } catch (error: any) {
    console.error("Grammar check error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Step 2 AI Expression Expansion (2차 표현 확장 제안)
app.post("/api/gemini/expression-expansion", async (req, res) => {
  try {
    const { currentText, koreanIdea, topicTitle } = req.body;
    if (!currentText) {
      return res.status(400).json({ success: false, error: "currentText is required" });
    }

    const prompt = `
당신은 중학교 1학년 학생들의 풍부한 글쓰기를 돕는 영어 멘토입니다.
학생이 문법 검토를 거친 영어 글을 보고, 감정이나 디테일을 더 풍부하게 표현할 수 있는 '딱 1가지 구체적인 제안'을 해주세요.

[AI 프롬프트 핵심 규칙 - 중학교 1학년 대상]
- 학생의 글을 알아서 통째로 바꾸지 마세요.
- 한 번에 여러 개를 요구하지 마세요. 오직 1가지(Single) 제안만 하세요!
- 제안 예시: "이 문장에 기분을 나타내는 형용사(예: happy, excited)를 하나 추가해볼까요?" 또는 "어디서 했는지 장소(예: in my room)를 덧붙여 볼까요?"
- 제안 유형(targetType): 감정 형용사(feeling), 묘사 수식어(description), 시간/장소(time/place), 이유 연결사(reason) 중 가장 적절한 것 1개 선택.

[주제]: ${topicTitle || "주제"}
[학생 한글 생각]: ${koreanIdea || "(없음)"}
[현재 학생의 영작]:
${currentText}

반드시 아래 JSON 형식으로 응답하세요:
\`\`\`json
{
  "targetSentence": "확장할 수 있는 학생의 특정 문장",
  "suggestionTitle": "1가지 핵심 제안 제목 (예: 기분을 나타내는 단어 덧붙이기)",
  "friendlyGuide": "친절한 가이드 설명 (예: 'I played soccer with my friends.' 문장에 그 때 기분이 어땠는지 'excited'나 'happy' 같은 말을 하나 추가해볼까요?)",
  "exampleKeywords": ["happy (행복한)", "excited (신나는)", "proud (자랑스러운)"],
  "exampleResult": "제안을 적용했을 때의 참고용 예시 문장"
}
\`\`\`
`;

    const result = await generateWithDualModelFallback({
      contents: prompt,
      systemInstruction: "You are an inspiring English writing coach for 7th graders. Always output strictly valid JSON.",
      responseMimeType: "application/json",
      temperature: 0.5,
    });

    const parsed = cleanAndParseJson(result.text, {});
    res.json({ success: true, suggestion: parsed, modelUsed: result.modelUsed, isFallback: result.isFallback });
  } catch (error: any) {
    console.error("Expression expansion error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. Process-Oriented Assessment Draft (과정중심평가 초안 생성)
app.post("/api/gemini/process-assessment", async (req, res) => {
  try {
    const { studentName, topicTitle, koreanIdea, initialDraft, aiGrammarFeedback, aiExpressionSuggestion, finalWriting, selfAssessment } = req.body;

    const prompt = `
당신은 대한민국 중학교 영어 교사로서 학생의 '과정중심평가(Process-oriented Assessment)' 기록 초안을 작성합니다.
학생이 한글 생각 구상부터 기초 영작, 문법 수정 수용, 표현 확장 반영, 최종 고쳐쓰기까지 수행한 전체 과정을 종합적으로 관찰하고 평가 의견 초안을 작성해 주세요.

[학생 정보 및 활동 기록]
- 학생 이름: ${studentName || "학생"}
- 글쓰기 주제: ${topicTitle}
- 1. 한글 구상: ${koreanIdea || "작성됨"}
- 2. 기초 영작 초고: ${initialDraft || "작성됨"}
- 3. 문법 수정 피드백 수용 여부: ${JSON.stringify(aiGrammarFeedback || {})}
- 4. 표현 확장 제안 및 반영: ${JSON.stringify(aiExpressionSuggestion || {})}
- 5. 최종 완성 글: ${finalWriting || "완성됨"}
- 6. 학생 자기 평가: ${JSON.stringify(selfAssessment || {})}

[평가 작성 지침]
- 교육부 중학교 1학년 영어과 학교생활기록부 교과학습발달상황(세부능력 및 특기사항) 양식에 적합한 신뢰성 있고 품격 있는 문체(~함, ~를 성실히 수행함)를 사용하세요.
- 한글 구상 단계에서의 창의적 아이디어, 영작 시도의 적극성, 피드백을 수용하여 스스로 고쳐 쓴 성장 과정을 구체적으로 기술하세요.
- 총평, 영역별 평가(내용 구성, 언어 형식/문법, 표현 확장 노력, 태도), 교사용 종합 의견을 작성하세요.

반드시 아래 JSON 형식으로 응답하세요:
\`\`\`json
{
  "summary": "1~2문장의 핵심 성장 요약",
  "contentRating": "탁월 / 우수 / 보통 중 하나",
  "grammarGrowthRating": "탁월 / 우수 / 보통 중 하나",
  "expressionRating": "탁월 / 우수 / 보통 중 하나",
  "effortRating": "탁월 / 우수 / 보통 중 하나",
  "detailedDraft": "학교생활기록부 세특에 바로 반영 가능한 3~5줄의 정제된 과정중심평가 문안 (문장 끝은 '~함', '~를 보여줌' 등으로 작성)",
  "encouragementComment": "선생님이 학생에게 전달할 따뜻한 칭찬과 피드백 한마디"
}
\`\`\`
`;

    const result = await generateWithDualModelFallback({
      contents: prompt,
      systemInstruction: "You are a professional Korean middle school English teacher writing educational evaluation records. Always output strictly valid JSON.",
      responseMimeType: "application/json",
      temperature: 0.4,
    });

    const parsed = cleanAndParseJson(result.text, {});
    res.json({ success: true, assessment: parsed, modelUsed: result.modelUsed, isFallback: result.isFallback });
  } catch (error: any) {
    console.error("Process assessment error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vite middleware / Static server setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Writing Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
