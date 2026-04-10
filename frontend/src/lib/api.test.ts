import { afterEach, describe, expect, it, vi } from "vitest";

import { apiJson, getApiBaseUrl, refreshAccessToken } from "@/lib/api";

describe("api utilities", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("reads NEXT_PUBLIC_API_URL and trims trailing slash", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000/api/v1/";
    expect(getApiBaseUrl()).toBe("http://localhost:8000/api/v1");
  });

  it("refreshAccessToken returns null for non-OK responses", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000/api/v1";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );
    const token = await refreshAccessToken();
    expect(token).toBeNull();
  });

  it("apiJson sends bearer token and credentials include", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000/api/v1";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ value: 42 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiJson<{ value: number }>("/workspaces", {
      token: "abc",
    });

    expect(result).toEqual({ value: 42 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/v1/workspaces");
    expect(opts.credentials).toBe("include");
    expect((opts.headers as Headers).get("Authorization")).toBe("Bearer abc");
  });
});
