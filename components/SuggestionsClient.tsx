"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addDoc, collection, collectionGroup, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Flag, Loader2, MessageSquarePlus, Reply, Send } from "lucide-react";
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

interface CommentReply {
  id: string;
  suggestionId: string;
  body: string;
  nickname: string;
  anonymous: boolean;
  createdAt: number;
}

interface Commenter {
  id: string;
  nickname: string;
  anonymous: boolean;
}

const MIN_BODY = 10;
const MIN_REPLY = 2;
const MAX_BODY = 2000;
const MAX_REPLY = 1000;
const MAX_NICKNAME = 40;
const COMMENT_COLORS = ["--comment-1", "--comment-2", "--comment-3", "--comment-4", "--comment-5"];

function commentColors(items: Commenter[]): string[] {
  let previous = -1;
  return items.map((item) => {
    const key = item.anonymous ? item.id : item.nickname || item.id;
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    let index = hash % COMMENT_COLORS.length;
    // Adjacent comments should never share a colour, even on a hash collision.
    if (index === previous) index = (index + 1) % COMMENT_COLORS.length;
    previous = index;
    return `rgb(var(${COMMENT_COLORS[index]}))`;
  });
}

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
  const [replies, setReplies] = useState<CommentReply[] | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyNickname, setReplyNickname] = useState("");
  const [replyAnonymous, setReplyAnonymous] = useState(false);
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const colors = items ? commentColors(items) : [];
  const repliesByComment = useMemo(() => {
    const grouped = new Map<string, CommentReply[]>();
    for (const reply of replies ?? []) {
      const list = grouped.get(reply.suggestionId) ?? [];
      list.push(reply);
      grouped.set(reply.suggestionId, list);
    }
    for (const list of grouped.values()) list.sort((a, b) => a.createdAt - b.createdAt);
    return grouped;
  }, [replies]);

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
    if (!user) return;
    setReplyNickname((current) => current || user.displayName || user.email?.split("@")[0] || "");
  }, [user]);

  useEffect(() => {
    const feed = query(collectionGroup(db, "replies"), limit(500));
    const unsubscribe = onSnapshot(
      feed,
      (snapshot) => {
        setReplies(
          snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              suggestionId: doc.ref.parent.parent?.id ?? "",
              body: typeof data.body === "string" ? data.body : "",
              nickname: typeof data.nickname === "string" ? data.nickname : "",
              anonymous: data.anonymous === true,
              createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
            };
          })
        );
      },
      () => setReplies([])
    );
    return unsubscribe;
  }, []);

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
      setError("Sign in first so the comment can be saved.");
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
        createdAt: new Date().valueOf(),
      });
      setBody("");
      setMessage("Comment posted. Thank you for helping improve Thesisweb.");
    } catch {
      setError("The comment was not saved. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function startReply(suggestionId: string) {
    setReplyingTo(suggestionId);
    setReplyBody("");
    setReplyAnonymous(false);
    setReplyNickname(user?.displayName || user?.email?.split("@")[0] || nickname);
    setReplyError(null);
  }

  async function submitReply(event: React.FormEvent, suggestionId: string) {
    event.preventDefault();
    setReplyError(null);
    if (!user) {
      setReplyError("Sign in first to reply.");
      return;
    }
    const text = replyBody.trim();
    const name = replyNickname.trim();
    if (text.length < MIN_REPLY) {
      setReplyError(`Write at least ${MIN_REPLY} characters.`);
      return;
    }
    if (text.length > MAX_REPLY) {
      setReplyError(`Keep the reply under ${MAX_REPLY} characters.`);
      return;
    }
    if (!replyAnonymous && name.length === 0) {
      setReplyError("Add a nickname or reply anonymously.");
      return;
    }

    setReplySending(true);
    try {
      await addDoc(collection(db, "suggestions", suggestionId, "replies"), {
        body: text,
        nickname: replyAnonymous ? "" : name.slice(0, MAX_NICKNAME),
        anonymous: replyAnonymous,
        createdAt: new Date().valueOf(),
      });
      setReplyingTo(null);
      setReplyBody("");
    } catch {
      setReplyError("The reply was not saved. Please try again.");
    } finally {
      setReplySending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="eyebrow">Feedback</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Problems and suggestions</h1>
        <p className="mt-2 text-muted">
          Report a broken result, a wrong link, or an idea for the site. Comments are public so everyone
          can follow the response. Do not include private or personal details.
        </p>
      </header>

      <section className="panel" aria-labelledby="comment-h">
        <h2 id="comment-h" className="text-lg font-semibold">Leave a comment</h2>

        {!initialized ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking your session...
          </p>
        ) : !user ? (
          <div className="mt-3 rounded-lg border border-border bg-surface2 p-4 text-sm text-muted">
            <p>Sign in to comment. You can still choose anonymous below.</p>
            <Link href="/login?next=/suggestions" className="btn-secondary btn-sm mt-3 inline-flex">
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Comment type">
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
              Comment anonymously
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
              {sending ? "Commenting..." : "Comment"}
            </button>
          </form>
        )}
      </section>

      <section aria-labelledby="board-h">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="board-h" className="text-lg font-semibold">Recent comments</h2>
          <span className="text-xs text-subtle">Latest 100</span>
        </div>

        {loadError && <p className="mt-3 text-sm" style={{ color: "rgb(var(--danger))" }}>{loadError}</p>}
        {items === null && !loadError && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading comments...
          </p>
        )}
        {items?.length === 0 && <p className="mt-3 text-sm text-muted">No comments yet. Be the first.</p>}

        {items && items.length > 0 && (
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {items.map((item, index) => {
              const href = internalPath(item.page);
              const commentReplies = repliesByComment.get(item.id) ?? [];
              const replyColors = commentColors(commentReplies);
              return (
                <li key={item.id} className="py-4 sm:py-5">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-base font-semibold" style={{ color: colors[index] }}>
                      {item.anonymous ? "Anonymous" : item.nickname || "Reader"}
                    </span>
                    <span className="chip" title={item.kind === "problem" ? "Problem report" : "Suggestion"}>
                      {item.kind === "problem" ? "Problem" : "Suggestion"}
                    </span>
                    <time dateTime={new Date(item.createdAt).toISOString()} className="text-xs text-subtle">
                      {formatDate(item.createdAt)}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-text">
                    {item.body}
                  </p>
                  {href && (
                    <p className="mt-2 text-xs text-subtle">
                      Related page: <Link href={href} className="underline hover:text-text">{href}</Link>
                    </p>
                  )}

                  {commentReplies.length > 0 && (
                    <ul className="mt-3 space-y-2 border-l-2 border-border pl-3">
                      {commentReplies.map((reply, replyIndex) => (
                        <li key={reply.id}>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-semibold" style={{ color: replyColors[replyIndex] }}>
                              {reply.anonymous ? "Anonymous" : reply.nickname || "Reader"}
                            </span>
                            <time dateTime={new Date(reply.createdAt).toISOString()} className="text-subtle">
                              {formatDate(reply.createdAt)}
                            </time>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted">{reply.body}</p>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-2">
                    {!initialized ? null : user ? (
                      replyingTo === item.id ? (
                        <form onSubmit={(event) => submitReply(event, item.id)} className="mt-2 rounded-lg border border-border bg-surface2 p-3">
                          <textarea
                            value={replyBody}
                            onChange={(event) => setReplyBody(event.target.value)}
                            rows={3}
                            maxLength={MAX_REPLY}
                            placeholder="Write a reply..."
                            className="input min-h-[80px] resize-y"
                            aria-label="Reply"
                          />
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
                              <input
                                type="checkbox"
                                checked={replyAnonymous}
                                onChange={(event) => setReplyAnonymous(event.target.checked)}
                                className="h-4 w-4 rounded"
                                style={{ accentColor: "rgb(var(--accent))" }}
                              />
                              Reply anonymously
                            </label>
                            {!replyAnonymous && (
                              <input
                                value={replyNickname}
                                onChange={(event) => setReplyNickname(event.target.value)}
                                maxLength={MAX_NICKNAME}
                                className="input !min-h-[32px] !w-40 !py-1 text-xs"
                                aria-label="Reply nickname"
                                placeholder="Nickname"
                              />
                            )}
                          </div>
                          {replyError && (
                            <p className="mt-2 text-xs" style={{ color: "rgb(var(--danger))" }} role="alert">
                              {replyError}
                            </p>
                          )}
                          <div className="mt-2 flex gap-2">
                            <button
                              type="submit"
                              disabled={replySending || replyBody.trim().length < MIN_REPLY}
                              className="btn-primary btn-sm"
                            >
                              {replySending ? "Replying..." : "Reply"}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setReplyingTo(null); setReplyError(null); }}
                              className="btn-ghost btn-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button type="button" onClick={() => startReply(item.id)} className="btn-ghost btn-sm">
                          <Reply className="h-3.5 w-3.5" aria-hidden />
                          Reply
                        </button>
                      )
                    ) : (
                      <Link href="/login?next=/suggestions" className="text-xs text-muted underline">
                        Sign in to reply
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
