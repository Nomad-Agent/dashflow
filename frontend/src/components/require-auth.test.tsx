import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/components/auth-provider", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/components/auth-provider";
import { RequireAuth } from "@/components/require-auth";

describe("RequireAuth", () => {
  it("redirects to /login when ready without token", async () => {
    vi.mocked(useAuth).mockReturnValue({
      token: null,
      ready: true,
      setToken: vi.fn(),
      refresh: vi.fn(),
    });

    render(
      <RequireAuth>
        <div>secret</div>
      </RequireAuth>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("renders children when token exists", () => {
    vi.mocked(useAuth).mockReturnValue({
      token: "jwt",
      ready: true,
      setToken: vi.fn(),
      refresh: vi.fn(),
    });

    render(
      <RequireAuth>
        <div>secret</div>
      </RequireAuth>,
    );

    expect(screen.getByText("secret")).toBeInTheDocument();
  });
});
