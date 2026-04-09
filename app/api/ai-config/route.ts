import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAIConfig,
  setAIConfig,
  DEFAULT_MODELS,
  PROVIDER_MODELS,
  PROVIDER_LABELS,
  type LLMProvider,
} from "@/lib/aiConfig";
import { testLLMConnection } from "@/lib/llm";

/** GET /api/ai-config — returns current config + available options */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getAIConfig();

  return NextResponse.json({
    config,
    options: {
      providers: (["local", "groq", "openrouter"] as LLMProvider[]).map((p) => ({
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

  const validProviders: LLMProvider[] = ["local", "groq", "openrouter"];
  const provider = validProviders.includes(body.provider as LLMProvider)
    ? (body.provider as LLMProvider)
    : undefined;

  const model = typeof body.model === "string" && body.model.trim()
    ? body.model.trim()
    : undefined;

  // Update runtime config
  setAIConfig({ provider, model });

  // If test flag set, also run a connection test
  if (body.test) {
    const config = getAIConfig();
    const result = await testLLMConnection(config.provider, config.model);
    return NextResponse.json({ config: getAIConfig(), test: result });
  }

  return NextResponse.json({ config: getAIConfig() });
}

/** POST /api/ai-config/test — dedicated test endpoint */
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { provider?: string; model?: string };
  const validProviders: LLMProvider[] = ["local", "groq", "openrouter"];
  const provider = validProviders.includes(body.provider as LLMProvider)
    ? (body.provider as LLMProvider)
    : getAIConfig().provider;

  const model = typeof body.model === "string" && body.model.trim()
    ? body.model.trim()
    : getAIConfig().model;

  const result = await testLLMConnection(provider, model);
  return NextResponse.json(result);
}
