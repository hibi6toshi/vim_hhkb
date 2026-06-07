export type Lesson = {
  id: string;
  title: string;
  description: string;
  hint: string;
  initialText: string[];
  initialCursor: { row: number; col: number };
  targetText: string[];
  // Optional: if set, the lesson is only cleared when the cursor lands here too
  targetCursor?: { row: number; col: number };
  category:
    | "movement"
    | "edit"
    | "yank"
    | "visual"
    | "search"
    | "combo"
    | "advanced";
};

export const lessons: Lesson[] = [
  {
    id: "hjkl-basics",
    title: "01. hjkl で移動",
    description:
      "h(←) j(↓) k(↑) l(→) でカーソルを動かせます。2 行目の行末までカーソルを移動し、a で挿入モードに入って「ok」と入力、Esc で抜けてください。",
    hint: "j で下へ → l を連打（または $）で行末 → a で挿入 → ok → Esc",
    initialText: [
      "Welcome to Vim!",
      "Type 'ok' at the end -> ",
      "Then press Esc.",
    ],
    initialCursor: { row: 0, col: 0 },
    targetText: [
      "Welcome to Vim!",
      "Type 'ok' at the end -> ok",
      "Then press Esc.",
    ],
    category: "movement",
  },
  {
    id: "word-motion",
    title: "02. 単語単位の移動 (w/b/e)",
    description:
      "w で次の単語、b で前の単語、e で単語末へ移動。w を 2 回押して 3 単語目「fox」の先頭にカーソルを乗せてください。",
    hint: "ww",
    initialText: ["The quick fox jumps over"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["The quick fox jumps over"],
    targetCursor: { row: 0, col: 10 },
    category: "movement",
  },
  {
    id: "dd-delete-line",
    title: "03. dd で行削除",
    description: "真ん中の不要な行を dd で削除してください。",
    hint: "j でカーソルを 2 行目へ → dd",
    initialText: ["keep this line", "DELETE ME", "keep this too"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["keep this line", "keep this too"],
    category: "edit",
  },
  {
    id: "yy-paste",
    title: "04. yy と p で行コピー",
    description:
      "1 行目をコピー (yy) して、2 行目の下に貼り付け (p) てください。",
    hint: "yy → j → p",
    initialText: ["copy me", "below here"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["copy me", "below here", "copy me"],
    category: "yank",
  },
  {
    id: "ci-quote",
    title: '05. ci" で引用符の中身を変更',
    description:
      '引用符の中の文字列を ci" で削除し、挿入モードで「vim」と打って Esc を押してください。',
    hint: 'カーソルを " の内側へ → ci" → vim → Esc',
    initialText: ['const name = "hhkb";'],
    initialCursor: { row: 0, col: 0 },
    targetText: ['const name = "vim";'],
    category: "edit",
  },
  {
    id: "dw-word",
    title: "06. dw で単語削除",
    description: "「bad 」を dw で削除して「good idea」だけにしてください。",
    hint: "カーソルが b にある状態で dw",
    initialText: ["bad good idea"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["good idea"],
    category: "edit",
  },
  {
    id: "o-newline",
    title: "07. o で下に新規行",
    description:
      "o で 1 行目の下に新しい行を作り、「hello」と入力して Esc してください。",
    hint: "o → hello → Esc",
    initialText: ["top line"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["top line", "hello"],
    category: "edit",
  },
  {
    id: "A-append-end",
    title: "08. A で行末に追記",
    description:
      "A で行末に挿入モードに入り「!」を追加して Esc してください。",
    hint: "A → ! → Esc",
    initialText: ["hello world"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["hello world!"],
    category: "edit",
  },
  {
    id: "x-delete-char",
    title: "09. x で 1 文字削除",
    description: "余計な「!」を x で削除して「hello」にしてください。",
    hint: "カーソルを ! に重ねて x",
    initialText: ["hello!"],
    initialCursor: { row: 0, col: 5 },
    targetText: ["hello"],
    category: "edit",
  },
  {
    id: "combo-refactor",
    title: "10. 実践: 関数名のリファクタ",
    description:
      'ciw を使って関数名 "oldName" を "newName" に書き換えてください。',
    hint: "カーソルを oldName の上に → ciw → newName → Esc",
    initialText: ["function oldName() {", "  return 42;", "}"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["function newName() {", "  return 42;", "}"],
    category: "combo",
  },

  // ===== Advanced =====

  {
    id: "count-word",
    title: "11. 数値プレフィックス (3w)",
    description:
      "モーションの前に数値を付けると繰り返せます。3w で 3 単語進み、「gamma」の先頭にカーソルを置いてください。",
    hint: "3w",
    initialText: ["alpha beta gamma delta epsilon"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["alpha beta gamma delta epsilon"],
    targetCursor: { row: 0, col: 11 },
    category: "advanced",
  },
  {
    id: "count-down",
    title: "12. 5j で 5 行下へ",
    description:
      "5j とタイプすると 5 行下に一気に移動します。6 行目までジャンプしてください。",
    hint: "5j",
    initialText: ["L1", "L2", "L3", "L4", "L5", "L6", "L7"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["L1", "L2", "L3", "L4", "L5", "L6", "L7"],
    targetCursor: { row: 5, col: 0 },
    category: "advanced",
  },
  {
    id: "find-char",
    title: "13. fX で文字検索",
    description:
      "f は行内の指定文字へジャンプします。fX で「X」の位置までカーソルを移動してください。",
    hint: "fX",
    initialText: ["find the X marker in this line"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["find the X marker in this line"],
    targetCursor: { row: 0, col: 9 },
    category: "advanced",
  },
  {
    id: "replace-char",
    title: "14. r で 1 文字置換",
    description:
      "r の後ろに 1 文字を入力すると、カーソル位置の文字をその 1 文字に置き換えます。「kello」を「hello」にしてください。",
    hint: "rh",
    initialText: ["kello world"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["hello world"],
    category: "advanced",
  },
  {
    id: "join-lines",
    title: "15. J で行連結",
    description:
      "J は次の行を空白を 1 つ挟んで連結します。2 行を 1 行に繋げてください。",
    hint: "J",
    initialText: ["Hello,", "world!"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["Hello, world!"],
    category: "advanced",
  },
  {
    id: "toggle-case",
    title: "16. ~ で大小文字切替",
    description:
      "~ はカーソル位置の文字の大小を反転します。5~ で「hello」を「HELLO」にしてください。",
    hint: "5~",
    initialText: ["hello"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["HELLO"],
    category: "advanced",
  },
  {
    id: "matching-bracket",
    title: "17. % で対応する括弧へジャンプ",
    description:
      "( 上で % を押すと対応する ) へ飛びます。閉じ括弧 ) までカーソルを移動してください。",
    hint: "%",
    initialText: ["function add(a, b, c) { return a + b + c; }"],
    initialCursor: { row: 0, col: 12 },
    targetText: ["function add(a, b, c) { return a + b + c; }"],
    targetCursor: { row: 0, col: 20 },
    category: "advanced",
  },
  {
    id: "count-delete-line",
    title: "18. 3dd で 3 行削除",
    description:
      "数値+ddで複数行を一度に削除できます。中央の不要な 3 行を削除してください。",
    hint: "j で 2 行目へ → 3dd",
    initialText: [
      "header",
      "junk1",
      "junk2",
      "junk3",
      "footer",
    ],
    initialCursor: { row: 0, col: 0 },
    targetText: ["header", "footer"],
    category: "advanced",
  },
  {
    id: "visual-delete",
    title: "19. v で範囲選択して d",
    description:
      "v で文字単位の Visual モードに入り、選択範囲を d で削除できます。「BAD 」を選択して削除し、「good」だけ残してください。",
    hint: "v → e (または lll) → d",
    initialText: ["BAD good"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["good"],
    category: "visual",
  },
  {
    id: "indent-block",
    title: "20. >> で行インデント",
    description:
      ">> で行頭にスペース 2 つを追加します。3>> で 3 行まとめてインデントしてください。",
    hint: "3>>",
    initialText: ["if (x) {", "return x;", "}"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["  if (x) {", "  return x;", "  }"],
    category: "advanced",
  },
  {
    id: "G-bottom",
    title: "21. G と gg でファイル端へ",
    description:
      "G でファイル末尾、gg でファイル先頭へ移動します。ファイル末尾までジャンプしてください。",
    hint: "G",
    initialText: ["line 1", "line 2", "line 3", "line 4", "line 5"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["line 1", "line 2", "line 3", "line 4", "line 5"],
    targetCursor: { row: 4, col: 0 },
    category: "advanced",
  },
  {
    id: "dG-cleanup",
    title: "22. dG でカーソル位置から末尾まで削除",
    description:
      "dG はカーソル行から最終行までをすべて削除します。2 行目以降を削除してヘッダーだけ残してください。",
    hint: "j → dG",
    initialText: [
      "// header",
      "old code 1",
      "old code 2",
      "old code 3",
    ],
    initialCursor: { row: 0, col: 0 },
    targetText: ["// header"],
    category: "advanced",
  },

  // ===== Dot repeat & operator+motion =====

  {
    id: "dot-repeat-x",
    title: "23. . で直前の変更を繰り返す",
    description:
      "Vim の . (ドット) は「直前の変更」を再生します。x で 1 文字消したあと . を 4 回押すだけで 5 文字削除できます。「XXXXXhello」の X を全部消して「hello」にしてください。",
    hint: "x . . . .",
    initialText: ["XXXXXhello"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["hello"],
    category: "advanced",
  },
  {
    id: "dot-repeat-ciw",
    title: "24. ciw + . で複数単語を置換",
    description:
      "ciw でカーソル位置の単語を新しい単語に置き換えたあと、次の置き換えたい単語の上で . を押すと同じ変更を繰り返せます。「foo」を「bar」に 2 か所書き換えてください。",
    hint: "ciw → bar → Esc → w (次の foo まで移動) → .",
    initialText: ["foo and foo are foos"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["bar and bar are foos"],
    category: "advanced",
  },
  {
    id: "df-delete-until-char",
    title: '25. df) で対応括弧まで削除',
    description:
      "df は「指定文字を含めて削除」。カーソル位置から括弧 ) までを df) で一気に削除し、「const x = ;」にしてください。",
    hint: "df)",
    initialText: ["const x = (1 + 2 + 3);"],
    initialCursor: { row: 0, col: 10 },
    targetText: ["const x = ;"],
    category: "advanced",
  },
  {
    id: "dt-delete-till-char",
    title: "26. dt; で「;」の手前まで削除",
    description:
      "dt は「指定文字の手前まで」削除します (指定文字自体は残る)。dt; で末尾の「;」を残しつつ右側を削除してください。",
    hint: "dt;",
    initialText: ["return foo + bar;"],
    initialCursor: { row: 0, col: 7 },
    targetText: ["return ;"],
    category: "advanced",
  },
  {
    id: "D-delete-eol",
    title: "27. D で行末まで削除",
    description:
      "D は d$ と同じく「カーソルから行末まで」削除します。コメントだけ残して右側を削除してください。",
    hint: "D",
    initialText: ["// keep this DELETE THE REST"],
    initialCursor: { row: 0, col: 13 },
    targetText: ["// keep this "],
    category: "advanced",
  },
  {
    id: "C-change-eol",
    title: "28. C で行末まで変更",
    description:
      "C は c$ と同じで「カーソルから行末まで」を削除しつつ挿入モードに入ります。「TODO: 」を残して「done」と書き換えてください。",
    hint: "C → done → Esc",
    initialText: ["TODO: write the implementation"],
    initialCursor: { row: 0, col: 6 },
    targetText: ["TODO: done"],
    category: "advanced",
  },

  // ===== Undo / Redo / Search / Macros / Case ops / Inc-Dec =====

  {
    id: "undo-redo",
    title: "29. u で取り消し / Ctrl-r でやり直し",
    description:
      "間違って dd で行を消してしまった想定です。u で元に戻し、Ctrl-r で再度消し、もう一度 u で復元してください。",
    hint: "dd → u → Ctrl-r → u",
    initialText: ["keep this"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["keep this"],
    category: "advanced",
  },
  {
    id: "case-gUw",
    title: "30. gUw で単語を大文字化",
    description:
      "gU は「指定範囲を大文字化」するオペレータです。gUw で 1 単語を大文字に変えてください。「hello」を「HELLO」にしてください。",
    hint: "gUw",
    initialText: ["hello world"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["HELLO world"],
    category: "advanced",
  },
  {
    id: "case-gUU",
    title: "31. gUU で行ごと大文字化",
    description:
      "gUU は現在行をまるごと大文字化します。1 行目を大文字に変えてください。",
    hint: "gUU",
    initialText: ["important note", "do not change"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["IMPORTANT NOTE", "do not change"],
    category: "advanced",
  },
  {
    id: "increment-number",
    title: "32. Ctrl-a で数値を加算",
    description:
      "Ctrl-a はカーソル上 (またはその右の最も近い) 数値を 1 増やします。3 Ctrl-a で 3 増やすことも可能。「version 1」を「version 4」にしてください。",
    hint: "3 → Ctrl-a",
    initialText: ["version 1"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["version 4"],
    category: "advanced",
  },
  {
    id: "search-jump",
    title: "33. / で検索",
    description:
      "/ を押すと検索モードに入ります。/needle Enter でカーソルが needle にジャンプします。文中の「needle」までカーソルを動かしてください。",
    hint: "/needle Enter",
    initialText: ["finding a needle in a haystack"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["finding a needle in a haystack"],
    targetCursor: { row: 0, col: 10 },
    category: "advanced",
  },
  {
    id: "search-n-N",
    title: "34. n で次の一致, N で前の一致",
    description:
      "/foo で検索したあと n で次の一致、N で前の一致に飛びます。/foo してから n を 2 回押し、3 番目の foo に到達してください。",
    hint: "/foo Enter → n → n",
    initialText: ["foo bar foo bar foo bar foo"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["foo bar foo bar foo bar foo"],
    targetCursor: { row: 0, col: 16 },
    category: "advanced",
  },
  {
    id: "cgn-dot",
    title: "35. cgn と . でリファクタ",
    description:
      "/old で検索したあと cgn で「次の一致を変更」できます。新しい単語を入力して Esc、続けて . を押すと同じ変更を次の一致にも繰り返せます。3 か所の「old」を「new」に書き換えてください。",
    hint: "/old Enter → cgn → new → Esc → . → .",
    initialText: ["old code old style old way"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["new code new style new way"],
    category: "advanced",
  },
  {
    id: "macro-record",
    title: "36. qa で マクロ記録 / @a で再生",
    description:
      "qa を押してマクロ記録開始、適当な編集 (例: 行頭に // をつける) をして q で記録終了。@a でそのマクロを再生できます。1 行目で qa I // Esc j q を実行 → @a を 2 回押して残り 2 行にも // を付けてください。",
    hint: "qa → I → // → Space → Esc → j → q → @a → @a",
    initialText: ["line one", "line two", "line three"],
    initialCursor: { row: 0, col: 0 },
    targetText: ["// line one", "// line two", "// line three"],
    category: "advanced",
  },

  // ===== Viewport / Screen navigation =====

  {
    id: "ctrl-d-half-page",
    title: "37. Ctrl-d で半画面下へ",
    description:
      "Ctrl-d はビューポートの半分 (5 行) だけ下にスクロールしつつカーソルを動かします。1 度押して 6 行目までジャンプしてください。",
    hint: "Ctrl-d",
    initialText: Array.from({ length: 25 }, (_, i) => `line ${i + 1}`),
    initialCursor: { row: 0, col: 0 },
    targetText: Array.from({ length: 25 }, (_, i) => `line ${i + 1}`),
    targetCursor: { row: 5, col: 0 },
    category: "advanced",
  },
  {
    id: "ctrl-f-full-page",
    title: "38. Ctrl-f で一画面下へ",
    description:
      "Ctrl-f は一画面ぶんジャンプ。Ctrl-f を 2 回押して 17 行目までジャンプしてください (1 画面 = 8 行)。",
    hint: "Ctrl-f → Ctrl-f",
    initialText: Array.from({ length: 30 }, (_, i) => `row ${i + 1}`),
    initialCursor: { row: 0, col: 0 },
    targetText: Array.from({ length: 30 }, (_, i) => `row ${i + 1}`),
    targetCursor: { row: 16, col: 0 },
    category: "advanced",
  },
  {
    id: "H-M-L",
    title: "39. H / M / L で画面の端へ",
    description:
      "H は画面上端、M は画面中央、L は画面下端へカーソルをジャンプさせます。Ctrl-f で画面を一つ下に送ったあと、L で画面の一番下までジャンプしてください。",
    hint: "Ctrl-f → L",
    initialText: Array.from({ length: 30 }, (_, i) => `item ${i + 1}`),
    initialCursor: { row: 0, col: 0 },
    targetText: Array.from({ length: 30 }, (_, i) => `item ${i + 1}`),
    targetCursor: { row: 17, col: 0 },
    category: "advanced",
  },
  {
    id: "zz-center",
    title: "40. zz でカーソルを画面中央へ",
    description:
      "zz は「カーソル位置を変えず」画面 (ビューポート) を再配置してカーソルを中央に持ってきます。10G でジャンプしてから zz で中央に揃えてみてください。",
    hint: "10G → zz",
    initialText: Array.from({ length: 25 }, (_, i) => `line ${i + 1}`),
    initialCursor: { row: 0, col: 0 },
    targetText: Array.from({ length: 25 }, (_, i) => `line ${i + 1}`),
    targetCursor: { row: 9, col: 0 },
    category: "advanced",
  },
];

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}
