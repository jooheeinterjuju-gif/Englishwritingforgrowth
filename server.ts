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

// 2. [자동 복구 멀티 모델 캐스케이드 (안정성)]
// Priority order:
// 1. gemini-3.1-flash-lite (Ultra-fast ~1.2s, stable high throughput, no 503 demand spikes)
// 2. gemini-flash-latest (General stable flash fallback)
// 3. gemini-3.8-flash (Standard advanced text model)
const MODEL_CASCADE = [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.8-flash",
];
const PRIMARY_MODEL = MODEL_CASCADE[0];
const FALLBACK_MODEL = MODEL_CASCADE[1];

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

  const errors: string[] = [];

  for (let i = 0; i < MODEL_CASCADE.length; i++) {
    const currentModel = MODEL_CASCADE[i];
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: options.contents,
        config,
      });

      const latencyMs = Date.now() - startTime;
      return {
        text: response.text || "",
        modelUsed: currentModel,
        isFallback: i > 0,
        latencyMs,
      };
    } catch (modelErr: any) {
      const errMsg = modelErr?.message || String(modelErr);
      errors.push(`[${currentModel}]: ${errMsg.slice(0, 100)}`);
      console.warn(
        `[Gemini Multi-Model Cascade] 모델(${currentModel}) 호출 실패 (${errMsg.slice(0, 80)}). 다음 모델(${MODEL_CASCADE[i + 1] || "없음"})로 자동 전환합니다.`
      );

      if (i < MODEL_CASCADE.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  }

  throw new Error(`Gemini AI 통신 오류 (모든 모델 시도 실패: ${errors.join(" | ")})`);
}

