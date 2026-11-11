"use client";

import { getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";

/**
 * The Authorization header for our own API routes, when someone is signed in.
 *
 * The server only uses it to count that person's requests in their own bucket
 * instead of pooling the whole school's IP (lib/server/identity.ts). It is not
 * an access control: no route reads or writes private data on its say-so, and
 * the library still lives behind Firestore rules.
 *
 * Never throws: signed out, offline, or a token that can't be refreshed all
 * fall back to an anonymous request, which the server counts by IP.
 */
export async function authHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  try {
    return { Authorization: `Bearer ${await getIdToken(user)}` };
  } catch {
    return {};
  }
}
