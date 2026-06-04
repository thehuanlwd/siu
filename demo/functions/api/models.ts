import { fetchModelList } from "../../server/core/ai";
import { errorResponse, jsonResponse, optionsResponse } from "../../server/core/http";
import type { RuntimeEnv } from "../../server/core/types";

interface PagesContext {
  request: Request;
  env: RuntimeEnv;
}

export const onRequestOptions = () => optionsResponse();

export const onRequestPost = async (context: PagesContext) => {
  try {
    const body = await context.request.json().catch(() => ({}));
    const models = await fetchModelList(
      {
        customApiUrl: body.customApiUrl,
        customApiKey: body.customApiKey,
      },
      context.env
    );

    return jsonResponse({ models });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch model list.", 500);
  }
};

