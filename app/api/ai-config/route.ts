import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAIConfig,
  LLM_PROVIDERS,
  DEFAULT_MODELS,
  PROVIDER_MODELS,
  PROVIDER_LABELS,
  isValidLLMProvider,
  type LLMProvider,
} from "@/lib/aiConfig";
import { getUserAIConfig, saveUserAIConfig } from "@/lib/userAiConfig";
import { testLLMConnection } from "@/lib/llm";

/** GET /api/ai-config — returns current config + available options */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runtimeConfig = getAIConfig();
  const userConfig = await getUserAIConfig(session.user.id);
  const config = {
    provider: userConfig.provider,
    model: userConfig.model,
    embeddingModel: runtimeConfig.embeddingModel,
  };

  return NextResponse.json({
    config,
    options: {
      providers: LLM_PROVIDERS.map((p) => ({
        id: p,
        label: PROVIDER_LABELS[p],
        defaultModel: DEFAULT_MODELS[p],
        models: PROVIDER_MODELS[p],
      })),
    },
    hasGroqKey: !!process.env.GROQ_API_KEY,
    hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
  });
}

/** POST /api/ai-config — update provider and/or model */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    provider?: string;
    model?: string;
    test?: boolean;
  };

  const current = await getUserAIConfig(session.user.id);

  const provider: LLMProvider =
    typeof body.provider === "string" && isValidLLMProvider(body.provider)
      ? body.provider
      : current.provider;

  const requestedModel =
    typeof body.model === "string" && body.model.trim().length > 0
      ? body.model.trim()
      : "";

  const model = requestedModel ||
    (provider !== current.provider ? DEFAULT_MODELS[provider] : current.model);

  const saved = await saveUserAIConfig(session.user.id, { provider, model });
  const config = {
    ...saved,
    embeddingModel: getAIConfig().embeddingModel,
  };

  // If test flag set, also run a connection test
  if (body.test) {
    const result = await testLLMConnection(config.provider, config.model);
    return NextResponse.json({ config, test: result });
  }

  return NextResponse.json({ config });
}

/** POST /api/ai-config/test — dedicated test endpoint */
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { provider?: string; model?: string };
  const current = await getUserAIConfig(session.user.id);

  const provider =
    typeof body.provider === "string" && isValidLLMProvider(body.provider)
      ? body.provider
      : current.provider;

  const model = typeof body.model === "string" && body.model.trim()
    ? body.model.trim()
    : current.model;

  const result = await testLLMConnection(provider, model);
  return NextResponse.json(result);
}
