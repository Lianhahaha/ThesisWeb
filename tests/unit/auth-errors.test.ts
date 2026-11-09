import { describe, expect, it } from "vitest";
import { authMessage } from "@/lib/auth/errors";

describe("authMessage", () => {
  it("explains a blocked API-key referrer instead of falling back", () => {
    expect(
      authMessage({ code: "auth/requests-from-referer-http://localhost:3004/-are-blocked" })
    ).toMatch(/web address isn't allowed to use sign-in/i);
  });

  it("still maps wrong credentials", () => {
    expect(authMessage({ code: "auth/invalid-login-credentials" })).toBe("Wrong email or password.");
  });
});
