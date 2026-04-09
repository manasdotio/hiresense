"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Settings2, CheckCircle2, XCircle } from "lucide-react";

type AIConfig = {
  provider: string;
  model: string;
  embeddingModel: string;
};

type ProviderOption = {
  id: string;
  label: string;
  defaultModel: string;
  models: { id: string; label: string }[];
};

type SettingsData = {
  config: AIConfig;
  options: { providers: ProviderOption[] };
  hasGroqKey: boolean;
  hasOpenRouterKey: boolean;
};

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latencyMs: number } | null>(null);

  // Draft state changes before saving test
  const [provider, setProvider] = useState<string>("local");
  const [model, setModel] = useState<string>("");

  useEffect(() => {
    fetch("/api/ai-config")
      .then((res) => res.json())
      .then((resData: SettingsData) => {
        setData(resData);
        setProvider(resData.config.provider);
        setModel(resData.config.model);
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Failed to load settings");
        setLoading(false);
      });
  }, []);

  const currentProviderOpts = data?.options.providers.find((p) => p.id === provider);

  async function handleSave(test = false) {
    if (test) setTesting(true);
    else setSaving(true);

    setTestResult(null);

    try {
      const res = await fetch("/api/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, test }),
      });
      const resultData = await res.json();

      if (!res.ok) throw new Error(resultData.error ?? "Failed to save");

      if (test && resultData.test) {
        setTestResult(resultData.test);
        if (resultData.test.ok) toast.success("Connection successful!");
        else toast.error("Connection failed");
      } else if (!test) {
        toast.success("Settings saved successfully");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setSaving(false);
      setTesting(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Settings2 className="size-5" />
          AI Provider Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure which LLM provider to use for processing resumes and analyzing data.
        </p>
      </div>

      <div className="space-y-6 bg-card border border-black/8 rounded-xl p-6 shadow-sm">
        {/* Provider Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">LLM Provider</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.options.providers.map((p) => {
              const isSelected = p.id === provider;
              const hasKey = p.id === "groq" ? data.hasGroqKey : p.id === "openrouter" ? data.hasOpenRouterKey : true;
              
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setProvider(p.id);
                    setModel(p.defaultModel);
                  }}
                  className={`relative flex flex-col items-start p-4 border rounded-lg text-left transition-all ${
                    isSelected
                      ? "border-blue-600 ring-1 ring-blue-600 bg-blue-50"
                      : "border-black/10 hover:border-black/20 hover:bg-black/5"
                  }`}
                >
                  <span className={`text-sm font-semibold ${isSelected ? "text-blue-700" : "text-foreground"}`}>
                    {p.label}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {!hasKey ? "Requires API config" : p.id === "local" ? "Uses LM Studio" : "Cloud provider"}
                  </span>
                  
                  {!hasKey && (
                    <span className="absolute top-3 right-3 flex size-2 rounded-full bg-red-500" title="Missing API Key in .env" />
                  )}
                  {hasKey && isSelected && (
                    <CheckCircle2 className="absolute top-3 right-3 size-4 text-blue-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Model Selection */}
        {currentProviderOpts && (
          <div className="space-y-3 pt-4 border-t border-black/8">
            <label className="text-sm font-medium text-foreground pb-1 block">Chat Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="flex h-10 w-full md:w-2/3 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {currentProviderOpts.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.id})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Embeddings will always use local LM Studio ({data.config.embeddingModel}).
            </p>
          </div>
        )}

        {/* Actions & Testing */}
        <div className="space-y-4 pt-6 border-t border-black/8">
          <div className="flex gap-3 items-center">
            <Button onClick={() => handleSave(false)} disabled={saving || testing}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Configuration
            </Button>
            
            <Button variant="secondary" onClick={() => handleSave(true)} disabled={saving || testing}>
              {testing && <Loader2 className="mr-2 size-4 animate-spin" />}
              Test Connection
            </Button>
          </div>

          {testResult && (
            <div className={`p-4 rounded-md text-sm flex gap-3 items-start border ${
              testResult.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
            }`}>
              {testResult.ok ? (
                <CheckCircle2 className="size-5 shrink-0 text-green-600" />
              ) : (
                <XCircle className="size-5 shrink-0 text-red-600" />
              )}
              <div>
                <p className="font-semibold mb-0.5">{testResult.ok ? "Connection Successful" : "Connection Failed"}</p>
                <p className="opacity-90 font-mono text-xs">{testResult.message}</p>
                <p className="text-xs mt-2 opacity-75 font-medium">Latency: {testResult.latencyMs}ms</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