// 중학교 1학년 맞춤형 오프라인/네트워크 장애 대비 힌트 생성기
// 입력 문장의 모호성(너무 짧음, 단순 자음, 무성의한 단어) 판별 함수
function isKoreanInputAmbiguous(text: string): { isAmbiguous: boolean; reason?: string } {
  const trimmed = (text || "").trim();

  // 1. 글자 수 4자 미만 (단어 1개 수준)
  if (trimmed.length < 4) {
    return { isAmbiguous: true, reason: "too_short" };
  }

  // 2. 한글 완성형 음절이 거의 없고 자음/모음/기호만 있는 경우 (ㅋㅋㅋ, ㅎㅎ, ㅇㅇ, ㅠㅠ 등)
  const hasHangulSyllable = /[가-힣]/.test(trimmed);
  const onlyConsonantsOrPunct = /^[ㄱ-ㅎㅏ-ㅣ0-9\s!?.,~^;:\-_+@#%&*()]+$/.test(trimmed);
  if (!hasHangulSyllable || onlyConsonantsOrPunct) {
    return { isAmbiguous: true, reason: "consonants_only" };
  }

  // 3. 무성의/회피성 단어 목록
  const evasivePatterns = [
    /^몰라(요)?$/,
    /^그냥(이요)?$/,
    /^아무거나$/,
    /^생각\s*(안\s*남|없음)$/,
    /^글쎄(요)?$/,
    /^귀찮(아|음)$/,
    /^하기\s*싫어/,
    /^asdf/i,
  ];
  if (evasivePatterns.some((pattern) => pattern.test(trimmed))) {
    return { isAmbiguous: true, reason: "evasive" };
  }

  return { isAmbiguous: false };
}

// 중학교 1학년 맞춤형 오프라인/네트워크 장애 대비 동적 힌트 생성기
function generateFallbackHints(koreanIdea: string, topicTitle?: string) {
  const ambiguity = isKoreanInputAmbiguous(koreanIdea);

  // 모호한 입력인 경우 구체적 재입력 요청 반환
  if (ambiguity.isAmbiguous) {
    return {
      isAmbiguous: true,
      clarificationMessage:
        "어떤 일이나 장소, 기분에 대해 쓰고 싶은지 조금만 더 구체적으로 적어줄 수 있나요? (예: '어제 점심에 친구와 떡볶이를 먹었는데 정말 맛있었다'처럼 누가, 무엇을 했는지 알려주면 딱 맞는 멋진 영어 힌트를 줄게요!)",
      guidingQuestions: [
        "언제, 어디서 있었던 일이나 생각인가요?",
        "누구와 함께 무엇을 보거나 행동했나요?",
        "그 순간 어떤 기분이나 생각이 들었나요?",
      ],
      cheeringMessage: "생각을 조금만 더 구체적인 문장으로 적어주면 딱 맞는 영어 힌트를 알려줄게요! 😊",
      vocabHints: [],
      sentencePatterns: [],
    };
  }

  // 동적 어휘 매핑 사전 (중1 교육과정 중심)
  const dict: Record<string, { english: string; example: string; category: string }> = {
    // 환경 / 자연 / 지구 / 보호
    환경보호: { english: "protecting the environment", example: "for environmental protection", category: "environment" },
    환경: { english: "the environment", example: "protect the environment (환경을 보호하다)", category: "environment" },
    매연: { english: "smoke / exhaust fumes", example: "emit harmful smoke (해로운 매연을 내뿜다)", category: "environment" },
    공장: { english: "factory", example: "at the factory (공장에서)", category: "environment" },
    내뿜: { english: "emit / produce", example: "Factories emit smoke.", category: "environment" },
    인스턴트: { english: "instant food", example: "stop eating instant food (인스턴트 음식을 끊다)", category: "food" },
    지구: { english: "the Earth / our planet", example: "save our Earth (우리의 지구를 구하다)", category: "environment" },
    쓰레기: { english: "trash / garbage", example: "reduce trash (쓰레기를 줄이다)", category: "environment" },
    플라스틱: { english: "plastic", example: "recycle plastic (플라스틱을 재활용하다)", category: "environment" },
    자연: { english: "nature", example: "clean nature (깨끗한 자연)", category: "environment" },
    보호: { english: "protect / save", example: "protect the planet", category: "environment" },
    줄이: { english: "reduce / cut down on", example: "reduce eating ramen", category: "action" },
    결심: { english: "decided to / promise", example: "I decided not to eat (먹지 않기로 결심했다)", category: "action" },
    않: { english: "will not / not do", example: "I will not eat (먹지 않겠다)", category: "action" },
    안먹: { english: "will not eat", example: "I will not eat instant food.", category: "food" },

    // 음식 / 먹거리
    피자: { english: "pizza", example: "eat delicious pizza", category: "food" },
    치킨: { english: "chicken", example: "eat fried chicken", category: "food" },
    떡볶이: { english: "tteokbokki (spicy rice cakes)", example: "eat hot tteokbokki", category: "food" },
    라면: { english: "ramen / instant noodles", example: "eat ramen", category: "food" },
    빵: { english: "bread / bakery", example: "sweet bread", category: "food" },
    점심: { english: "lunch", example: "have lunch (점심을 먹다)", category: "food" },
    저녁: { english: "dinner", example: "eat dinner with family", category: "food" },
    아침: { english: "breakfast", example: "eat breakfast (아침을 먹다)", category: "food" },
    음식: { english: "food", example: "delicious food (맛있는 음식)", category: "food" },
    맛있: { english: "delicious / tasty", example: "It was really delicious.", category: "food" },
    먹: { english: "eat (과거형: ate)", example: "eat with my family", category: "food" },

    // 운동 / 스포츠
    축구: { english: "soccer", example: "play soccer (축구를 하다)", category: "sports" },
    농구: { english: "basketball", example: "play basketball (농구를 하다)", category: "sports" },
    야구: { english: "baseball", example: "play baseball (야구를 하다)", category: "sports" },
    자전거: { english: "bicycle / bike", example: "ride a bike (자전거를 타다)", category: "sports" },
    수영: { english: "swimming", example: "go swimming (수영하러 가다)", category: "sports" },
    달리기: { english: "running", example: "run fast (빨리 달리다)", category: "sports" },
    운동: { english: "exercise / sports", example: "do exercise (운동을 하다)", category: "sports" },

    // 인물 / 관계
    친구: { english: "friend / friends", example: "with my close friends", category: "people" },
    가족: { english: "family", example: "with my family (가족과 함께)", category: "people" },
    엄마: { english: "mom", example: "talk with my mom (엄마와 이야기하다)", category: "people" },
    아빠: { english: "dad", example: "help my dad (아빠를 돕다)", category: "people" },
    동생: { english: "brother / sister", example: "play with my brother/sister", category: "people" },
    선생님: { english: "teacher", example: "my English teacher (영어 선생님)", category: "people" },

    // 장소
    학교: { english: "school", example: "at school (학교에서)", category: "place" },
    집: { english: "home / my house", example: "at home (집에서)", category: "place" },
    공원: { english: "park", example: "walk in the park (공원에서 걷다)", category: "place" },
    도서관: { english: "library", example: "study in the library", category: "place" },
    바다: { english: "sea / beach", example: "go to the beach (바다에 가다)", category: "place" },
    산: { english: "mountain", example: "climb a mountain (등산하다)", category: "place" },
    방: { english: "room / my bedroom", example: "clean my room (내 방을 청소하다)", category: "place" },

    // 취미 / 활동
    게임: { english: "computer game", example: "play video games (게임을 하다)", category: "hobby" },
    영화: { english: "movie", example: "watch a movie (영화를 보다)", category: "hobby" },
    음악: { english: "music", example: "listen to music (음악을 듣다)", category: "hobby" },
    노래: { english: "song", example: "sing a song (노래를 부르다)", category: "hobby" },
    책: { english: "book", example: "read a comic book (책을 읽다)", category: "hobby" },
    그림: { english: "drawing / picture", example: "draw a picture (그림을 그리다)", category: "hobby" },
    공부: { english: "study", example: "study hard (열심히 공부하다)", category: "hobby" },
    숙제: { english: "homework", example: "finish my homework (숙제를 끝내다)", category: "hobby" },
    쇼핑: { english: "shopping", example: "go shopping (쇼핑하러 가다)", category: "hobby" },

    // 감정 / 상태
    행복: { english: "happy", example: "I felt very happy.", category: "emotion" },
    신나: { english: "excited", example: "I was so excited! (정말 신났다!)", category: "emotion" },
    재미: { english: "fun / interesting", example: "It was really fun. (정말 재미있었다)", category: "emotion" },
    힘들: { english: "tired / hard", example: "I was tired, but happy.", category: "emotion" },
    슬프: { english: "sad", example: "I felt sad.", category: "emotion" },
    놀라: { english: "surprised", example: "I was surprised.", category: "emotion" },

    // 시간
    어제: { english: "yesterday", example: "yesterday (어제 - 과거동사 사용)", category: "time" },
    주말: { english: "on the weekend", example: "last weekend (지난 주말에)", category: "time" },
    오늘: { english: "today", example: "today (오늘)", category: "time" },
    방학: { english: "vacation", example: "during vacation (방학 동안)", category: "time" },
  };

  const vocabHints: Array<{ korean: string; english: string; example: string }> = [];
  const text = (koreanIdea + " " + (topicTitle || "")).toLowerCase();
  const matchedCategories = new Set<string>();

  for (const [k, v] of Object.entries(dict)) {
    if (text.includes(k)) {
      vocabHints.push({
        korean: k,
        english: v.english,
        example: v.example,
      });
      matchedCategories.add(v.category);
      if (vocabHints.length >= 4) break;
    }
  }

  // 만약 사전에 매칭되지 않은 특수 단어가 있다면 기본 중1 표현 추출
  if (vocabHints.length < 2) {
    if (text.includes("좋") || text.includes("좋아")) {
      vocabHints.push({ korean: "좋아하다", english: "like / love", example: "I like to [동사]" });
    }
    if (text.includes("갔") || text.includes("가다")) {
      vocabHints.push({ korean: "갔다", english: "went (go의 과거형)", example: "I went to [장소]" });
    }
    if (text.includes("보") || text.includes("봤")) {
      vocabHints.push({ korean: "보았다", english: "saw / watched", example: "I watched [대상]" });
    }
    if (text.includes("만들")) {
      vocabHints.push({ korean: "만들었다", english: "made (make의 과거형)", example: "I made [음식/물건]" });
    }
  }

  // 동적 문장 패턴 생성 (학생의 소재에 맞춤)
  const sentencePatterns: Array<{ pattern: string; meaning: string }> = [];

  if (matchedCategories.has("environment")) {
    sentencePatterns.push({
      pattern: "I will not [동사: eat / use] [대상] to protect the environment.",
      meaning: "나는 환경을 보호하기 위해 [대상]을(를) [먹지/사용하지] 않을 것이다.",
    });
    sentencePatterns.push({
      pattern: "Factories emit [매연: smoke], so I decided to [행동].",
      meaning: "공장에서 [매연]을 내뿜기 때문에, 나는 [행동]하기로 결심했다.",
    });
  }

  if (matchedCategories.has("food")) {
    if (text.includes("않") || text.includes("안먹") || text.includes("줄이")) {
      sentencePatterns.push({
        pattern: "I decided not to eat [음식 이름] because of [이유].",
        meaning: "나는 [이유] 때문에 [음식]을(를) 먹지 않기로 했다.",
      });
    } else {
      sentencePatterns.push({
        pattern: "I ate [음식 이름] and it was really [맛/느낌: delicious/spicy].",
        meaning: "나는 [음식]을 먹었고 그것은 정말 [맛있/매웠]어요.",
      });
    }
  }

  if (matchedCategories.has("sports")) {
    sentencePatterns.push({
      pattern: "I played [운동] with my [사람] and had a great time.",
      meaning: "나는 [사람]과 [운동]을 했고 정말 즐거운 시간을 보냈어요.",
    });
  }

  if (matchedCategories.has("place")) {
    sentencePatterns.push({
      pattern: "I went to [장소] because I wanted to [하고 싶었던 행동].",
      meaning: "나는 [행동]을 하고 싶어서 [장소]에 갔어요.",
    });
  }

  if (matchedCategories.has("hobby")) {
    sentencePatterns.push({
      pattern: "I enjoyed [취미/활동] in my free time.",
      meaning: "나는 자유 시간에 [취미/활동]을 즐겼어요.",
    });
  }

  if (sentencePatterns.length === 0) {
    sentencePatterns.push({
      pattern: "I [과거동사] [대상] [시간/장소: yesterday / at home].",
      meaning: "나는 [시간/장소]에 [대상]을 [행동]했어요.",
    });
    sentencePatterns.push({
      pattern: "It made me feel [감정: happy / proud / excited].",
      meaning: "그것은 나를 [행복하게/뿌듯하게/신나게] 만들어 주었어요.",
    });
  }

  return {
    isAmbiguous: false,
    clarificationMessage: "",
    guidingQuestions: [],
    cheeringMessage: `"${koreanIdea.slice(0, 20)}${koreanIdea.length > 20 ? "..." : ""}"에 대한 생각 정말 좋아요! 아래 맞춤 단어와 괄호 패턴을 채워 첫 문장을 적어보세요. ✨`,
    vocabHints: vocabHints.slice(0, 4),
    sentencePatterns: sentencePatterns.slice(0, 3),
  };
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
  const { koreanIdea, topicTitle } = req.body;
  if (!koreanIdea || typeof koreanIdea !== "string" || !koreanIdea.trim()) {
    return res.status(400).json({ success: false, error: "koreanIdea is required" });
  }

  const trimmedInput = koreanIdea.trim();

  // 1차 모호성 검사 (너무 짧거나 자음/무의미한 단어인 경우 친절한 안내와 생각 유도 질문 즉시 반환)
  const quickAmbiguity = isKoreanInputAmbiguous(trimmedInput);
  if (quickAmbiguity.isAmbiguous) {
    const fallbackHints = generateFallbackHints(trimmedInput, topicTitle);
    return res.json({
      success: true,
      hints: fallbackHints,
      modelUsed: "instant-validation",
      isFallback: false,
    });
  }

  try {
    const systemInstruction = `You are an expert bilingual Korean-English writing coach for Korean 7th-grade students (대한민국 중학교 1학년 / 만 13세).
Your primary task is to deeply and dynamically analyze the student's Korean input ({{student_input}}) to generate personalized, level-appropriate English vocabulary and structural sentence patterns.

[CRITICAL INSTRUCTIONS & STRICT CONSTRAINTS]
1. STRICTLY DYNAMIC CONTENT EXTRACTION (ANTI-BOILERPLATE MANDATE):
   - You MUST analyze the specific entities, nouns, verbs, emotions, and context provided in {{student_input}}.
   - You are STRICTLY FORBIDDEN from returning predefined, stock filler expressions (such as generic "play with my friends", "spend time", "like/enjoy", or "happy/excited") unless the student's Korean text explicitly describes those exact subjects.
   - Every single vocabulary hint and sentence pattern MUST directly trace back to the student's unique words and thoughts.

2. AMBIGUITY & VAGUENESS DETECTION (정확한 입력 요청):
   - You must evaluate whether the student's input contains enough concrete information (who, what, where, action, or feeling) to produce meaningful English hints.
   - The input MUST be flagged as ambiguous ("isAmbiguous": true) if it meets ANY of these criteria:
     * Too short: Less than 4-5 Korean characters or only 1-2 fragmented words (e.g., "좋다", "밥", "어제", "축구", "그냥").
     * Consonant/vowel/symbol only: Slang like "ㅋㅋㅋ", "ㅎㅎ", "ㅇㅇ", "ㅠㅠ", "^^", or keyboard smashing.
     * Evasive or non-informative phrases: "몰라요", "생각 안 남", "아무거나", "글쓰기 싫어", "없음".
     * Incoherent or fragmented input that does not convey an action, subject, or context.
   - WHEN AMBIGUOUS ("isAmbiguous": true):
     * "clarificationMessage": Provide an encouraging, gentle explanation in Korean asking the student to write more specifically (e.g. explain that telling 'who, when, what was done, or how they felt' allows the AI to provide great custom hints, and give a friendly example like "어제 점심에 친구와 떡볶이를 먹었는데 정말 맛있었다").
     * "guidingQuestions": Provide 2-3 tailored Korean guiding questions related to the topic to prompt their ideas.
     * "cheeringMessage": Friendly short cheer asking for a bit more detail.
     * "vocabHints": [] (empty array)
     * "sentencePatterns": [] (empty array)
   - WHEN CLEAR AND MEANINGFUL ("isAmbiguous": false):
     * "clarificationMessage": ""
     * "guidingQuestions": []
     * "cheeringMessage": A tailored, non-generic cheer referencing the student's specific topic or activity.
     * "vocabHints": Exactly 3-5 vocabulary hints mapped directly to words in {{student_input}}.
     * "sentencePatterns": Exactly 2-3 scaffolded sentence patterns with bracketed placeholders (e.g. "[동사]", "[음식]", "[장소]") fitting the student's exact sentence structure.

3. GRADE 7 CURRICULUM LEVEL (중1 수준):
   - Keep vocabulary within the Ministry of Education 800 basic vocabulary words.
   - If past actions are described, provide the past tense with the root verb (e.g. "ate (eat의 과거형: 먹었다)").
   - DO NOT provide a finished translation of the whole sentence. Always provide fill-in-the-blank brackets so the student constructs their own draft.

4. OUTPUT FORMAT:
   - Output MUST strictly be valid JSON conforming to the requested schema with no surrounding commentary or markdown code blocks.`;

    const prompt = `
[글쓰기 주제]
${topicTitle || "자유 주제"}

[학생이 작성한 한글 생각 ({{student_input}})]
"""
${trimmedInput}
"""

위 학생의 입력값({{student_input}})을 동적으로 정밀 분석하여, 아래 규격에 맞는 JSON으로 응답하세요.

[응답 포맷 1: 학생 입력이 모호하거나 너무 짧은 경우]
{
  "isAmbiguous": true,
  "clarificationMessage": "구체적인 한국어 보완 요청 안내문 (예: '어떤 일이나 장소, 기분에 대해 쓰고 싶은지 조금만 더 구체적으로 적어줄 수 있나요? (예: \"어제 점심에 가족과 김밥을 만들었는데 재미있었다\"처럼 누가, 무엇을 했는지 적어주면 딱 맞는 멋진 영어 힌트를 줄게요!)')",
  "guidingQuestions": [
    "생각을 이끌어내는 질문 1 (예: 언제, 어디서 있었던 일인가요?)",
    "생각을 이끌어내는 질문 2 (예: 누구와 함께 무엇을 했나요?)",
    "생각을 이끌어내는 질문 3 (예: 그 순간 어떤 기분이나 생각이 들었나요?)"
  ],
  "cheeringMessage": "구체적인 생각을 조금만 더 적어주면 딱 맞는 영어 힌트를 준비해 줄게요! 😊",
  "vocabHints": [],
  "sentencePatterns": []
}

[응답 포맷 2: 학생 입력에 구체적인 내용과 상황이 담겨 있는 경우]
{
  "isAmbiguous": false,
  "clarificationMessage": "",
  "guidingQuestions": [],
  "cheeringMessage": "학생의 구체적인 소재(활동, 음식, 감정 등)를 직접 언급하며 격려하는 맞춤형 한마디",
  "vocabHints": [
    {
      "korean": "{{student_input}}에서 추출한 한글 단어/표현",
      "english": "중1 수준 영단어 (과거 시제 필요 시 과거형 명시)",
      "example": "문장에서 바로 쓸 수 있는 짧은 예시 표현"
    }
  ],
  "sentencePatterns": [
    {
      "pattern": "학생의 한글 문장 구조에 1:1로 맞춘 빈칸 괄호 패턴 (예: I [과거동사] [대상] at [장소].)",
      "meaning": "해당 문장 패턴의 한글 뜻"
    }
  ]
}
`;

    const result = await generateWithDualModelFallback({
      contents: prompt,
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.5,
    });

    const parsed = cleanAndParseJson(result.text, null);
    if (parsed && (parsed.cheeringMessage || parsed.clarificationMessage)) {
      return res.json({
        success: true,
        hints: {
          isAmbiguous: Boolean(parsed.isAmbiguous),
          clarificationMessage: parsed.clarificationMessage || "",
          guidingQuestions: Array.isArray(parsed.guidingQuestions) ? parsed.guidingQuestions : [],
          cheeringMessage: parsed.cheeringMessage || "정말 멋진 생각이에요! 차근차근 시작해 보세요. ✨",
          vocabHints: Array.isArray(parsed.vocabHints) ? parsed.vocabHints : [],
          sentencePatterns: Array.isArray(parsed.sentencePatterns) ? parsed.sentencePatterns : [],
        },
        modelUsed: result.modelUsed,
        isFallback: result.isFallback,
      });
    }

    // JSON 형태가 불완전할 경우 안전한 동적 힌트 생성기 호출
    const fallbackHints = generateFallbackHints(trimmedInput, topicTitle);
    return res.json({ success: true, hints: fallbackHints, modelUsed: result.modelUsed + "-fallback", isFallback: true });
  } catch (error: any) {
    console.warn("Hints generation API error, activating fallback generator:", error?.message);
    const fallbackHints = generateFallbackHints(trimmedInput, topicTitle);
    return res.json({
      success: true,
      hints: fallbackHints,
      modelUsed: "smart-rule-fallback",
      isFallback: true,
    });
  }
});

