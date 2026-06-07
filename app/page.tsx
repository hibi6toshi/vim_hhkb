"use client";

import Link from "next/link";
import { HHKBKeyboard, useActiveKeys } from "./components/HHKBKeyboard";
import { layerLessons } from "./layer/data";
import { lessons } from "./lessons/data";

const categoryColor: Record<string, string> = {
  movement: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  edit: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  yank: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  visual: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  search: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  combo: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40",
  advanced: "bg-pink-500/20 text-pink-300 border-pink-500/40",
  fkey: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  arrow: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  mod: "bg-orange-500/20 text-orange-300 border-orange-500/40",
};

export default function Home() {
  const activeKeys = useActiveKeys();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 py-12 flex flex-col gap-10">
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-amber-400">Vim</span> × <span className="text-sky-300">HHKB</span> Trainer
          </h1>
          <p className="max-w-2xl text-zinc-400">
            実際のコーディングシナリオを Vim キーバインドで操作しながら、
            HHKB の配列にも同時に慣れていく練習アプリです。
            下のキーボード図に押したキーがハイライト表示されます。
          </p>
        </header>

        <section className="flex flex-col items-center gap-2">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            キーを押してみてください
          </p>
          <HHKBKeyboard activeKeys={activeKeys} />
        </section>

        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">
              <span className="text-amber-400">Vim</span> レッスン
            </h2>
            <span className="text-xs text-zinc-500">
              実際の編集操作を通して Vim を体得
            </span>
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={`/lessons/${lesson.id}`}
                  className="group flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-amber-500/50 hover:bg-zinc-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold group-hover:text-amber-300">
                      {lesson.title}
                    </span>
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-mono ${
                        categoryColor[lesson.category] ?? ""
                      }`}
                    >
                      {lesson.category}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-zinc-400">
                    {lesson.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">
              <span className="text-sky-300">HHKB レイヤー</span> 練習
            </h2>
            <span className="text-xs text-zinc-500">
              Fn + キーの組み合わせを体に染み込ませる
            </span>
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {layerLessons.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={`/layer/${lesson.id}`}
                  className="group flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-sky-500/50 hover:bg-zinc-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold group-hover:text-sky-300">
                      {lesson.title}
                    </span>
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-mono ${
                        categoryColor[lesson.category] ?? ""
                      }`}
                    >
                      {lesson.category}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-zinc-400">
                    {lesson.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <footer className="pt-8 text-center text-xs text-zinc-600">
          Built with Next.js + Bun · Have fun ✨
        </footer>
      </div>
    </main>
  );
}
