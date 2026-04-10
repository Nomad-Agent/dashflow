import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold text-foreground">DashFlow</h1>
      <p className="max-w-md text-center text-muted">
        Set{" "}
        <code className="rounded bg-accent px-1.5 py-0.5 text-sm text-foreground">
          NEXT_PUBLIC_API_URL
        </code>{" "}
        in{" "}
        <code className="rounded bg-accent px-1.5 py-0.5 text-sm text-foreground">.env.local</code>.
        Kanban, List, and Calendar live under{" "}
        <code className="rounded bg-accent px-1.5 py-0.5 text-sm text-foreground">
          /w/…/projects/…
        </code>
        . Specs:{" "}
        <code className="rounded bg-accent px-1.5 py-0.5 text-sm text-foreground">doc/README.md</code>.
      </p>
      <nav className="flex gap-4 text-sm">
        <Link href="/login" className="text-foreground underline underline-offset-4 hover:text-muted">
          Sign in
        </Link>
        <Link href="/register" className="text-foreground underline underline-offset-4 hover:text-muted">
          Register
        </Link>
        <Link href="/dashboard" className="text-foreground underline underline-offset-4 hover:text-muted">
          Dashboard
        </Link>
      </nav>
    </main>
  );
}
