"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Member = {
  id: string;
  name: string;
};

type ExpenseItem = {
  id: string;
  amount: number;
  category: string;
  memo: string | null;
  created_at: string;
  paid_by_member_id: string;
};

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const [eventTitle, setEventTitle] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [memberName, setMemberName] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingMember, setAddingMember] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  const fetchEvent = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("title")
      .eq("id", eventId)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setEventTitle(data.title);
  };

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

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("id, amount, category, memo, created_at, paid_by_member_id")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setExpenses(data || []);
  };

  const addMember = async () => {
    const name = memberName.trim();

    if (!name) {
      alert("メンバー名を入力してください");
      return;
    }

    setAddingMember(true);

    const { error } = await supabase.from("members").insert([
      {
        event_id: eventId,
        name,
      },
    ]);

    setAddingMember(false);

    if (error) {
      console.error(error);
      alert("メンバー追加に失敗しました");
      return;
    }

    setMemberName("");
    await fetchMembers();
  };

  const deleteMember = async (memberId: string) => {
    const memberName = members.find((m) => m.id === memberId)?.name ?? "このメンバー";
    const ok = window.confirm(`${memberName} を削除しますか？`);
    if (!ok) return;

    setDeletingMemberId(memberId);

    const { data: paidExpenses, error: paidError } = await supabase
      .from("expenses")
      .select("id")
      .eq("event_id", eventId)
      .eq("paid_by_member_id", memberId)
      .limit(1);

    if (paidError) {
      console.error(paidError);
      alert("支払い履歴の確認に失敗しました");
      setDeletingMemberId(null);
      return;
    }

    if (paidExpenses && paidExpenses.length > 0) {
      alert("このメンバーは支払った支出があるため削除できません。先に支出を削除または編集してください。");
      setDeletingMemberId(null);
      return;
    }

    const { data: participantRows, error: participantError } = await supabase
      .from("expense_participants")
      .select("id")
      .eq("member_id", memberId)
      .limit(1);

    if (participantError) {
      console.error(participantError);
      alert("参加履歴の確認に失敗しました");
      setDeletingMemberId(null);
      return;
    }

    if (participantRows && participantRows.length > 0) {
      alert("このメンバーは支出の対象に含まれているため削除できません。先に該当支出を編集または削除してください。");
      setDeletingMemberId(null);
      return;
    }

    const { error: deleteError } = await supabase
      .from("members")
      .delete()
      .eq("id", memberId);

    setDeletingMemberId(null);

    if (deleteError) {
      console.error(deleteError);
      alert("メンバー削除に失敗しました");
      return;
    }

    await fetchMembers();
  };

  const deleteExpense = async (expenseId: string) => {
  alert(`delete開始: ${expenseId}`);

  const ok = window.confirm("この支出を削除しますか？");
  if (!ok) return;

  setDeletingExpenseId(expenseId);

  const { data: participantDeleted, error: participantsError } = await supabase
    .from("expense_participants")
    .delete()
    .eq("expense_id", expenseId)
    .select();

  if (participantsError) {
    setDeletingExpenseId(null);
    alert(`participantsError: ${participantsError.message}`);
    return;
  }

  console.log("participantDeleted", participantDeleted);

  const { data: expenseDeleted, error: expenseError } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .select();

  if (expenseError) {
    setDeletingExpenseId(null);
    alert(`expenseError: ${expenseError.message}`);
    return;
  }

  console.log("expenseDeleted", expenseDeleted);

  setDeletingExpenseId(null);

  if (!expenseDeleted || expenseDeleted.length === 0) {
    alert("expensesテーブルで削除対象が0件でした");
    return;
  }

  alert("削除成功");

  await fetchExpenses();
};

  const getMemberName = (memberId: string) =>
    members.find((m) => m.id === memberId)?.name || "不明";

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${String(
      date.getHours()
    ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "食事":
        return "bg-orange-100 text-orange-700";
      case "交通":
        return "bg-sky-100 text-sky-700";
      case "グッズ":
        return "bg-lime-100 text-lime-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchEvent(), fetchMembers(), fetchExpenses()]);
      setLoading(false);
    };

    if (eventId) init();
  }, [eventId]);

  if (loading) {
    return <div className="mx-auto max-w-xl px-4 py-6">読み込み中...</div>;
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <Link
        href="/"
        className="mb-4 inline-block rounded-lg bg-sky-200 px-3 py-2"
      >
        ← ホーム
      </Link>

      <h1 className="mb-5 text-3xl font-bold text-sky-500">{eventTitle}</h1>

      <section className="mb-6 rounded-2xl bg-white p-5 shadow-md">
        <h2 className="mb-4 text-xl font-semibold">メンバー追加</h2>

        <div className="space-y-3">
          <input
            className="w-full rounded-xl border p-4 text-lg"
            placeholder="例：たくみ"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
          />

          <button
            onClick={addMember}
            disabled={addingMember}
            className="w-full rounded-2xl bg-sky-400 py-4 text-lg font-semibold text-white shadow-md hover:bg-sky-500 disabled:opacity-50"
          >
            {addingMember ? "追加中..." : "メンバーを追加"}
          </button>
        </div>
      </section>

      <section className="mb-6 rounded-2xl bg-white p-5 shadow-md">
        <h2 className="mb-4 text-xl font-semibold">メンバー一覧</h2>

        {members.length === 0 ? (
          <p className="text-gray-500">まだメンバーがいません</p>
        ) : (
          <ul className="space-y-3">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-sky-50 p-4 shadow-sm"
              >
                <span>{member.name}</span>
                <button
                  onClick={() => deleteMember(member.id)}
                  disabled={deletingMemberId === member.id}
                  className="shrink-0 rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                >
                  {deletingMemberId === member.id ? "削除中..." : "削除"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6 rounded-2xl bg-white p-5 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">支出一覧</h2>
          <span className="text-sm text-gray-500">{expenses.length}件</span>
        </div>

        {expenses.length === 0 ? (
          <p className="text-gray-500">まだ支出がありません</p>
        ) : (
          <ul className="space-y-3">
            {expenses.map((expense) => (
              <li key={expense.id} className="rounded-2xl bg-sky-50 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${getCategoryColor(
                          expense.category
                        )}`}
                      >
                        {expense.category}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(expense.created_at)}
                      </span>
                    </div>

                    <div className="text-lg font-bold">¥{expense.amount.toLocaleString()}</div>
<div className="mt-1 text-xs text-gray-400">id: {expense.id}</div>

                    <div className="mt-1 text-sm text-gray-600">
                      支払った人: {getMemberName(expense.paid_by_member_id)}
                    </div>

                    {expense.memo ? (
                      <div className="mt-1 text-sm text-gray-600">
                        メモ: {expense.memo}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
  <button
    onClick={() => {
      alert(`編集クリック: ${expense.id}`);
      window.location.href = `/events/${eventId}/expenses/${expense.id}/edit`;
    }}
    className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-200"
  >
    編集
  </button>

  <button
    onClick={() => {
      alert(`削除クリック: ${expense.id}`);
      deleteExpense(expense.id);
    }}
    disabled={deletingExpenseId === expense.id}
    className="rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
  >
    {deletingExpenseId === expense.id ? "削除中..." : "削除"}
  </button>
</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="space-y-3">
        <Link
          href={`/events/${eventId}/expenses/new`}
          className="block w-full rounded-2xl bg-lime-400 py-4 text-center text-lg font-semibold text-white shadow-md hover:bg-lime-500"
        >
          支出を追加
        </Link>

        <Link
          href={`/events/${eventId}/result`}
          className="block w-full rounded-2xl bg-sky-400 py-4 text-center text-lg font-semibold text-white shadow-md hover:bg-sky-500"
        >
          精算結果を見る
        </Link>
      </div>
    </main>
  );
}