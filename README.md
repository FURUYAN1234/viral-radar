[![Manual / 操作マニュアル PDF](https://img.shields.io/badge/PDF-Manual%20%2F%20操作マニュアル-087c86)](https://furuyan1234.github.io/viral-radar/downloads/viral-radar-manual.pdf) [![API setup / API設定 PDF](https://img.shields.io/badge/PDF-API%20setup%20%2F%20API設定-087c86)](https://furuyan1234.github.io/viral-radar/downloads/viral-radar-api-guide.pdf)

[![Read the application manual PDF / 操作マニュアルPDFを読む](docs/assets/manual-pdf-banner.png)](https://furuyan1234.github.io/viral-radar/downloads/viral-radar-manual.pdf)

Operation guide / 操作ガイド: Open the PDF to review the application workflow and controls. / PDFで制作の流れと操作方法を確認できます。

Read the Japanese A4 guides from the app header; each opens in a separate tab and can be saved from the PDF viewer. / アプリ上部から日本語A4の操作・API設定ガイドを別タブで開き、PDFビューアーで保存できます。

# Monogatari Buzz Maker / 物語バズメーカー

**v1.4.2**: One source for GitHub Pages and local use. X is enabled only when running locally; public Web research and AI story planning work on both. / **GitHub Pagesとローカルで同じソースを使います。X連携はローカル起動時だけ利用できます。** 公開Webの背景情報と任意のXの反応を生成AIが照合し、漫画・動画・小説の企画へ反映します。[User guide / 利用ガイド](docs/x-api.md) · [Release notes / 変更内容](docs/releases/v1.4.2.md)

| Feature / 機能 | GitHub Pages / 公開Web版 | Download and run locally / ダウンロードしてローカル起動 |
| --- | --- | --- |
| Web research + AI story planning / 公開Web＋生成AIによる企画・本文 | Available with your AI key / 自分の生成AIキーで利用可 | Available with your AI key / 自分の生成AIキーで利用可 |
| Add X evidence / Xの根拠を追加 | Settings hidden; local-use guide only / 設定欄は非表示・ローカル利用案内のみ | Select “Use X” and enter your Bearer Token / 「Xを使う」を選び、自分のBearer Tokenを入力 |
| Where X requests run / Xへの接続処理 | No X requests / Xへ通信しない | Your own PC / 利用者自身のPC |

**To use X / Xを使う場合：** [Download the source ZIP / ソースZIPをダウンロード](https://github.com/FURUYAN1234/viral-radar/archive/refs/heads/main.zip) → extract / 展開 → [local launch instructions / ローカル起動手順](#local-setup)。This is the same app and version, not a separate X edition. / X専用の別アプリ・別バージョンではありません。

GitHub Pages cannot run the server-side connection needed for X. No shared author-operated relay, author API credentials, browser extension or Cloudflare account is required. Each user supplies their own X and OpenAI/Gemini API keys and pays their own API usage. / GitHub PagesではX接続に必要なサーバー処理を実行できません。作者の共有中継やAPI認証は使わず、拡張機能やCloudflareアカウントも不要です。APIキーとAPI利用料は利用者各自のものです。X向け投稿文・X単独分析は提供しません。

**Gemini model route / Geminiモデル候補**: `gemini-3.8-flash` → `gemini-3.6-flash` → `gemini-3.5-flash-lite` → `gemini-3.1-flash-lite`. Explicit stable IDs avoid the December 1, 2026 redirects; image-generation models keep their dedicated routes. / 2026年12月1日の旧モデル自動転送に依存しないよう、現行GAモデルを明示します。画像生成は専用のモデル経路を使います。

> **MIT License; your outputs remain yours.** You may use, modify, redistribute and sell the app, including in paid products and services, without individual permission from FURU. Retain the copyright and MIT license notices in copies or substantial portions of the software. External API fees and third-party terms are separate. / **アプリはMITライセンス。成果物の権利は従来どおり利用者に帰属します。** アプリの利用・改変・再配布・販売、有料商品やサービスへの組み込みに、FURUへの個別許可は不要です。ソフトウェアの複製または重要な部分には著作権表示とMITの許諾表示を残してください。外部API料金と第三者の条件は別です。

[![物語バズメーカー デモサイトを開く。リンク先: https://furuyan1234.github.io/viral-radar/](docs/assets/demo-site-button.png)](https://furuyan1234.github.io/viral-radar/)

Demo URL / デモサイト: [https://furuyan1234.github.io/viral-radar/](https://furuyan1234.github.io/viral-radar/)

[![Download local app: Web + AI, with optional X API / ローカルアプリをダウンロード：公開Web＋生成AIにX API連携を追加](docs/assets/local-download-banner.png)](https://github.com/FURUYAN1234/viral-radar/archive/refs/heads/main.zip)

**Local download / ローカル版のダウンロード:** Extract the ZIP and double-click `start_monogatari_buzz_maker.bat` on Windows. In addition to public Web research and AI story planning, the local app can add X API evidence with your own Bearer Token. / WindowsではZIPを展開して `start_monogatari_buzz_maker.bat` をダブルクリックします。公開Web＋生成AIによる企画作成に加え、自分のBearer TokenでX APIの情報を追加できます。

[Local launch instructions / ローカル起動手順](#local-setup) · X and AI API usage are billed separately by each provider. / X APIと生成AIの利用料金は各事業者へ別途かかります。


![Version](https://img.shields.io/badge/version-1.4.2-0f766e)
![Framework](https://img.shields.io/badge/framework-Vite-646cff)
![Runtime](https://img.shields.io/badge/runtime-browser%20%2B%20local%20Vite-111827)
![API](https://img.shields.io/badge/API-OpenAI%20%2F%20Gemini-2563eb)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Monogatari Buzz Maker is a creative planning app that turns topics retrieved from public Web/RSS sources into story manga, short-video, explainer-video, and novel planning materials. / 物語バズメーカーは、公開Web/RSSから実際に取得した話題を、ストーリー漫画、ショート動画、トレンド解説動画、小説の制作案へ整理する創作支援アプリです。

[!['ChatGPT Image 2026年6月25日 22_19_30'](https://github.com/user-attachments/assets/d850ac7f-aa1c-40cc-a378-b8c6673c726c)](https://youtu.be/pqYVxUUg0Cs?si=27g1I3tO2EuZkOuxJ)

It is not a simple buzzword list. It keeps retrieval evidence, derived metrics, creative plans, text-generation prompts, and editor-facing DOCX output in one workflow. / 単なる流行語リストではありません。取得根拠、算出指標、制作案、本文生成プロンプト、確認用DOCXまでを1つのワークフローで扱います。

> **Important / 重要**
> This app does not fill missing retrieval data with fictional examples, guessed values, or fixed samples. If public Web/RSS retrieval fails or returns no usable result, the app reports no result or retrieval failure. / 取得できないデータを架空例、推測値、固定サンプルで埋めません。公開Web/RSSで取得できない場合は、結果なし、または取得失敗と表示します。
>
> This app does not replace unavailable data with fictional examples, guesses or fixed samples. If public Web/RSS retrieval fails, it reports no result or a retrieval failure. / このアプリは、取得できないデータを架空例、推測値、固定サンプルで埋めません。公開Web/RSSから取得できない場合は、結果なし、または取得失敗として表示します。

---

## Overview / 概要

Monogatari Buzz Maker organizes topics that are currently gaining reactions around news, public feeds, and social discussion into evidence-backed creative planning material that can be handed to AI or a human editor. / 物語バズメーカーは、ニュース、公開フィード、SNS周辺で反応が起きている話題を、AIや編集者に渡せる根拠付きの制作資料へ整理します。

The app deliberately avoids dropping buzzwords directly into a story. Instead, it follows this sequence: / 流行語をそのまま作品に入れるのではなく、次の順序で扱います。

1. Retrieve topic candidates from public Web/RSS sources. / 公開Web/RSSから話題候補を取得します。
2. Preserve source, link, search query, observed timestamp, and derived metrics. / 取得元、リンク、検索クエリ、観測時刻、算出指標を残します。
3. Do not make local interpretation, planning, or prose look already AI-generated. / ローカル側では、解釈、企画判断、本文を生成済みのようには見せません。
4. Split the creative focus by medium: manga, short video, explainer video, and novel. / 漫画、ショート動画、解説動画、小説で、制作上の焦点を分けます。
5. Build text-generation prompts that contain only evidence-backed inputs. / 取得根拠だけを含む本文生成用プロンプトを作ります。
6. Run OpenAI or Gemini analysis only when a valid user-entered key is available. / 有効なユーザー入力APIキーがある場合だけ、OpenAIまたはGeminiで詳細分析を行います。
7. Export JSON, Markdown, and DOCX for saving, editing, and handoff. / JSON、Markdown、DOCXで保存し、編集や別AIとの打ち合わせに使います。

---

## Live Site / 公開サイト

GitHub Pages: / GitHub Pages 公開版:

[https://furuyan1234.github.io/viral-radar/](https://furuyan1234.github.io/viral-radar/)

Local development: / ローカル開発:

[http://127.0.0.1:5180/](http://127.0.0.1:5180/)

The local port is fixed to `5180` so this app can run beside the other Antigravity apps without port collisions. / ローカルポートは `5180` 固定です。他のAntigravity系アプリと同時起動できるよう、既存ポートとは分けています。

---

## Current v1.4.0 Behavior / 現行v1.4.0挙動

The current release line is **v1.4.0**. It combines retrieved public Web context and optional X evidence for creative planning, preserves source and retrieval dates, and uses past plans to reduce repetition. / 現行リリース系統は **v1.4.0** です。取得した公開Webの背景情報と任意のX情報を企画へ反映し、出典と取得の日時を保持し、過去案を参照して反復を抑えます。

* **Retrieval boundary / 取得境界**: Public Web/RSS retrieval can produce evidence rows with source URLs, query terms, timestamps, categories, and derived metrics. If retrieval fails, the UI reports the failure instead of recycling old or invented topics. / 公開Web/RSS取得では、ソースURL、検索語、観測時刻、カテゴリ、算出指標を含む根拠行を作ります。取得失敗時は古い結果や架空トピックを回さず、失敗状態を表示します。
* **Provider analysis / プロバイダー分析**: OpenAI or Gemini analysis runs only when the user supplies a valid UI-entered key and the provider returns usable content. Local templates do not pretend to be AI analysis or reference prose.
  OpenAI / Gemini の分析は、UIで入力された有効なキーがあり、プロバイダーが利用可能な内容を返した場合だけ成立します。ローカルテンプレートをAI分析や参考本文として見せません。
* **Single key field / 単一キー入力**: The AI settings flow detects OpenAI and Gemini keys from one field, keeps them in the browser session only, and clears legacy saved settings. / AI設定UIは単一フィールドでOpenAI/Geminiキーを判別し、ブラウザセッション内だけで扱い、過去の保存設定は消去します。
* **Fail-closed merge / fail-closed統合**: Provider output is reflected only when the expected analysis fields, production-plan fields, evidence-card fields, and reference-draft fields are usable. / プロバイダー出力は、期待される分析欄、制作案欄、根拠カード欄、参考文章欄が利用可能な場合だけ反映します。
* **Export role / エクスポートの役割**: JSON, Markdown, and DOCX exports are editorial handoff material: evidence, planning notes, prompts, risks, and next decisions. / JSON、Markdown、DOCXの出力は、根拠、設計メモ、プロンプト、リスク、次の判断を含む編集引き継ぎ資料です。

---

## Core Concept / 基本コンセプト

### Trend To Story / 話題を物語へ変換する

This app is not a "popular-article list" app. / 本アプリは「人気記事を並べるアプリ」ではありません。

It translates retrieved topics into creative ingredients while keeping the original evidence visible. / 取得した話題を、元の根拠が見える状態のまま創作要素へ変換します。

| Retrieved item / 取得したもの | Why it is not used directly / そのまま使わない理由 | What AI should check / AI生成時に確認するもの |
|---|---|---|
| Real news headline / 実在ニュースの見出し | It can become real-name dramatization or accusation. / 実名ドラマ化や告発風になる危険がある | Fictional systems, fictional UI, fictional daily-life scenes / 架空制度、架空UI、架空の生活場面 |
| Rapidly growing topic word / 急に伸びた話題語 | A buzzword alone does not become a story core. / 流行語だけでは作品の芯にならない | Reader anxiety, envy, regret, desire for rescue / 読者の不安、羨望、後悔、救済欲求 |
| Highly commentable topic / コメントされやすい話題 | It can become imitation of controversy. / 炎上模倣になる危険がある | Conflict structure, unsaid truth, cost of choice / 対立構造、言えなかった本音、選択の代償 |
| Save-worthy know-how / 保存されるノウハウ | It may end as mere explanation. / 単なる説明で終わりやすい | Scenes where the protagonist changes through action / 主人公が実際に行動で変化する場面 |
| Co-occurrence across sources / 複数ソースの共起 | Surface words alone become thin. / 表面語だけ追うと薄くなる | Repeated discomfort in the social atmosphere / 世の中の空気として繰り返し出る違和感 |

### Evidence First / 根拠から作る

The evidence area displays article links, search queries, source names, and retrieval timestamps that were actually obtained. / 根拠欄には、実際に取得した記事リンク、検索クエリ、取得元、取得時刻を表示します。

Anything not retrieved, not connected, or blocked by API limits is not shown as if it succeeded. / 取得できないもの、接続できないもの、API制限で得られないものは、成功したようには表示しません。

### Medium Specific / 媒体別に別物として扱う

The same topic works differently in manga, video, and prose. / 同じ話題でも、漫画、動画、小説では効く形が違います。

* **Manga / 漫画**: page turn, panel pull, gaze guidance, expression, silence, first abnormality. / ページめくり、コマの引き、視線誘導、表情、沈黙、最初の異常を重視します。
* **Short video / ショート動画**: second 0, second 1, short subtitles, loop, save reason, comment trigger. / 0秒目、1秒目、字幕の短さ、ループ、保存理由、コメント誘導を重視します。
* **Explainer video / 解説動画**: evidence presentation, separation of fact and inference, safe proper-noun handling, understanding after watching. / 根拠提示、推測の分離、安全な固有名詞の扱い、視聴後の理解を重視します。
* **Novel / 小説**: short/mid/long structure, chapter-end hooks, character change, foreshadowing payoff, reader retention. / 短編・中編・長編の伸ばし方、章末フック、人物変化、伏線回収、読者維持を重視します。

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

Story Manga mode converts reader desire into one-shot manga, first-episode manga, or vertical-scroll manga planning material. / ストーリー漫画モードでは、読者欲求を読み切り、連載第1話、縦読み漫画の企画へ変換します。

AI should check: / AI生成時の確認項目:

* What abnormality appears on page 1. / 1ページ目で見せる異常。
* The concrete scene where the protagonist first loses something. / 主人公が最初に損をする具体場面。
* Props, notifications, expressions, silence, and other panel-drawable details. / コマとして描ける小道具、通知、表情、沈黙。
* The information gap before and after the page turn. / ページめくり前後の情報差。
* The unresolved hook left for episode 1 of a serial. / 連載第1話として残す未回収フック。
* Vertical-scroll pacing, blank space, and downward eye movement. / 縦読みの場合のコマ送り、余白、視線の落下。

### Short Video / ショート動画

Short Video mode creates plans from the first second, subtitle density, save reason, and comment trigger. / ショート動画モードでは、冒頭1秒、字幕量、保存理由、コメント誘発点から短尺動画案を作ります。

AI should check: / AI生成時の確認項目:

* The exact screen shown at second 0. / 0秒目に出す画面。
* The loss, fear, or curiosity the viewer understands by second 1. / 1秒目で視聴者に理解させる損失感、恐れ、好奇心。
* Subtitle length and gaze guidance. / 字幕の文量と視線誘導。
* Sound, silence, pause, and screen switching. / 音、無音、間、画面切り替え。
* The question that makes the viewer comment. / コメント欄に書きたくなる問い。
* Practicality or rewatch value that makes the viewer save. / 保存したくなる実用性や再視聴ポイント。
* A loop structure from the ending back to the beginning. / 最後から冒頭へ戻るループ構造。

### Trend Explainer Video / トレンド解説動画

Trend Explainer Video mode uses real evidence while avoiding accusation, real-name dramatization, or unsupported claims. / トレンド解説動画モードでは、実在の根拠を使いながら、告発、実名ドラマ化、根拠のない断定を避けた解説企画を作ります。

AI should check: / AI生成時の確認項目:

* Show what is happening in the first short block. / 何が起きているのかを最初に短く示す。
* Separate evidence from inference. / 根拠と推測を分ける。
* Restrict real names to evidence and source explanation. / 実名は根拠欄や出典説明に限定する。
* Use fictional examples, abstract structures, and viewer-near substitutions in the main body. / 本編では架空例、抽象構造、視聴者の生活に近い置き換えを使う。
* Avoid outrage framing, overstatement, and named criticism. / 炎上、断定、名指し批判へ寄せない。
* End with a viewpoint the viewer can use. / 最後に視聴者が使える観点を残す。

### Novel / 小説

Novel mode organizes public evidence into short, mid-length, or long-form fiction planning material. / 小説モードでは、公開根拠を短編・中編・長編の制作案へ整理します。

AI should check: / AI生成時の確認項目:

* Short story: one scene, one choice, one aftertaste. / 短編: 一場面、一選択、一つの読後感へ絞る。
* Mid-length story: misunderstanding, relationship change, and two-stage turning point. / 中編: 誤解、関係変化、二段階の転換を入れる。
* Long-form story: update desire, obstacle, cost, and relationship in each chapter. / 長編: 章ごとに欲望、障害、代償、関係性を更新する。
* Leave chapter-end hooks as unresolved emotion, not only unresolved events. / 章末フックを出来事だけでなく感情の未決として残す。
* Avoid stagnating through repeated versions of the same worry. / 同じ悩みの反復で停滞させない。
* Show change through action, objects, silence, and aftermath rather than explanation. / 最終的に、言葉ではなく行動、物、沈黙、後始末で変化を見せる。

---

## Analysis Surfaces / 分析画面

### Root Evidence / 根拠シグナル

Evidence cards display the retrieved observation and the creative handling rules attached to it. / 根拠カードには、取得された観測結果と、それに紐づく創作上の扱い方を表示します。

Displayed fields include: / 表示される主な項目:

* Title from a real article or public feed. / 実記事または公開フィード由来のタイトル。
* Source name. / 取得元。
* Real article link. / 実記事リンク。
* Search query used in this run. / 今回の検索クエリ。
* AI reading. / AI読み取り。
* AI planning judgment. / AI企画判断。
* Proper nouns and safe handling notes. / 固有名詞と安全上の扱い。
* Rank, freshness, source weight, co-occurrence, and category-match metrics. / 取得順位、新しさ、ソース重み、共起、カテゴリ一致などの指標。

### Evidence Scores / 取得状況

Evidence scores are calculated from the information actually available through RSS and public feeds. / 取得状況スコアは、RSSや公開フィードから実際に取れた情報をもとに計算します。

Main scoring dimensions: / 主な観点:

* Momentum: freshness, rank, and source responsiveness. / 勢い: 新しさ、順位、取得元の反応しやすさ。
* Confidence: multiple sources, category match, and topic specificity. / 確度: 複数ソース、カテゴリ一致、話題の具体性。
* Saturation risk: whether similar topics are already too common. / 飽和リスク: 類似話題が増えすぎていないか。
* Evidence volume: whether there are enough usable observations. / 根拠量: 使用できる観測が十分あるか。
* Category match: how close the retrieved terms are to the selected category. / カテゴリ一致: 選択カテゴリと取得語がどれくらい近いか。

These are not decorative invented numbers. The app does not display unretrieved metrics such as TikTok views, YouTube views, saves, or comments as real data. / これらは装飾用の架空数字ではありません。TikTok再生数、YouTube視聴回数、保存数、コメント数のような未取得の実数は、実データとして表示しません。

### Production Notes / 制作メモ

Production notes summarize the starting point, process, pre-writing checks, and weak points that must not be missed. / 制作メモには、初稿の出発点、手順、書く前の確認、外すと弱くなる点をまとめます。

Examples: / 例:

* Manga: first page, pull, panel gaze, final choice. / 漫画: 1ページ目、引き、コマの視線、最後の選択。
* Short video: second 0, second 1, subtitle, loop, comment trigger. / ショート動画: 0秒、1秒、字幕、ループ、コメント誘導。
* Explainer video: question, evidence, structural breakdown, safe example, ending. / 解説動画: 問い、根拠、構造分解、安全な例示、締め。
* Novel: reader retention for short, mid-length, and long-form stories. / 小説: 短編、中編、長編、それぞれの読者維持。

### Production Plans / 制作案

Each category can display multiple production plans. / 各カテゴリでは複数の制作案を表示できます。

Main fields: / 主な項目:

* Candidate title. / タイトル候補。
* Promise to the reader or viewer. / 読者・視聴者への約束。
* Protagonist or narrator. / 主人公または語り手。
* Setting. / 舞台。
* First incident. / 最初の事件。
* Conflict. / 対立。
* Turn. / 転換。
* Final choice. / 最後に選ばせること。
* Aftertaste after reading or watching. / 読後感または視聴後感。
* Story/script architecture. / 物語・台本設計。
* Medium-specific production notes. / 媒体別の制作メモ。
* Flow of prose or script. / 本文・台本の流れ。
* Opening example. / 冒頭例。
* Prompt for body generation. / 本文生成用プロンプト。

Fields equivalent to title, prose, or script are shown as "not generated" unless a real provider response exists. / タイトルや本文に相当する項目は、実際のプロバイダー応答がない限り「未生成」として表示します。

### Story Architecture / 物語・台本設計

Story architecture appears only when OpenAI or Gemini returns usable structure. / 物語・台本設計は、OpenAIまたはGeminiの応答がある場合にだけ表示します。

Included viewpoints: / 含まれる観点:

* Foreshadowing and payoff. / 伏線と回収。
* Goal, motivation, conflict, and cost. / 目的、動機、対立、代償。
* Emotional delta. / 感情差分。
* Motif recurrence. / モチーフ再登場。
* Knowledge boundary. / 知識境界。
* Medium implementation. / 媒体実装。

If the API response is missing, failed, empty, or template-like, this area remains not generated. / API応答が未取得、失敗、空、またはテンプレ的な場合、この領域は未生成のままです。

### AI Analysis Summary / AI分析サマリー

When the user connects an OpenAI or Gemini key in `AI Settings` and explicitly starts the workflow, the app can run deeper analysis on the retrieved evidence. OpenAI additionally requires an explicit model selection. / `AI設定` でOpenAIまたはGeminiのキーを接続し、明示的に開始すると、取得結果をもとに詳細分析を実行できます。OpenAIではモデル選択も必須です。

Main outputs: / 主な出力:

* The strongest creative direction visible from this retrieval. / 今回の取得結果から見える最も強い制作方向。
* Which medium is likely to work best. / どの媒体で効きやすいか。
* Risk that similar projects are already saturated. / 似た企画が増える危険。
* Concrete scenes to include in the plan. / 企画に入れるべき具体場面。
* Real-name or accusation risks to avoid. / 避けるべき実名化・告発化。
* Revision points for the first draft. / 初稿に入れるべき修正案。

### Reference Draft / 自AIの参考文章

Each production plan's body-generation prompt can be sent to the connected provider to create an actual reference draft. / 各企画案の本文生成プロンプトは、接続済みプロバイダーへ送って実際の参考本文に変換できます。

The reference draft is provider output. It is not local filler text. / 参考本文はプロバイダー出力です。ローカルの穴埋め文ではありません。

---

## Data Sources / 取得データの扱い

### Current Retrieval Scope / 現在の取得範囲

The current retrieval scope is public Web/RSS/public feed data. / 現在の実取得範囲は、公開Web/RSS/公開フィードです。

Main sources: / 主な取得対象:

* Google News RSS.
  Google News RSS。
* Bing News RSS.
  Bing News RSS。
* Google Trends RSS.
  Google Trends RSS。
* Hatena Bookmark-related RSS. / はてなブックマーク系RSS。
* Yahoo-related public RSS. / Yahoo系公開RSS。
* Category-specific queries tuned toward social, lifestyle, emotional, and discussion material. / 社会、生活、感情、議論素材に寄せたカテゴリ別検索クエリ。

### Why RSS / なぜRSSか

RSS is retrievable as an official or public feed format and makes it easier to retain source links. / RSSは、公式または公開フィードとして取得でき、出典リンクを残しやすい形式です。

RSS alone cannot provide platform-internal metrics such as views, saves, comments, or retention. Therefore Monogatari Buzz Maker treats only what can be retrieved through RSS/public feeds as evidence and does not display metrics it did not obtain. / ただし、RSSだけではプラットフォーム内の再生数、保存数、コメント数、視聴維持率は取得できません。そのため、物語バズメーカーでは「RSSや公開フィードで取れる範囲」を根拠として扱い、取得していない数値は表示しません。

---

## API Engine / APIエンジン

### Supported Providers / 対応API

The app uses a single API-key input field. OpenAI and Gemini keys are detected from the key format. / アプリは1つのAPIキー入力欄を使います。OpenAIキーとGeminiキーは、キー形式から自動判定します。

| Provider / プロバイダー | Use / 用途 |
|---|---|
| OpenAI | Deep analysis and reference-draft generation / 詳細分析、参考本文生成 |
| Gemini | Deep analysis and reference-draft generation / 詳細分析、参考本文生成 |

### OpenAI Model Selection / OpenAIモデル選択

Default: GPT-6.1 Sol / 既定: GPT-6.1 Sol

The normal `check:nano-fallback` gate checks both Gemini and OpenAI against Nano. Run `npm run sync:nano-fallback` when either catalog changes. Explicit `--openai-only` remains available for a scoped manual update, but does not replace the normal gate. / 通常の `check:nano-fallback` はGeminiとOpenAIの両方をNanoと照合します。いずれかの候補が変わった場合は `npm run sync:nano-fallback` で同期します。明示的な `--openai-only` は限定更新用に残しますが、通常検査の代わりにはしません。

API connection does not start retrieval or analysis for either provider. With OpenAI, the user must explicitly choose a model, including GPT-6.1 Sol, and then press the `情報収集・分析・企画作成を開始` button. With Gemini, the user presses the same button after connecting the key. GPT-6.1 Sol is recommended in both development and production. Astra remains selectable above Sol in the fallback order. The choice is kept for the page session only / ページ内のみ; reloading requires model selection again. The selector applies to provider analysis, plan design, and reference-draft generation. Each request starts from the selected model and falls back only to models below it in the displayed list. / どちらのAPIも、キーを接続しただけでは情報収集・分析・企画作成を開始しません。OpenAIはGPT-6.1 Solが初期選択され、必要なら別モデルに変更してから `情報収集・分析・企画作成を開始` ボタンを押します。Geminiはキー接続後に同じ開始ボタンを押します。GPT-6.1 Solは開発版・公開版共通の既定モデルです。AstraはSolより上位の選択肢として残します。選択はページ内だけで保持され、再読み込みするとGPT-6.1 Solが初期選択されます。接続後はキー入力を閉じ、接続済みのマスク表示にします。「APIキーを変更」で新規入力を開き、キャンセルや形式不明の入力では現在の接続を維持します。実キーを入力欄へ復元しません。モデル選択は詳細分析、制作案設計、参考文章生成に共通で適用されます。各リクエストは選択モデルから開始し、表示順で下位のモデルにだけフォールバックします。

API usage fees, terms, model restrictions, and rate limits follow each provider's contract. / API利用料、利用規約、モデル制限、レート制限は、各サービスの契約に従います。

---

## Output & Export / 出力

### JSON

JSON saves the screen's analysis results and production plans as structured data. / 画面の分析結果と制作案を、構造化したJSONとして保存します。

Imported report text is displayed as text, including HTML-like content. JSON with invalid report structures is rejected while keeping the current report. / JSON内のHTMLのような文字列もテキストとして表示します。レポートの構造が不正なJSONは読み込まず、現在のレポートを保持します。

Primary uses: / JSONは、画面の分析結果と制作案を構造化データとして保存します。

Main uses: / 主な用途:

* Reload the same plan later. / 後で同じ企画を読み込む。
* Pass data to another AI. / 別AIへ渡す。
* Reuse prompts and evidence. / プロンプトや根拠を再利用する。
* Keep a machine-readable backup separate from DOCX. / DOCXとは別に、機械可読なバックアップとして残す。

### Markdown

Markdown is generated for report copying and AI handoff. / Markdownは、レポートコピーや別AIへの引き継ぎ用に生成します。

Primary uses: / 主な用途:

* Paste into another AI. / 他AIへ貼る。
* Paste into a note app. / メモアプリへ貼る。
* Read as an editorial memo. / 編集メモとして読む。

### DOCX

DOCX output reorganizes evidence and planning material for human review. It is not a raw copy of the web screen. / DOCX出力は、取得根拠と制作案を人間が確認しやすい資料へ再構成します。Web画面の丸写しではありません。

Typical structure: / 主な構成:

* Evidence summary. / 取得根拠の要点。
* Production notes. / 制作メモ。
* Retrieval status. / 取得状況。
* Production plans. / 制作案。
* Medium-specific decisions. / 媒体別の制作判断。
* Evidence handling. / 根拠の扱い。
* Risks and revision policy. / リスクと修正方針。
* Decisions for the next meeting. / 次回までに決めること。

---

## Setup & Launch / セットアップと起動

### Cloud / Browser / 公開ページ

Open the public version: / 公開版を開きます。

[https://furuyan1234.github.io/viral-radar/](https://furuyan1234.github.io/viral-radar/)

Enter a provider key in the initial `AI Settings` panel. For OpenAI, select a model, then press `Start Search & Analysis`. Gemini also waits for the same explicit start action. / 初期表示の `AI設定` でプロバイダーキーを入力します。OpenAIではモデルを選び、`情報収集・分析・企画作成を開始` を押します。Geminiも同じ開始操作まで待機します。

Until AI setup is completed, the main UI remains locked. Public Web/RSS retrieval, deep analysis, reference-draft generation, and save/export operations become available only after the user explicitly starts the workflow. / AI設定が完了するまでは主要UIをロックします。公開Web/RSS取得、詳細分析、参考本文生成、保存系操作は、利用者が明示的に開始したあとに有効になります。

<a id="local-setup"></a>

### Local Launch (Windows) / ローカルでの起動

1. [Download the source ZIP](https://github.com/FURUYAN1234/viral-radar/archive/refs/heads/main.zip) and extract the entire folder. / ソースZIPをダウンロードし、フォルダー全体を展開します。
2. Double-click `start_monogatari_buzz_maker.bat`. The first run prepares Node.js if needed, installs the required components, and opens the app. / 展開先の `start_monogatari_buzz_maker.bat` をダブルクリックします。初回は不足するNode.jsと必要な部品を自動で準備し、アプリ画面を開きます。
3. Connect your OpenAI/Gemini key first. Below it, select “Xを使う” and enter your X Bearer Token. / 先に生成AIキーを接続します。その下の「Xの追加接続」で「Xを使う」を選び、自分のBearer Tokenを設定します。APIキーの発行と入力は利用者本人が行います。

Windows 10/11 (64-bit x64 or ARM64) and an Internet connection are required. No administrator access, manual Node.js installation, or other app is needed. If a compatible Node.js is already installed, it is reused; otherwise the launcher downloads the pinned official Node.js LTS ZIP, verifies its SHA-256, and places it in this app's `.runtime` folder. It does not change the system PATH. / Windows 10/11（64bit x64・ARM64）とインターネット接続が必要です。管理者権限・Node.jsの手動インストール・他アプリは不要です。利用可能なNode.jsがあれば再利用し、なければ公式の固定版LTSを取得してSHA-256を照合し、このアプリ内の `.runtime` に置きます。PC全体のPATH設定は変更しません。

Later launches reuse the prepared files. Dependencies are reinstalled if the lockfile/runtime changes or required components are broken. If setup fails, the window shows the cause; resolve it and run the same batch again. / 2回目以降は準備済みのファイルを使います。依存関係・実行環境の更新や必要部品の破損時は再準備します。失敗時は起動画面に原因を表示します。通信状態などを確認して同じバッチを再実行してください。

Keep the launcher running while using the app. Downloading the ZIP alone or double-clicking `index.html` does not start the local API connection. X stays off until you select it; entering a token does not start a search. / 利用中は起動した画面を閉じないでください。ZIPのダウンロードだけ、または `index.html` の直接表示ではX接続は動きません。Xは初期オフで、キー入力だけでは検索しません。

Alternatively, with a compatible Node.js installed, open a terminal in the extracted folder (also available on macOS/Linux): / 手動起動では対応するNode.jsをインストールし、展開先のフォルダーで実行します（macOS/Linuxもこの方法で起動できます）。

First install dependencies: / 初回は依存関係をインストールします。

```powershell
npm ci
```

Start the dev server: / 開発サーバーを起動します。

```powershell
npm run dev
```

Open in browser: / ブラウザで開きます。

[http://127.0.0.1:5180/](http://127.0.0.1:5180/)

One-click launcher: / ワンクリック起動:

```powershell
.\start_monogatari_buzz_maker.bat
```

### Manual Build / 手動ビルド

Build the production bundle: / 本番ビルドを作成します。

```powershell
npm run build
```

The build output is written to `dist/`. / ビルド結果は `dist/` に出力されます。

### Preview / ビルド結果の確認

Preview the built app: / ビルド済みアプリを確認します。

```powershell
npm run preview
```

---

## Verification / 検証

Basic verification: / 基本検証:

```powershell
npm test
npm run build
```

Maintenance snapshot check: / 保守スナップショット検査:

```powershell
npm run check:upstreams
```

Individual verification examples: / 個別検証の例:

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

The app does not use an additional frontend framework. It shares the same public Web/RSS search modules between GitHub Pages and local Vite. Local Vite also handles save dialogs and CORS-friendly mediation for provider calls where needed. / 追加のフロントエンドフレームワークは使っていません。GitHub PagesとローカルViteの両方で同じ公開Web/RSS検索モジュールを使います。ローカルViteでは、必要に応じて保存ダイアログやプロバイダー呼び出しのCORS回避用中継も扱います。

---

## Unique Architecture Highlights / 固有アーキテクチャの要点

### 1. Search-Grounded Creative Planning / 検索根拠に紐づく企画化

Evidence is built from retrieved observations, not fixed samples. / 取得根拠は、固定サンプルではなく、取得した観測結果をもとに作ります。

The app does not turn retrieved titles or proper nouns directly into story titles. It treats them as evidence to inform AI generation. / 取得結果のタイトルや固有名詞をそのまま作品名にせず、AI生成時の入力根拠として扱います。

### 2. Medium Translation Layer / 媒体変換レイヤー

The same topic is passed differently to manga, short video, explainer video, and novel planning. / 同じ話題を、漫画、ショート動画、解説動画、小説で別の制作判断として渡します。

Examples: / 例:

* Manga: first panel, page turn, and gaze flow. / 漫画では「最初のコマ」「ページめくり」「視線誘導」。
* Short video: first second, subtitles, and loop. / ショート動画では「冒頭1秒」「字幕」「ループ」。
* Explainer video: evidence presentation, inference separation, and misunderstanding prevention. / 解説動画では「根拠提示」「推測の分離」「誤解回避」。
* Novel: chapter hooks, character change, and foreshadowing payoff. / 小説では「章末フック」「人物変化」「伏線回収」。

### 3. Story Architecture Layer / 物語設計レイヤー

Story architecture is displayed only when a provider response is available. / 物語設計は、プロバイダー応答がある場合にだけ表示します。

It can include foreshadowing, goal, motivation, conflict, cost, emotional delta, motif recurrence, knowledge boundary, and medium implementation. / 伏線、目的、動機、対立、代償、感情差分、モチーフ再登場、知識境界、媒体実装などを含みます。

The local app does not fill those fields with boilerplate. / ローカル側では、これらを定型文で穴埋めしません。

### 4. Fail-Closed Evidence Policy / 失敗を成功に見せない方針

If retrieval fails, provider analysis fails, or returned prose is empty, the app does not treat the operation as success. / 取得できない、解析できない、APIが失敗した、本文が空白だった場合は、成功扱いにしません。

The design rejects fictional observations, fictional search results, and decorative metrics. / 架空の観測値、架空の検索結果、装飾用数字で画面を埋める設計は採用しません。

### 5. Editor-Facing DOCX / 編集者向けDOCX

DOCX output is reorganized into an editorial review document, not a copy of the web screen. / DOCXはWeb画面の複製ではなく、取得根拠と制作案を確認する編集用資料へ再構成します。

---

## Compliance & Legal Stance / 法的遵守について

### Public Data Usage / 公開データの利用

The app uses information retrievable from public Web/RSS/public feeds as reference material for creative planning. / 本アプリは、公開Web/RSS/公開フィードから取得できる範囲の情報を、創作企画の参考として扱います。

It displays source links and separates evidence from creative transformation. / 取得元リンクを表示し、根拠と創作変換を分けます。

### Official API Usage / 公式APIの利用

OpenAI and Gemini are called with API keys prepared by the user. / OpenAIおよびGeminiは、ユーザーが自身で用意したAPIキーを使って呼び出します。

API fees, terms, model restrictions, and rate limits follow each provider's contract. / API利用料、利用規約、モデル制限、レート制限は、各サービスの契約に従います。

### No Impersonation / 実在名の扱い

The app does not turn real people, companies, works, creators, or existing characters into protagonists, villains, accusation targets, or sequel targets. / 実在の人物、企業、作品、クリエイター、既存キャラクターを、物語の主役、黒幕、告発対象、続編対象にしません。

Real names are limited to evidence, source format, and market-trend explanation. / 実在名は、根拠、配信形式、市場動向の説明に限定します。

### Creative Transformation / 創作上の変換

When generating with AI, the app encourages fictional names and fictional settings where needed. The local app itself does not ghostwrite that body text. / AI生成時には、必要に応じて架空名や架空設定へ置き換えます。ローカル側はその本文を代筆しません。

### No Legal Advice / 助言ではない

The app output is reference information for creative planning. It is not professional advice for law, medicine, finance, investment, or reporting decisions. / 本アプリの出力は、創作企画支援を目的とした参考情報です。法律、医療、金融、投資、報道判断の専門助言ではありません。

---

## Security / セキュリティ

### API Keys / APIキー

* Do not paste API keys into chat. / APIキーをチャットに貼らないでください。
* Keys are not saved to README, JSON, DOCX, HANDOFF, PLAN, or logs. / キーをREADME、JSON、DOCX、HANDOFF、PLAN、ログに保存しません。
  Keys are not saved to README, JSON, DOCX, HANDOFF, PLAN or logs. / README、JSON、DOCX、HANDOFF、PLAN、ログに保存しません。
* Saved-key fields do not re-display full keys. / 保存済みキーは入力欄へ全文再表示しません。
* Key-like strings are masked during export. / エクスポート時はキー形式の文字列をマスクします。

### Local Saving / ローカル保存

For JSON and DOCX saving, the user chooses the save destination. / JSON/DOCX保存では、ユーザーが保存先を選びます。

The app does not silently save into a fixed folder under the app directory. / アプリ直下の固定フォルダへ勝手に保存しません。

### File Names / ファイル名

Exported filenames include a local 14-digit timestamp. / 保存ファイル名には、ローカル時刻の14桁タイムスタンプを付けます。

Format: / 形式:

```text
YYYYMMDDHHMMSS
```

Example: / 例:

```text
monogatari-buzz-maker-story-manga-20260625123045.docx
```

---

## Terms & Output Rights / 利用条件・作品の権利

### MIT license for the app / アプリ本体はMITライセンス

From November 12, 2026, the current source of this app is available under the [MIT License](LICENSE). This applies to the program, bundled prompts and accompanying documentation that FURU has authority to license. / 2026年11月12日より、本アプリの現行ソースを[MITライセンス](LICENSE)で公開します。FURUが許諾権限を持つプログラム、同梱プロンプト、付属文書が対象です。

You may use, copy, modify, merge, publish, distribute, sublicense and sell the software, including paid redistribution, paid services and bundling with paid teaching materials, without individual permission, prior contact or a license fee to FURU. / 利用・複製・改変・結合・公開・配布・再許諾・販売ができます。有料再配布、有料サービスへの組み込み、有料教材への同梱にも、FURUへの個別許可・事前連絡・ライセンス料は不要です。

Include the copyright notice and the MIT permission notice in all copies or substantial portions of the software. The software is provided as is, without warranty, as stated in the license. / ソフトウェアのすべての複製または重要な部分に、著作権表示とMITの許諾表示を含めてください。ソフトウェアは、ライセンスに記載のとおり無保証で現状のまま提供します。

### Your outputs remain yours / 成果物の権利は従来どおり利用者に

Rights in the text, images, comics, audio, video and other works you create remain with you as before. FURU does not acquire rights in your outputs merely because you use this app, and the app's MIT license does not automatically apply to your outputs. / 作成した文章・画像・漫画・音声・動画などの成果物の権利は、従来どおり利用者に帰属します。アプリを使ったことを理由にFURUが成果物の権利を取得することはなく、アプリのMITライセンスが成果物へ自動的に適用されることもありません。

You may publish, sell, monetize and deliver your works without permission, fees or credit to FURU. If an output includes copies or modifications of the app's code or other licensed software, retain the applicable notices for those portions. / 自分の作品は、FURUへの許可・利用料・クレジット表記なしで公開・販売・収益化・納品できます。成果物にアプリのコードなどソフトウェアの複製・改変を含める場合、その部分には該当ライセンスの表示を残してください。

### Third-party materials and services / 第三者の素材・サービス

Third-party code, models, assets, voices, separately bundled projects and external services retain their own licenses and terms. API charges, attribution requirements and rights in source materials must be checked separately. This license does not grant rights that FURU does not hold. / 第三者のコード・モデル・素材・音声、同梱の別プロジェクト、外部サービスには、それぞれのライセンス・利用条件が適用されます。API料金、クレジット義務、入力素材の権利は別途確認してください。FURUが持たない権利をこのライセンスで許諾するものではありません。

### Earlier distributions / 過去の配布物

This change applies to the current source distributed with this MIT license and subsequent versions. Existing release ZIPs are not rewritten; check their attached license. Valid earlier permissions are not revoked. The [previous notices](docs/licenses/previous-notices.md) are retained as history. / 今回の変更は、このMITライセンスを添付した現行ソースと今後の版に適用します。既存のリリースZIPは書き換えていないため、添付のライセンスを確認してください。過去に有効に付与された許諾は取り消しません。[以前の表示](docs/licenses/previous-notices.md)は履歴として残しています。

## Browser security / ブラウザーの安全対策

This update further strengthens security while preserving the existing creation workflow. / 今回の更新では、既存の制作フローを保ちながらセキュリティをさらに強化しました。

The app limits script execution and API connections with Content Security Policy, disables embedded frames and form submissions, and sends no referrer. Open the app directly in its own tab. API keys remain sensitive while in memory; these protections do not guarantee the absence of every vulnerability. Every deployment checks dependencies, source safeguards and the built policy. / CSPでスクリプト実行・API接続先を制限し、埋め込み表示とフォーム送信を禁止、参照元情報を送信しません。アプリは直接タブで開いてください。メモリー内のAPIキーも機密情報であり、すべての脆弱性がないことを保証するものではありません。毎回のデプロイで依存ライブラリ・ソースの防御・ビルド後の設定を検査します。

## AI Manga Creative Suite / AIまんが制作エコシステム

This app is one component in a broader AI-assisted manga and story production workflow. / このアプリは、AIを活用した漫画・物語制作ワークフローの一部です。

Monogatari Buzz Maker is designed as one tool in the Antigravity AI creative support suite. / 物語バズメーカーは、Antigravity内のAI制作支援群の一部として設計されています。

It does not call the other apps at runtime. Each app works independently. / ただし、実行時に他アプリを呼び出すものではありません。各アプリは独立して動作します。

### Ecosystem Components / 構成システム

| **Tool / ツール** | **Role / 役割** | **Repository / リポジトリ** |
| --- | --- | --- |
| Super FURU AI 4-koma System / Super FURU AI 4コマシステム | AI 4-panel manga generation / AI 4コマ漫画生成 | [nano-banana-pro](https://github.com/FURUYAN1234/nano-banana-pro) |
| Story Maker | Story and plot generation / 物語・プロット生成 | [story-maker](https://github.com/FURUYAN1234/story-maker) |
| AI Character Sheet Maker / AIキャラクターシートメーカー | Character reference generation / キャラクター資料生成 | [character-sheet-maker](https://github.com/FURUYAN1234/character-sheet-maker) |
| AI Comic Translation Tool / AI漫画翻訳ツール | Manga translation and regeneration / 漫画翻訳・再生成 | [comic-translation](https://github.com/FURUYAN1234/comic-translation) |
| 360° AI Panorama Generator / 360度AIパノラマ生成ツール | 360-degree background generation / 360度背景生成 | [panoforge](https://github.com/FURUYAN1234/panoforge) |
| AI Voice Comic Maker / AI音声コミックメーカー | Voice comic video generation / フルボイス動画化 | [ai-voice-comic-maker](https://github.com/FURUYAN1234/ai-voice-comic-maker) |
| Monogatari Buzz Maker / 物語バズメーカー | Trend research and creative planning / トレンド調査・創作企画 | [viral-radar](https://github.com/FURUYAN1234/viral-radar) |
| Narration Video Maker / ナレーション動画メーカー | Video generation with narration, subtitles, and BGM / ナレーション・字幕・BGM付き動画生成 | [gemini-narration-studio](https://github.com/FURUYAN1234/gemini-narration-studio) |
| AI Image Bridge / クリスタ用AI画像編集プラグイン | Edit CLIP STUDIO PAINT layers with AI / クリスタのレイヤーをAIで編集 | [GitHub](https://github.com/FURUYAN1234/ai-image-bridge) · [Guide / 解説](https://note.com/happy_duck780/n/n6747a089fce7) |
| MiniMax H3 Video / MiniMax H3動画生成 | T2V, I2V and Ref2V workflows / 文章・開始画像・参照画像から動画生成 | [GitHub](https://github.com/FURUYAN1234/comfyui-h3-workflows) · [Guide / 解説](https://note.com/happy_duck780/n/n15e732b3147b) |
| MiniMax H3 MV / MiniMax H3ミュージックビデオ | Music videos from completed songs / 完成曲からMV制作 | [GitHub](https://github.com/FURUYAN1234/comfyui-h3-workflows) · [Guide / 解説](https://note.com/happy_duck780/n/ne8a84cb6db37) |
| KomaOrbit / 一枚絵から3D構図を探すツール | Explore viewpoints and export images / 視点の調整・画像出力 | [GitHub](https://github.com/FURUYAN1234/comfyui-h3-workflows) · [Guide / 解説](https://note.com/happy_duck780/n/n3f68482d5edd) |
| Long Video AnimeSharp Upscaler / 長尺動画AnimeSharpアップスケーラー | Video upscaling with audio retention / 音声を保持して動画を拡大 | [GitHub](https://github.com/FURUYAN1234/comfyui-long-video-upscaler) · [Guide / 解説](https://note.com/happy_duck780/n/n0f190160e307) |
| Japanese Song Creation / 日本語おまかせ作曲（LM Studio × YuE2） | Lyrics and song creation / 歌詞・歌の制作 | [GitHub](https://github.com/FURUYAN1234/ComfyUI-YuE2-Japanese) · [Guide / 解説](https://note.com/happy_duck780/n/n57df44cf7fd2) |
| Japanese Narration / 日本語おまかせナレーション | Voice consultation and speech synthesis / 声の相談・音声生成 | [GitHub](https://github.com/FURUYAN1234/ComfyUI-Local-Narration-Japanese) · [Guide / 解説](https://note.com/happy_duck780/n/nda7ed302d544) |
| MangaScreen JP / 日本語操作・原寸出力対応版 | Manga lines, fills and screentones / 漫画の線画・ベタ・網点処理 | [GitHub](https://github.com/FURUYAN1234/ComfyUI-MangaScreen-JP) · [Guide / 解説](https://note.com/happy_duck780/n/n5c89a250fb82) |
| Codex Usage / Codex 残量 | Windows usage overlay / Windows用の利用枠表示ツール | [GitHub / ソースコード](https://github.com/FURUYAN1234/codex-usage-overlay) |

## Changelog / 更新履歴

### v1.2.10 (2026-10-27)

- Added GPT-6.1 Terra between Sol and GPT-6 Sol in the OpenAI selection and fallback route at $1 input / $5 output per million tokens. Preserved Viral Radar's GPT-4 compatibility choices and Gemini route. / OpenAIの選択肢とフォールバックでGPT-6.1 TerraをSolとGPT-6 Solの間に追加しました。入力$1・出力$5／100万トークンです。Viral RadarのGPT-4互換選択肢とGemini経路は維持しています。

### v1.2.9 (2026-10-07)

- Security: CSP and frame protection, dependency updates, and mandatory release checks. / CSP・埋め込み防御・依存更新・公開前検査を追加。

### v1.2.8 (2026-10-04)

- Escape imported labels and descriptions, reject malformed nested reports, and preserve the existing report on rejection. / 取り込むラベル・説明を安全に表示し、不正な入れ子JSONを拒否して元のレポートを保持します。
- Publish common application terms while preserving valid prior grants and third-party conditions. / 共通利用条件を公開し、過去の有効な許諾と第三者条件を保持します。
- Refresh only Nano source metadata; model order, prices and Gemini routes are unchanged. / Nano参照元metadataだけを同期し、モデル順序・価格・Gemini経路は変更しません。


### v1.2.7 (2026-10-01)

* Added GPT-6.1 Sol as the default candidate in development and production. / 開発版と公開版の初期候補にGPT-6.1 Solを追加しました。
* Synced the fallback catalog: Astra → 6.1 Sol → 6 Sol, retaining selected-model downward routing across analysis, plan design and drafts. / 開発版・公開版の実際の初期選択をGPT-6.1 Solへ統一。Astraと既存モデルの明示選択、API接続後の開始確認は維持します。

### v1.2.6 (2026-09-24)

* Added an explicit OpenAI model selector, with GPT-6 Astra shown as the recommended option and downward-only fallback from the selected model. / OpenAIモデルを明示的に選べるようにし、GPT-6 Astraを推奨候補として表示しました。フォールバックは選択モデルより下位だけへ進みます。
* Stopped automatic retrieval after API connection. OpenAI requires model selection and both OpenAI and Gemini require the `情報収集・分析・企画作成を開始` action. / API接続直後の自動取得を停止しました。OpenAIはモデル選択、OpenAIとGeminiの両方で `情報収集・分析・企画作成を開始` 操作が必要です。
* Unified API connection, model selection, and start confirmation in one AI settings panel, and removed transient route-status boxes that disappeared with the panel. / API接続、モデル選択、開始確認を1つのAI設定パネルにまとめ、パネルとともに消える経路表示欄を削除しました。
* Added product-specific model descriptions and synchronized model order and pricing metadata without importing Nano Banana product copy. / 物語バズメーカー専用のモデル説明を追加し、Nano Bananaの製品文言を持ち込まず、モデル順と料金情報だけを同期しました。

* Expanded the README into a consistent English/Japanese bilingual structure. / README全体を一貫した英日併記構造へ拡張しました。
* Clarified that detailed analysis, medium decisions, story/script fields, and reference drafts must not be filled with local boilerplate. / 詳細分析、媒体別判断、物語・台本設計、参考文章をローカル定型文で穴埋めしない方針を明確化しました。
* Kept the distinction between retrieved evidence, creative planning, provider analysis, and export material. / 取得根拠、制作案、プロバイダー分析、エクスポート資料の区別を維持しました。

### v1.2.5 (2026-06-26)

* Strengthened the API response contract and quality gates so ungenerated fields, professional-planning notes, story/script architecture, and body labels do not leak as fixed local text. / 未生成欄、プロ向け設計メモ、物語・台本設計、本文ラベルがローカル定型文として漏れないよう、API応答契約と品質ゲートを強化しました。
* Changed result integration to fail closed unless all evidence cards, production-plan fields, and reference drafts are available. / 全取得根拠カード、全制作案フィールド、全参考文章が揃った場合だけ反映する fail-closed 動作に修正しました。
* Reorganized checks into generic rules independent of one visible sample phrase. / 個別サンプル語に依存しない汎用判定ルールへ整理しました。

### v1.2.4 (2026-06-26)

* Stopped generating professional-planning notes and story/script architecture from local boilerplate. / プロ向け設計メモと物語・台本設計をローカル定型文で生成しないよう変更しました。
* Limited those fields to OpenAI/Gemini API responses. / それらの欄をOpenAI/GeminiのAPI応答でのみ埋める設計に修正しました。

### v1.2.3 (2026-06-26)

* Hardened reference-draft and body-generation handling. / 参考本文と本文生成まわりの扱いを強化しました。
* Kept missing provider output visibly ungenerated instead of silently filling it. / プロバイダー出力がない場合は、黙って穴埋めせず未生成として残す方針を維持しました。

### v1.2.2 (2026-06-26)

* Improved provider-output validation and evidence-boundary wording. / プロバイダー出力検証と根拠境界の表現を改善しました。
* Clarified the distinction between local evidence and AI-generated interpretation. / ローカル根拠とAI生成による解釈の違いを明確化しました。

### v1.2.1 (2026-06-25)

* Improved export behavior and editor-facing report structure. / エクスポート挙動と編集者向けレポート構成を改善しました。
* Added stronger handling for API settings and generated material. / API設定と生成物の扱いを強化しました。

### v1.2.0 (2026-06-25)

* Added broader planning support for story manga, short video, explainer video, and novel modes. / ストーリー漫画、ショート動画、解説動画、小説向けの制作案支援を拡張しました。
* Added structured export paths for JSON, Markdown, and DOCX. / JSON、Markdown、DOCXの構造化エクスポートを追加しました。

### v1.1.x

* Iteratively improved trend retrieval, creative planning cards, scoring, and export flow. / トレンド取得、制作案カード、スコアリング、エクスポートフローを段階的に改善しました。

### v0.1.x

* Initial experimental release for converting public trend material into creative planning prompts. / 公開トレンド素材を創作企画プロンプトへ変換する初期実験版を公開しました。

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
| License / ライセンス | [FURU アプリ利用条件](LICENSE) |
