import { describe, expect, it } from "vitest";
import { fieldErrors, message } from "../api";

function axiosError(code?: string, details?: unknown, topMessage?: string) {
  return {
    isAxiosError: true,
    response: {
      data: { error: { code, details, request_id: "req-1" }, message: topMessage },
    },
  };
}

describe("message", () => {
  it("maps known codes to friendly text", () => {
    expect(message(axiosError("PERMISSION_DENIED"))).toBe("Permission denied");
    expect(message(axiosError("RATE_LIMIT_EXCEEDED"))).toBe(
      "Too many requests. Try again shortly",
    );
  });

  it("falls back to a generic message for unknown codes", () => {
    expect(message(axiosError("SOME_UNKNOWN"))).toBe("Request failed");
  });

  it("uses top-level message when no error body", () => {
    expect(
      message({
        isAxiosError: true,
        response: { data: { message: "Custom failure" } },
      }),
    ).toBe("Custom failure");
  });
});

describe("fieldErrors", () => {
  it("maps a fields object to flat key/value strings", () => {
    expect(
      fieldErrors(
        axiosError("VALIDATION_ERROR", {
          fields: { title: ["Title is required"], severity: "bad value" },
        }),
      ),
    ).toEqual({ title: "Title is required", severity: "bad value" });
  });

  it("returns empty when no fields present", () => {
    expect(fieldErrors(axiosError("VALIDATION_ERROR"))).toEqual({});
  });
});
