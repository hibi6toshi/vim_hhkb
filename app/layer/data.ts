export type LayerLesson = {
  id: string;
  title: string;
  description: string;
  hint: string;
  // sequence of expected keys (lowercase, as produced by eventToKey)
  sequence: string[];
  // display label for each key in sequence
  display: string[];
  category: "fkey" | "arrow" | "mod";
};

// HHKB Pro2 default Fn mapping:
//   Fn + 1..= → F1..F12 (F5/F11/F12 are reserved by browsers, so we skip them in lessons)
//   Fn + [   → ↑
//   Fn + ;   → →
//   Fn + /   → ↓
//   Fn + ,   → ←
//   Fn + \   → Insert
//   Fn + Tab → Caps Lock

export const layerLessons: LayerLesson[] = [
  {
    id: "fkeys-low",
    title: "01. F1〜F4 を順番に",
    description:
      "Fn を押しながら 1, 2, 3, 4 と順に押してください。HHKB には独立した F キーがないので、Fn レイヤーで打つ感覚を身に付けます。",
    hint: "右手親指あたりで Fn を保持しつつ、左手で 1〜4",
    sequence: ["f1", "f2", "f3", "f4"],
    display: ["F1", "F2", "F3", "F4"],
    category: "fkey",
  },
  {
    id: "fkeys-mid",
    title: "02. F6〜F10 (F5 はブラウザがリロードに使うため除外)",
    description: "Fn + 6, 7, 8, 9, 0 の順に押してください。",
    hint: "F10 = Fn + 0。一番右までスライドします",
    sequence: ["f6", "f7", "f8", "f9", "f10"],
    display: ["F6", "F7", "F8", "F9", "F10"],
    category: "fkey",
  },
  {
    id: "arrows-basic",
    title: "03. 矢印キー: ↑ → ↓ ←",
    description:
      "Fn + [ で ↑、Fn + ; で →、Fn + / で ↓、Fn + , で ← です。順に押してください。",
    hint: "右手ホームポジションのまま、人差し指・中指・薬指で届く位置にあります",
    sequence: ["arrowup", "arrowright", "arrowdown", "arrowleft"],
    display: ["↑", "→", "↓", "←"],
    category: "arrow",
  },
  {
    id: "arrows-konami",
    title: "04. コナミコマンド ↑↑↓↓←→←→",
    description: "懐かしのコナミコマンドを Fn レイヤーで打ってみよう。",
    hint: "↑=Fn+[ ↓=Fn+/ ←=Fn+, →=Fn+;",
    sequence: [
      "arrowup",
      "arrowup",
      "arrowdown",
      "arrowdown",
      "arrowleft",
      "arrowright",
      "arrowleft",
      "arrowright",
    ],
    display: ["↑", "↑", "↓", "↓", "←", "→", "←", "→"],
    category: "arrow",
  },
  {
    id: "mod-combo",
    title: "05. モディファイア: Tab, Backspace, Enter",
    description:
      "HHKB は最上段がない分、よく使う Tab / Delete(Backspace) / Return が手の近くにあります。Tab → Backspace → Return の順に押してください。",
    hint: "Delete キー(右上) は Backspace として動作します",
    sequence: ["tab", "backspace", "enter"],
    display: ["Tab", "⌫", "↵"],
    category: "mod",
  },
];

export function getLayerLesson(id: string): LayerLesson | undefined {
  return layerLessons.find((l) => l.id === id);
}
