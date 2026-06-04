import { runAnalysis } from "../../server/core/analysis";
import { errorResponse, jsonResponse, optionsResponse } from "../../server/core/http";
import type { AnalyzeRequestBody, RuntimeEnv } from "../../server/core/types";

interface PagesContext {
  request: Request;
  env: RuntimeEnv;
}

export const onRequestOptions = () => optionsResponse();

export const onRequestPost = async (context: PagesContext) => {
  try {
    const body = (await context.request.json()) as AnalyzeRequestBody;
    const result = await runAnalysis(body, context.env);
    return jsonResponse(result);
  } catch (error: any) {
    return errorResponse(error.message || "Analysis failed.", 500);
  }
};

