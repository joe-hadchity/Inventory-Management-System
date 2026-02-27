import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center p-6">
      <div className="w-full space-y-4 rounded border p-6">
        <h1 className="text-2xl font-semibold">Inventory Management System V4</h1>
        <p className="text-sm text-gray-600">
          Team inventory app with RBAC, filtering, and AI tools.
        </p>
        <div className="flex gap-2">
          <Link className="rounded border px-3 py-2" href="/login">
            Login
          </Link>
          <Link className="rounded border px-3 py-2" href="/inventory">
            Inventory
          </Link>
          <Link className="rounded border px-3 py-2" href="/admin/team">
            Team Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
