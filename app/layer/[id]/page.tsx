"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { HHKBKeyboard, useActiveKeys } from "../../components/HHKBKeyboard";
import { LayerTrainer } from "../../components/LayerTrainer";
import { getLayerLesson, layerLessons } from "../data";

export default function LayerLessonPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const lesson = useMemo(() => getLayerLesson(params.id), [params.id]);
  const activeKeys = useActiveKeys();
  const [cleared, setCleared] = useState(false);

  if (!lesson) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12 text-zinc-100">
        <p>レッスンが見つかりませんでした。</p>
        <Link href="/" className="text-amber-400 underline">← トップへ</Link>
      </main>
    );
  }

  const currentIndex = layerLessons.findIndex((l) => l.id === lesson.id);
  const next = layerLessons[currentIndex + 1];
  const prev = layerLessons[currentIndex - 1];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
            ← トップ
          </Link>
          <div className="flex items-center gap-2 text-sm">
            {prev && (
              <Link
                href={`/layer/${prev.id}`}
                className="rounded border border-zinc-700 px-3 py-1 hover:bg-zinc-800"
              >
                ← 前
              </Link>
            )}
            {next && (
              <Link
                href={`/layer/${next.id}`}
                className="rounded border border-zinc-700 px-3 py-1 hover:bg-zinc-800"
              >
                次 →
              </Link>
            )}
          </div>
        </div>

        <header className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-sky-300">
            HHKB layer · {lesson.category}
          </span>
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
          <p className="text-zinc-300">{lesson.description}</p>
          <details className="text-sm text-zinc-400">
            <summary className="cursor-pointer hover:text-zinc-200">
              ヒントを見る
            </summary>
            <p className="mt-2 rounded bg-zinc-900 p-3 font-mono">
              {lesson.hint}
            </p>
          </details>
        </header>

        <section>
          <LayerTrainer
            sequence={lesson.sequence}
            display={lesson.display}
            onSuccess={() => setCleared(true)}
          />
          {cleared && next && (
            <button
              onClick={() => router.push(`/layer/${next.id}`)}
              className="mt-4 w-full rounded-md bg-emerald-500 px-4 py-2 font-semibold text-emerald-950 hover:bg-emerald-400"
            >
              次のレッスンへ →
            </button>
          )}
          {cleared && !next && (
            <div className="mt-4 rounded-md bg-amber-500/20 px-4 py-3 text-center font-semibold text-amber-200">
              🎉 全レイヤー練習クリア!
            </div>
          )}
        </section>

        <section className="flex flex-col items-center gap-2 pt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            HHKB (Fnレイヤーは青い小さなラベル)
          </h2>
          <HHKBKeyboard activeKeys={activeKeys} />
        </section>
      </div>
    </main>
  );
}
