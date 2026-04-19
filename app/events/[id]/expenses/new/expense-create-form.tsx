'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Select } from '@/components/select';
import { Textarea } from '@/components/textarea';
import { CATEGORIES } from '@/lib/constants';
import type { MemberRow } from '@/types/database';

export function ExpenseCreateForm({ eventId, members }: { eventId: string; members: MemberRow[] }) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [paidByMemberId, setPaidByMemberId] = useState(members[0]?.id ?? '');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [memo, setMemo] = useState('');
  const [applyToAll, setApplyToAll] = useState(true);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(members.map((member) => member.id));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleMember(id: string) {
    setSelectedMemberIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const participantIds = applyToAll ? members.map((member) => member.id) : selectedMemberIds;
    if (participantIds.length === 0) {
      setError('対象メンバーを1人以上選んでください。');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/events/${eventId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          paidByMemberId,
          category,
          memo,
          participantIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '支出追加に失敗しました');
      router.push(`/events/${eventId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '支出追加に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div>
        <label className="mb-2 block text-sm font-medium">金額</label>
        <Input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">カテゴリ</label>
        <Select value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">支払った人</label>
        <Select value={paidByMemberId} onChange={(e) => setPaidByMemberId(e.target.value)} required>
          {members.map((member) => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">メモ</label>
        <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={50} placeholder="例: ハングリーベア / カチューシャ" rows={3} />
      </div>

      <div>
        <p className="mb-2 block text-sm font-medium">誰の分か</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={applyToAll} onChange={(e) => setApplyToAll(e.target.checked)} />
          全員で割る
        </label>

        {!applyToAll ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {members.map((member) => (
              <label key={member.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedMemberIds.includes(member.id)}
                  onChange={() => toggleMember(member.id)}
                />
                {member.name}
              </label>
            ))}
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" disabled={loading || members.length === 0}>
        {loading ? '保存中...' : '保存する'}
      </Button>
      {members.length === 0 ? <p className="text-sm text-amber-700">先にメンバーを追加してください。</p> : null}
    </form>
  );
}
