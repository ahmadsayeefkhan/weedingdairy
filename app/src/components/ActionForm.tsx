"use client";
import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";
import type { ActionResult } from "@/lib/result";

type Action = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

const Pending = createContext(false);

/**
 * Form bound to a server action. After hydration it submits through onSubmit + preventDefault, so React
 * doesn't clear the fields when the server rejects the input (fields reset only on success when `reset`
 * is set). The `action` prop stays for submits before hydration: they POST to the server action instead
 * of falling back to a GET that would put the fields in the URL.
 * Shows the server's success or error message.
 */
export function ActionForm({ action, children, className, reset, id, showOk = true }: { action: Action; children: ReactNode; className?: string; reset?: boolean; id?: string; showOk?: boolean }) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && reset) ref.current?.reset();
  }, [state, reset]);
  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      id={id}
      onSubmit={(e) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
        const fd = new FormData(e.currentTarget, submitter);
        startTransition(() => formAction(fd));
      }}
    >
      <Pending.Provider value={pending}>{children}</Pending.Provider>
      {state && !state.ok && <p className="form-msg err mt-s" role="alert">{state.error}</p>}
      {state && state.ok && state.message && showOk && <p className="form-msg ok mt-s" role="status">{state.message}</p>}
    </form>
  );
}

export function Submit({ children, className = "btn", pendingText, ...rest }: { children: ReactNode; className?: string; pendingText?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const pending = useContext(Pending);
  return (
    <button type="submit" className={className} disabled={pending || rest.disabled} aria-busy={pending || undefined} {...rest}>
      {pending ? pendingText ?? "Saving…" : children}
    </button>
  );
}
