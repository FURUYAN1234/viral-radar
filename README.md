# Monogatari Buzz Maker / 物語バズメーカー

![Version](https://img.shields.io/badge/version-1.2.6-0f766e)
![Framework](https://img.shields.io/badge/framework-Vite-646cff)
![Runtime](https://img.shields.io/badge/runtime-browser%20%2B%20local%20Vite-111827)
![API](https://img.shields.io/badge/API-OpenAI%20%2F%20Gemini-2563eb)
![License](https://img.shields.io/badge/license-UNLICENSED-red)

Monogatari Buzz Maker is a creative planning app that turns topics retrieved from public Web/RSS sources into story manga, short-video, explainer-video, and novel planning materials.

物語バズメーカーは、公開Web/RSSから実際に取得した話題を、ストーリー漫画、ショート動画、トレンド解説動画、小説の制作案へ整理する創作支援アプリです。

[!['ChatGPT Image 2026年6月25日 22_19_30'](https://github.com/user-attachments/assets/d850ac7f-aa1c-40cc-a378-b8c6673c726c)](https://youtu.be/pqYVxUUg0Cs?si=27g1I3tO2EuZkOuxJ)

It is not a simple buzzword list. It keeps retrieval evidence, derived metrics, creative plans, text-generation prompts, and editor-facing DOCX output in one workflow.

単なる流行語リストではありません。取得根拠、算出指標、制作案、本文生成プロンプト、確認用DOCXまでを1つのワークフローで扱います。

> **Important / 重要**
> This app does not fill missing retrieval data with fictional examples, guessed values, or fixed samples. If public Web/RSS retrieval fails or returns no usable result, the app reports no result or retrieval failure.
>
> このアプリは、取得できないデータを架空例、推測値、固定サンプルで埋めません。公開Web/RSSから取得できない場合は、結果なし、または取得失敗として表示します。

---

## Overview / 概要

Monogatari Buzz Maker organizes topics that are currently gaining reactions around news, public feeds, and social discussion into evidence-backed creative planning material that can be handed to AI or a human editor.

物語バズメーカーは、ニュース、公開フィード、SNS周辺で反応が起きている話題を、AIや編集者に渡せる根拠付きの制作資料へ整理します。

The app deliberately avoids dropping buzzwords directly into a story. Instead, it follows this sequence:

流行語をそのまま作品に入れるのではなく、次の順序で扱います。

1. Retrieve topic candidates from public Web/RSS sources.
   公開Web/RSSから話題候補を取得します。
2. Preserve source, link, search query, observed timestamp, and derived metrics.
   取得元、リンク、検索クエリ、観測時刻、算出指標を残します。
3. Do not make local interpretation, planning, or prose look already AI-generated.
   ローカル側では、解釈、企画判断、本文を生成済みのようには見せません。
4. Split the creative focus by medium: manga, short video, explainer video, and novel.
   漫画、ショート動画、解説動画、小説で、制作上の焦点を分けます。
5. Build text-generation prompts that contain only evidence-backed inputs.
   取得根拠だけを含む本文生成用プロンプトを作ります。
6. Run OpenAI or Gemini analysis only when a valid user-entered key is available.
   有効なユーザー入力APIキーがある場合だけ、OpenAIまたはGeminiで詳細分析を行います。
7. Export JSON, Markdown, and DOCX for saving, editing, and handoff.
   JSON、Markdown、DOCXで保存し、編集や別AIとの打ち合わせに使います。

---

## Live Site / 公開サイト

GitHub Pages:

GitHub Pages 公開版:

[https://furuyan1234.github.io/viral-radar/](https://furuyan1234.github.io/viral-radar/)

Local development:

ローカル開発:

[http://127.0.0.1:5180/](http://127.0.0.1:5180/)

The local port is fixed to `5180` so this app can run beside the other Antigravity apps without port collisions.

ローカルポートは `5180` 固定です。他のAntigravity系アプリと同時起動できるよう、既存ポートとは分けています。

---

## Current v1.2.6 Behavior / 現行v1.2.6挙動

The current public line is **v1.2.6**. It is evidence-first by design: retrieval, scoring, provider analysis, creative planning, and exports are separated so the UI does not pretend that missing data exists.

現行公開系統は **v1.2.6** です。根拠優先の設計で、取得、スコアリング、プロバイダー分析、制作案、エクスポートを分離し、存在しないデータをあるように見せません。

* **Retrieval boundary / 取得境界**: Public Web/RSS retrieval can produce evidence rows with source URLs, query terms, timestamps, categories, and derived metrics. If retrieval fails, the UI reports the failure instead of recycling old or invented topics.
  公開Web/RSS取得では、ソースURL、検索語、観測時刻、カテゴリ、算出指標を含む根拠行を作ります。取得失敗時は古い結果や架空トピックを回さず、失敗状態を表示します。
* **Provider analysis / プロバイダー分析**: OpenAI or Gemini analysis runs only when the user supplies a valid UI-entered key and the provider returns usable content. Local templates do not pretend to be AI analysis or reference prose.
  OpenAI / Gemini の分析は、UIで入力された有効なキーがあり、プロバイダーが利用可能な内容を返した場合だけ成立します。ローカルテンプレートをAI分析や参考本文として見せません。
* **Single key field / 単一キー入力**: The AI settings flow detects OpenAI and Gemini keys from one field, keeps them in the browser session only, and clears legacy saved settings.
  AI設定UIは単一フィールドでOpenAI/Geminiキーを判別し、ブラウザセッション内だけで扱い、過去の保存設定は消去します。
* **Fail-closed merge / fail-closed統合**: Provider output is reflected only when the expected analysis fields, production-plan fields, evidence-card fields, and reference-draft fields are usable.
  プロバイダー出力は、期待される分析欄、制作案欄、根拠カード欄、参考文章欄が利用可能な場合だけ反映します。
* **Export role / エクスポートの役割**: JSON, Markdown, and DOCX exports are editorial handoff material: evidence, planning notes, prompts, risks, and next decisions.
  JSON、Markdown、DOCXの出力は、根拠、設計メモ、プロンプト、リスク、次の判断を含む編集引き継ぎ資料です。

---

## Core Concept / 基本コンセプト

### Trend To Story / 話題を物語へ変換する

This app is not a "popular-article list" app.

本アプリは「人気記事を並べるアプリ」ではありません。

It translates retrieved topics into creative ingredients while keeping the original evidence visible.

取得した話題を、元の根拠が見える状態のまま創作要素へ変換します。

| Retrieved item / 取得したもの | Why it is not used directly / そのまま使わない理由 | What AI should check / AI生成時に確認するもの |
|---|---|---|
| Real news headline / 実在ニュースの見出し | It can become real-name dramatization or accusation. / 実名ドラマ化や告発風になる危険がある | Fictional systems, fictional UI, fictional daily-life scenes / 架空制度、架空UI、架空の生活場面 |
| Rapidly growing topic word / 急に伸びた話題語 | A buzzword alone does not become a story core. / 流行語だけでは作品の芯にならない | Reader anxiety, envy, regret, desire for rescue / 読者の不安、羨望、後悔、救済欲求 |
| Highly commentable topic / コメントされやすい話題 | It can become imitation of controversy. / 炎上模倣になる危険がある | Conflict structure, unsaid truth, cost of choice / 対立構造、言えなかった本音、選択の代償 |
| Save-worthy know-how / 保存されるノウハウ | It may end as mere explanation. / 単なる説明で終わりやすい | Scenes where the protagonist changes through action / 主人公が実際に行動で変化する場面 |
| Co-occurrence across sources / 複数ソースの共起 | Surface words alone become thin. / 表面語だけ追うと薄くなる | Repeated discomfort in the social atmosphere / 世の中の空気として繰り返し出る違和感 |

### Evidence First / 根拠から作る

The evidence area displays article links, search queries, source names, and retrieval timestamps that were actually obtained.

根拠欄には、実際に取得した記事リンク、検索クエリ、取得元、取得時刻を表示します。

Anything not retrieved, not connected, or blocked by API limits is not shown as if it succeeded.

取得できないもの、接続できないもの、API制限で得られないものは、成功したようには表示しません。

### Medium Specific / 媒体別に別物として扱う

The same topic works differently in manga, video, and prose.

同じ話題でも、漫画、動画、小説では効く形が違います。

* **Manga / 漫画**: page turn, panel pull, gaze guidance, expression, silence, first abnormality.
  ページめくり、コマの引き、視線誘導、表情、沈黙、最初の異常を重視します。
* **Short video / ショート動画**: second 0, second 1, short subtitles, loop, save reason, comment trigger.
  0秒目、1秒目、字幕の短さ、ループ、保存理由、コメント誘導を重視します。
* **Explainer video / 解説動画**: evidence presentation, separation of fact and inference, safe proper-noun handling, understanding after watching.
  根拠提示、推測の分離、安全な固有名詞の扱い、視聴後の理解を重視します。
* **Novel / 小説**: short/mid/long structure, chapter-end hooks, character change, foreshadowing payoff, reader retention.
  短編・中編・長編の伸ばし方、章末フック、人物変化、伏線回収、読者維持を重視します。

---

## Feature Map / 機能マップ

| Area / 領域 | Feature / 機能 | Purpose / 目的 |
|---|---|---|
| Retrieval / 取得 | Public Web/RSS retrieval / 公開Web/RSS取得 | Collect real topic material. / 実在する話題素材を集める |
| Transparency / 透明性 | Source links, queries, timestamps / 取得リンク、検索クエリ、取得時刻 | Make the origin of evidence inspectable. / 根拠の出所を確認できるようにする |
| Analysis / 分析 | Scores, charts, evidence cards / スコア、チャート、根拠カード | Check volume, freshness, overlap, and category match. / 取得量、鮮度、重なり、カテゴリ一致を確認する |
| Planning / 企画 | Production plans / 制作案 | Separate evidence to pass to AI from creative decisions. / AIへ渡す根拠と制作判断を分ける |
| Story design / 物語設計 | Shown after AI response / AI応答後に表示 | Do not fill gaps with local fixed prose. / ローカル定型文では穴埋めしない |
| Medium design / 媒体設計 | Shown after AI response / AI応答後に表示 | Let actual production flow come from AI or human judgment. / 実際の制作手順はAI生成または人間が作る |
| API analysis / API分析 | OpenAI/Gemini deep analysis / OpenAI/Gemini詳細分析 | Read retrieval results more deeply. / 取得結果をさらに深く読ませる |
| Reference draft / 参考本文 | AI-generated sample prose / 自AIで参考文章生成 | See an example body, not only a prompt. / プロンプトだけでなく本文例を見る |
| Export / 出力 | JSON, Markdown, DOCX / JSON、Markdown、DOCX | Save, share, and discuss with editors. / 保存、共有、編集者打ち合わせに使う |
| Maintenance / 保守 | Snapshot checks / スナップショット検査 | Prevent quality regressions after updates. / アップデート時の品質劣化を防ぐ |

---

## Features & Modes / 機能とモード

### Story Manga / ストーリー漫画

Story Manga mode converts reader desire into one-shot manga, first-episode manga, or vertical-scroll manga planning material.

ストーリー漫画モードでは、読者欲求を読み切り、連載第1話、縦読み漫画の企画へ変換します。

AI should check:

AI生成時の確認項目:

* What abnormality appears on page 1.
  1ページ目で見せる異常。
* The concrete scene where the protagonist first loses something.
  主人公が最初に損をする具体場面。
* Props, notifications, expressions, silence, and other panel-drawable details.
  コマとして描ける小道具、通知、表情、沈黙。
* The information gap before and after the page turn.
  ページめくり前後の情報差。
* The unresolved hook left for episode 1 of a serial.
  連載第1話として残す未回収フック。
* Vertical-scroll pacing, blank space, and downward eye movement.
  縦読みの場合のコマ送り、余白、視線の落下。

### Short Video / ショート動画

Short Video mode creates plans from the first second, subtitle density, save reason, and comment trigger.

ショート動画モードでは、冒頭1秒、字幕量、保存理由、コメント誘発点から短尺動画案を作ります。

AI should check:

AI生成時の確認項目:

* The exact screen shown at second 0.
  0秒目に出す画面。
* The loss, fear, or curiosity the viewer understands by second 1.
  1秒目で視聴者に理解させる損失感、恐れ、好奇心。
* Subtitle length and gaze guidance.
  字幕の文量と視線誘導。
* Sound, silence, pause, and screen switching.
  音、無音、間、画面切り替え。
* The question that makes the viewer comment.
  コメント欄に書きたくなる問い。
* Practicality or rewatch value that makes the viewer save.
  保存したくなる実用性や再視聴ポイント。
* A loop structure from the ending back to the beginning.
  最後から冒頭へ戻るループ構造。

### Trend Explainer Video / トレンド解説動画

Trend Explainer Video mode uses real evidence while avoiding accusation, real-name dramatization, or unsupported claims.

トレンド解説動画モードでは、実在の根拠を使いながら、告発、実名ドラマ化、根拠のない断定を避けた解説企画を作ります。

AI should check:

AI生成時の確認項目:

* Show what is happening in the first short block.
  何が起きているのかを最初に短く示す。
* Separate evidence from inference.
  根拠と推測を分ける。
* Restrict real names to evidence and source explanation.
  実名は根拠欄や出典説明に限定する。
* Use fictional examples, abstract structures, and viewer-near substitutions in the main body.
  本編では架空例、抽象構造、視聴者の生活に近い置き換えを使う。
* Avoid outrage framing, overstatement, and named criticism.
  炎上、断定、名指し批判へ寄せない。
* End with a viewpoint the viewer can use.
  最後に視聴者が使える観点を残す。

### Novel / 小説

Novel mode organizes public evidence into short, mid-length, or long-form fiction planning material.

小説モードでは、公開根拠を短編・中編・長編の制作案へ整理します。

AI should check:

AI生成時の確認項目:

* Short story: one scene, one choice, one aftertaste.
  短編: 一場面、一選択、一つの読後感へ絞る。
* Mid-length story: misunderstanding, relationship change, and two-stage turning point.
  中編: 誤解、関係変化、二段階の転換を入れる。
* Long-form story: update desire, obstacle, cost, and relationship in each chapter.
  長編: 章ごとに欲望、障害、代償、関係性を更新する。
* Leave chapter-end hooks as unresolved emotion, not only unresolved events.
  章末フックを出来事だけでなく感情の未決として残す。
* Avoid stagnating through repeated versions of the same worry.
  同じ悩みの反復で停滞させない。
* Show change through action, objects, silence, and aftermath rather than explanation.
  最終的に、言葉ではなく行動、物、沈黙、後始末で変化を見せる。

---

## Analysis Surfaces / 分析画面

### Root Evidence / 根拠シグナル

Evidence cards display the retrieved observation and the creative handling rules attached to it.

根拠カードには、取得された観測結果と、それに紐づく創作上の扱い方を表示します。

Displayed fields include:

表示される主な項目:

* Title from a real article or public feed.
  実記事または公開フィード由来のタイトル。
* Source name.
  取得元。
* Real article link.
  実記事リンク。
* Search query used in this run.
  今回の検索クエリ。
* AI reading.
  AI読み取り。
* AI planning judgment.
  AI企画判断。
* Proper nouns and safe handling notes.
  固有名詞と安全上の扱い。
* Rank, freshness, source weight, co-occurrence, and category-match metrics.
  取得順位、新しさ、ソース重み、共起、カテゴリ一致などの指標。

### Evidence Scores / 取得状況

Evidence scores are calculated from the information actually available through RSS and public feeds.

取得状況スコアは、RSSや公開フィードから実際に取れた情報をもとに計算します。

Main scoring dimensions:

主な観点:

* Momentum: freshness, rank, and source responsiveness.
  勢い: 新しさ、順位、取得元の反応しやすさ。
* Confidence: multiple sources, category match, and topic specificity.
  確度: 複数ソース、カテゴリ一致、話題の具体性。
* Saturation risk: whether similar topics are already too common.
  飽和リスク: 類似話題が増えすぎていないか。
* Evidence volume: whether there are enough usable observations.
  根拠量: 使用できる観測が十分あるか。
* Category match: how close the retrieved terms are to the selected category.
  カテゴリ一致: 選択カテゴリと取得語がどれくらい近いか。

These are not decorative invented numbers. The app does not display unretrieved metrics such as TikTok views, YouTube views, saves, or comments as real data.

これらは装飾用の架空数字ではありません。TikTok再生数、YouTube視聴回数、保存数、コメント数のような未取得の実数は、実データとして表示しません。

### Production Notes / 制作メモ

Production notes summarize the starting point, process, pre-writing checks, and weak points that must not be missed.

制作メモには、初稿の出発点、手順、書く前の確認、外すと弱くなる点をまとめます。

Examples:

例:

* Manga: first page, pull, panel gaze, final choice.
  漫画: 1ページ目、引き、コマの視線、最後の選択。
* Short video: second 0, second 1, subtitle, loop, comment trigger.
  ショート動画: 0秒、1秒、字幕、ループ、コメント誘導。
* Explainer video: question, evidence, structural breakdown, safe example, ending.
  解説動画: 問い、根拠、構造分解、安全な例示、締め。
* Novel: reader retention for short, mid-length, and long-form stories.
  小説: 短編、中編、長編、それぞれの読者維持。

### Production Plans / 制作案

Each category can display multiple production plans.

各カテゴリでは複数の制作案を表示できます。

Main fields:

主な項目:

* Candidate title.
  タイトル候補。
* Promise to the reader or viewer.
  読者・視聴者への約束。
* Protagonist or narrator.
  主人公または語り手。
* Setting.
  舞台。
* First incident.
  最初の事件。
* Conflict.
  対立。
* Turn.
  転換。
* Final choice.
  最後に選ばせること。
* Aftertaste after reading or watching.
  読後感または視聴後感。
* Story/script architecture.
  物語・台本設計。
* Medium-specific production notes.
  媒体別の制作メモ。
* Flow of prose or script.
  本文・台本の流れ。
* Opening example.
  冒頭例。
* Prompt for body generation.
  本文生成用プロンプト。

Fields equivalent to title, prose, or script are shown as "not generated" unless a real provider response exists.

タイトルや本文に相当する項目は、実際のプロバイダー応答がない限り「未生成」として表示します。

### Story Architecture / 物語・台本設計

Story architecture appears only when OpenAI or Gemini returns usable structure.

物語・台本設計は、OpenAIまたはGeminiの応答がある場合にだけ表示します。

Included viewpoints:

含まれる観点:

* Foreshadowing and payoff.
  伏線と回収。
* Goal, motivation, conflict, and cost.
  目的、動機、対立、代償。
* Emotional delta.
  感情差分。
* Motif recurrence.
  モチーフ再登場。
* Knowledge boundary.
  知識境界。
* Medium implementation.
  媒体実装。

If the API response is missing, failed, empty, or template-like, this area remains not generated.

API応答が未取得、失敗、空、またはテンプレ的な場合、この領域は未生成のままです。

### AI Analysis Summary / AI分析サマリー

When the user connects an OpenAI or Gemini key in `AI Settings` and explicitly starts the workflow, the app can run deeper analysis on the retrieved evidence. OpenAI additionally requires an explicit model selection.

`AI設定` でOpenAIまたはGeminiのキーを接続し、明示的に開始すると、取得結果をもとに詳細分析を実行できます。OpenAIではモデル選択も必須です。

Main outputs:

主な出力:

* The strongest creative direction visible from this retrieval.
  今回の取得結果から見える最も強い制作方向。
* Which medium is likely to work best.
  どの媒体で効きやすいか。
* Risk that similar projects are already saturated.
  似た企画が増える危険。
* Concrete scenes to include in the plan.
  企画に入れるべき具体場面。
* Real-name or accusation risks to avoid.
  避けるべき実名化・告発化。
* Revision points for the first draft.
  初稿に入れるべき修正案。

### Reference Draft / 自AIの参考文章

Each production plan's body-generation prompt can be sent to the connected provider to create an actual reference draft.

各企画案の本文生成プロンプトは、接続済みプロバイダーへ送って実際の参考本文に変換できます。

The reference draft is provider output. It is not local filler text.

参考本文はプロバイダー出力です。ローカルの穴埋め文ではありません。

---

## Data Sources / 取得データの扱い

### Current Retrieval Scope / 現在の取得範囲

The current retrieval scope is public Web/RSS/public feed data.

現在の実取得範囲は、公開Web/RSS/公開フィードです。

Main sources:

主な取得対象:

* Google News RSS.
  Google News RSS。
* Bing News RSS.
  Bing News RSS。
* Google Trends RSS.
  Google Trends RSS。
* Hatena Bookmark-related RSS.
  はてなブックマーク系RSS。
* Yahoo-related public RSS.
  Yahoo系公開RSS。
* Category-specific queries tuned toward social, lifestyle, emotional, and discussion material.
  社会、生活、感情、議論素材に寄せたカテゴリ別検索クエリ。

### Why RSS / なぜRSSか

RSS is retrievable as an official or public feed format and makes it easier to retain source links.

RSSは、公式または公開フィードとして取得でき、出典リンクを残しやすい形式です。

RSS alone cannot provide platform-internal metrics such as views, saves, comments, or retention. Therefore Monogatari Buzz Maker treats only what can be retrieved through RSS/public feeds as evidence and does not display metrics it did not obtain.

ただし、RSSだけではプラットフォーム内の再生数、保存数、コメント数、視聴維持率は取得できません。そのため、物語バズメーカーでは「RSSや公開フィードで取れる範囲」を根拠として扱い、取得していない数値は表示しません。

---

## API Engine / APIエンジン

### Supported Providers / 対応API

The app uses a single API-key input field. OpenAI and Gemini keys are detected from the key format.

アプリは1つのAPIキー入力欄を使います。OpenAIキーとGeminiキーは、キー形式から自動判定します。

| Provider / プロバイダー | Use / 用途 |
|---|---|
| OpenAI | Deep analysis and reference-draft generation / 詳細分析、参考本文生成 |
| Gemini | Deep analysis and reference-draft generation / 詳細分析、参考本文生成 |

### OpenAI Model Selection / OpenAIモデル選択

Default: GPT-6 Astra / 既定: GPT-6 Astra

API connection does not start retrieval or analysis for either provider. With OpenAI, the user must explicitly choose a model, including Astra, and then press the `検索・分析を開始` button. With Gemini, the user presses the same button after connecting the key. Astra is shown as the recommended first OpenAI option. The choice is kept for the page session only / ページ内のみ; reloading requires model selection again. The selector applies to provider analysis, plan design, and reference-draft generation. Each request starts from the selected model and falls back only to models below it in the displayed list.

どちらのAPIも、キーを接続しただけでは検索・分析を開始しません。OpenAIはAstraを使う場合を含めてモデルを明示的に選び、その後に `検索・分析を開始` ボタンを押します。Geminiはキー接続後に同じ開始ボタンを押します。Astraは推奨の先頭候補として表示します。選択はページ内だけで保持され、再読み込みすると再選択が必要です。モデル選択は詳細分析、制作案設計、参考文章生成に共通で適用されます。各リクエストは選択モデルから開始し、表示順で下位のモデルにだけフォールバックします。

API usage fees, terms, model restrictions, and rate limits follow each provider's contract.

API利用料、利用規約、モデル制限、レート制限は、各サービスの契約に従います。

---

## Output & Export / 出力

### JSON

JSON saves the screen's analysis results and production plans as structured data.

JSONは、画面の分析結果と制作案を構造化データとして保存します。

Primary uses:

主な用途:

* Reload the same plan later.
  後で同じ企画を読み込む。
* Pass data to another AI.
  別AIへ渡す。
* Reuse prompts and evidence.
  プロンプトや根拠を再利用する。
* Keep a machine-readable backup separate from DOCX.
  DOCXとは別に、機械可読なバックアップとして残す。

### Markdown

Markdown is generated for report copying and AI handoff.

Markdownは、レポートコピーや別AIへの引き継ぎ用に生成します。

Primary uses:

主な用途:

* Paste into another AI.
  他AIへ貼る。
* Paste into a note app.
  メモアプリへ貼る。
* Read as an editorial memo.
  編集メモとして読む。

### DOCX

DOCX output reorganizes evidence and planning material for human review. It is not a raw copy of the web screen.

DOCX出力は、取得根拠と制作案を人間が確認しやすい資料へ再構成します。Web画面の丸写しではありません。

Typical structure:

主な構成:

* Evidence summary.
  取得根拠の要点。
* Production notes.
  制作メモ。
* Retrieval status.
  取得状況。
* Production plans.
  制作案。
* Medium-specific decisions.
  媒体別の制作判断。
* Evidence handling.
  根拠の扱い。
* Risks and revision policy.
  リスクと修正方針。
* Decisions for the next meeting.
  次回までに決めること。

---

## Setup & Launch / セットアップと起動

### Cloud / Browser / 公開ページ

Open the public version:

公開版を開きます。

[https://furuyan1234.github.io/viral-radar/](https://furuyan1234.github.io/viral-radar/)

Enter a provider key in the initial `AI Settings` panel. For OpenAI, select a model, then press `Start Search & Analysis`. Gemini also waits for the same explicit start action.

初期表示の `AI設定` でプロバイダーキーを入力します。OpenAIではモデルを選び、`検索・分析を開始` を押します。Geminiも同じ開始操作まで待機します。

Until AI setup is completed, the main UI remains locked. Public Web/RSS retrieval, deep analysis, reference-draft generation, and save/export operations become available only after the user explicitly starts the workflow.

AI設定が完了するまでは主要UIをロックします。公開Web/RSS取得、詳細分析、参考本文生成、保存系操作は、利用者が明示的に開始したあとに有効になります。

### Local Launch (Windows) / ローカルでの起動

First install dependencies:

初回は依存関係をインストールします。

```powershell
npm install
```

Start the dev server:

開発サーバーを起動します。

```powershell
npm run dev
```

Open in browser:

ブラウザで開きます。

[http://127.0.0.1:5180/](http://127.0.0.1:5180/)

One-click launcher:

ワンクリック起動:

```powershell
.\start_monogatari_buzz_maker.bat
```

### Manual Build / 手動ビルド

Build the production bundle:

本番ビルドを作成します。

```powershell
npm run build
```

The build output is written to `dist/`.

ビルド結果は `dist/` に出力されます。

### Preview / ビルド結果の確認

Preview the built app:

ビルド済みアプリを確認します。

```powershell
npm run preview
```

---

## Verification / 検証

Basic verification:

基本検証:

```powershell
npm test
npm run build
```

Maintenance snapshot check:

保守スナップショット検査:

```powershell
npm run check:upstreams
```

Individual verification examples:

個別検証の例:

```powershell
node tests\browser-smoke.mjs
node --test tests\trendSearch.test.mjs
node --test tests\docxExporter.test.mjs
```

---

## Tech Stack / 技術スタック

| Area / 領域 | Technology / 技術 |
|---|---|
| Frontend / フロントエンド | Vanilla JavaScript, HTML, CSS |
| Build / ビルド | Vite |
| Local middleware / ローカル中継 | Vite middleware |
| API / API | OpenAI, Gemini |
| Export / 出力 | JSON, Markdown, DOCX (OpenXML) |
| Test / テスト | Node.js test runner |
| Deploy / デプロイ | GitHub Pages, gh-pages |

The app does not use an additional frontend framework. It shares the same public Web/RSS search modules between GitHub Pages and local Vite. Local Vite also handles save dialogs and CORS-friendly mediation for provider calls where needed.

追加のフロントエンドフレームワークは使っていません。GitHub PagesとローカルViteの両方で同じ公開Web/RSS検索モジュールを使います。ローカルViteでは、必要に応じて保存ダイアログやプロバイダー呼び出しのCORS回避用中継も扱います。

---

## Unique Architecture Highlights / 固有アーキテクチャの要点

### 1. Search-Grounded Creative Planning / 検索根拠に紐づく企画化

Evidence is built from retrieved observations, not fixed samples.

取得根拠は、固定サンプルではなく、取得した観測結果をもとに作ります。

The app does not turn retrieved titles or proper nouns directly into story titles. It treats them as evidence to inform AI generation.

取得結果のタイトルや固有名詞をそのまま作品名にせず、AI生成時の入力根拠として扱います。

### 2. Medium Translation Layer / 媒体変換レイヤー

The same topic is passed differently to manga, short video, explainer video, and novel planning.

同じ話題を、漫画、ショート動画、解説動画、小説で別の制作判断として渡します。

Examples:

例:

* Manga: first panel, page turn, and gaze flow.
  漫画では「最初のコマ」「ページめくり」「視線誘導」。
* Short video: first second, subtitles, and loop.
  ショート動画では「冒頭1秒」「字幕」「ループ」。
* Explainer video: evidence presentation, inference separation, and misunderstanding prevention.
  解説動画では「根拠提示」「推測の分離」「誤解回避」。
* Novel: chapter hooks, character change, and foreshadowing payoff.
  小説では「章末フック」「人物変化」「伏線回収」。

### 3. Story Architecture Layer / 物語設計レイヤー

Story architecture is displayed only when a provider response is available.

物語設計は、プロバイダー応答がある場合にだけ表示します。

It can include foreshadowing, goal, motivation, conflict, cost, emotional delta, motif recurrence, knowledge boundary, and medium implementation.

伏線、目的、動機、対立、代償、感情差分、モチーフ再登場、知識境界、媒体実装などを含みます。

The local app does not fill those fields with boilerplate.

ローカル側では、これらを定型文で穴埋めしません。

### 4. Fail-Closed Evidence Policy / 失敗を成功に見せない方針

If retrieval fails, provider analysis fails, or returned prose is empty, the app does not treat the operation as success.

取得できない、解析できない、APIが失敗した、本文が空白だった場合は、成功扱いにしません。

The design rejects fictional observations, fictional search results, and decorative metrics.

架空の観測値、架空の検索結果、装飾用数字で画面を埋める設計は採用しません。

### 5. Editor-Facing DOCX / 編集者向けDOCX

DOCX output is reorganized into an editorial review document, not a copy of the web screen.

DOCXはWeb画面の複製ではなく、取得根拠と制作案を確認する編集用資料へ再構成します。

---

## Compliance & Legal Stance / 法的遵守について

### Public Data Usage / 公開データの利用

The app uses information retrievable from public Web/RSS/public feeds as reference material for creative planning.

本アプリは、公開Web/RSS/公開フィードから取得できる範囲の情報を、創作企画の参考として扱います。

It displays source links and separates evidence from creative transformation.

取得元リンクを表示し、根拠と創作変換を分けます。

### Official API Usage / 公式APIの利用

OpenAI and Gemini are called with API keys prepared by the user.

OpenAIおよびGeminiは、ユーザーが自身で用意したAPIキーを使って呼び出します。

API fees, terms, model restrictions, and rate limits follow each provider's contract.

API利用料、利用規約、モデル制限、レート制限は、各サービスの契約に従います。

### No Impersonation / 実在名の扱い

The app does not turn real people, companies, works, creators, or existing characters into protagonists, villains, accusation targets, or sequel targets.

実在の人物、企業、作品、クリエイター、既存キャラクターを、物語の主役、黒幕、告発対象、続編対象にしません。

Real names are limited to evidence, source format, and market-trend explanation.

実在名は、根拠、配信形式、市場動向の説明に限定します。

### Creative Transformation / 創作上の変換

When generating with AI, the app encourages fictional names and fictional settings where needed. The local app itself does not ghostwrite that body text.

AI生成時には、必要に応じて架空名や架空設定へ置き換えます。ローカル側はその本文を代筆しません。

### No Legal Advice / 助言ではない

The app output is reference information for creative planning. It is not professional advice for law, medicine, finance, investment, or reporting decisions.

本アプリの出力は、創作企画支援を目的とした参考情報です。法律、医療、金融、投資、報道判断の専門助言ではありません。

---

## Security / セキュリティ

### API Keys / APIキー

* Do not paste API keys into chat.
  APIキーをチャットに貼らないでください。
* Keys are not saved to README, JSON, DOCX, HANDOFF, PLAN, or logs.
  README、JSON、DOCX、HANDOFF、PLAN、ログに保存しません。
* Saved-key fields do not re-display full keys.
  保存済みキーは入力欄へ全文再表示しません。
* Key-like strings are masked during export.
  エクスポート時はキー形式の文字列をマスクします。

### Local Saving / ローカル保存

For JSON and DOCX saving, the user chooses the save destination.

JSON/DOCX保存では、ユーザーが保存先を選びます。

The app does not silently save into a fixed folder under the app directory.

アプリ直下の固定フォルダへ勝手に保存しません。

### File Names / ファイル名

Exported filenames include a local 14-digit timestamp.

保存ファイル名には、ローカル時刻の14桁タイムスタンプを付けます。

Format:

形式:

```text
YYYYMMDDHHMMSS
```

Example:

例:

```text
monogatari-buzz-maker-story-manga-20260625123045.docx
```

---

## License & Rights / ライセンス・権利関係

This project is `UNLICENSED`.

このプロジェクトは `UNLICENSED` です。

Do not redistribute, republish, sublicense, sell, or commercially use this repository without explicit permission from the copyright holder.

著作権者の明示的な許可なく、再配布、再公開、サブライセンス、販売、商用利用をしないでください。

This repository is published for viewing, evaluation, local execution, and personal-environment verification.

このリポジトリは、閲覧、評価、ローカル実行、個人環境での検証を目的として公開されます。

### Third-Party Services / 外部サービス

Names, trademarks, and service rights for OpenAI, Gemini, RSS sources, and news providers belong to their respective owners.

OpenAI、Gemini、RSS取得元、ニュース配信元などの名称、商標、サービス権利は、それぞれの権利者に帰属します。

This app does not own, operate, represent, or guarantee those services.

本アプリは、それらのサービスを所有、運営、代行、保証するものではありません。

---

## Terms of Use / 利用規約

### 1. Purpose / 目的

This app is a research and production-support tool that turns public Web/RSS topics into creative planning material.

本アプリは、公開Web/RSSの話題を創作企画へ変換する研究・制作支援ツールです。

### 2. Prohibited Uses / 禁止事項

The following uses are prohibited:

以下の用途を禁止します。

* False accusation, defamation, or harassment toward real people or companies.
  実在人物や企業への虚偽告発、名誉毀損、嫌がらせ。
* Unauthorized sequels, plagiarism, or confusing use of existing works or characters.
  既存作品、既存キャラクターの無断続編、盗用、混同を招く利用。
* Saving or publishing API keys, personal information, or non-public information.
  APIキー、個人情報、非公開情報の保存や公開。
* Displaying unretrieved numbers as real data.
  取得していない数値を実データとして表示する行為。
* Using the output as professional advice for law, medicine, finance, or investment.
  法律、医療、金融、投資判断の専門助言として使う行為。

### 3. Responsibility & Ownership / 生成物の責任と権利

Users are responsible for checking, revising, publishing, and using plans, prompts, and draft text created with this app.

ユーザーが本アプリを使って作成した企画、プロンプト、本文案の確認、修正、公開責任はユーザーにあります。

Before publication, users must confirm that third-party rights are not infringed.

第三者の権利を侵害しないよう、公開前に必ず確認してください。

### 4. Disclaimer / 免責事項

The app does not guarantee success, revenue, virality, publication, or acceptance of retrieved results, analysis, plans, or reference drafts.

本アプリの取得結果、分析、企画案、参考本文は、成功、収益、拡散、出版、掲載を保証しません。

RSS source changes, API limits, and network failures may prevent retrieval.

RSS取得元の仕様変更、API制限、ネットワーク障害により、結果が取得できない場合があります。

### 5. Infringement & Takedown / 権利侵害への対応

If output that may infringe rights is found, stop publication and delete or revise the relevant part.

権利侵害が疑われる出力を発見した場合は、公開を停止し、該当部分を削除または修正してください。

### 6. Changes / 規約の変更

This README and the terms of use may change as the app is updated.

本READMEおよび利用条件は、アプリの更新に合わせて変更される場合があります。

### 7. Governing Law / 準拠法

Interpretation of app usage is based on Japanese law.

本アプリの利用に関する解釈は、日本法を基準とします。

---

## AI Manga Creative Suite / AIまんが制作エコシステム

Monogatari Buzz Maker is designed as one tool in the Antigravity AI creative support suite.

物語バズメーカーは、Antigravity内のAI制作支援群の一部として設計されています。

It does not call the other apps at runtime. Each app works independently.

ただし、実行時に他アプリを呼び出すものではありません。各アプリは独立して動作します。

### Ecosystem Components / 構成システム

| App / アプリ | Role / 役割 | Links / リンク |
|---|---|---|
| Nano Banana Pro / Super FURU AI 4-koma System | 4-koma manga and image-generation prompt support / 4コマ漫画・画像生成プロンプト生成 | [Explanation / 解説](https://note.com/happy_duck780/n/ndf063558c1f5) / [Demo / デモ](https://furuyan1234.github.io/nano-banana-pro/) / [Code / コード](https://github.com/FURUYAN1234/nano-banana-pro) |
| AI Story Maker / Story Maker | Story text, scripts, short stories, and mid-length generation / 物語本文・脚本・短編・中編生成 | [Explanation / 解説](https://note.com/happy_duck780/n/nd3d972922868) / [Demo / デモ](https://furuyan1234.github.io/story-maker/) / [Code / コード](https://github.com/FURUYAN1234/story-maker) |
| AI Character Sheet Maker / キャラクターシートメーカー | Character settings and image-prompt support / キャラクター設定と画像プロンプト支援 | [Explanation / 解説](https://note.com/happy_duck780/n/neccbebd7d957) / [Demo / デモ](https://furuyan1234.github.io/character-sheet-maker/) / [Code / コード](https://github.com/FURUYAN1234/character-sheet-maker) |
| AI Comic Translation Tool / 漫画翻訳ツール | Manga translation and translated-image processing / 漫画翻訳・翻訳画像処理支援 | [Explanation / 解説](https://note.com/happy_duck780/n/ne462dfc55ec8) / [Demo / デモ](https://furuyan1234.github.io/comic-translation/) / [Code / コード](https://github.com/FURUYAN1234/comic-translation) |
| 360° AI Panorama Generator / 360度パノラマ生成 | Background and panorama material generation / 背景・パノラマ素材生成 | [Explanation / 解説](https://note.com/happy_duck780/n/nb53b121fef88) / [Demo / デモ](https://furuyan1234.github.io/panoforge/) / [Code / コード](https://github.com/FURUYAN1234/panoforge) |
| AI Voice Comic Maker / フルボイス動画メーカー | Short-video and voiced-video generation from manga material / 漫画素材からショート動画・音声動画を生成 | [Explanation / 解説](https://note.com/happy_duck780/n/ndc6533c1512f) / [Code / コード](https://github.com/FURUYAN1234/ai-voice-comic-maker) |
| Monogatari Buzz Maker / 物語バズメーカー | Convert public Web/RSS trends into creative plans / 公開Web/RSSトレンドを創作企画へ変換 | [Explanation / 解説](https://note.com/happy_duck780/n/ncc593101d77f) / [Demo / デモ](https://furuyan1234.github.io/viral-radar/) / [Code / コード](https://github.com/FURUYAN1234/viral-radar) |

---

## Changelog / 更新履歴

### v1.2.6 (2026-09-24)

* Added an explicit OpenAI model selector, with GPT-6 Astra shown as the recommended option and downward-only fallback from the selected model.
  OpenAIモデルを明示的に選べるようにし、GPT-6 Astraを推奨候補として表示しました。フォールバックは選択モデルより下位だけへ進みます。
* Stopped automatic retrieval after API connection. OpenAI requires model selection and both OpenAI and Gemini require the `検索・分析を開始` action.
  API接続直後の自動取得を停止しました。OpenAIはモデル選択、OpenAIとGeminiの両方で `検索・分析を開始` 操作が必要です。
* Unified API connection, model selection, and start confirmation in one AI settings panel, and removed transient route-status boxes that disappeared with the panel.
  API接続、モデル選択、開始確認を1つのAI設定パネルにまとめ、パネルとともに消える経路表示欄を削除しました。
* Added product-specific model descriptions and synchronized model order and pricing metadata without importing Nano Banana product copy.
  物語バズメーカー専用のモデル説明を追加し、Nano Bananaの製品文言を持ち込まず、モデル順と料金情報だけを同期しました。

* Expanded the README into a consistent English/Japanese bilingual structure.
  README全体を一貫した英日併記構造へ拡張しました。
* Clarified that detailed analysis, medium decisions, story/script fields, and reference drafts must not be filled with local boilerplate.
  詳細分析、媒体別判断、物語・台本設計、参考文章をローカル定型文で穴埋めしない方針を明確化しました。
* Kept the distinction between retrieved evidence, creative planning, provider analysis, and export material.
  取得根拠、制作案、プロバイダー分析、エクスポート資料の区別を維持しました。

### v1.2.5 (2026-06-26)

* Strengthened the API response contract and quality gates so ungenerated fields, professional-planning notes, story/script architecture, and body labels do not leak as fixed local text.
  未生成欄、プロ向け設計メモ、物語・台本設計、本文ラベルがローカル定型文として漏れないよう、API応答契約と品質ゲートを強化しました。
* Changed result integration to fail closed unless all evidence cards, production-plan fields, and reference drafts are available.
  全取得根拠カード、全制作案フィールド、全参考文章が揃った場合だけ反映する fail-closed 動作に修正しました。
* Reorganized checks into generic rules independent of one visible sample phrase.
  個別サンプル語に依存しない汎用判定ルールへ整理しました。

### v1.2.4 (2026-06-26)

* Stopped generating professional-planning notes and story/script architecture from local boilerplate.
  プロ向け設計メモと物語・台本設計をローカル定型文で生成しないよう変更しました。
* Limited those fields to OpenAI/Gemini API responses.
  それらの欄をOpenAI/GeminiのAPI応答でのみ埋める設計に修正しました。

### v1.2.3 (2026-06-26)

* Hardened reference-draft and body-generation handling.
  参考本文と本文生成まわりの扱いを強化しました。
* Kept missing provider output visibly ungenerated instead of silently filling it.
  プロバイダー出力がない場合は、黙って穴埋めせず未生成として残す方針を維持しました。

### v1.2.2 (2026-06-26)

* Improved provider-output validation and evidence-boundary wording.
  プロバイダー出力検証と根拠境界の表現を改善しました。
* Clarified the distinction between local evidence and AI-generated interpretation.
  ローカル根拠とAI生成による解釈の違いを明確化しました。

### v1.2.1 (2026-06-25)

* Improved export behavior and editor-facing report structure.
  エクスポート挙動と編集者向けレポート構成を改善しました。
* Added stronger handling for API settings and generated material.
  API設定と生成物の扱いを強化しました。

### v1.2.0 (2026-06-25)

* Added broader planning support for story manga, short video, explainer video, and novel modes.
  ストーリー漫画、ショート動画、解説動画、小説向けの制作案支援を拡張しました。
* Added structured export paths for JSON, Markdown, and DOCX.
  JSON、Markdown、DOCXの構造化エクスポートを追加しました。

### v1.1.x

* Iteratively improved trend retrieval, creative planning cards, scoring, and export flow.
  トレンド取得、制作案カード、スコアリング、エクスポートフローを段階的に改善しました。

### v0.1.x

* Initial experimental release for converting public trend material into creative planning prompts.
  公開トレンド素材を創作企画プロンプトへ変換する初期実験版を公開しました。

---

## Repository Info / リポジトリ情報

| Item / 項目 | Value / 値 |
|---|---|
| App Name / アプリ名 | 物語バズメーカー |
| English Name / 英語名 | Monogatari Buzz Maker |
| Package / パッケージ | `monogatari-buzz-maker` |
| Repository / リポジトリ | [FURUYAN1234/viral-radar](https://github.com/FURUYAN1234/viral-radar) |
| Local Port / ローカルポート | `5180` |
| Public URL / 公開URL | [https://furuyan1234.github.io/viral-radar/](https://furuyan1234.github.io/viral-radar/) |
| License / ライセンス | `UNLICENSED` |
