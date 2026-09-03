import { redirect } from "next/navigation";
import { signUp } from "@/app/actions";
import { currentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { Brand, Shell } from "@/components/ui";

export default async function SignupPage() {
  if (await currentUser()) redirect("/dashboard");
  return (
    <Shell>
      <Brand />
      <AuthForm mode="signup" action={signUp} />
    </Shell>
  );
}
