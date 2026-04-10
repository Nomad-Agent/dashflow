import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold">DashFlow</h1>
      <p className="max-w-md text-center text-neutral-600">
        Set <code className="rounded bg-neutral-100 px-1">NEXT_PUBLIC_API_URL</code> in{" "}
        <code className="rounded bg-neutral-100 px-1">.env.local</code>. Kanban, List, and Calendar live under{" "}
        <code className="rounded bg-neutral-100 px-1">/w/…/projects/…</code>. Specs:{" "}
        <code className="rounded bg-neutral-100 px-1">doc/README.md</code>.
      </p>
      <nav className="flex gap-4 text-sm">
        <Link href="/login" className="text-neutral-900 underline">
          Sign in
        </Link>
        <Link href="/register" className="text-neutral-900 underline">
          Register
        </Link>
        <Link href="/dashboard" className="text-neutral-900 underline">
          Dashboard
        </Link>
      </nav>
    </main>
  );
}