// 7. Step 1 AI Grammar Check (1차 문법 오류 교정)
app.post("/api/gemini/grammar-check", async (req, res) => {
  const { draftText, koreanIdea, topicTitle } = req.body;
  if (!draftText) {
    return res.status(400).json({ success: false, error: "draftText is required" });
  }

  try {
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

    const parsed = cleanAndParseJson(result.text, null);
    if (parsed && parsed.improvedDraft) {
      return res.json({ success: true, feedback: parsed, modelUsed: result.modelUsed, isFallback: result.isFallback });
    }

    return res.json({
      success: true,
      feedback: {
        praiseMessage: "첫 영어 문장을 용기 있게 작성한 멋진 도전이에요! 문장의 기본 형태가 잘 갖추어져 있습니다. 👏",
        corrections: [],
        improvedDraft: draftText,
      },
      modelUsed: result.modelUsed + "-fallback",
      isFallback: true,
    });
  } catch (error: any) {
    console.warn("Grammar check API error, activating fallback generator:", error?.message);
    return res.json({
      success: true,
      feedback: {
        praiseMessage: "스스로 영어 문장을 완성한 훌륭한 시도예요! 문법 검토를 이어 진행할 수 있습니다. 👏",
        corrections: [],
        improvedDraft: draftText,
      },
      modelUsed: "smart-rule-fallback",
      isFallback: true,
    });
  }
});

