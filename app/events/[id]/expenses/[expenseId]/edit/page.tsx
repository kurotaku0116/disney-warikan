"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";

type Member = {
  id: string;
  name: string;
};

const CATEGORIES = ["食事", "交通", "グッズ", "その他"];

export default function EditExpensePage() {
  const router = useRouter();
  const params = useParams<{ id: string; expenseId: string }>();
  const eventId = params.id;
  const expenseId = params.expenseId;

  const [members, setMembers] = useState<Member[]>([]);
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [category, setCategory] = useState("食事");
  const [memo, setMemo] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchInitialData = async () => {
    const { data: membersData, error: membersError } = await supabase
      .from("members")
      .select("id, name")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (membersError) {
      console.error(membersError);
      alert("メンバー取得に失敗しました");
      return;
    }

    setMembers(membersData || []);

    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", expenseId)
      .single();

    if (expenseError) {
      console.error(expenseError);
      alert("支出取得に失敗しました");
      return;
    }

    const { data: participantRows, error: participantError } = await supabase
      .from("expense_participants")
      .select("member_id")
      .eq("expense_id", expenseId);

    if (participantError) {
      console.error(participantError);
      alert("対象メンバー取得に失敗しました");
      return;
    }

    setAmount(String(expenseData.amount));
    setPaidBy(expenseData.paid_by_member_id);
    setCategory(expenseData.category);
    setMemo(expenseData.memo ?? "");
    setSelectedMembers((participantRows || []).map((row) => row.member_id));
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchInitialData();
      setLoading(false);
    };

    if (eventId && expenseId) init();
  }, [eventId, expenseId]);

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

  if (selectedMembers.length === 0) {
    alert("対象メンバーを1人以上選んでください");
    return;
  }

  setSaving(true);

  const { error: updateError } = await supabase
    .from("expenses")
    .update({
      amount: Number(amount),
      paid_by_member_id: paidBy,
      category,
      memo,
    })
    .eq("id", expenseId);

  console.log("updateError", updateError);

  if (updateError) {
    console.error(updateError);
    alert(`支出更新に失敗しました: ${updateError.message}`);
    setSaving(false);
    return;
  }

  const { error: deleteParticipantError } = await supabase
    .from("expense_participants")
    .delete()
    .eq("expense_id", expenseId);

  console.log("deleteParticipantError", deleteParticipantError);

  if (deleteParticipantError) {
    console.error(deleteParticipantError);
    alert(`対象メンバー更新に失敗しました: ${deleteParticipantError.message}`);
    setSaving(false);
    return;
  }

  const inserts = selectedMembers.map((memberId) => ({
    expense_id: expenseId,
    member_id: memberId,
  }));

  const { error: insertParticipantError } = await supabase
    .from("expense_participants")
    .insert(inserts);

  console.log("insertParticipantError", insertParticipantError);

  setSaving(false);

  if (insertParticipantError) {
    console.error(insertParticipantError);
    alert(`対象メンバー再登録に失敗しました: ${insertParticipantError.message}`);
    return;
  }

  router.push(`/events/${eventId}`);
};

  if (loading) {
    return <div className="mx-auto max-w-xl px-4 py-6">読み込み中...</div>;
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6 pb-28">
      <button
        onClick={() => router.back()}
        className="mb-4 rounded-lg bg-sky-200 px-3 py-2"
      >
        ← 戻る
      </button>

      <div className="rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-5 text-2xl font-bold text-sky-500">支出編集</h1>

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
          placeholder="メモ"
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
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="mx-auto max-w-xl">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full rounded-2xl bg-gradient-to-r from-sky-400 to-lime-400 py-4 text-lg font-semibold text-white shadow-md disabled:opacity-50"
          >
            {saving ? "保存中..." : "変更を保存"}
          </button>
        </div>
      </div>
    </main>
  );
}