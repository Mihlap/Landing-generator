import https from "node:https";
import GigaChat from "gigachat";

const YANDEX_COMPLETION_URL = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";
const ZAI_COMPLETION_URL = "https://api.z.ai/api/paas/v4/chat/completions";
const ZAI_CODING_COMPLETION_URL = "https://api.z.ai/api/coding/paas/v4/chat/completions";

export type LlmProvider = "yandex" | "gigachat" | "openai" | "zai";

function hasYandexCreds(): boolean {
  const folder = process.env.YANDEX_CLOUD_FOLDER_ID?.trim();
  const iam = process.env.YANDEX_IAM_TOKEN?.trim();
  const apiKey = process.env.YANDEX_API_KEY?.trim();
  return Boolean(folder && (iam || apiKey));
}

function hasGigaCreds(): boolean {
  return Boolean(process.env.GIGACHAT_CREDENTIALS?.trim());
}

function hasOpenaiCreds(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function hasZaiCreds(): boolean {
  return Boolean(process.env.ZAI_API_KEY?.trim() || process.env.AI_ZZZ?.trim());
}

export function resolveLlmProvider(): LlmProvider | "none" {
  const forced = process.env.AI_PROVIDER?.toLowerCase().trim();

  if (forced === "zai" || forced === "z.ai") return hasZaiCreds() ? "zai" : "none";
  if (forced === "yandex") return hasYandexCreds() ? "yandex" : "none";
  if (forced === "gigachat") return hasGigaCreds() ? "gigachat" : "none";
  if (forced === "openai") return hasOpenaiCreds() ? "openai" : "none";

  if (hasGigaCreds()) return "gigachat";
  if (hasZaiCreds()) return "zai";
  if (hasYandexCreds()) return "yandex";
  if (hasOpenaiCreds()) return "openai";
  return "none";
}

async function completeYandex(
  system: string,
  user: string,
  opts?: { maxTokens?: string },
): Promise<string> {
  const folder = process.env.YANDEX_CLOUD_FOLDER_ID!.trim();
  const modelUri =
    process.env.YANDEX_MODEL_URI?.trim() || `gpt://${folder}/yandexgpt/lite`;
  const apiKey = process.env.YANDEX_API_KEY?.trim();
  const iam = process.env.YANDEX_IAM_TOKEN?.trim();
  const auth = apiKey ? `Api-Key ${apiKey}` : `Bearer ${iam!}`;

  const res = await fetch(YANDEX_COMPLETION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
    },
    body: JSON.stringify({
      modelUri,
      completionOptions: {
        stream: false,
        temperature: 0.6,
        maxTokens: opts?.maxTokens ?? "2000",
      },
      messages: [
        { role: "system", text: system },
        { role: "user", text: user },
      ],
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`YandexGPT ${res.status}: ${raw.slice(0, 400)}`);
  }

  let json: { result?: { alternatives?: { message?: { text?: string } }[] } };
  try {
    json = JSON.parse(raw) as typeof json;
  } catch {
    throw new Error("YandexGPT: не удалось разобрать ответ");
  }

  const text = json.result?.alternatives?.[0]?.message?.text?.trim() ?? "";
  if (!text) throw new Error("YandexGPT: пустой ответ модели");
  return text;
}

async function completeGigachat(
  system: string,
  user: string,
  opts?: { maxTokens?: number },
): Promise<string> {
  const credentials = process.env.GIGACHAT_CREDENTIALS!.trim();
  const scope = process.env.GIGACHAT_SCOPE?.trim() || "GIGACHAT_API_PERS";
  const model = process.env.GIGACHAT_MODEL?.trim() || "GigaChat";

  const httpsAgent = new https.Agent({ rejectUnauthorized: false });
  const client = new GigaChat({
    credentials,
    scope,
    model,
    httpsAgent,
    timeout: 180,
  });

  const completion = await client.chat({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.6,
    ...(opts?.maxTokens ? { max_tokens: opts.maxTokens } : {}),
  });

  const text = completion.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("GigaChat: пустой ответ модели");
  return text;
}

async function completeOpenai(
  system: string,
  user: string,
  opts?: { maxTokens?: number },
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY!.trim();
  const body: Record<string, unknown> = {
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.6,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (opts?.maxTokens) body.max_tokens = opts.maxTokens;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const errText = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status} ${errText}`);
  }

  const data = JSON.parse(errText) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("OpenAI: пустой ответ модели");
  return text;
}

async function completeZai(
  system: string,
  user: string,
  opts?: { maxTokens?: number },
): Promise<string> {
  const apiKey = (process.env.ZAI_API_KEY?.trim() || process.env.AI_ZZZ?.trim()) as string;
  const useCodingEndpoint = (process.env.ZAI_USE_CODING_ENDPOINT ?? "").trim().toLowerCase() === "true";
  const endpoint = useCodingEndpoint ? ZAI_CODING_COMPLETION_URL : ZAI_COMPLETION_URL;
  const body: Record<string, unknown> = {
    model: process.env.ZAI_MODEL?.trim() || "glm-5.1",
    temperature: 0.6,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (opts?.maxTokens) body.max_tokens = opts.maxTokens;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Accept-Language": "en-US,en",
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`ZAI ${res.status} ${raw}`);
  }

  const data = JSON.parse(raw) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("ZAI: пустой ответ модели");
  return text;
}

export async function runLlmCompletion(
  provider: LlmProvider,
  system: string,
  user: string,
): Promise<string> {
  switch (provider) {
    case "zai":
      return completeZai(system, user);
    case "yandex":
      return completeYandex(system, user);
    case "gigachat":
      return completeGigachat(system, user);
    case "openai":
      return completeOpenai(system, user);
    default:
      throw new Error("Неизвестный LLM-провайдер");
  }
}

export async function runLlmLandingHtml(
  provider: LlmProvider,
  system: string,
  user: string,
): Promise<string> {
  const gigaMax = Number(process.env.LANDING_HTML_MAX_TOKENS) || 8000;
  switch (provider) {
    case "zai":
      return completeZai(system, user, { maxTokens: 4096 });
    case "yandex":
      return completeYandex(system, user, { maxTokens: "4000" });
    case "gigachat":
      return completeGigachat(system, user, { maxTokens: gigaMax });
    case "openai":
      return completeOpenai(system, user, { maxTokens: 4096 });
    default:
      throw new Error("Неизвестный LLM-провайдер");
  }
}
