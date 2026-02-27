"use client";

import { useCallback, useEffect, useState } from "react";
import type { Profile } from "@/types/inventory";

type Props = {
  meRole: string;
};

export function TeamAdminClient({ meRole }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "viewer">("viewer");

  const loadProfiles = useCallback(async () => {
    const res = await fetch("/api/admin/roles", { method: "GET" });
    const json = await res.json();
    setProfiles(Array.isArray(json.data) ? json.data : []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfiles();
  }, [loadProfiles]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fullName, role }),
    });
    setEmail("");
    setFullName("");
    setRole("viewer");
    await loadProfiles();
  }

  async function updateRole(userId: string, nextRole: "admin" | "manager" | "viewer") {
    await fetch("/api/admin/roles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: nextRole }),
    });
    await loadProfiles();
  }

  if (meRole !== "admin") {
    return <p className="p-4 text-sm">Only admins can manage team roles.</p>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-4">
      <h1 className="text-2xl font-semibold text-slate-900">Team Management</h1>
      <form
        onSubmit={invite}
        className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4"
      >
        <input
          required
          className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="Invite email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "admin" | "manager" | "viewer")}
          className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="viewer">viewer</option>
          <option value="manager">manager</option>
          <option value="admin">admin</option>
        </select>
        <button className="rounded-lg bg-slate-900 px-3 py-2 text-white hover:bg-slate-800">
          Send Invite
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Role</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="p-2">{p.email}</td>
                <td className="p-2">{p.full_name ?? "-"}</td>
                <td className="p-2">
                  <select
                    value={p.role}
                    onChange={(e) =>
                      updateRole(p.id, e.target.value as "admin" | "manager" | "viewer")
                    }
                    className="rounded-lg border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="viewer">viewer</option>
                    <option value="manager">manager</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
