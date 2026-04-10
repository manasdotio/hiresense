import { prisma } from "@/lib/prisma";
import {
  DEFAULT_MODELS,
  getAIConfig,
  isValidLLMProvider,
  type LLMProvider,
} from "@/lib/aiConfig";

export type UserAISelection = {
  provider: LLMProvider;
  model: string;
};

function normalizeModel(provider: LLMProvider, model: string | null | undefined): string {
  const trimmed = typeof model === "string" ? model.trim() : "";
  return trimmed.length > 0 ? trimmed : DEFAULT_MODELS[provider];
}

export async function getUserAIConfig(userId: string): Promise<UserAISelection> {
  const saved = await prisma.userAIConfig.findUnique({
    where: { userId },
    select: { provider: true, model: true },
  });

  if (!saved) {
    const runtime = getAIConfig();
    return {
      provider: runtime.provider,
      model: normalizeModel(runtime.provider, runtime.model),
    };
  }

  const fallbackProvider = getAIConfig().provider;
  const provider = isValidLLMProvider(saved.provider)
    ? saved.provider
    : fallbackProvider;

  return {
    provider,
    model: normalizeModel(provider, saved.model),
  };
}

export async function saveUserAIConfig(
  userId: string,
  config: UserAISelection,
): Promise<UserAISelection> {
  const model = normalizeModel(config.provider, config.model);

  const saved = await prisma.userAIConfig.upsert({
    where: { userId },
    update: {
      provider: config.provider,
      model,
    },
    create: {
      userId,
      provider: config.provider,
      model,
    },
    select: {
      provider: true,
      model: true,
    },
  });

  return {
    provider: config.provider,
    model: saved.model,
  };
}
