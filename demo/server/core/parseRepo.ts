import type { ParsedRepo } from "./types";

export function parseRepo(input: string): ParsedRepo | null {
  const cleanInput = input.trim();
  const match = cleanInput.match(
    /^(?:https?:\/\/)?(?:www\.)?(?:github\.com\/)?([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/.*)?$/
  );

  if (!match) return null;

  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");

  if (!owner || !repo) return null;

  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
  };
}

