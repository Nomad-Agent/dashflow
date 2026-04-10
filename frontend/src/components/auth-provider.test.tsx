import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  refreshAccessToken: vi.fn(),
}));

import { useAuth, AuthProvider } from "@/components/auth-provider";
import { refreshAccessToken } from "@/lib/api";

function Probe() {
  const { token, ready } = useAuth();
  return (
    <div>
      <span data-testid="ready">{String(ready)}</span>
      <span data-testid="token">{token ?? "none"}</span>
    </div>
  );
}

describe("AuthProvider", () => {
  it("refreshes token on mount and marks ready", async () => {
    vi.mocked(refreshAccessToken).mockResolvedValue("jwt-token");

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("true"));
    expect(screen.getByTestId("token")).toHaveTextContent("jwt-token");
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });
});
