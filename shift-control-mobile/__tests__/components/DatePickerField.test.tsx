import { fireEvent, render } from "@testing-library/react-native";

import { DatePickerField } from "@/src/components/DatePickerField";

jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");

  return function MockDateTimePicker({
    onChange,
  }: {
    onChange: (
      event: { type: string },
      selectedDate?: Date
    ) => void;
  }) {
    return (
      <Pressable
        testID="mock-date-picker"
        onPress={() =>
          onChange(
            { type: "set" },
            new Date(2026, 5, 18)
          )
        }
      >
        <Text>Select mocked date</Text>
      </Pressable>
    );
  };
});

describe("DatePickerField", () => {
  it("shows the current ISO date", () => {
    const { getByText } = render(
      <DatePickerField
        label="Week start"
        value="2026-06-15"
        onChange={jest.fn()}
      />
    );

    expect(getByText("2026-06-15")).toBeTruthy();
  });

  it("shows a placeholder when the value is empty", () => {
    const { getByText } = render(
      <DatePickerField
        label="Week start"
        value=""
        onChange={jest.fn()}
        placeholder="Select date"
      />
    );

    expect(getByText("Select date")).toBeTruthy();
  });

  it("opens the picker when the field is pressed", () => {
    const { getByTestId, queryByTestId } = render(
      <DatePickerField
        label="Week start"
        value=""
        onChange={jest.fn()}
      />
    );

    expect(queryByTestId("mock-date-picker")).toBeNull();

    fireEvent.press(getByTestId("date-picker-field"));

    expect(getByTestId("mock-date-picker")).toBeTruthy();
  });

  it("returns the selected date as YYYY-MM-DD", () => {
    const onChange = jest.fn();

    const { getByTestId } = render(
      <DatePickerField
        label="Week start"
        value=""
        onChange={onChange}
      />
    );

    fireEvent.press(getByTestId("date-picker-field"));
    fireEvent.press(getByTestId("mock-date-picker"));

    expect(onChange).toHaveBeenCalledWith("2026-06-18");
  });

  it("does not open when disabled", () => {
    const { getByTestId, queryByTestId } = render(
      <DatePickerField
        label="Week start"
        value=""
        onChange={jest.fn()}
        disabled
      />
    );

    fireEvent.press(getByTestId("date-picker-field"));

    expect(queryByTestId("mock-date-picker")).toBeNull();
  });
});