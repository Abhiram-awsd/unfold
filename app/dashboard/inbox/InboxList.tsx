"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { Message } from "@/lib/supabase/types";
import { deleteMessage, markMessage } from "../actions";

type Change = { id: string; read?: boolean; gone?: boolean };

function when(iso: string): string {
  const d = new Date(iso), mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

/** Messages with optimistic read/unread and delete: the list updates at once, the server catches up. */
export function InboxList({ messages }: { messages: Message[] }) {
  const [list, apply] = useOptimistic(messages, (state: Message[], c: Change) =>
    c.gone ? state.filter(m => m.id !== c.id) : state.map(m => (m.id === c.id ? { ...m, read_at: c.read ? m.read_at ?? new Date().toISOString() : null } : m)),
  );
  const [confirm, setConfirm] = useState<string | null>(null);
  const [, start] = useTransition();

  const mark = (id: string, read: boolean) => start(async () => { apply({ id, read }); await markMessage(id, read); });
  const remove = (id: string) => start(async () => { apply({ id, gone: true }); setConfirm(null); await deleteMessage(id); });

  return (
    <ol className="ib-list">
      {list.map(m => {
        const unread = !m.read_at;
        const subject = encodeURIComponent("Re: your message");
        return (
          <li key={m.id} className={`db-card ib-msg${unread ? " unread" : ""}`}>
            <div className="ib-head">
              <span className="ib-dot" aria-hidden="true" />
              <b>{m.sender_name}</b>
              <a className="ib-email" href={`mailto:${m.sender_email}?subject=${subject}`} onClick={() => unread && mark(m.id, true)}>{m.sender_email}</a>
              <time dateTime={m.created_at} title={new Date(m.created_at).toLocaleString()}>{when(m.created_at)}</time>
              {unread && <span className="sr-only">Unread</span>}
            </div>
            <p className="ib-body">{m.body}</p>
            <div className="ib-actions">
              <a className="btn btn-silver db-btn-sm" href={`mailto:${m.sender_email}?subject=${subject}`} onClick={() => unread && mark(m.id, true)}>Reply</a>
              <button type="button" className="btn btn-ghost db-btn-sm" onClick={() => mark(m.id, unread)}>{unread ? "Mark as read" : "Mark as unread"}</button>
              {confirm === m.id ? (
                <span className="db-confirm">
                  Delete this message?
                  <button type="button" className="btn db-btn-sm db-danger" onClick={() => remove(m.id)}>Delete</button>
                  <button type="button" className="btn btn-ghost db-btn-sm" onClick={() => setConfirm(null)}>Keep</button>
                </span>
              ) : (
                <button type="button" className="btn btn-ghost db-btn-sm" onClick={() => setConfirm(m.id)}>Delete</button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
