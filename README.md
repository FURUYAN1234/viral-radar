# Monogatari Buzz Maker / 物語バズメーカー

![Version](https://img.shields.io/badge/version-1.2.5-0f766e)
![Framework](https://img.shields.io/badge/framework-Vite-646cff)
![Runtime](https://img.shields.io/badge/runtime-browser%20%2B%20local%20Vite-111827)
![API](https://img.shields.io/badge/API-OpenAI%20%2F%20Gemini-2563eb)
![Source Code License](https://img.shields.io/badge/source%20code-UNLICENSED-red)
[![Generated Text License](https://img.shields.io/badge/generated%20text-CC%20BY--NC--SA%204.0-0f766e)](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ja)

- English: Monogatari Buzz Maker is a creative planning app that turns real public Web/RSS trend signals into evidence packs, medium-specific plans, AI prompts, reference drafts, and editor-facing exports.
- 日本語: 物語バズメーカーは、公開Web/RSSから実際に取得した話題シグナルを、取得根拠、媒体別制作案、AI用プロンプト、参考本文、編集者向け出力へ整理する創作支援アプリです。

[![AI Manga Creative Suite / AIまんが制作エコシステム](https://github.com/user-attachments/assets/d850ac7f-aa1c-40cc-a378-b8c6673c726c)](https://youtu.be/pqYVxUUg0Cs?si=27g1I3tO2EuZkOuxJ)

> English: The app must not fill missing retrievals, failed API responses, or creative sections with invented data, old samples, local templates, or fake metrics.
>
> 日本語: このアプリは、取得できないデータ、失敗したAPI応答、未生成の創作欄を、架空データ、旧サンプル、ローカル定型文、偽の数値で埋めてはいけません。

---

## Overview / 概要

| English | 日本語 |
|---|---|
| The app collects public Web/RSS topic candidates and keeps the source URL, query, timestamp, and calculated evidence signals visible. | 公開Web/RSSから話題候補を取得し、取得元URL、検索語、取得時刻、算出した根拠シグナルを表示します。 |
| It does not put trend words directly into a story. It separates evidence, analysis, planning, prompting, and export. | 流行語をそのまま作品へ入れず、根拠、分析、制作案、プロンプト、出力を分けて扱います。 |
| OpenAI or Gemini can generate deeper readings, production notes, story/script design, and reference prose after the user enters an API key in the UI. | ユーザーがUIでAPIキーを入力したあと、OpenAIまたはGeminiで詳細読み取り、制作メモ、物語・台本設計、参考本文を生成できます。 |
| If AI output is absent, incomplete, unsafe, or template-like, the app fails closed instead of pretending that generation succeeded. | AI応答がない、不完全、安全でない、または定型的な場合は、生成済みに見せず fail-closed で扱います。 |

## Problem It Solves / このアプリが解く問題

| English | 日本語 |
|---|---|
| Seeing what is trending is not enough for a manga artist, novelist, video creator, or editor to start production. | 「今ウケているもの」を見るだけでは、漫画家、小説家、動画制作者、編集者はすぐ制作へ入れません。 |
| They need to know why people reacted, what emotional pattern is present, which medium can use it, and where real names must be abstracted. | 必要なのは、なぜ反応が起きたのか、どんな感情構造なのか、どの媒体に向くのか、どこから実名を抽象化すべきかという制作判断です。 |
| Monogatari Buzz Maker prepares that decision layer without pretending that local code is an AI writer. | 物語バズメーカーは、ローカルコードをAI作家に見せかけず、その判断層を準備します。 |

## Live Site / 公開サイト

| Item | English | 日本語 |
|---|---|---|
| Public URL | [https://furuyan1234.github.io/viral-radar/](https://furuyan1234.github.io/viral-radar/) | 公開版はこのURLで利用します。 |
| Local URL | [http://127.0.0.1:5180/](http://127.0.0.1:5180/) | ローカル開発ではこのURLを使います。 |
| Reserved port | `5180` | 他のAntigravity系アプリと同時起動できるよう、固定ポート`5180`を使います。 |

---

## Core Concept / 基本コンセプト

### Trend To Story / 話題を物語へ変換する

| Retrieved signal / 取得したもの | English handling | 日本語での扱い |
|---|---|---|
| Real news headline / 実在ニュースの見出し | Keep it as evidence, then abstract it before story planning. | 根拠として保持し、物語化の前に抽象化します。 |
| Fast-rising phrase / 急に伸びた話題語 | Read the emotion behind the phrase instead of copying the phrase. | 語そのものではなく、その背後の感情を読み取ります。 |
| Comment-heavy topic / コメントが集まる話題 | Treat it as conflict structure, not as material for harassment or accusation. | 嫌がらせや告発ではなく、対立構造として扱います。 |
| Saved know-how / 保存されるノウハウ | Convert it into a character action or decision point. | 説明ではなく、登場人物の行動や選択へ変換します。 |
| Cross-source co-occurrence / 複数ソースの共起 | Use it as evidence of atmosphere, not as a made-up score. | 架空スコアではなく、空気感の根拠として使います。 |

### Evidence First / 根拠から作る

| English | 日本語 |
|---|---|
| Evidence cards show source title, summary, tags, search terms, retrieval time, and links. | 根拠カードには、見出し、概要、タグ、検索語、取得時刻、リンクを表示します。 |
| Evidence is not the finished story. It is the material that AI or a human editor can inspect before planning. | 根拠は完成本文ではありません。AIや編集者が制作前に確認する素材です。 |
| Real names may appear in evidence, but story-facing outputs should use fictionalization or abstraction when needed. | 実名は根拠欄には残せますが、物語側の出力では必要に応じて架空化・抽象化します。 |

### Medium Specific Planning / 媒体別の制作判断

| Medium | English focus | 日本語での焦点 |
|---|---|---|
| Story manga / ストーリー漫画 | Page rhythm, panel reveal, visual contrast, and emotional payoff. | ページ運び、コマの見せ場、視覚的対比、感情の回収。 |
| Short video / ショート動画 | First-second hook, cut order, subtitle pressure, and repeatable visual beat. | 冒頭1秒、カット順、字幕圧、繰り返せる画のリズム。 |
| Trend explainer video / トレンド解説動画 | Evidence framing, abstraction boundary, viewer question, and responsible explanation. | 根拠の見せ方、抽象化の境界、視聴者の疑問、責任ある解説。 |
| Novel / 小説 | Point of view, scene order, psychological pressure, and scale of expansion. | 視点、場面順、心理的圧力、短編から長編までの伸ばし方。 |

---

## Feature Map / 機能マップ

| Area | English | 日本語 |
|---|---|---|
| Retrieval / 取得 | Fetch public Web/RSS topic candidates through the app's retrieval routes. | アプリの取得経路で公開Web/RSSの話題候補を取得します。 |
| Transparency / 透明性 | Keep source links, queries, timestamps, and evidence structure visible. | 取得元リンク、検索語、取得時刻、根拠構造を見える形で残します。 |
| Metrics / 指標 | Show source count, freshness, overlap, and category fit only from retrieved data. | 取得データに基づく件数、鮮度、重なり、カテゴリ適合を表示します。 |
| AI analysis / AI分析 | Ask OpenAI/Gemini to read evidence and produce visible analysis fields. | OpenAI/Geminiに根拠を読ませ、画面に出る分析欄を生成します。 |
| Production plans / 制作案 | Generate medium-specific plans only after provider output is complete. | API応答が揃った場合だけ、媒体別制作案を生成済みとして表示します。 |
| Reference prose / 参考本文 | Generate reference prose from selected evidence and selected plan context. | 選択した根拠と制作案から参考本文を生成します。 |
| Export / 出力 | Save JSON, Markdown, and DOCX for review or handoff. | JSON、Markdown、DOCXで保存し、確認や引き継ぎに使います。 |
| Maintenance / 保守 | Regression tests guard against fake data, local template filler, secret leakage, and sample-specific rules. | 回帰テストで、偽データ、ローカル定型文、秘密情報漏れ、個別サンプル専用ルールを防ぎます。 |

## User Workflow / 利用手順

| Step | English | 日本語 |
|---:|---|---|
| 1 | Open the app and enter an OpenAI or Gemini API key in the UI when AI generation is needed. | アプリを開き、AI生成が必要な場合はUIでOpenAIまたはGeminiのAPIキーを入力します。 |
| 2 | Choose a medium: story manga, short video, trend explainer video, or novel. | ストーリー漫画、ショート動画、トレンド解説動画、小説から媒体を選びます。 |
| 3 | Retrieve public Web/RSS evidence and inspect the source cards. | 公開Web/RSSの根拠を取得し、取得元カードを確認します。 |
| 4 | Run AI analysis and plan generation only when the evidence is sufficient. | 根拠が十分な場合だけAI分析と制作案生成を実行します。 |
| 5 | Generate reference prose for a selected plan if needed. | 必要に応じて、選択した制作案の参考本文を生成します。 |
| 6 | Export JSON, Markdown, or DOCX for editing, review, or another AI workflow. | 編集、確認、別AIへの引き継ぎ用にJSON、Markdown、DOCXで出力します。 |

---

## Analysis Surfaces / 分析画面

| Surface | English | 日本語 |
|---|---|---|
| Acquisition status / 取得状態 | Shows what was retrieved and whether retrieval failed. | 何を取得できたか、または取得に失敗したかを表示します。 |
| AI analysis summary / AI分析サマリー | Summarizes provider-generated reading after API output exists. | API応答がある場合に、AI生成の読み取りを要約します。 |
| Evidence readings / 取得データの読み取り | Displays one AI reading and one planning judgment per evidence card. | 根拠カードごとにAI読み取りと企画判断を表示します。 |
| Medium decisions / 媒体別の制作判断 | Separates manga, video, explainer, and novel decisions. | 漫画、動画、解説、小説の制作判断を分けて表示します。 |
| Production notes / 制作メモ | Gives practical notes for execution, only from valid AI output. | 実制作に使うメモを、有効なAI応答がある場合だけ表示します。 |
| Production plans / 制作案 | Shows proposed titles, promises, examples, flow, openings, and differentiation. | タイトル、読者への約束、具体例、流れ、冒頭、差別化を表示します。 |
| Reference drafts / 参考本文 | Shows generated prose or script samples for selected plans. | 選択した制作案の参考本文や台本例を表示します。 |

---

## Data Sources / 取得データの扱い

| English | 日本語 |
|---|---|
| The app uses public Web/RSS sources that can be retrieved from the browser or local route. | アプリは、ブラウザまたはローカル経路から取得可能な公開Web/RSSソースを使います。 |
| If all sources fail, the app reports retrieval failure or no result instead of fabricating observations. | 全ソースの取得に失敗した場合、架空観測を作らず、取得失敗または結果なしとして扱います。 |
| Retrieved article text is treated as evidence for analysis, not as a body of text to reproduce. | 取得記事の文章は分析根拠として扱い、再現する本文としては扱いません。 |
| RSS is used because it gives stable public metadata, source titles, links, and time context. | RSSは、公開メタデータ、見出し、リンク、時刻情報を比較的安定して取得できるため使います。 |

---

## API Engine / APIエンジン

| Provider | English | 日本語 |
|---|---|---|
| OpenAI | Used for evidence reading, plan design, and reference prose when an OpenAI key is entered. | OpenAIキーが入力された場合、根拠読み取り、制作案設計、参考本文生成に使います。 |
| Google Gemini | Used for the same visible generation surfaces when a Gemini key is entered. | Geminiキーが入力された場合も、同じ表示生成欄に使います。 |

| English rule | 日本語ルール |
|---|---|
| API keys are runtime-only and must be entered in the app UI, not in chat. | APIキーは実行時のみ使い、チャットではなくアプリUIに入力します。 |
| API keys are not written to README, JSON, Markdown, DOCX, PLAN, HANDOFF, logs, or Git history. | APIキーはREADME、JSON、Markdown、DOCX、PLAN、HANDOFF、ログ、Git履歴には書きません。 |
| Provider failures are shown as failures; they are not replaced by local creative filler. | API失敗は失敗として扱い、ローカル創作文では置き換えません。 |

---

## Output & Export / 出力

| Format | English | 日本語 |
|---|---|---|
| JSON | Saves structured report data without API keys. | APIキーを含めず、構造化されたレポートデータを保存します。 |
| Markdown | Saves a readable handoff with evidence, plan context, and rights notes. | 根拠、制作案、権利注意を含む読みやすい引き継ぎ文書を保存します。 |
| DOCX | Saves an editor-facing review document, not a raw dump of the screen. | 画面の丸写しではなく、編集者が確認しやすい文書として保存します。 |

| English | 日本語 |
|---|---|
| Saved filenames include a 14-digit local timestamp. | 保存ファイル名にはローカル時刻の14桁タイムスタンプを付けます。 |
| Example: `monogatari-buzz-maker-story-manga-20260625123045.docx`. | 例: `monogatari-buzz-maker-story-manga-20260625123045.docx`。 |

---

## Setup & Launch / セットアップと起動

### Public Page / 公開ページ

| English | 日本語 |
|---|---|
| Open [https://furuyan1234.github.io/viral-radar/](https://furuyan1234.github.io/viral-radar/). | [https://furuyan1234.github.io/viral-radar/](https://furuyan1234.github.io/viral-radar/) を開きます。 |
| Enter an API key from the API settings panel when AI generation is needed. | AI生成が必要な場合は、API設定パネルからAPIキーを入力します。 |
| Major actions remain locked until a valid runtime API key is connected. | 有効な実行時APIキーが接続されるまで、主要操作はロックされます。 |

### Local Launch On Windows / Windowsでのローカル起動

```powershell
cd C:\Users\sx717\Antigravity\viral-radar
npm install
npm run dev
```

| English | 日本語 |
|---|---|
| Open [http://127.0.0.1:5180/](http://127.0.0.1:5180/) after the dev server starts. | 開発サーバー起動後、[http://127.0.0.1:5180/](http://127.0.0.1:5180/) を開きます。 |
| The reserved local port is `5180`. | 予約済みローカルポートは`5180`です。 |

### Manual Build / 手動ビルド

```powershell
npm run build
```

| English | 日本語 |
|---|---|
| Production assets are generated under `dist/`. | 本番用ファイルは`dist/`に生成されます。 |
| The production base path is `/viral-radar/` for GitHub Pages. | GitHub Pages向けのproduction base pathは`/viral-radar/`です。 |

---

## Verification / 検証

```powershell
npm test
node tests\browser-smoke.mjs
npm run build
git diff --check -- . ':!dist'
```

| English | 日本語 |
|---|---|
| `npm test` checks retrieval boundaries, provider contracts, export safety, secret handling, and generic production rules. | `npm test`は、取得境界、API契約、出力安全性、秘密情報の扱い、汎用本番ルールを確認します。 |
| `node tests\browser-smoke.mjs` checks the browser-facing app shell. | `node tests\browser-smoke.mjs`は、ブラウザ表示側の基本動作を確認します。 |
| `npm run build` confirms that the production bundle can be generated. | `npm run build`は、本番バンドルを生成できることを確認します。 |
| `git diff --check` catches whitespace and conflict-marker issues before commit. | `git diff --check`は、コミット前に空白や衝突マーカーの問題を検出します。 |

---

## Tech Stack / 技術スタック

| Layer | English | 日本語 |
|---|---|---|
| Frontend | Vite, browser JavaScript, CSS. | Vite、ブラウザJavaScript、CSS。 |
| AI providers | OpenAI and Google Gemini through user-entered runtime API keys. | ユーザーが実行時に入力したAPIキーでOpenAIとGoogle Geminiを利用。 |
| Retrieval | Browser-safe public Web/RSS retrieval with fail-closed behavior. | fail-closed方針のブラウザ対応公開Web/RSS取得。 |
| Export | JSON, Markdown, and DOCX generation. | JSON、Markdown、DOCX生成。 |
| Tests | Node test runner and browser smoke checks. | Node標準テストランナーとブラウザ簡易確認。 |

---

## Architecture Highlights / アーキテクチャの要点

| Highlight | English | 日本語 |
|---|---|---|
| Search-grounded planning / 検索根拠に紐づく企画化 | Plans are generated from visible evidence, not from an invisible sample bank. | 制作案は見える根拠から作り、見えないサンプルバンクからは作りません。 |
| Medium translation / 媒体変換 | The same evidence is reshaped differently for manga, short video, explainer video, and novels. | 同じ根拠でも、漫画、ショート動画、解説動画、小説で別の形に変換します。 |
| Story architecture / 物語設計 | Structure, scene flow, opening, and differentiation are provider-generated fields. | 構成、場面の流れ、冒頭、差別化はAPI応答で生成する欄です。 |
| Fail-closed policy / fail-closed方針 | Missing or weak provider output does not become local creative prose. | 欠けたAPI応答や弱いAPI応答を、ローカル創作文に置き換えません。 |
| Editor-facing export / 編集者向け出力 | DOCX is organized for review and handoff, not as a raw UI screenshot. | DOCXはレビューと引き継ぎ用に整理し、画面の生コピーにはしません。 |

---

## Compliance & Legal Stance / 法的遵守について

| Topic | English | 日本語 |
|---|---|---|
| Public data analysis / 公開データ分析 | The app analyzes public Web/RSS metadata and trend signals as creative reference material. | 本アプリは、公開Web/RSSのメタデータと話題シグナルを創作参考資料として分析します。 |
| Article 30-4 / 著作権法30条の4 | The design assumes information analysis, trend reading, and technical verification under the scope contemplated by Japanese Copyright Law Article 30-4. | 日本の著作権法30条の4が想定する情報解析、傾向分析、技術検証の範囲を前提に設計しています。 |
| No reproduction / 再現目的ではない | Retrieved works, authors, characters, people, and events are not meant to be reproduced, substituted, or impersonated. | 取得した作品、作家、キャラクター、人物、事件を再現、代替、なりすましする目的ではありません。 |
| Official API usage / 公式API利用 | AI generation runs through official OpenAI or Google Gemini APIs selected by the user's runtime key. | AI生成は、ユーザーの実行時APIキーで選択されたOpenAIまたはGoogle Geminiの公式APIを通じて行います。 |
| Evidence-bound generation / 根拠に紐づく生成 | Generated text should be tied to retrieved evidence and should abstract real-world material when needed. | 生成文章は取得根拠に紐づけ、必要に応じて実在素材を抽象化する前提で扱います。 |
| No legal advice / 法的助言ではない | This README and app output are not legal, medical, financial, investment, or publishing advice. | このREADMEとアプリ出力は、法律、医療、金融、投資、出版判断の専門助言ではありません。 |

---

## Security / セキュリティ

| English | 日本語 |
|---|---|
| Do not paste API keys into chat, issues, commits, README, PLAN, HANDOFF, exported files, or logs. | APIキーをチャット、Issue、コミット、README、PLAN、HANDOFF、出力ファイル、ログに貼らないでください。 |
| The app uses runtime-only API keys and should not restore a saved key after reload. | アプリは実行時のみAPIキーを使い、リロード後に保存済みキーを復元しない設計です。 |
| Exports must not contain API keys or key-like strings. | 出力ファイルにはAPIキーやキー形式の文字列を含めてはいけません。 |
| Failed retrievals and failed API calls must be visible as failures. | 取得失敗やAPI失敗は、失敗として見えるように扱います。 |

---

## License & Rights / ライセンスと権利

| Area | English | 日本語 |
|---|---|---|
| Source code / ソースコード | Source code is `UNLICENSED`. Redistribution, sublicensing, sale, or commercial use requires explicit permission from the rights holder. | ソースコードは`UNLICENSED`です。再配布、サブライセンス、販売、商用利用には権利者の明示的な許可が必要です。 |
| Prompts and design logic / プロンプトと設計ロジック | Prompt structure, analysis flow, guardrails, and production-judgment logic are published for noncommercial research and evaluation. | プロンプト構造、分析手順、ガード、制作判断ロジックは、非商用の研究・評価目的で公開しています。 |
| Generated text / 生成文章 | Generated reference prose, scripts, production notes, and proposals are treated by default under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ja). | 生成される参考本文、台本案、制作メモ、企画案は、原則として[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ja)で扱う考え方です。 |
| Third-party services / 外部サービス | OpenAI, Google Gemini, RSS providers, news providers, trademarks, and service names belong to their respective rights holders. | OpenAI、Google Gemini、RSS取得元、ニュース配信元、商標、サービス名は、それぞれの権利者に帰属します。 |

---

## Terms Of Use / 利用規約

| Topic | English | 日本語 |
|---|---|---|
| Purpose / 目的 | The app is a research and creative-assistance tool for turning public trend evidence into planning material. | 本アプリは、公開トレンド根拠を制作資料へ変換する研究・創作支援ツールです。 |
| Prohibited use / 禁止事項 | Do not use it for defamation, harassment, false accusation, impersonation, recognizable style cloning, unauthorized IP-like output, fake data display, secret storage, or professional advice. | 名誉毀損、嫌がらせ、虚偽告発、なりすまし、識別可能な作風模倣、既存IPに類似した無断出力、偽データ表示、秘密情報保存、専門助言用途には使わないでください。 |
| Generated text responsibility / 生成文章の責任 | Users are responsible for reviewing, revising, licensing, and publishing any plan, prompt, reference prose, or script created with the app. | 本アプリで作成した企画、プロンプト、参考本文、台本案の確認、修正、ライセンス確認、公開責任はユーザーにあります。 |
| Disclaimer / 免責 | The app does not guarantee virality, revenue, publication, ranking, accuracy of third-party sources, or continued provider availability. | 本アプリは、拡散、収益、出版、順位、第三者ソースの正確性、API提供継続を保証しません。 |
| Takedown / 権利侵害対応 | If a rights issue is reported, related output should be reviewed, corrected, or removed as needed. | 権利問題の指摘があった場合、該当出力を確認し、必要に応じて修正または削除してください。 |
| Governing law / 準拠法 | Unless otherwise required, interpretation follows Japanese law. | 別途必要な場合を除き、日本法に従って解釈します。 |

---

## AI Manga Creative Suite / AIまんが制作エコシステム

| App | English | 日本語 |
|---|---|---|
| [Nano Banana Pro](https://github.com/FURUYAN1234/nano-banana-pro) | AI image generation and visual production support. | AI画像生成とビジュアル制作支援。 |
| [AI Story Maker](https://github.com/FURUYAN1234/story-maker) | Story generation and narrative drafting. | 物語生成と本文制作支援。 |
| [AI Character Sheet Maker](https://github.com/FURUYAN1234/character_sheet) | Character sheet and visual profile creation. | キャラクターシートと設定資料作成。 |
| [Comic Translation Tool](https://github.com/FURUYAN1234/comic_translation) | Comic translation and localization support. | 漫画翻訳とローカライズ支援。 |
| [360 AI Panorama Generator](https://github.com/FURUYAN1234/background) | Panorama and background generation support. | パノラマと背景生成支援。 |
| AI Voice Comic Maker | Voice comic and short video narration support. | ボイスコミックと短編動画ナレーション支援。 |
| [Monogatari Buzz Maker](https://github.com/FURUYAN1234/viral-radar) | Public Web/RSS trends to story planning. | 公開Web/RSSトレンドから物語企画へ変換。 |

---

## Changelog / 更新履歴

| Version | English | 日本語 |
|---|---|---|
| v1.2.5 | Hardened OpenAI/Gemini visible generation fields, rejected incomplete or template-like provider output, removed sample-specific production rules, updated compliance text, and documented generated text handling under CC BY-NC-SA 4.0. | OpenAI/Geminiの表示生成欄を強化し、不完全または定型的なAPI応答を拒否し、個別サンプル専用の本番ルールを排除し、法的遵守文と生成文章のCC BY-NC-SA 4.0扱いを明記しました。 |
| v1.2.4 | Stopped local template generation for professional design notes and story/script design; provider output is required. | プロ向け設計メモと物語・台本設計をローカル定型文で生成せず、API応答必須にしました。 |
| v1.2.3 | Kept real names as evidence while converting story-facing fields into fictionalizable structures. | 実名は根拠に保持しつつ、物語化欄では架空化できる構造へ変換するよう修正しました。 |
| v1.2.2 | Rebuilt metrics, analysis, plans, notes, openings, and prompts from retrieved evidence terms. | 取得指標、分析、制作案、設計メモ、冒頭、プロンプトを取得根拠語から再構成しました。 |
| v1.2.1 | Made API keys runtime-only, removed legacy saved keys, and avoided Gemini key exposure in URL queries. | APIキーを実行時のみ扱い、旧保存キーを削除し、GeminiキーをURLクエリに出さないよう修正しました。 |
| v1.2.0 | Reset stale reports after API key changes and blocked late old responses from merging into a new session. | APIキー変更後に古いレポートをリセットし、遅れて返った旧応答が新セッションへ混ざらないようにしました。 |
| v1.1.9 | Linked design notes and story/script design to each plan's evidence and added public retrieval fallbacks. | 設計メモと物語・台本設計を各案の根拠に結びつけ、公開版の取得フォールバックを追加しました。 |
| v1.1.8 | Separated title generation from analysis labels and removed misleading analysis-round wording. | タイトル生成を分析ラベルから分離し、誤解を招く分析ラウンド表記を修正しました。 |
| v1.1.7 | Added visible version labels in the app header and API settings panel. | アプリヘッダーとAPI設定パネルにバージョン表示を追加しました。 |
| v1.1.6 | Improved API-gate behavior, JSON parsing, and visible API-status privacy. | API未設定時の制御、JSON解析、API接続表示の秘匿性を改善しました。 |
| v1.1.5 | Added browser-side RSS retrieval for GitHub Pages and removed the static-preview limitation. | GitHub Pages版のブラウザ側RSS取得を追加し、静的プレビュー扱いを解消しました。 |
| v1.1.4 | Reduced fixed-rotation drift and tied alternate plans to specific evidence anchors. | 固定ローテーションへの戻りを減らし、別案を個別根拠に結びつけました。 |
| Internal preview | Built the initial app, project-path asset support, export formats, evidence cards, charts, and no-fake-search policy before the public v1.x line. | 公開v1.x以前の内部プレビューとして、初期アプリ、project path対応、出力形式、根拠カード、チャート、架空検索禁止方針を整備しました。 |

---

## Repository Info / リポジトリ情報

| Item | English | 日本語 |
|---|---|---|
| App name | Monogatari Buzz Maker | 物語バズメーカー |
| Package | `monogatari-buzz-maker` | `monogatari-buzz-maker` |
| Version | `1.2.5` | `1.2.5` |
| Repository | [FURUYAN1234/viral-radar](https://github.com/FURUYAN1234/viral-radar) | [FURUYAN1234/viral-radar](https://github.com/FURUYAN1234/viral-radar) |
| Public URL | [https://furuyan1234.github.io/viral-radar/](https://furuyan1234.github.io/viral-radar/) | [https://furuyan1234.github.io/viral-radar/](https://furuyan1234.github.io/viral-radar/) |
| Local port | `5180` | `5180` |
| Source code license | `UNLICENSED` | `UNLICENSED` |
| Generated text license | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ja) | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ja) |

- English: Developed by FURU.
- 日本語: 開発者: FURU。