// 8. Step 2 AI Expression Expansion (2차 표현 확장 제안)
app.post("/api/gemini/expression-expansion", async (req, res) => {
  const { currentText, koreanIdea, topicTitle } = req.body;
  if (!currentText) {
    return res.status(400).json({ success: false, error: "currentText is required" });
  }

  try {
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

    const parsed = cleanAndParseJson(result.text, null);
    if (parsed && parsed.suggestionTitle) {
      return res.json({ success: true, suggestion: parsed, modelUsed: result.modelUsed, isFallback: result.isFallback });
    }

    const sentences = currentText.split(/[.!?]+/).filter(Boolean);
    const targetSentence = sentences[0]?.trim() || currentText;

    return res.json({
      success: true,
      suggestion: {
        targetSentence,
        suggestionTitle: "감정이나 느낌을 나타내는 단어 더하기",
        friendlyGuide: "문장에 그때의 기분(happy, excited)이나 장소(at school, at home)를 덧붙여 더 생생하게 만들어 보세요!",
        exampleKeywords: ["happy (행복한)", "excited (신나는)", "with my friends (친구들과 함께)"],
        exampleResult: `${targetSentence}. It was very exciting!`,
      },
      modelUsed: result.modelUsed + "-fallback",
      isFallback: true,
    });
  } catch (error: any) {
    console.warn("Expression expansion API error, activating fallback generator:", error?.message);
    const sentences = currentText.split(/[.!?]+/).filter(Boolean);
    const targetSentence = sentences[0]?.trim() || currentText;

    return res.json({
      success: true,
      suggestion: {
        targetSentence,
        suggestionTitle: "감정이나 느낌을 나타내는 단어 더하기",
        friendlyGuide: "문장에 그때의 기분(happy, excited)이나 장소(at school, at home)를 덧붙여 더 생생하게 만들어 보세요!",
        exampleKeywords: ["happy (행복한)", "excited (신나는)", "with my friends (친구들과 함께)"],
        exampleResult: `${targetSentence}. It was very exciting!`,
      },
      modelUsed: "smart-rule-fallback",
      isFallback: true,
    });
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
