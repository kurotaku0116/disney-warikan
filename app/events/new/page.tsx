"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewEventPage() {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    const trimmed = title.trim();

    if (!trimmed) {
      alert("イベント名を入力してください");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("events")
      .insert([{ title: trimmed }])
      .select()
      .single();

    setLoading(false);

    if (error) {
      console.error(error);
      alert("イベント作成に失敗しました");
      return;
    }

    router.push(`/events/${data.id}`);
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <Link
        href="/"
        className="mb-4 inline-block rounded-lg bg-sky-200 px-3 py-2"
      >
        ← ホーム
      </Link>

      <div className="rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-5 text-2xl font-bold text-sky-500">イベント作成</h1>

        <input
          className="mb-4 w-full rounded-xl border p-4 text-lg"
          placeholder="例：ディズニー2026春"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-sky-400 to-lime-400 py-4 text-lg font-semibold text-white shadow-md disabled:opacity-50"
        >
          {loading ? "作成中..." : "作成する"}
        </button>
      </div>
    </main>
  );
}