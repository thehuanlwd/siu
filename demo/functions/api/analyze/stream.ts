import { fetchAiStream, logAiContext, normalizeAnalysis, resolveAiConfig } from "../../../server/core/ai";
import { prepareAnalysis } from "../../../server/core/analysis";
import { writeAnalysisCache } from "../../../server/core/cache";
import { corsHeaders, optionsResponse } from "../../../server/core/http";
import type { AnalyzeRequestBody, RuntimeEnv } from "../../../server/core/types";

interface PagesContext {
  request: Request;
  env: RuntimeEnv;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function isReasoningModel(model: string): boolean {
  return /(reasoning|deepseek-r1|(^|[-_])r1($|[-_])|(^|[-_])o[134]($|[-_])|gpt-5)/i.test(model);
}

export const onRequestOptions = () => optionsResponse();

export const onRequestPost = async (context: PagesContext) => {
  const stream = new ReadableStream({
    async start(controller) {
      const send = (value: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
      };

      try {
        const body = (await context.request.json()) as AnalyzeRequestBody;
        const lang = body.lang || "en";

        send({
          type: "status",
          stage: "reading",
          message: lang === "zh" ? "正在读取 GitHub Releases..." : "Reading GitHub Releases...",
        });

        const prepared = await prepareAnalysis(body, context.env);
        if ("status" in prepared) {
          send({ type: "done", response: prepared });
          controller.close();
          return;
        }

        if (prepared.cachedAnalysis) {
          logAiContext(context.env, {
            phase: "analysis_cache_hit",
            stream: true,
            cacheKey: prepared.cacheKey,
            repoFullName: prepared.repo.fullName,
            inputType: prepared.range.inputType,
            inputValue: prepared.range.inputValue,
            latestVersion: prepared.range.latestVersion,
            releaseCount: prepared.range.releasesToAnalyze.length,
            releaseHash: prepared.releaseHash,
            promptVersion: prepared.promptVersion,
            staleReleases: prepared.staleReleases,
            note: "AI request was skipped because analysis cache returned a result.",
          });

          send({
            type: "status",
            stage: "cached",
            message: lang === "zh" ? "命中跨用户缓存，正在载入结果..." : "Cross-user cache hit. Loading result...",
          });
          send({
            type: "done",
            response: {
              status: "success",
              analysis: prepared.cachedAnalysis,
              cached: true,
              staleReleases: prepared.staleReleases,
            },
          });
          controller.close();
          return;
        }

        send({
          type: "status",
          stage: "collected",
          releaseCount: prepared.range.releasesToAnalyze.length,
          message:
            lang === "zh"
              ? `已收集到 ${prepared.range.releasesToAnalyze.length} 个版本记录`
              : `Collected ${prepared.range.releasesToAnalyze.length} release records`,
        });

        const aiConfig = resolveAiConfig(prepared.request, context.env);
        send({
          type: "status",
          stage: "summarizing",
          message: lang === "zh" ? "正在汇总" : "Summarizing",
        });

        if (isReasoningModel(aiConfig.model)) {
          send({
            type: "status",
            stage: "reasoning",
            message: lang === "zh" ? "正在深度推理..." : "Deep reasoning in progress...",
          });
        }

        const aiResponse = await fetchAiStream({
          request: prepared.request,
          env: context.env,
          releases: prepared.range.releasesToAnalyze,
          cleanedReleases: prepared.cleanedReleases,
          repoProfile: prepared.repoProfile,
          repoFullName: prepared.repo.fullName,
          currentVersionLabel: prepared.range.currentVersionLabel,
          latestVersion: prepared.range.latestVersion,
        });

        send({
          type: "status",
          stage: "generating",
          tokenCount: 0,
          message: lang === "zh" ? "报告生成中..." : "Generating report...",
        });

        const reader = aiResponse.body!.getReader();
        let buffer = "";
        let content = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") continue;

            try {
              const json = JSON.parse(data);
              const delta = json?.choices?.[0]?.delta?.content || "";
              if (delta) {
                content += delta;
                send({ type: "delta", text: delta, approxTokenCount: Math.ceil(content.length / 4) });
              }
            } catch {
              // Ignore malformed provider stream chunks.
            }
          }
        }

        const analysis = normalizeAnalysis(JSON.parse(content || "{}"), {
          request: prepared.request,
          releases: prepared.range.releasesToAnalyze,
          repoFullName: prepared.repo.fullName,
          currentVersionLabel: prepared.range.currentVersionLabel,
          latestVersion: prepared.range.latestVersion,
        });

        logAiContext(context.env, {
          phase: "response",
          stream: true,
          model: resolveAiConfig(prepared.request, context.env).model,
          rawContent: content,
        });

        await writeAnalysisCache(
          {
            cacheKey: prepared.cacheKey || "",
            repoFullName: prepared.repo.fullName,
            inputType: prepared.range.inputType,
            inputValue: prepared.range.inputValue,
            latestVersion: prepared.range.latestVersion,
            releaseCount: prepared.range.releasesToAnalyze.length,
            releaseHash: prepared.releaseHash || "",
            lang: prepared.request.lang || "en",
            promptVersion: prepared.promptVersion,
            provider: aiConfig.provider,
            model: aiConfig.model,
            resultJson: analysis,
          },
          context.env
        );

        send({
          type: "done",
          response: {
            status: "success",
            analysis,
            cached: false,
            staleReleases: prepared.staleReleases,
          },
        });
        controller.close();
      } catch (error: any) {
        send({ type: "error", error: error.message || "Analysis stream failed." });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/x-ndjson; charset=utf-8",
    },
  });
};
