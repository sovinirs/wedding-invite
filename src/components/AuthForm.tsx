"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { FormState } from "@/app/actions";
import { Button, ErrorNote, Field, Input } from "./ui";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "One moment…" : label}
    </Button>
  );
}

export function AuthForm({
  mode,
  action,
}: {
  mode: "signin" | "signup";
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const isSignUp = mode === "signup";

  return (
    <div className="mx-auto mt-20 w-full max-w-md">
      <h1 className="text-4xl" style={{ fontFamily: "Georgia, serif" }}>
        {isSignUp ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#6b4c3d]">
        {isSignUp
          ? "One account holds every invitation you make."
          : "Sign in to manage your invitations."}
      </p>

      <form action={formAction} className="mt-10 flex flex-col gap-6">
        <ErrorNote>{state?.error}</ErrorNote>

        {isSignUp && (
          <Field label="Your name">
            <Input name="name" autoComplete="name" placeholder="Optional" />
          </Field>
        )}

        <Field label="Email">
          <Input name="email" type="email" required autoComplete="email" />
        </Field>

        <Field label="Password" hint={isSignUp ? "At least 8 characters." : undefined}>
          <Input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isSignUp ? "new-password" : "current-password"}
          />
        </Field>

        <Submit label={isSignUp ? "Create account" : "Sign in"} />
      </form>

      <p className="mt-8 text-sm text-[#6b4c3d]">
        {isSignUp ? "Already have an account? " : "No account yet? "}
        <Link href={isSignUp ? "/login" : "/signup"} className="underline">
          {isSignUp ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  );
}
