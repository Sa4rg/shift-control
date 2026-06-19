type RouteParamValue = string | string[] | undefined;

type NewWeeklyReviewRouteParams = {
  storeId?: RouteParamValue;
  staffId?: RouteParamValue;
  weekStart?: RouteParamValue;
};

export type NewWeeklyReviewInitialParams = {
  storeId: string | null;
  staffId: string | null;
  weekStart: string | null;
};

function normalizeRouteParam(value: RouteParamValue): string | null {
  const normalizedValue = Array.isArray(value) ? value[0] : value;

  if (normalizedValue === undefined) {
    return null;
  }

  const trimmedValue = normalizedValue.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

export function getNewWeeklyReviewInitialParams({
  storeId,
  staffId,
  weekStart,
}: NewWeeklyReviewRouteParams): NewWeeklyReviewInitialParams {
  return {
    storeId: normalizeRouteParam(storeId),
    staffId: normalizeRouteParam(staffId),
    weekStart: normalizeRouteParam(weekStart),
  };
}