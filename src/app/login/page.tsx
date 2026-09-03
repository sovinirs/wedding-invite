import { redirect } from "next/navigation";
import { signIn } from "@/app/actions";
import { currentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { Brand, Shell } from "@/components/ui";

export default async function LoginPage() {
  if (await currentUser()) redirect("/dashboard");
  return (
    <Shell>
      <Brand />
      <AuthForm mode="signin" action={signIn} />
    </Shell>
  );
}
