"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { calculateSettlement } from "@/lib/settlement";
import ExpenseChart from "@/components/expense-chart";
import * as htmlToImage from "html-to-image";
import { useParams } from "next/navigation";

type Member = {
  id: string;
  name: string;
};

type SettlementItem = {
  from: string;
  to: string;
  amount: number;
};

export default function Page() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: membersData, error: mErr } = await supabase
        .from("members")
        .select("*")
        .eq("event_id", eventId);

      if (mErr) {
        console.error(mErr);
        return;
      }

      const { data: expensesData, error: eErr } = await supabase
        .from("expenses")
        .select("*")
        .eq("event_id", eventId);

      if (eErr) {
        console.error(eErr);
        return;
      }

      const { data: participants, error: pErr } = await supabase
        .from("expense_participants")
        .select("*");

      if (pErr) {
        console.error(pErr);
        return;
      }

      const formatted = (expensesData || []).map((exp: any) => ({
        id: exp.id,
        amount: exp.amount,
        paid_by_member_id: exp.paid_by_member_id,
        participants: (participants || [])
          .filter((p: any) => p.expense_id === exp.id)
          .map((p: any) => p.member_id),
      }));

      const result = calculateSettlement(membersData || [], formatted);

      setMembers(membersData || []);
      setExpenses(expensesData || []);
      setSettlements(result.settlements || []);
      setLoading(false);
    };

    fetchData();
  }, [eventId]);

  const getName = (id: string) =>
    members.find((m) => m.id === id)?.name || "";

  const handleDownload = async () => {
    const node = document.getElementById("result-card");
    if (!node) return;

    const dataUrl = await htmlToImage.toPng(node);
    const link = document.createElement("a");
    link.download = "result.png";
    link.href = dataUrl;
    link.click();
  };

  if (loading) {
    return <div className="mx-auto max-w-xl px-4 py-6">読み込み中...</div>;
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <button
        onClick={() => router.back()}
        className="mb-4 rounded-lg bg-sky-200 px-3 py-2"
      >
        ← 戻る
      </button>

      <div id="result-card" className="rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-5 text-2xl font-bold text-sky-500">精算結果</h1>

        <div className="mb-6">
          <ExpenseChart expenses={expenses} />
        </div>

        {settlements.length === 0 ? (
          <p>精算なし</p>
        ) : (
          <ul className="space-y-3">
            {settlements.map((s, i) => (
              <li key={i} className="rounded-xl bg-sky-100 p-4 text-lg">
                {getName(s.from)} → {getName(s.to)}：¥{s.amount}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={handleDownload}
        className="mt-6 w-full rounded-2xl bg-sky-400 py-4 text-lg font-semibold text-white shadow-md hover:bg-sky-500"
      >
        画像保存
      </button>
    </main>
  );
}