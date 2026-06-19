import { Share } from "react-native";

import { formatShiftClosureShareText } from "@/src/features/closures/formatShiftClosureShareText";
import type { Shift, ShiftClosure } from "@/src/types/api";

type ShareShiftClosureSummaryData = {
  shift: Shift;
  closure: ShiftClosure;
};

export async function shareShiftClosureSummary({
  shift,
  closure,
}: ShareShiftClosureSummaryData): Promise<void> {
  const message = formatShiftClosureShareText({
    shift,
    closure,
  });

  await Share.share({
    message,
    title: "Shift closure",
  });
}