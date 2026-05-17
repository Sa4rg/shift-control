import { render, screen } from "@testing-library/react-native";

import { ErrorMessage } from "@/src/components/ErrorMessage";

describe("ErrorMessage", () => {
  it("renders nothing when message is null", () => {
    render(<ErrorMessage message={null} />);

    expect(screen.queryByText("Invalid credentials")).toBeNull();
  });

  it("renders the provided message", () => {
    render(<ErrorMessage message="Invalid credentials" />);

    expect(screen.getByText("Invalid credentials")).toBeTruthy();
  });
});