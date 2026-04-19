"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type EventItem = {
  id: string;
  title: string;
  created_at: string;
};

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("events")
        .select("id, title, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setEvents(data || []);
      setLoading(false);
    };

    fetchEvents();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  const latestEvent = events[0];

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-md">
        <h1 className="text-3xl font-bold text-sky-500">イベント一覧</h1>
        <p className="mt-2 text-sm text-gray-600">
          ディズニー用の割り勘イベントを管理できます
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-sky-50 p-4">
            <div className="text-sm text-gray-500">イベント数</div>
            <div className="mt-1 text-2xl font-bold text-sky-600">
              {events.length}
            </div>
          </div>

          <div className="rounded-xl bg-lime-50 p-4">
            <div className="text-sm text-gray-500">最新イベント</div>
            <div className="mt-1 truncate text-sm font-semibold text-lime-700">
              {latestEvent ? latestEvent.title : "まだなし"}
            </div>
          </div>
        </div>
      </div>

      <Link
        href="/events/new"
        className="mb-5 block rounded-2xl bg-gradient-to-r from-sky-400 to-lime-400 p-4 text-center text-lg font-semibold text-white shadow-md"
      >
        ＋ 新しいイベントを作成
      </Link>

      {loading ? (
        <div className="rounded-2xl bg-white p-5 shadow-md">
          <p>読み込み中...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl bg-white p-5 shadow-md">
          <p className="text-gray-600">まだイベントがありません。</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="block rounded-2xl bg-white p-5 shadow-md transition hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-semibold">{event.title}</div>
                    <div className="mt-2 text-sm text-gray-500">
                      作成日: {formatDate(event.created_at)}
                    </div>
                  </div>

                  <div className="shrink-0 rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700">
                    開く
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
