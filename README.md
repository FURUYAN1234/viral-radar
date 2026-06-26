# Monogatari Buzz Maker / 物語バズメーカー

![Version](https://img.shields.io/badge/version-1.2.5-0f766e)
![Framework](https://img.shields.io/badge/framework-Vite-646cff)
![Runtime](https://img.shields.io/badge/runtime-browser%20%2B%20local%20Vite-111827)
![API](https://img.shields.io/badge/API-OpenAI%20%2F%20Gemini-2563eb)
![Source Code License](https://img.shields.io/badge/source%20code-UNLICENSED-red)
[![Generated Text License](https://img.shields.io/badge/generated%20text-CC%20BY--NC--SA%204.0-0f766e)](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ja)

Monogatari Buzz Maker is a creative planning app that turns real public Web/RSS trend signals into evidence packs, medium-specific production plans, AI prompts, reference drafts, and editor-facing exports.

物語バズメーカーは、公開Web/RSSから実際に取得した話題シグナルを、取得根拠、媒体別制作案、AI用プロンプト、参考本文、編集者向け出力へ整理する創作支援アプリです。

[![AI Manga Creative Suite / AIまんが制作エコシステム](https://github.com/user-attachments/assets/d850ac7f-aa1c-40cc-a378-b8c6673c726c)](https://youtu.be/pqYVxUUg0Cs?si=27g1I3tO2EuZkOuxJ)

> Important: This app must not fill missing retrievals, failed API responses, or creative sections with invented data, old samples, local templates, or fake metrics.
>
> 重要: このアプリは、取得できないデータ、失敗したAPI応答、未生成の創作欄を、架空データ、旧サンプル、ローカル定型文、偽の数値で埋めてはいけません。

---

## Overview / 概要

The app is not a trend-word list. It keeps source links, search terms, retrieval time, evidence signals, and medium-specific planning material visible so that a creator or editor can inspect why a topic may be useful before turning it into a story.

このアプリは、流行語リストではありません。取得元リンク、検索語、取得時刻、根拠シグナル、媒体別の制作判断を見える形で残し、制作者や編集者が「なぜこの話題を使えるのか」を確認してから物語化できるようにします。

OpenAI or Google Gemini can generate deeper readings, production notes, story/script design, and reference prose after the user enters an API key in the browser UI. If that AI output is absent, incomplete, unsafe, or template-like, the app fails closed instead of pretending that generation succeeded.

ユーザーがブラウザUIでAPIキーを入力したあと、OpenAIまたはGoogle Geminiで詳細読み取り、制作メモ、物語・台本設計、参考本文を生成できます。AI応答がない、不完全、安全でない、または定型的な場合は、生成済みに見せず fail-closed で扱います。

## What Problem This Solves / このアプリが解く問題

Seeing what is trending is not enough for a manga artist, novelist, video creator, or editor to start production. They need to know why people reacted, what emotional pattern is present, which medium can use it, and where real names must be abstracted.

「今ウケているもの」を見るだけでは、漫画家、小説家、動画制作者、編集者はすぐ制作へ入れません。必要なのは、なぜ反応が起きたのか、どんな感情構造なのか、どの媒体に向くのか、どこから実名を抽象化すべきかという制作判断です。

Monogatari Buzz Maker prepares that decision layer without turning local code into a fake AI writer. Local logic organizes evidence and requests; actual creative prose is generated only by a connected provider or by a human.

物語バズメーカーは、ローカルコードを偽のAI作家に見せかけず、その判断層を準備します。ローカル処理は根拠と依頼内容を整理し、創作本文は接続されたAPIまたは人間が生成します。

## Live Site / 公開サイト

Public version: [https://furuyan1234.github.io/viral-radar/](https://furuyan1234.github.io/viral-radar/)

公開版: [https://furuyan1234.github.io/viral-radar/](https://furuyan1234.github.io/viral-radar/)

Local development uses [http://127.0.0.1:5180/](http://127.0.0.1:5180/). The reserved local port is `5180` so this app can run alongside other Antigravity apps.

ローカル開発では [http://127.0.0.1:5180/](http://127.0.0.1:5180/) を使います。他のAntigravity系アプリと同時起動できるよう、予約済みポート`5180`を使います。

---

## Core Concept / 基本コンセプト

### Trend To Story / 話題を物語へ変換する

The app treats real headlines, fast-rising phrases, comment-heavy topics, saved know-how, and cross-source co-occurrence as signals. It does not copy those signals into a finished story. It asks what emotional pressure, conflict, viewer question, character action, or fictional structure can be derived from them.

このアプリは、実在ニュースの見出し、急に伸びた話題語、コメントが集まる話題、保存されるノウハウ、複数ソースの共起をシグナルとして扱います。それらを完成作品へそのままコピーせず、どんな感情圧、対立、視聴者の疑問、登場人物の行動、架空構造へ変換できるかを確認します。

### Evidence First / 根拠から作る

Evidence cards show source titles, summaries, tags, search terms, retrieval time, and links. Evidence is not the finished story. It is the material that an AI provider or a human editor can inspect before planning.

根拠カードには、見出し、概要、タグ、検索語、取得時刻、リンクを表示します。根拠は完成本文ではありません。AI提供元や編集者が制作前に確認する素材です。

Real names may appear in evidence, but story-facing outputs should use fictionalization or abstraction when needed. The app is not designed to turn real people, companies, works, or incidents into direct accusation-style fiction.

実名は根拠欄には残せますが、物語側の出力では必要に応じて架空化・抽象化します。実在人物、企業、作品、事件をそのまま告発風の物語へ変換するためのアプリではありません。

### Medium Specific Planning / 媒体別の制作判断

The same evidence should not become the same plan in every medium. A story manga needs page rhythm and panel reveal. A short video needs a first-second hook and repeatable visual beat. A trend explainer video needs evidence framing and abstraction boundaries. A novel needs point of view, scene order, psychological pressure, and expansion scale.

同じ根拠でも、すべての媒体で同じ案にしてはいけません。ストーリー漫画にはページ運びとコマの見せ場が必要です。ショート動画には冒頭1秒と繰り返せる画のリズムが必要です。トレンド解説動画には根拠の見せ方と抽象化の境界が必要です。小説には視点、場面順、心理的圧力、短編から長編までの伸ばし方が必要です。

---

## Feature Map / 機能マップ

| Area / 領域 | Feature / 機能 | Details / 詳細 |
|---|---|---|
| Retrieval / 取得 | Public Web/RSS retrieval / 公開Web/RSS取得 | Fetches topic candidates and source links through browser-safe or local routes. / ブラウザ対応またはローカル経路で話題候補と取得元リンクを取得します。 |
| Evidence / 根拠 | Evidence cards / 根拠カード | Shows source title, summary, tags, query, timestamp, and link. / 見出し、概要、タグ、検索語、取得時刻、リンクを表示します。 |
| Metrics / 指標 | Retrieved-data signals / 取得データ指標 | Calculates source count, freshness, overlap, and category fit only from retrieved data. / 取得データに基づく件数、鮮度、重なり、カテゴリ適合を算出します。 |
| AI analysis / AI分析 | Provider-generated readings / API生成の読み取り | Generates summary, evidence readings, and planning judgments through OpenAI or Gemini. / OpenAIまたはGeminiで要約、根拠読み取り、企画判断を生成します。 |
| Planning / 制作案 | Medium-specific plans / 媒体別制作案 | Builds manga, short video, explainer, and novel plans from the same evidence. / 同じ根拠から漫画、ショート動画、解説動画、小説の案を分けて作ります。 |
| Drafting / 参考本文 | Reference prose / 参考本文 | Generates reference prose or script samples for a selected plan. / 選択した制作案の参考本文や台本例を生成します。 |
| Export / 出力 | JSON, Markdown, DOCX | Saves review and handoff artifacts without API keys. / APIキーを含めず、確認・引き継ぎ用の成果物を保存します。 |
| Safety / 安全性 | Fail-closed behavior / fail-closed動作 | Refuses fake success when retrieval or AI generation fails. / 取得やAI生成に失敗した場合、成功したように見せません。 |

---

## User Workflow / 利用手順

1. Open the app and enter an OpenAI or Gemini API key in the UI when AI generation is needed.
2. Choose a medium: story manga, short video, trend explainer video, or novel.
3. Retrieve public Web/RSS evidence and inspect the source cards.
4. Run AI analysis and plan generation only when the evidence is sufficient.
5. Generate reference prose for a selected plan if needed.
6. Export JSON, Markdown, or DOCX for editing, review, or another AI workflow.

1. アプリを開き、AI生成が必要な場合はUIでOpenAIまたはGeminiのAPIキーを入力します。
2. ストーリー漫画、ショート動画、トレンド解説動画、小説から媒体を選びます。
3. 公開Web/RSSの根拠を取得し、取得元カードを確認します。
4. 根拠が十分な場合だけAI分析と制作案生成を実行します。
5. 必要に応じて、選択した制作案の参考本文を生成します。
6. 編集、確認、別AIへの引き継ぎ用にJSON、Markdown、DOCXで出力します。

## Analysis Surfaces / 分析画面

The screen is organized from evidence to decision to draft. Acquisition status comes first, followed by AI analysis summary, evidence readings, medium-specific production judgments, production notes, production plans, and reference drafts.

画面は、根拠から判断、下書きへ進む順番で整理します。取得状態、AI分析サマリー、取得データの読み取り、媒体別制作判断、制作メモ、制作案、参考本文の順に扱います。

This order is intentional. A user should be able to see what was retrieved before seeing what the AI thinks, and should be able to distinguish evidence from creative transformation.

この順序には意味があります。ユーザーはAIの判断を見る前に何が取得されたかを確認でき、根拠と創作変換を混同しないで済む必要があります。

---

## Data Sources / 取得データの扱い

The app uses public Web/RSS sources that can be retrieved from the browser or local route. If all sources fail, the app reports retrieval failure or no result instead of fabricating observations.

アプリは、ブラウザまたはローカル経路から取得可能な公開Web/RSSソースを使います。全ソースの取得に失敗した場合、架空観測を作らず、取得失敗または結果なしとして扱います。

Retrieved article text is treated as evidence for analysis, not as text to reproduce. RSS is used because it gives stable public metadata, source titles, links, and time context.

取得記事の文章は分析根拠として扱い、再現する本文としては扱いません。RSSは、公開メタデータ、見出し、リンク、時刻情報を比較的安定して取得できるため使います。

---

## API Engine / APIエンジン

OpenAI and Google Gemini are both supported. The selected provider is inferred from the API key entered by the user in the browser UI, and provider calls are made only when the user runs analysis or reference drafting.

OpenAIとGoogle Geminiの両方に対応します。ブラウザUIに入力されたAPIキーから利用プロバイダを判定し、ユーザーが分析または参考本文生成を実行したときだけAPIを呼び出します。

API keys are runtime-only. They must not be pasted into chat, issues, commits, README, PLAN, HANDOFF, exported files, or logs. Provider failures are shown as failures; they are not replaced by local creative filler.

APIキーは実行時のみ使います。チャット、Issue、コミット、README、PLAN、HANDOFF、出力ファイル、ログに貼ってはいけません。API失敗は失敗として扱い、ローカル創作文では置き換えません。

---

## Output & Export / 出力

JSON export saves structured report data without API keys. Markdown export saves a readable handoff with evidence, plan context, and rights notes. DOCX export saves an editor-facing review document rather than a raw dump of the screen.

JSON出力は、APIキーを含めず構造化レポートを保存します。Markdown出力は、根拠、制作案、権利注意を含む読みやすい引き継ぎ文書を保存します。DOCX出力は、画面の丸写しではなく、編集者が確認しやすい文書として保存します。

Saved filenames include a 14-digit local timestamp. Example: `monogatari-buzz-maker-story-manga-20260625123045.docx`.

保存ファイル名にはローカル時刻の14桁タイムスタンプを付けます。例: `monogatari-buzz-maker-story-manga-20260625123045.docx`。

---

## Setup & Launch / セットアップと起動

### Public Page / 公開ページ

Open [https://furuyan1234.github.io/viral-radar/](https://furuyan1234.github.io/viral-radar/). Enter an API key from the API settings panel when AI generation is needed. Major actions remain locked until a valid runtime API key is connected.

[https://furuyan1234.github.io/viral-radar/](https://furuyan1234.github.io/viral-radar/) を開きます。AI生成が必要な場合は、API設定パネルからAPIキーを入力します。有効な実行時APIキーが接続されるまで、主要操作はロックされます。

### Local Launch On Windows / Windowsでのローカル起動

```powershell
cd C:\Users\sx717\Antigravity\viral-radar
npm install
npm run dev
```

Open [http://127.0.0.1:5180/](http://127.0.0.1:5180/) after the dev server starts.

開発サーバー起動後、[http://127.0.0.1:5180/](http://127.0.0.1:5180/) を開きます。

### Manual Build / 手動ビルド

```powershell
npm run build
```

Production assets are generated under `dist/`. The production base path is `/viral-radar/` for GitHub Pages.

本番用ファイルは`dist/`に生成されます。GitHub Pages向けのproduction base pathは`/viral-radar/`です。

---

## Verification / 検証

```powershell
npm test
node tests\browser-smoke.mjs
npm run build
git diff --check -- . ':!dist'
```

`npm test` checks retrieval boundaries, provider contracts, export safety, secret handling, and generic production rules. `node tests\browser-smoke.mjs` checks the browser-facing app shell. `npm run build` confirms that the production bundle can be generated. `git diff --check` catches whitespace and conflict-marker issues before commit.

`npm test`は、取得境界、API契約、出力安全性、秘密情報の扱い、汎用本番ルールを確認します。`node tests\browser-smoke.mjs`は、ブラウザ表示側の基本動作を確認します。`npm run build`は、本番バンドルを生成できることを確認します。`git diff --check`は、コミット前に空白や衝突マーカーの問題を検出します。

---

## Tech Stack / 技術スタック

- Vite, browser JavaScript, and CSS for the frontend.
- OpenAI and Google Gemini through user-entered runtime API keys.
- Browser-safe public Web/RSS retrieval with fail-closed behavior.
- JSON, Markdown, and DOCX export.
- Node test runner and browser smoke checks.

- フロントエンドはVite、ブラウザJavaScript、CSSで構成しています。
- ユーザーが実行時に入力したAPIキーでOpenAIとGoogle Geminiを利用します。
- fail-closed方針のブラウザ対応公開Web/RSS取得を使います。
- JSON、Markdown、DOCX出力に対応します。
- Node標準テストランナーとブラウザ簡易確認を使います。

---

## Architecture Highlights / アーキテクチャの要点

Plans are generated from visible evidence, not from an invisible sample bank. The same evidence is reshaped differently for manga, short video, explainer video, and novels. Structure, scene flow, opening, and differentiation are provider-generated fields. Missing or weak provider output does not become local creative prose.

制作案は見える根拠から作り、見えないサンプルバンクからは作りません。同じ根拠でも、漫画、ショート動画、解説動画、小説で別の形に変換します。構成、場面の流れ、冒頭、差別化はAPI応答で生成する欄です。欠けたAPI応答や弱いAPI応答を、ローカル創作文に置き換えません。

DOCX is organized for review and handoff, not as a raw UI screenshot. This matters because the target reader may be an editor, another AI, or the user revising the plan later.

DOCXはレビューと引き継ぎ用に整理し、画面の生コピーにはしません。読み手が編集者、別AI、あとで制作案を直すユーザーのいずれであっても、根拠と判断を追える必要があるためです。

---

## Compliance & Legal Stance / 法的遵守について

The app analyzes public Web/RSS metadata and trend signals as creative reference material. The design assumes information analysis, trend reading, and technical verification under the scope contemplated by Japanese Copyright Law Article 30-4.

本アプリは、公開Web/RSSのメタデータと話題シグナルを創作参考資料として分析します。日本の著作権法30条の4が想定する情報解析、傾向分析、技術検証の範囲を前提に設計しています。

Retrieved works, authors, characters, people, and events are not meant to be reproduced, substituted, or impersonated. Generated text should be tied to retrieved evidence and should abstract real-world material when needed.

取得した作品、作家、キャラクター、人物、事件を再現、代替、なりすましする目的ではありません。生成文章は取得根拠に紐づけ、必要に応じて実在素材を抽象化する前提で扱います。

This README and app output are not legal, medical, financial, investment, or publishing advice.

このREADMEとアプリ出力は、法律、医療、金融、投資、出版判断の専門助言ではありません。

---

## Security / セキュリティ

Do not paste API keys into chat, issues, commits, README, PLAN, HANDOFF, exported files, or logs. The app uses runtime-only API keys and should not restore a saved key after reload. Exports must not contain API keys or key-like strings.

APIキーをチャット、Issue、コミット、README、PLAN、HANDOFF、出力ファイル、ログに貼らないでください。アプリは実行時のみAPIキーを使い、リロード後に保存済みキーを復元しない設計です。出力ファイルにはAPIキーやキー形式の文字列を含めてはいけません。

Failed retrievals and failed API calls must be visible as failures. This is a product rule, not just an implementation detail.

取得失敗やAPI失敗は、失敗として見えるように扱います。これは実装上の都合ではなく、プロダクト上のルールです。

---

## License & Rights / ライセンスと権利

Source code is `UNLICENSED`. Redistribution, sublicensing, sale, or commercial use requires explicit permission from the rights holder.

ソースコードは`UNLICENSED`です。再配布、サブライセンス、販売、商用利用には権利者の明示的な許可が必要です。

Prompt structure, analysis flow, guardrails, and production-judgment logic are published for noncommercial research and evaluation.

プロンプト構造、分析手順、ガード、制作判断ロジックは、非商用の研究・評価目的で公開しています。

Generated reference prose, scripts, production notes, and proposals are treated by default under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ja).

生成される参考本文、台本案、制作メモ、企画案は、原則として[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ja)で扱う考え方です。

OpenAI, Google Gemini, RSS providers, news providers, trademarks, and service names belong to their respective rights holders.

OpenAI、Google Gemini、RSS取得元、ニュース配信元、商標、サービス名は、それぞれの権利者に帰属します。

---

## Terms Of Use / 利用規約

The app is a research and creative-assistance tool for turning public trend evidence into planning material. Do not use it for defamation, harassment, false accusation, impersonation, recognizable style cloning, unauthorized IP-like output, fake data display, secret storage, or professional advice.

本アプリは、公開トレンド根拠を制作資料へ変換する研究・創作支援ツールです。名誉毀損、嫌がらせ、虚偽告発、なりすまし、識別可能な作風模倣、既存IPに類似した無断出力、偽データ表示、秘密情報保存、専門助言用途には使わないでください。

Users are responsible for reviewing, revising, licensing, and publishing any plan, prompt, reference prose, or script created with the app. The app does not guarantee virality, revenue, publication, ranking, accuracy of third-party sources, or continued provider availability.

本アプリで作成した企画、プロンプト、参考本文、台本案の確認、修正、ライセンス確認、公開責任はユーザーにあります。本アプリは、拡散、収益、出版、順位、第三者ソースの正確性、API提供継続を保証しません。

If a rights issue is reported, related output should be reviewed, corrected, or removed as needed. Unless otherwise required, interpretation follows Japanese law.

権利問題の指摘があった場合、該当出力を確認し、必要に応じて修正または削除してください。別途必要な場合を除き、日本法に従って解釈します。

---

## AI Manga Creative Suite / AIまんが制作エコシステム

This project is part of an integrated ecosystem designed to support AI-powered manga and story creation.

本プロジェクトは、AIを活用した漫画・ストーリー制作を支援する統合エコシステムの一部です。

### Ecosystem Components / 構成システム

#### 1. Nano Banana 2 and ChatGPT Images 2.0 Powered Super AI 4-koma System

A system specialized in creating 4-panel manga with AI. / AIを活用した4コマ漫画制作に特化したシステムです。

- [Explanation / 解説](https://note.com/happy_duck780/n/ndf063558c1f5)
- [Demo / デモ](https://furuyan1234.github.io/nano-banana-pro/)
- [Code / コード](https://github.com/FURUYAN1234/nano-banana-pro)

#### 2. AI Story Maker

A tool for generating creative stories and plots using AI. / AIを用いてクリエイティブなストーリーやプロットを生成するツールです。

- [Explanation / 解説](https://note.com/happy_duck780/n/nd3d972922868)
- [Demo / デモ](https://furuyan1234.github.io/story-maker/)
- [Code / コード](https://github.com/FURUYAN1234/story-maker)

#### 3. AI Character Sheet Maker

An assistant for designing detailed character sheets and settings. / 詳細なキャラクターシートや設定をデザインするための支援ツールです。

- [Explanation / 解説](https://note.com/happy_duck780/n/neccbebd7d957)
- [Demo / デモ](https://furuyan1234.github.io/character-sheet-maker/)
- [Code / コード](https://github.com/FURUYAN1234/character-sheet-maker)

#### 4. AI Comic Translation Tool

A tool for translating manga into 10 languages using AI. / AIを使って漫画を10言語に翻訳するツールです。

- [Explanation / 解説](https://note.com/happy_duck780/n/ne462dfc55ec8)
- [Demo / デモ](https://furuyan1234.github.io/comic-translation/)
- [Code / コード](https://github.com/FURUYAN1234/comic-translation)

#### 5. 360° AI Panorama Generator

A tool that generates seamless 360-degree spatial backgrounds to provide background assets for manga and video. / シームレスな360度空間の背景を生成し、漫画や動画の背景素材として提供するツールです。

- [Explanation / 解説](https://note.com/happy_duck780/n/nb53b121fef88)
- [Demo / デモ](https://furuyan1234.github.io/panoforge/)
- [Code / コード](https://github.com/FURUYAN1234/panoforge)

#### 6. AI Voice Comic Maker

A tool to automatically convert static 4-koma manga into fully voiced animated videos. / 静止画の4コマ漫画をフルボイスの動画に自動変換するツールです。

- [Explanation / 解説](https://note.com/happy_duck780/n/ndc6533c1512f)
- [Code / コード](https://github.com/FURUYAN1234/ai-voice-comic-maker)

#### 7. Monogatari Buzz Maker / 物語バズメーカー

A trend-to-story planning tool that converts public Web/RSS signals into practical manga, short video, explainer video, and novel briefs. / 公開Web/RSSの話題シグナルを、漫画・ショート動画・解説動画・小説の実用企画へ変換する創作支援ツールです。

- [Explanation / 解説](https://note.com/happy_duck780/n/ncc593101d77f)
- [Demo / デモ](https://furuyan1234.github.io/viral-radar/)
- [Code / コード](https://github.com/FURUYAN1234/viral-radar)

---

## Changelog / 更新履歴

### v1.2.5 (2026-06-26)

- Hardened OpenAI/Gemini visible generation fields and rejected incomplete or template-like provider output.
- Removed sample-specific production rules and kept draft-quality checks generic.
- Rewrote the README into a readable bilingual format, using paragraphs for prose and tables only where they aid comparison.
- Documented generated text handling under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ja).

- OpenAI/Geminiの表示生成欄を強化し、不完全または定型的なAPI応答を拒否するようにしました。
- 個別サンプル専用の本番ルールを排除し、参考本文の品質判定を汎用ルールに整理しました。
- READMEを読み物としての英日併記へ書き直し、本文は段落、比較に向く箇所だけ表を使う構成にしました。
- 生成文章を[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ja)で扱う考え方を明記しました。

### v1.2.4 to v1.1.4 / v1.2.4〜v1.1.4

These releases removed local template prose, improved evidence-bound planning, hardened API-key handling, added public Web/RSS retrieval support for GitHub Pages, and reduced fixed-rotation drift.

これらのリリースでは、ローカル定型文の削除、根拠に紐づく制作案、APIキー安全性、GitHub Pages版の公開Web/RSS取得、固定ローテーションへの戻りにくさを改善しました。

### Internal preview builds / 内部プレビュー

The internal preview line built the initial app, project-path asset support, export formats, evidence cards, charts, and no-fake-search policy before the public v1.x release line.

内部プレビューでは、公開v1.x以前に、初期アプリ、project path対応、出力形式、根拠カード、チャート、架空検索禁止方針を整備しました。

---

## Repository Info / リポジトリ情報

| Item | Value |
|---|---|
| App name | Monogatari Buzz Maker / 物語バズメーカー |
| Package | `monogatari-buzz-maker` |
| Version | `1.2.5` |
| Repository | [FURUYAN1234/viral-radar](https://github.com/FURUYAN1234/viral-radar) |
| Public URL | [https://furuyan1234.github.io/viral-radar/](https://furuyan1234.github.io/viral-radar/) |
| Local port | `5180` |
| Source code license | `UNLICENSED` |
| Generated text license | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ja) |

Developed by FURU.

開発者: FURU。
