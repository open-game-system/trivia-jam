import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CastButton } from "../CastButton";
import {
  CastProvider,
} from "@open-game-system/cast-kit-react";
import {
  CAST_INITIAL_STATE,
  _resetBridge,
  getCastBridge,
} from "@open-game-system/cast-kit-core";
import type { CastState } from "@open-game-system/cast-kit-core";

function initCastStore(data: CastState) {
  getCastBridge();
  window.dispatchEvent(
    new MessageEvent("message", {
      data: JSON.stringify({
        type: "STATE_INIT",
        storeKey: "cast",
        data,
      }),
    })
  );
}

function renderCastButton(overrides?: Partial<CastState>) {
  const state: CastState = {
    ...CAST_INITIAL_STATE,
    ...overrides,
    session: {
      ...CAST_INITIAL_STATE.session,
      ...(overrides?.session ?? {}),
    },
  };

  initCastStore(state);

  return render(
    <CastProvider>
      <CastButton />
    </CastProvider>
  );
}

describe("CastButton", () => {
  beforeEach(() => {
    _resetBridge();
    vi.stubGlobal("ReactNativeWebView", {
      postMessage: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders nothing when no devices are available", () => {
    renderCastButton();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders a cast button when devices are available", () => {
    renderCastButton({
      isAvailable: true,
      devices: [
        { id: "device-1", name: "Living Room TV", type: "chromecast" },
      ],
    });

    const button = screen.getByRole("button");
    expect(button).toBeDefined();
    expect(button.getAttribute("title")).toBe("Cast to device");
  });

  it("shows connected state when casting", () => {
    renderCastButton({
      isAvailable: true,
      devices: [
        { id: "device-1", name: "Living Room TV", type: "chromecast" },
      ],
      session: {
        status: "connected",
        deviceId: "device-1",
        deviceName: "Living Room TV",
        sessionId: "session-1",
        streamSessionId: null,
      },
    });

    expect(screen.getByText("Connected")).toBeDefined();
  });

  it("shows connecting state", () => {
    renderCastButton({
      isAvailable: true,
      devices: [
        { id: "device-1", name: "Living Room TV", type: "chromecast" },
      ],
      session: {
        status: "connecting",
        deviceId: null,
        deviceName: null,
        sessionId: null,
        streamSessionId: null,
      },
    });

    expect(screen.getByText("Connecting")).toBeDefined();
  });

  it("disables button when connecting", () => {
    renderCastButton({
      isAvailable: true,
      devices: [
        { id: "device-1", name: "Living Room TV", type: "chromecast" },
      ],
      session: {
        status: "connecting",
        deviceId: null,
        deviceName: null,
        sessionId: null,
        streamSessionId: null,
      },
    });

    const button = screen.getByRole("button");
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("dispatches STOP_CASTING when connected and clicked", () => {
    renderCastButton({
      isAvailable: true,
      devices: [
        { id: "device-1", name: "Living Room TV", type: "chromecast" },
      ],
      session: {
        status: "connected",
        deviceId: "device-1",
        deviceName: "Living Room TV",
        sessionId: "session-1",
        streamSessionId: null,
      },
    });

    const button = screen.getByRole("button");
    fireEvent.click(button);

    const postMessage = (window as any).ReactNativeWebView.postMessage;
    const lastCall =
      postMessage.mock.calls[postMessage.mock.calls.length - 1][0];
    const parsed = JSON.parse(lastCall);
    expect(parsed.event.type).toBe("STOP_CASTING");
  });

  it("dispatches SHOW_CAST_PICKER when available and clicked", () => {
    renderCastButton({
      isAvailable: true,
      devices: [
        { id: "device-1", name: "Living Room TV", type: "chromecast" },
      ],
    });

    const button = screen.getByRole("button");
    fireEvent.click(button);

    const postMessage = (window as any).ReactNativeWebView.postMessage;
    const lastCall =
      postMessage.mock.calls[postMessage.mock.calls.length - 1][0];
    const parsed = JSON.parse(lastCall);
    expect(parsed.event.type).toBe("SHOW_CAST_PICKER");
  });
});
