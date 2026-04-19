"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";

type Member = {
  id: string;
  name: string;
};

const CATEGORIES = ["食事", "交通", "グッズ", "その他"];

export default function NewExpensePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const [members, setMembers] = useState<Member[]>([]);
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [category, setCategory] = useState("食事");
  const [memo, setMemo] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from("members")
      .select("id, name")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setMembers(data || []);
  };

  useEffect(() => {
    if (eventId) {
      fetchMembers();
    }
  }, [eventId]);

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!amount || !paidBy) {
      alert("金額と支払った人を入力してください");
      return;
    }

    if (members.length === 0) {
      alert("先にメンバーを追加してください");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("expenses")
      .insert([
        {
          event_id: eventId,
          amount: Number(amount),
          paid_by_member_id: paidBy,
          category,
          memo,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("支出の保存に失敗しました");
      setLoading(false);
      return;
    }

    const participants =
      selectedMembers.length > 0 ? selectedMembers : members.map((m) => m.id);

    const inserts = participants.map((memberId) => ({
      expense_id: data.id,
      member_id: memberId,
    }));

    const { error: participantError } = await supabase
      .from("expense_participants")
      .insert(inserts);

    setLoading(false);

    if (participantError) {
      console.error(participantError);
      alert("対象メンバーの保存に失敗しました");
      return;
    }

    router.push(`/events/${eventId}`);
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-6 pb-28">
      <button
        onClick={() => router.back()}
        className="mb-4 rounded-lg bg-sky-200 px-3 py-2"
      >
        ← 戻る
      </button>

      <div className="rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-5 text-2xl font-bold text-sky-500">支出追加</h1>

        <input
          className="mb-4 w-full rounded-xl border p-4 text-lg"
          placeholder="金額"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="numeric"
        />

        <select
          className="mb-4 w-full rounded-xl border p-4 text-lg"
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
        >
          <option value="">支払った人を選択</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <select
          className="mb-4 w-full rounded-xl border p-4 text-lg"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <input
          className="mb-4 w-full rounded-xl border p-4 text-lg"
          placeholder="メモ（例：ハングリーベア）"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />

        <div className="rounded-xl bg-sky-50 p-4">
          <p className="mb-3 font-semibold">対象メンバー</p>

          <div className="space-y-3">
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(m.id)}
                  onChange={() => toggleMember(m.id)}
                  className="h-5 w-5"
                />
                <span className="text-lg">{m.name}</span>
              </label>
            ))}
          </div>

          <p className="mt-3 text-sm text-gray-500">
            未選択の場合は全員で割ります
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="mx-auto max-w-xl">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-sky-400 to-lime-400 py-4 text-lg font-semibold text-white shadow-md disabled:opacity-50"
          >
            {loading ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </main>
  );
}