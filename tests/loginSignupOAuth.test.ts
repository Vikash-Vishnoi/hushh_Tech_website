// @vitest-environment jsdom

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const startOAuthMock = vi.fn();
const redirectToUrlMock = vi.fn();
const authState = {
  status: "anonymous",
};

vi.mock("../src/auth/AuthSessionProvider", () => ({
  useAuthSession: () => ({
    status: authState.status,
    startOAuth: (...args: unknown[]) => startOAuthMock(...args),
  }),
}));

vi.mock("../src/auth/authHost", async () => {
  const actual = await vi.importActual<typeof import("../src/auth/authHost")>(
    "../src/auth/authHost"
  );
  return {
    ...actual,
    redirectToUrl: (...args: unknown[]) => redirectToUrlMock(...args),
  };
});

vi.mock("../src/components/hushh-tech-header/HushhTechHeader", () => ({
  default: () => React.createElement("div", null, "header"),
}));

vi.mock("../src/components/hushh-tech-footer/HushhTechFooter", () => ({
  default: () => React.createElement("div", null, "footer"),
}));

vi.mock("../src/components/images/Hushhogo.png", () => ({
  default: "logo.png",
}));

import LoginPage from "../src/pages/login/ui";
import SignupPage from "../src/pages/signup/ui";

describe("login/signup OAuth UI", () => {
  let container: HTMLDivElement;
  let root: Root;

  const flush = async () => {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    authState.status = "anonymous";
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("shows an inline login error and re-enables the buttons when OAuth start fails", async () => {
    startOAuthMock.mockResolvedValue({
      ok: false,
      provider: "apple",
      reason: "missing_client",
      message: "Authentication is not configured for this build.",
    });

    await act(async () => {
      root.render(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(LoginPage)
        )
      );
    });
    await flush();

    const appleButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Continue with Apple")
    );

    await act(async () => {
      appleButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(startOAuthMock).toHaveBeenCalledWith("apple");
    expect(appleButton?.hasAttribute("disabled")).toBe(false);
    expect(container.textContent).toContain(
      "Authentication is not configured for this build."
    );
    expect(redirectToUrlMock).not.toHaveBeenCalled();
  });

  it("shows a signup fallback link and redirects unsupported hosts to the canonical host", async () => {
    startOAuthMock.mockResolvedValue({
      ok: false,
      provider: "google",
      reason: "unsupported_host",
      message: "Sign-in is only available on https://hushhtech.com.",
      redirectTo: "https://hushhtech.com/signup?redirect=%2Fprofile",
    });

    await act(async () => {
      root.render(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(SignupPage)
        )
      );
    });
    await flush();

    const googleButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Continue with Google")
    );

    await act(async () => {
      googleButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(startOAuthMock).toHaveBeenCalledWith("google");
    expect(redirectToUrlMock).toHaveBeenCalledWith(
      "https://hushhtech.com/signup?redirect=%2Fprofile"
    );
    expect(container.textContent).toContain(
      "Sign-in is only available on https://hushhtech.com."
    );

    const fallbackLink = Array.from(container.querySelectorAll("a")).find(
      (link) => link.textContent?.includes("supported sign-up host")
    );

    expect(fallbackLink?.getAttribute("href")).toBe(
      "https://hushhtech.com/signup?redirect=%2Fprofile"
    );
  });
});
