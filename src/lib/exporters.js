const SECRET_PATTERNS = [/sk-proj-[A-Za-z0-9_-]+/g, /AIza[0-9A-Za-z_-]+/g];

export function toMarkdown(report) {
  const cluster = report.trendClusters?.[0] ?? {};
  const markdown = [
    '# 物語バズメーカー 取得根拠と制作案レポート',
    '',
    `カテゴリ: ${report.category?.label ?? '未設定'}`,
    `対象: ${report.locale ?? '未設定'}`,
    `分析期間: ${report.timeWindow ?? '未設定'}`,
    `作成日時: ${report.generatedAt ?? '未設定'}`,
    '',
    '## 取得状況',
    '',
    `- 勢い: ${cluster.momentumScore ?? 0}`,
    `- 飽和リスク: ${cluster.saturationScore ?? 0}`,
    `- 新しさ: ${cluster.noveltyScore ?? 0}`,
    `- 確度: ${cluster.confidenceScore ?? 0}`,
    '',
    '## 取得データの読み取り',
    '',
    ...report.evidenceCards.flatMap((card) => [
      `- ${card.claim}`,
      `  - 出典: ${card.source}`,
      `  - 指標: ${card.metricsSummary}`,
      `  - 観測: ${card.observation}`,
      `  - AI読み取り: ${card.meaningForCreator}`,
      `  - AI企画判断: ${card.creativeUse}`,
      `  - 注意: ${card.limitations || '特記事項なし'}`,
    ]),
    '',
    '## AI分析サマリー',
    '',
    `- カテゴリ洞察: ${report.deepAnalysis?.categoryInsight ?? ''}`,
    `- 欲求: ${(report.deepAnalysis?.humanMotivation ?? []).join(' / ')}`,
    `- 物語化の仕組み: ${(report.deepAnalysis?.narrativeMechanism ?? []).join(' / ')}`,
    '',
    ...(report.beginnerGuide
      ? [
          '## 制作メモ',
          '',
          `### ${report.beginnerGuide.headline}`,
          '',
          report.beginnerGuide.promise,
          '',
          `初稿の出発点: ${report.beginnerGuide.firstOutput}`,
          '',
          ...report.beginnerGuide.steps.flatMap((step, index) => [
            `${index + 1}. ${step.label}`,
            `   - 作業: ${step.action}`,
            `   - 出力: ${step.output}`,
          ]),
          '',
          '### 書く前の確認',
          '',
          ...report.beginnerGuide.checklist.map((item) => `- ${item}`),
          '',
          '### 外すと弱くなる点',
          '',
          ...report.beginnerGuide.avoid.map((item) => `- ${item}`),
          '',
        ]
      : []),
    '## 媒体別の制作判断',
    '',
    ...(report.categoryFitCards.length
      ? report.categoryFitCards.flatMap((card) => [
          `### ${card.title}`,
          '',
          card.whyThisMedium,
          '',
          `制作でやること: ${card.creatorMove}`,
          `例: ${card.example}`,
          `根拠: ${card.evidenceAnchor}`,
          '',
        ])
      : ['- 未生成', '']),
    '',
    '## 追加確認項目',
    '',
    ...(report.categoryReasons.length
      ? report.categoryReasons.flatMap((reason) => [
          `### ${reason.title}`,
          '',
          reason.detail,
          '',
          `例: ${reason.example}`,
          '',
        ])
      : ['- 未生成', '']),
    '',
    '## 外部根拠と固有名詞の扱い',
    '',
    '固有名詞は取得根拠としてのみ扱います。本文・台本では、実在の人物や作品を主役、黒幕、告発対象、続編対象にしません。必要な場合はAI生成時に架空名へ置き換えます。',
    '',
    ...[...new Set(report.creativePlans.flatMap((plan) => plan.properNounUsage ?? []))].map(
      (item) => `- ${item}`,
    ),
    '',
    '## 制作案',
    '',
    ...report.creativePlans.flatMap((plan, index) => [
      `### 案${index + 1}: ${plan.titleCandidates[0]}`,
      '',
      `形式: ${plan.formatLabel}`,
      `読者への約束: ${plan.audiencePromise}`,
      '',
      '#### 案の要点',
      `- 主人公: ${plan.creatorBrief.protagonist}`,
      `- 舞台: ${plan.creatorBrief.setting}`,
      `- 最初の事件: ${plan.creatorBrief.incitingIncident}`,
      `- 対立: ${plan.creatorBrief.conflict}`,
      `- 最後に選ばせること: ${plan.creatorBrief.choice}`,
      `- 読後感: ${plan.creatorBrief.payoff}`,
      '',
      '#### 物語・台本設計',
      ...designNotesForMarkdown(plan.storyArchitecture?.notes, '未生成'),
      '',
      '#### プロ向け設計メモ',
      ...designNotesForMarkdown(plan.craftNotes, '未生成'),
      '',
      '#### 取得根拠',
      ...plan.reasonToWin.map((item) => `- ${item}`),
      '',
      '#### 初回具体例',
      plan.exampleDetail,
      '',
      '#### 作品本文の核',
      plan.premise,
      '',
      '#### 本文・台本の流れ',
      ...plan.outline.map((item, outlineIndex) => `${outlineIndex + 1}. ${item}`),
      '',
      '#### 安全・類似回避',
      ...plan.sourceSimilarityFlags.map((flag) => `- ${flag.note}`),
      '',
      '#### 本文生成用プロンプト',
      '```text',
      plan.aiDraftPrompt,
      '```',
      '',
    ]),
    '## 前提と制約',
    ...report.limitations.map((item) => `- ${item}`),
    '',
  ].join('\n');

  return scrubSecrets(markdown);
}

function designNotesForMarkdown(notes, emptyMessage) {
  if (Array.isArray(notes) && notes.length > 0) {
    return notes.map((note) => `- ${note.label}: ${note.detail}`);
  }
  return [`- ${emptyMessage}`];
}

export function toJson(report) {
  return scrubSecrets(JSON.stringify(report, null, 2));
}

export function fromJson(jsonText) {
  const parsed = JSON.parse(scrubSecrets(String(jsonText ?? '')));
  validateReportShape(parsed);
  return parsed;
}

function validateReportShape(report) {
  if (!report || typeof report !== 'object') {
    throw new Error('物語バズメーカーのレポートJSONではありません。');
  }
  if (!report.category?.id || !report.category?.label) {
    throw new Error('カテゴリ情報がないため読み込めません。');
  }
  for (const key of [
    'trendClusters',
    'evidenceCards',
    'categoryFitCards',
    'categoryReasons',
    'creativePlans',
    'limitations',
  ]) {
    if (!Array.isArray(report[key])) {
      throw new Error(`${key} がないため読み込めません。`);
    }
  }
}

function scrubSecrets(value) {
  return SECRET_PATTERNS.reduce((result, pattern) => result.replace(pattern, '[redacted-key]'), value);
}
