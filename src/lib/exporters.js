const SECRET_PATTERNS = [/sk-proj-[A-Za-z0-9_-]+/g, /AIza[0-9A-Za-z_-]+/g];

export function toMarkdown(report) {
  const cluster = report.trendClusters?.[0] ?? {};
  const markdown = [
    '# 物語バズメーカー企画レポート',
    '',
    `カテゴリ: ${report.category?.label ?? '未設定'}`,
    `対象: ${report.locale ?? '未設定'}`,
    `分析期間: ${report.timeWindow ?? '未設定'}`,
    `作成日時: ${report.generatedAt ?? '未設定'}`,
    '',
    '## 判断スコア',
    '',
    `- 勢い: ${cluster.momentumScore ?? 0}`,
    `- 飽和リスク: ${cluster.saturationScore ?? 0}`,
    `- 新しさ: ${cluster.noveltyScore ?? 0}`,
    `- 確度: ${cluster.confidenceScore ?? 0}`,
    '',
    '## 根拠シグナル',
    '',
    ...report.evidenceCards.flatMap((card) => [
      `- ${card.claim}`,
      `  - 出典: ${card.source}`,
      `  - 指標: ${card.metricsSummary}`,
      `  - 観測: ${card.observation}`,
      `  - 読み取り: ${card.meaningForCreator}`,
      `  - 企画への使い方: ${card.creativeUse}`,
      `  - 注意: ${card.limitations || '特記事項なし'}`,
    ]),
    '',
    '## 詳細分析',
    '',
    `- カテゴリ洞察: ${report.deepAnalysis?.categoryInsight ?? ''}`,
    `- 欲求: ${(report.deepAnalysis?.humanMotivation ?? []).join(' / ')}`,
    `- 物語化の仕組み: ${(report.deepAnalysis?.narrativeMechanism ?? []).join(' / ')}`,
    '',
    ...(report.beginnerGuide
      ? [
          '## 制作ロードマップ',
          '',
          `### ${report.beginnerGuide.headline}`,
          '',
          report.beginnerGuide.promise,
          '',
          `最初に作るもの: ${report.beginnerGuide.firstOutput}`,
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
    '## 媒体別の勝ち筋',
    '',
    ...report.categoryFitCards.flatMap((card) => [
      `### ${card.title}`,
      '',
      card.whyThisMedium,
      '',
      `制作でやること: ${card.creatorMove}`,
      `例: ${card.example}`,
      `根拠: ${card.evidenceAnchor}`,
      '',
    ]),
    '',
    '## 狙える理由',
    '',
    ...report.categoryReasons.flatMap((reason) => [
      `### ${reason.title}`,
      '',
      reason.detail,
      '',
      `例: ${reason.example}`,
      '',
    ]),
    '',
    '## 外部根拠と固有名詞の扱い',
    '',
    '固有名詞は市場・配信形式・共有文脈の根拠として扱います。漫画や小説の本文では、架空UI・架空制度・架空組織へ置き換えて、実在の人物や作品を主役、黒幕、告発対象にしません。',
    '',
    ...[...new Set(report.creativePlans.flatMap((plan) => plan.properNounUsage ?? []))].map(
      (item) => `- ${item}`,
    ),
    '',
    '## そのまま企画に使える案',
    '',
    ...report.creativePlans.flatMap((plan, index) => [
      `### 案${index + 1}: ${plan.titleCandidates[0]}`,
      '',
      `形式: ${plan.formatLabel}`,
      `読者への約束: ${plan.audiencePromise}`,
      '',
      '#### 創作ブリーフ',
      `- 主人公: ${plan.creatorBrief.protagonist}`,
      `- 舞台: ${plan.creatorBrief.setting}`,
      `- 最初の事件: ${plan.creatorBrief.incitingIncident}`,
      `- 対立: ${plan.creatorBrief.conflict}`,
      `- 最後に選ばせること: ${plan.creatorBrief.choice}`,
      `- 読後感: ${plan.creatorBrief.payoff}`,
      '',
      '#### 物語・台本設計',
      ...designNotesForMarkdown(plan.storyArchitecture?.notes, 'API応答がまだないため未生成です。ローカル定型文では埋めません。'),
      '',
      '#### プロ向け設計メモ',
      ...designNotesForMarkdown(plan.craftNotes, 'API応答がまだないため未生成です。ローカル定型文では埋めません。'),
      '',
      '#### ウケそうな理由',
      ...plan.reasonToWin.map((item) => `- ${item}`),
      '',
      '#### 具体例',
      plan.exampleDetail,
      '',
      '#### 物語・動画の核',
      plan.premise,
      '',
      '#### 構成',
      ...plan.outline.map((item, outlineIndex) => `${outlineIndex + 1}. ${item}`),
      '',
      '#### 安全・類似回避',
      ...plan.sourceSimilarityFlags.map((flag) => `- ${flag.note}`),
      '',
      '#### 他AIに貼る本文生成プロンプト',
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
