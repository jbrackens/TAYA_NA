import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useConfirm } from "../app/hooks/useConfirm";

// Confirm-lifecycle tests for the useConfirm hook. Exercises the
// open -> confirm/cancel -> close state machine via RTL's built-in
// `renderHook` (added to @testing-library/react in v13; only available
// after the v11 -> v16 upgrade — previously this lived in the separate
// @testing-library/react-hooks package).
describe("useConfirm", () => {
  it("starts closed with the default copy", () => {
    const { result } = renderHook(() => useConfirm());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.confirmText).toBe("Confirm");
    expect(result.current.cancelText).toBe("Cancel");
  });

  it("openConfirm merges options and flips isOpen true", () => {
    const { result } = renderHook(() => useConfirm());
    act(() => {
      result.current.openConfirm({
        title: "Suspend Account",
        message: "Are you sure?",
        variant: "danger",
      });
    });
    expect(result.current.isOpen).toBe(true);
    expect(result.current.title).toBe("Suspend Account");
    expect(result.current.message).toBe("Are you sure?");
    expect(result.current.variant).toBe("danger");
    expect(result.current.isLoading).toBe(false);
  });

  it("handleConfirm runs the async onConfirm callback then closes", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useConfirm());

    act(() => {
      result.current.openConfirm({ title: "T", message: "M", onConfirm });
    });
    await act(async () => {
      await result.current.handleConfirm();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
  });

  it("handleConfirm still closes when onConfirm rejects (finally clause)", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useConfirm());

    act(() => {
      result.current.openConfirm({ title: "T", message: "M", onConfirm });
    });
    await act(async () => {
      await expect(result.current.handleConfirm()).rejects.toThrow("boom");
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
  });

  it("handleCancel runs onCancel and closes without invoking onConfirm", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() => useConfirm());

    act(() => {
      result.current.openConfirm({
        title: "T",
        message: "M",
        onConfirm,
        onCancel,
      });
    });
    act(() => {
      result.current.handleCancel();
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
  });
});
