import { ApiError } from "@/lib/api/problem-details";

const GENERIC_SERVER_DETAIL = "An unexpected error occurred.";

const humanizeServerFailure = (detail: string): string => {
  if (detail === GENERIC_SERVER_DETAIL) {
    return "Something went wrong on the server. Try again in a moment, or contact your supervisor if it keeps happening.";
  }
  return detail;
};

export const formatApiErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof ApiError) {
    const detail = humanizeServerFailure((error.problem?.detail ?? error.message).trim());
    const fieldErrors =
      error.problem?.errors?.map((entry) => entry.message.trim()).filter((m) => m.length > 0) ?? [];

    if (detail === "Validation failed." && fieldErrors.length > 0) {
      return fieldErrors.join(" ");
    }

    return detail.length > 0 ? detail : fallback;
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    return message.length > 0 ? message : fallback;
  }

  return fallback;
};
