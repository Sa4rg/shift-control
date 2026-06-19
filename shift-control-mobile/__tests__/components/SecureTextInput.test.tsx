import { fireEvent, render } from "@testing-library/react-native";

import { SecureTextInput } from "@/src/components/SecureTextInput";

describe("SecureTextInput", () => {
  it("hides the value by default", () => {
    const { getByTestId, getByText } = render(
      <SecureTextInput
        value="Secret123"
        onChangeText={jest.fn()}
        placeholder="Enter password"
      />
    );

    expect(getByTestId("secure-text-input").props.secureTextEntry).toBe(true);
    expect(getByText("Show")).toBeTruthy();
  });

  it("shows the value when the visibility button is pressed", () => {
    const { getByTestId, getByText } = render(
      <SecureTextInput
        value="Secret123"
        onChangeText={jest.fn()}
        placeholder="Enter password"
      />
    );

    fireEvent.press(getByText("Show"));

    expect(getByTestId("secure-text-input").props.secureTextEntry).toBe(false);
    expect(getByText("Hide")).toBeTruthy();
  });

  it("hides the value again when Hide is pressed", () => {
    const { getByTestId, getByText } = render(
      <SecureTextInput
        value="Secret123"
        onChangeText={jest.fn()}
        placeholder="Enter password"
      />
    );

    fireEvent.press(getByText("Show"));
    fireEvent.press(getByText("Hide"));

    expect(getByTestId("secure-text-input").props.secureTextEntry).toBe(true);
    expect(getByText("Show")).toBeTruthy();
  });

  it("forwards text changes", () => {
    const onChangeText = jest.fn();

    const { getByTestId } = render(
      <SecureTextInput
        value=""
        onChangeText={onChangeText}
        placeholder="Enter password"
      />
    );

    fireEvent.changeText(
      getByTestId("secure-text-input"),
      "NewSecret123"
    );

    expect(onChangeText).toHaveBeenCalledWith("NewSecret123");
  });

  it("does not toggle visibility when disabled", () => {
    const { getByTestId, getByText } = render(
      <SecureTextInput
        value="Secret123"
        onChangeText={jest.fn()}
        placeholder="Enter password"
        disabled
      />
    );

    fireEvent.press(getByText("Show"));

    expect(getByTestId("secure-text-input").props.secureTextEntry).toBe(true);
  });
});