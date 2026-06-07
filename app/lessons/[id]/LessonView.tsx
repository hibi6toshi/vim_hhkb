"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { HHKBKeyboard, useActiveKeys } from "../../components/HHKBKeyboard";
import { VimEditor } from "../../components/VimEditor";
import { getLesson, lessons } from "../data";

export function LessonView({ id }: { id: string }) {
  const router = useRouter();
  const lesson = useMemo(() => getLesson(id), [id]);
  const activeKeys = useActiveKeys();
  const [cleared, setCleared] = useState(false);

  if (!lesson) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12 text-zinc-100">
        <p>レッスンが見つかりませんでした。</p>
        <Link href="/" className="text-amber-400 underline">
          ← トップへ
        </Link>
      </main>
    );
  }

  const currentIndex = lessons.findIndex((l) => l.id === lesson.id);
  const next = lessons[currentIndex + 1];
  const prev = lessons[currentIndex - 1];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
            ← レッスン一覧
          </Link>
          <div className="flex items-center gap-2 text-sm">
            {prev && (
              <Link
                href={`/lessons/${prev.id}`}
                className="rounded border border-zinc-700 px-3 py-1 hover:bg-zinc-800"
              >
                ← 前
              </Link>
            )}
            {next && (
              <Link
                href={`/lessons/${next.id}`}
                className="rounded border border-zinc-700 px-3 py-1 hover:bg-zinc-800"
              >
                次 →
              </Link>
            )}
          </div>
        </div>

        <header className="flex flex-col gap-2">
          <span className="text-xs tracking-wider text-amber-400 uppercase">
            {lesson.category}
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

        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <h2 className="mb-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              エディタ
            </h2>
            <VimEditor
              initialLines={lesson.initialText}
              initialCursor={lesson.initialCursor}
              targetLines={lesson.targetText}
              targetCursor={lesson.targetCursor}
              onSuccess={() => setCleared(true)}
            />
          </div>
          <div>
            <h2 className="mb-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              目標
            </h2>
            <pre className="rounded-md border border-emerald-700/40 bg-emerald-900/10 p-4 font-mono text-sm whitespace-pre text-emerald-200">
              {lesson.targetText.join("\n") || " "}
            </pre>
            {lesson.targetCursor && (
              <p className="mt-2 text-xs text-zinc-400">
                目標カーソル位置:{" "}
                <span className="font-mono text-emerald-300">
                  ({lesson.targetCursor.row + 1}:{lesson.targetCursor.col + 1})
                </span>
              </p>
            )}
            {cleared && next && (
              <button
                onClick={() => router.push(`/lessons/${next.id}`)}
                className="mt-4 w-full rounded-md bg-emerald-500 px-4 py-2 font-semibold text-emerald-950 hover:bg-emerald-400"
              >
                次のレッスンへ →
              </button>
            )}
            {cleared && !next && (
              <div className="mt-4 rounded-md bg-amber-500/20 px-4 py-3 text-center font-semibold text-amber-200">
                🎉 全レッスン完了!
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col items-center gap-2 pt-4">
          <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
            HHKB
          </h2>
          <HHKBKeyboard activeKeys={activeKeys} />
        </section>
      </div>
    </main>
  );
}
