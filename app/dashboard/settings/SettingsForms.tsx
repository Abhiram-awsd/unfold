"use client";

import { useActionState } from "react";
import { deleteAccount, setCustomDomain } from "../actions";
import { Status, SubmitButton } from "../ui";

export function DomainForm({ domain }: { domain: string | null }) {
  const [state, action] = useActionState(setCustomDomain, null);
  return (
    <form action={action} className="st-row">
      <label className="db-field">
        <span>Domain <em>leave empty to remove</em></span>
        <input name="domain" defaultValue={domain ?? ""} placeholder="www.yourname.com" maxLength={253} spellCheck={false} autoCapitalize="none" inputMode="url" />
      </label>
      <div className="db-actions">
        <Status state={state} />
        <SubmitButton pendingLabel="Saving…" className="btn btn-silver db-btn-sm">Save domain</SubmitButton>
      </div>
    </form>
  );
}

export function DeleteAccount() {
  const [state, action] = useActionState(deleteAccount, null);
  return (
    <form action={action} className="st-row">
      <label className="db-field">
        <span>Type DELETE to confirm</span>
        <input name="confirm" autoComplete="off" spellCheck={false} maxLength={10} required />
      </label>
      <div className="db-actions">
        <Status state={state} />
        <SubmitButton pendingLabel="Deleting…" className="btn db-btn-sm db-danger">Delete my account</SubmitButton>
      </div>
    </form>
  );
}
