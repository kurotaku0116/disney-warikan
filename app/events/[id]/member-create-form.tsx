'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';

export function MemberCreateForm({ eventId, nextSortOrder }: { eventId: string; nextSortOrder: number }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/events/${eventId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sortOrder: nextSortOrder }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'メンバー追加に失敗しました');
      setName('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メンバー追加に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 md:flex-row">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="メンバー名を入力" required />
      <Button type="submit" disabled={loading}>{loading ? '追加中...' : '追加'}</Button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
