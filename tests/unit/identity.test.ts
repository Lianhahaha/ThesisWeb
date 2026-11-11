import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifiedUid } from "@/lib/server/identity";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
const other = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;

const projectId = "thesisweb-test";
const kid = "test-kid";

function makeToken(
  claims: Record<string, unknown>,
  opts: { alg?: string; key?: typeof privateKey } = {}
): string {
  const header = Buffer.from(JSON.stringify({ alg: opts.alg ?? "RS256", kid, typ: "JWT" })).toString(
    "base64url"
  );
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), opts.key ?? privateKey);
  return `${header}.${payload}.${signature.toString("base64url")}`;
}

const claims = (overrides: Record<string, unknown> = {}) => ({
  aud: projectId,
  iss: `https://securetoken.google.com/${projectId}`,
  sub: "uid-1",
  iat: 1000,
  exp: 3000,
  ...overrides,
});

const req = (token?: string) =>
  new Request("http://localhost/api/search", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

const verify = (token: string | undefined, now = 2_000_000) =>
  verifiedUid(req(token), { projectId, now, getCertificate: async () => pem });

describe("verifiedUid", () => {
  it("returns the uid of a correctly signed, current token", async () => {
    expect(await verify(makeToken(claims()))).toBe("uid-1");
  });

  it("ignores a request with no token", async () => {
    expect(await verify(undefined)).toBeNull();
  });

  it("refuses a token minted for another project", async () => {
    expect(await verify(makeToken(claims({ aud: "someone-else" })))).toBeNull();
    expect(await verify(makeToken(claims({ iss: "https://securetoken.google.com/someone-else" })))).toBeNull();
  });

  it("refuses an expired token", async () => {
    expect(await verify(makeToken(claims({ exp: 1000 })), 2_000_000)).toBeNull();
  });

  it("refuses an unsigned or downgraded algorithm", async () => {
    expect(await verify(makeToken(claims(), { alg: "none" }))).toBeNull();
    expect(await verify(makeToken(claims(), { alg: "HS256" }))).toBeNull();
  });

  it("refuses a token whose signature is not from Google's key", async () => {
    expect(await verify(makeToken(claims(), { key: other }))).toBeNull();
  });

  it("refuses garbage and tokens without a subject", async () => {
    expect(await verify("not.a.token")).toBeNull();
    expect(await verify(makeToken(claims({ sub: "" })))).toBeNull();
  });

  it("treats an unknown key id as anonymous", async () => {
    const token = makeToken(claims());
    const uid = await verifiedUid(req(token), {
      projectId,
      now: 2_000_000,
      getCertificate: async () => null,
    });
    expect(uid).toBeNull();
  });
});
