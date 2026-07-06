import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConfirmModal } from "../app/components/shared/ConfirmModal";

// Render-based tests for the shared ConfirmModal (styled-components, no AntD).
// These were deferred until the @testing-library/react v11 -> v16 upgrade that
// makes RTL's `render` React-19 compatible. The component is a controlled
// overlay: visibility, copy, and button wiring are all props-driven, so it
// renders with zero mocking.
describe("ConfirmModal", () => {
  const baseProps = {
    title: "Suspend Account",
    message: "Suspend this punter's account immediately.",
    onConfirm: () => {},
    onCancel: () => {},
  };

  it("renders title, message, and both default action buttons", () => {
    render(<ConfirmModal {...baseProps} isOpen />);
    expect(screen.getByText("Suspend Account")).toBeInTheDocument();
    expect(
      screen.getByText("Suspend this punter's account immediately."),
    ).toBeInTheDocument();
    // Defaults from the component: Confirm / Cancel.
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders the impact summary only when provided", () => {
    const { rerender } = render(<ConfirmModal {...baseProps} isOpen />);
    expect(screen.queryByText("3 open positions affected")).toBeNull();

    rerender(
      <ConfirmModal
        {...baseProps}
        isOpen
        impactSummary="3 open positions affected"
      />,
    );
    expect(screen.getByText("3 open positions affected")).toBeInTheDocument();
  });

  it("fires onConfirm and onCancel when the matching button is clicked", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        {...baseProps}
        isOpen
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons and shows the processing label while loading", () => {
    render(<ConfirmModal {...baseProps} isOpen isLoading />);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    const confirmBtn = screen.getByRole("button", { name: "Processing..." });
    expect(confirmBtn).toBeDisabled();
  });

  it("honors custom confirmText / cancelText overrides", () => {
    render(
      <ConfirmModal
        {...baseProps}
        isOpen
        confirmText="Yes, suspend"
        cancelText="Keep active"
      />,
    );
    expect(
      screen.getByRole("button", { name: "Yes, suspend" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Keep active" }),
    ).toBeInTheDocument();
  });
});
