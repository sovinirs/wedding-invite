import Link from "next/link";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fbf7f2] text-[#2b1710]">
      <div className="mx-auto w-full max-w-5xl px-6 py-10 md:py-16">{children}</div>
    </div>
  );
}

export function Brand() {
  return (
    <Link
      href="/"
      className="text-sm uppercase tracking-[0.4em] text-[#9b5f36]"
      style={{ fontFamily: "Georgia, serif" }}
    >
      Invitations
    </Link>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-[0.32em] text-[#9b5f36]">{label}</span>
      {children}
      {hint && <span className="text-xs leading-5 text-[#8a6b5c]">{hint}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-sm border border-[#c9956a]/35 bg-white px-4 py-3 text-[15px] text-[#2b1710] outline-none transition-colors placeholder:text-[#b9a294] focus:border-[#9b5f36]";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} min-h-24 resize-y ${props.className ?? ""}`} />;
}

export function Button({
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-[#2b1710] text-[#fdf6ec] hover:bg-[#3f2318]",
    ghost: "border border-[#c9956a]/45 text-[#9b5f36] hover:bg-[#f3e7db]",
    danger: "border border-[#b4453a]/40 text-[#b4453a] hover:bg-[#f7e6e4]",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-sm px-6 py-3 text-xs uppercase tracking-[0.24em] transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${styles} ${props.className ?? ""}`}
    />
  );
}

export function ErrorNote({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-sm border border-[#b4453a]/30 bg-[#fbeceb] px-4 py-3 text-sm text-[#8f342b]">
      {children}
    </p>
  );
}
