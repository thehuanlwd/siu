import { explainReportItem } from "../../server/core/explain";
import { errorResponse, jsonResponse, optionsResponse } from "../../server/core/http";
import type { ExplainRequestBody, RuntimeEnv } from "../../server/core/types";

interface PagesContext {
  request: Request;
  env: RuntimeEnv;
}

export const onRequestOptions = () => optionsResponse();

export const onRequestPost = async (context: PagesContext) => {
  try {
    const body = (await context.request.json()) as ExplainRequestBody;
    const result = await explainReportItem(body, context.env);
    return jsonResponse(result);
  } catch (error: any) {
    return errorResponse(error.message || "Explanation failed.", 500);
  }
};
