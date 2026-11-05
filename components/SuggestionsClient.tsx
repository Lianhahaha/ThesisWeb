"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addDoc, collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Flag, Loader2, MessageSquarePlus, Send } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth/store";

type Kind = "problem" | "suggestion";

interface Suggestion {
  id: string;
  body: string;
  nickname: string;
  anonymous: boolean;
  kind: Kind;
  page: string;
  createdAt: number;
}

const MIN_BODY = 10;
const MAX_BODY = 2000;
const MAX_NICKNAME = 40;

function formatDate(value: number): string {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function internalPath(value: string): string | null {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value;
}

export function SuggestionsClient() {
  const { user, initialized } = useAuth();
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("suggestion");
  const [about, setAbout] = useState("");
  const [body, setBody] = useState("");
  const [nickname, setNickname] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("kind");
    if (requested === "problem" || requested === "suggestion") setKind(requested);
    setAbout(params.get("about") ?? "");
  }, []);

  useEffect(() => {
    if (!user) return;
    setNickname((current) => current || user.displayName || user.email?.split("@")[0] || "");
  }, [user]);

  useEffect(() => {
    const feed = query(collection(db, "suggestions"), orderBy("createdAt", "desc"), limit(100));
    const unsubscribe = onSnapshot(
      feed,
      (snapshot) => {
        setItems(
          snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              body: typeof data.body === "string" ? data.body : "",
              nickname: typeof data.nickname === "string" ? data.nickname : "",
              anonymous: data.anonymous === true,
              kind: data.kind === "problem" ? "problem" : "suggestion",
              page: typeof data.page === "string" ? data.page : "",
              createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
            };
          })
        );
        setLoadError(null);
      },
      () => setLoadError("The board could not load right now. Please refresh the page.")
    );
    return unsubscribe;
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!user) {
      setError("Sign in first so the post can be saved.");
      return;
    }
    const text = body.trim();
    const name = nickname.trim();
    if (text.length < MIN_BODY) {
      setError(`Write at least ${MIN_BODY} characters.`);
      return;
    }
    if (text.length > MAX_BODY) {
      setError(`Keep it under ${MAX_BODY} characters.`);
      return;
    }
    if (!anonymous && name.length === 0) {
      setError("Add a nickname or choose anonymous.");
      return;
    }

    setSending(true);
    try {
      await addDoc(collection(db, "suggestions"), {
        body: text,
        nickname: anonymous ? "" : name.slice(0, MAX_NICKNAME),
        anonymous,
        kind,
        page: about.slice(0, 500),
        createdAt: Date.now(),
      });
      setBody("");
      setMessage("Posted. Thank you for helping improve Thesisweb.");
    } catch {
      setError("The post was not saved. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="eyebrow">Feedback</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Problems and suggestions</h1>
        <p className="mt-2 text-muted">
          Report a broken result, a wrong link, or an idea for the site. Posts are public so everyone can
          follow the response. Do not include private or personal details.
        </p>
      </header>

      <section className="panel" aria-labelledby="post-h">
        <h2 id="post-h" className="text-lg font-semibold">Leave a post</h2>

        {!initialized ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking your session...
          </p>
        ) : !user ? (
          <div className="mt-3 rounded-lg border border-border bg-surface2 p-4 text-sm text-muted">
            <p>Sign in to post. You can still choose anonymous below.</p>
            <Link href="/login?next=/suggestions" className="btn-secondary btn-sm mt-3 inline-flex">
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Post type">
              <button
                type="button"
                onClick={() => setKind("suggestion")}
                aria-pressed={kind === "suggestion"}
                className={`chip-btn ${kind === "suggestion" ? "chip-on" : ""}`}
              >
                <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
                Suggestion
              </button>
              <button
                type="button"
                onClick={() => setKind("problem")}
                aria-pressed={kind === "problem"}
                className={`chip-btn ${kind === "problem" ? "chip-on" : ""}`}
              >
                <Flag className="h-3.5 w-3.5" aria-hidden />
                Problem
              </button>
            </div>

            {about && (
              <p className="rounded-md border border-border bg-surface2 px-3 py-2 text-xs text-muted">
                About: <span className="break-all font-mono">{about}</span>
                <button type="button" onClick={() => setAbout("")} className="ml-2 underline">
                  Remove
                </button>
              </p>
            )}

            <div>
              <label htmlFor="suggestion-body" className="field-label">Your message</label>
              <textarea
                id="suggestion-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={5}
                maxLength={MAX_BODY}
                placeholder={kind === "problem" ? "What went wrong, and on which page?" : "What would make Thesisweb better?"}
                className="input min-h-[120px] resize-y"
              />
              <p className="field-hint">{body.trim().length}/{MAX_BODY} characters</p>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(event) => setAnonymous(event.target.checked)}
                className="h-4 w-4 rounded"
                style={{ accentColor: "rgb(var(--accent))" }}
              />
              Post anonymously
            </label>

            {!anonymous && (
              <div>
                <label htmlFor="nickname" className="field-label">Nickname</label>
                <input
                  id="nickname"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  maxLength={MAX_NICKNAME}
                  className="input"
                  placeholder="How your name appears on the board"
                />
              </div>
            )}

            {error && <p className="text-sm" style={{ color: "rgb(var(--danger))" }} role="alert">{error}</p>}
            {message && <p className="text-sm" style={{ color: "rgb(var(--ok))" }} role="status">{message}</p>}

            <button type="submit" disabled={sending || body.trim().length < MIN_BODY} className="btn-primary">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
              {sending ? "Posting..." : "Post"}
            </button>
          </form>
        )}
      </section>

      <section aria-labelledby="board-h">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="board-h" className="text-lg font-semibold">Recent posts</h2>
          <span className="text-xs text-subtle">Latest 100</span>
        </div>

        {loadError && <p className="mt-3 text-sm" style={{ color: "rgb(var(--danger))" }}>{loadError}</p>}
        {items === null && !loadError && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading posts...
          </p>
        )}
        {items?.length === 0 && <p className="mt-3 text-sm text-muted">No posts yet. Be the first.</p>}

        {items && items.length > 0 && (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {items.map((item) => {
              const href = internalPath(item.page);
              return (
                <li key={item.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{item.anonymous ? "Anonymous" : item.nickname || "Reader"}</span>
                    <span className="chip" title={item.kind === "problem" ? "Problem report" : "Suggestion"}>
                      {item.kind === "problem" ? "Problem" : "Suggestion"}
                    </span>
                    <time dateTime={new Date(item.createdAt).toISOString()} className="text-xs text-subtle">
                      {formatDate(item.createdAt)}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{item.body}</p>
                  {href && (
                    <p className="mt-2 text-xs text-subtle">
                      Related page: <Link href={href} className="underline hover:text-text">{href}</Link>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
