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

type PersonalAdvanceLine = {
  expenseId: string;
  title: string;
  category: string;
  personName: string;
  amount: number;
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
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
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

      if ((membersData || []).length > 0) {
        setSelectedMemberId((membersData || [])[0].id);
      }

      setLoading(false);
    };

    if (eventId) {
      fetchData();
    }
  }, [eventId]);

  const getName = (id: string) =>
    members.find((member) => member.id === id)?.name || "不明";

  const formatYen = (value: number) => `¥${Math.round(value).toLocaleString()}`;

  const summary = useMemo(() => {
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const memberCount = members.length;
    const expenseCount = expenses.length;

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

      return {
        memberId: member.id,
        name: member.name,
        paid,
        owed,
        balance: paid - owed,
      };
    });

    return {
      totalAmount,
      memberCount,
      expenseCount,
      memberSummaries,
    };
  }, [members, expenses, expenseParticipants]);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  const selectedMemberSummary = summary.memberSummaries.find(
    (m) => m.memberId === selectedMemberId
  );

  const personalAdvance = useMemo(() => {
    const advancedForOthers: PersonalAdvanceLine[] = [];
    const advancedByOthers: PersonalAdvanceLine[] = [];

    expenses.forEach((expense) => {
      const participantIds = expenseParticipants
        .filter((row) => row.expense_id === expense.id)
        .map((row) => row.member_id);

      if (participantIds.length === 0) return;

      const share = expense.amount / participantIds.length;
      const title = expense.memo?.trim() || `${expense.category}の支出`;

      if (expense.paid_by_member_id === selectedMemberId) {
        participantIds
          .filter((memberId) => memberId !== selectedMemberId)
          .forEach((memberId) => {
            advancedForOthers.push({
              expenseId: expense.id,
              title,
              category: expense.category,
              personName: getName(memberId),
              amount: share,
            });
          });
      }

      if (
        expense.paid_by_member_id !== selectedMemberId &&
        participantIds.includes(selectedMemberId)
      ) {
        advancedByOthers.push({
          expenseId: expense.id,
          title,
          category: expense.category,
          personName: getName(expense.paid_by_member_id),
          amount: share,
        });
      }
    });

    const advancedForOthersTotal = advancedForOthers.reduce(
      (sum, line) => sum + line.amount,
      0
    );

    const advancedByOthersTotal = advancedByOthers.reduce(
      (sum, line) => sum + line.amount,
      0
    );

    const paying = settlements.filter((s) => s.from === selectedMemberId);
    const receiving = settlements.filter((s) => s.to === selectedMemberId);

    return {
      advancedForOthers,
      advancedByOthers,
      advancedForOthersTotal,
      advancedByOthersTotal,
      paying,
      receiving,
    };
  }, [expenses, expenseParticipants, selectedMemberId, settlements, members]);

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

      <div id="result-card" className="space-y-6 rounded-2xl bg-white p-6 shadow-md">
        <section>
          <h1 className="mb-4 text-2xl font-bold text-sky-500">精算結果</h1>
        </section>

        <section className="rounded-2xl bg-sky-50 p-4">
          <h2 className="mb-3 text-lg font-semibold">計算概要</h2>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">合計支出</div>
              <div className="mt-1 text-lg font-bold text-sky-700">
                {formatYen(summary.totalAmount)}
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">支出件数</div>
              <div className="mt-1 text-lg font-bold text-sky-700">
                {summary.expenseCount}件
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">人数</div>
              <div className="mt-1 text-lg font-bold text-sky-700">
                {summary.memberCount}人
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-md">
          <h2 className="mb-4 text-lg font-semibold">人ごとの立て替え状況</h2>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                  selectedMemberId === member.id
                    ? "bg-sky-400 text-white"
                    : "bg-sky-100 text-sky-700"
                }`}
              >
                {member.name}
              </button>
            ))}
          </div>

          {selectedMember && selectedMemberSummary ? (
            <div className="space-y-4">
              <div
                className={`rounded-2xl p-4 ${
                  selectedMemberSummary.balance > 0
                    ? "bg-lime-50"
                    : selectedMemberSummary.balance < 0
                    ? "bg-red-50"
                    : "bg-gray-100"
                }`}
              >
                <div className="text-lg font-bold">{selectedMember.name}</div>

                <div className="mt-2 text-sm text-gray-600">
                  立て替えた合計: {formatYen(personalAdvance.advancedForOthersTotal)}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  立て替えてもらった合計: {formatYen(personalAdvance.advancedByOthersTotal)}
                </div>

                <div className="mt-3 text-xl font-bold">
                  {selectedMemberSummary.balance > 0
                    ? `あと ${formatYen(selectedMemberSummary.balance)} 受け取る`
                    : selectedMemberSummary.balance < 0
                    ? `あと ${formatYen(Math.abs(selectedMemberSummary.balance))} 払う`
                    : "精算なし"}
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  ※ 立替額・負担額を全体で相殺した結果です。
                </div>
              </div>

              <div className="rounded-2xl bg-lime-50 p-4">
                <h3 className="mb-3 font-semibold">この人が立て替えた相手</h3>

                {personalAdvance.advancedForOthers.length === 0 ? (
                  <p className="text-sm text-gray-600">なし</p>
                ) : (
                  <ul className="space-y-2">
                    {personalAdvance.advancedForOthers.map((line, index) => (
                      <li key={`${line.expenseId}-for-${index}`} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                        <div className="font-semibold">{line.personName} の分を {formatYen(line.amount)} 立て替え</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {line.title} / {line.category}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl bg-red-50 p-4">
                <h3 className="mb-3 font-semibold">この人が立て替えてもらった相手</h3>

                {personalAdvance.advancedByOthers.length === 0 ? (
                  <p className="text-sm text-gray-600">なし</p>
                ) : (
                  <ul className="space-y-2">
                    {personalAdvance.advancedByOthers.map((line, index) => (
                      <li key={`${line.expenseId}-by-${index}`} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                        <div className="font-semibold">{line.personName} に {formatYen(line.amount)} 立て替えてもらった</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {line.title} / {line.category}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl bg-sky-50 p-4">
                <h3 className="mb-3 font-semibold">この人の最終精算</h3>

                {personalAdvance.paying.length === 0 &&
                personalAdvance.receiving.length === 0 ? (
                  <p className="text-sm text-gray-600">精算なし</p>
                ) : (
                  <div className="space-y-3">
                    {personalAdvance.paying.length > 0 ? (
                      <div>
                        <div className="mb-2 text-sm font-semibold text-red-600">
                          払う
                        </div>
                        <ul className="space-y-2">
                          {personalAdvance.paying.map((s, index) => (
                            <li key={`pay-${index}`} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                              {getName(s.to)} に {formatYen(s.amount)} 払う
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {personalAdvance.receiving.length > 0 ? (
                      <div>
                        <div className="mb-2 text-sm font-semibold text-lime-700">
                          受け取る
                        </div>
                        <ul className="space-y-2">
                          {personalAdvance.receiving.map((s, index) => (
                            <li key={`receive-${index}`} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                              {getName(s.from)} から {formatYen(s.amount)} 受け取る
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-600">メンバーがいません</p>
          )}
        </section>

        <section className="rounded-2xl bg-white">
          <h2 className="mb-4 text-lg font-semibold">カテゴリ内訳</h2>
          <ExpenseChart expenses={expenses} />
        </section>

        <section className="rounded-2xl bg-sky-50 p-4">
          <h2 className="mb-3 text-lg font-semibold">全体の最終精算</h2>

          {settlements.length === 0 ? (
            <p className="text-gray-600">精算なし</p>
          ) : (
            <ul className="space-y-3">
              {settlements.map((settlement, index) => (
                <li key={index} className="rounded-xl bg-white p-4 text-lg shadow-sm">
                  {getName(settlement.from)} が {getName(settlement.to)} に{" "}
                  <span className="font-bold text-sky-700">
                    {formatYen(settlement.amount)}
                  </span>{" "}
                  払う
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