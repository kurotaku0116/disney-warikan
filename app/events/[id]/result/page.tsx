"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { calculateSettlement } from "@/lib/settlement";
import ExpenseChart from "@/components/expense-chart";
import * as htmlToImage from "html-to-image";

type Member = {
  id: string;
  name: string;
};

type ExpenseItem = {
  id: string;
  amount: number;
  category: string;
  memo: string | null;
  paid_by_member_id: string;
};

type ExpenseParticipantRow = {
  expense_id: string;
  member_id: string;
};

type SettlementItem = {
  from: string;
  to: string;
  amount: number;
};

type MemberSummary = {
  memberId: string;
  name: string;
  paid: number;
  owed: number;
  balance: number;
};

export default function ResultPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [expenseParticipants, setExpenseParticipants] = useState<
    ExpenseParticipantRow[]
  >([]);
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select("id, name")
        .eq("event_id", eventId);

      if (membersError) {
        console.error(membersError);
        setLoading(false);
        return;
      }

      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("id, amount, category, memo, paid_by_member_id")
        .eq("event_id", eventId);

      if (expensesError) {
        console.error(expensesError);
        setLoading(false);
        return;
      }

      const expenseIds = (expensesData || []).map((e) => e.id);

      let participantData: ExpenseParticipantRow[] = [];

      if (expenseIds.length > 0) {
        const { data, error } = await supabase
          .from("expense_participants")
          .select("expense_id, member_id")
          .in("expense_id", expenseIds);

        if (error) {
          console.error(error);
          setLoading(false);
          return;
        }

        participantData = data || [];
      }

      const formattedExpenses = (expensesData || []).map((expense) => ({
        id: expense.id,
        amount: expense.amount,
        paid_by_member_id: expense.paid_by_member_id,
        participants: participantData
          .filter((row) => row.expense_id === expense.id)
          .map((row) => row.member_id),
      }));

      const result = calculateSettlement(membersData || [], formattedExpenses);

      setMembers(membersData || []);
      setExpenses(expensesData || []);
      setExpenseParticipants(participantData);
      setSettlements(result.settlements || []);
      setLoading(false);
    };

    if (eventId) {
      fetchData();
    }
  }, [eventId]);

  const getName = (id: string) =>
    members.find((member) => member.id === id)?.name || "不明";

  const summary = useMemo(() => {
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const memberCount = members.length;
    const expenseCount = expenses.length;
    const perPersonAmount =
      memberCount > 0 ? Math.round(totalAmount / memberCount) : 0;

    const paidMap: Record<string, number> = {};
    const owedMap: Record<string, number> = {};

    members.forEach((member) => {
      paidMap[member.id] = 0;
      owedMap[member.id] = 0;
    });

    expenses.forEach((expense) => {
      paidMap[expense.paid_by_member_id] =
        (paidMap[expense.paid_by_member_id] || 0) + expense.amount;

      const targetIds = expenseParticipants
        .filter((row) => row.expense_id === expense.id)
        .map((row) => row.member_id);

      if (targetIds.length === 0) return;

      const share = expense.amount / targetIds.length;

      targetIds.forEach((memberId) => {
        owedMap[memberId] = (owedMap[memberId] || 0) + share;
      });
    });

    const memberSummaries: MemberSummary[] = members.map((member) => {
      const paid = paidMap[member.id] || 0;
      const owed = owedMap[member.id] || 0;
      const balance = paid - owed;

      return {
        memberId: member.id,
        name: member.name,
        paid,
        owed,
        balance,
      };
    });

    return {
      totalAmount,
      memberCount,
      expenseCount,
      perPersonAmount,
      memberSummaries,
    };
  }, [members, expenses, expenseParticipants]);

  const handleDownload = async () => {
    const node = document.getElementById("result-card");
    if (!node) return;

    const dataUrl = await htmlToImage.toPng(node);
    const link = document.createElement("a");
    link.download = "result.png";
    link.href = dataUrl;
    link.click();
  };

  const formatYen = (value: number) => `¥${Math.round(value).toLocaleString()}`;

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

      <div id="result-card" className="space-y-6 rounded-2xl bg-white p-6 shadow-md">
        <section>
          <h1 className="mb-4 text-2xl font-bold text-sky-500">精算結果</h1>
        </section>

        <section className="rounded-2xl bg-sky-50 p-4">
          <h2 className="mb-3 text-lg font-semibold">計算概要</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">合計支出</div>
              <div className="mt-1 text-xl font-bold text-sky-700">
                {formatYen(summary.totalAmount)}
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">支出件数</div>
              <div className="mt-1 text-xl font-bold text-sky-700">
                {summary.expenseCount}件
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">人数</div>
              <div className="mt-1 text-xl font-bold text-sky-700">
                {summary.memberCount}人
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">1人あたり</div>
              <div className="mt-1 text-xl font-bold text-sky-700">
                {formatYen(summary.perPersonAmount)}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white">
          <h2 className="mb-4 text-lg font-semibold">カテゴリ内訳</h2>
          <ExpenseChart expenses={expenses} />
        </section>

        <section className="rounded-2xl bg-lime-50 p-4">
          <h2 className="mb-3 text-lg font-semibold">メンバー別内訳</h2>

          <div className="space-y-3">
            {summary.memberSummaries.map((member) => (
              <div key={member.memberId} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="mb-2 text-lg font-semibold">{member.name}</div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-gray-500">払った額</div>
                    <div className="mt-1 font-bold">{formatYen(member.paid)}</div>
                  </div>

                  <div>
                    <div className="text-gray-500">負担額</div>
                    <div className="mt-1 font-bold">{formatYen(member.owed)}</div>
                  </div>

                  <div>
                    <div className="text-gray-500">差額</div>
                    <div
                      className={`mt-1 font-bold ${
                        member.balance > 0
                          ? "text-lime-700"
                          : member.balance < 0
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {member.balance > 0
                        ? `+${formatYen(member.balance)}`
                        : member.balance < 0
                        ? `-${formatYen(Math.abs(member.balance))}`
                        : "±¥0"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-sm text-gray-600">
                  {member.balance > 0
                    ? `${formatYen(member.balance)} 受け取る側`
                    : member.balance < 0
                    ? `${formatYen(Math.abs(member.balance))} 支払う側`
                    : "精算なし"}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-sky-50 p-4">
          <h2 className="mb-3 text-lg font-semibold">最終精算</h2>

          {settlements.length === 0 ? (
            <p className="text-gray-600">精算なし</p>
          ) : (
            <ul className="space-y-3">
              {settlements.map((settlement, index) => (
                <li key={index} className="rounded-xl bg-white p-4 text-lg shadow-sm">
                  {getName(settlement.from)} → {getName(settlement.to)} に{" "}
                  {formatYen(settlement.amount)}
                </li>
              ))}
            </ul>
          )}
        </section>
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