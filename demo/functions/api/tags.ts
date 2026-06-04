import { getReleasesForRepo } from "../../server/core/analysis";
import { releasesToTagList } from "../../server/core/github";
import { errorResponse, jsonResponse, optionsResponse } from "../../server/core/http";
import { parseRepo } from "../../server/core/parseRepo";
import { officialReleasesOnly } from "../../server/core/range";
import type { RuntimeEnv } from "../../server/core/types";

interface PagesContext {
  request: Request;
  env: RuntimeEnv;
}

export const onRequestOptions = () => optionsResponse();

export const onRequestGet = async (context: PagesContext) => {
  try {
    const url = new URL(context.request.url);
    const repoQuery = url.searchParams.get("repo") || "";
    const parsed = parseRepo(repoQuery);

    if (!parsed) {
      return errorResponse("Invalid repository format. Use owner/repo or a GitHub URL.", 400);
    }

    const releaseResult = await getReleasesForRepo(parsed, context.env);
    const officialReleases = officialReleasesOnly(releaseResult.releases);

    return jsonResponse({
      tags: releasesToTagList(officialReleases),
      source: "releases",
      cached: releaseResult.cached,
      stale: releaseResult.stale,
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to load repository releases.", 500);
  }
};

