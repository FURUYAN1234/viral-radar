import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const checkMode = process.argv.includes('--check');
const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, '..');
const workspaceRoot = resolve(appRoot, '..');
const storyMakerRoot = resolve(workspaceRoot, 'story-maker');
const snapshotPath = resolve(appRoot, 'src/lib/storyMakerRoutineSnapshot.js');

const sourcePaths = [
  resolve(storyMakerRoot, 'package.json'),
  resolve(storyMakerRoot, 'src/modeContracts.js'),
  resolve(storyMakerRoot, 'src/editorialEvaluationHelpers.js'),
  resolve(storyMakerRoot, 'src/outputModeContracts.js'),
  resolve(storyMakerRoot, 'src/styleGuides.js'),
  resolve(storyMakerRoot, 'src/standardThoughtScores.js'),
];

const methodCandidates = [
  'Setup-Payoff',
  'Emotion Gap Design',
  'Motif Recurrence',
  '15-beat Emotion Curve',
  'GMC+S',
  "Show Don't Tell",
  'Subtext',
  'sensory balance',
  'world-grounded metaphor',
  'Character Knowledge Boundary',
];

const categoryDefaults = {
  storyManga: [
    '漫画では、冒頭ページで異常な事実を絵として見せ、説明より先に主人公の困りごとを置く。',
    '各話に小さな未解決を残し、次話で回収する伏線とモチーフを必ず1つ仕込む。',
    '台詞で説明しすぎず、表情、沈黙、持ち物、ページめくりの前後差で感情を読ませる。',
  ],
  shortVideo: [
    '短尺では、冒頭1秒に損失感か違和感を置き、途中は手順や発見を視線移動だけで追える形にする。',
    '最後は共感だけで終えず、保存したくなる実用理由、問い、再視聴ポイントのどれかを残す。',
    '字幕は説明文ではなく、画面上の行動とズレる短い言葉で期待差を作る。',
  ],
  trendExplainer: [
    '解説では、実在トレンド名を根拠として扱い、物語化するときは架空制度・架空UI・架空場面へ変換する。',
    '視聴者が使える制作判断に落とすため、流行の紹介、構造分解、創作への応用、注意点を分ける。',
    '告発や断定に寄せず、なぜ人が見続けるのかという視聴行動の仕組みを説明する。',
  ],
  longNovel: [
    '長編では、第1章の個人的な痛みを章ごとに制度、他者、過去の約束へ広げる。',
    '主人公の欲望、誤解、障害、代償、関係変化を章ごとに更新し、同じ悩みの反復で停滞させない。',
    '結末は説明や希望だけで閉じず、行動、物、対話、未払いの代償のどれかを残す。',
  ],
};

const categoryModeMap = {
  storyManga: ['manga'],
  shortVideo: ['scenario'],
  trendExplainer: ['documentary'],
  longNovel: ['novel', 'medium'],
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  assertStoryMakerSources();

  const snapshot = await buildSnapshot();
  const output = formatSnapshot(snapshot);

  if (checkMode) {
    const current = existsSync(snapshotPath) ? readFileSync(snapshotPath, 'utf8') : '';
    if (normalizeNewlines(current) !== normalizeNewlines(output)) {
      console.error(
        'Story Maker思考ルーチンの同期差分があります。npm run sync:story-maker を実行してから再確認してください。',
      );
      process.exit(1);
    }
    console.log('Story Maker思考ルーチンの同期状態は最新です。');
    return;
  }

  writeFileSync(snapshotPath, output, 'utf8');
  console.log(`Story Maker思考ルーチンを同期しました: ${relative(appRoot, snapshotPath)}`);
}

async function buildSnapshot() {
  const packageJson = JSON.parse(readFileSync(sourcePaths[0], 'utf8'));
  const modeContracts = await import(pathToFileURL(sourcePaths[1]).href);
  const editorialText = readFileSync(sourcePaths[2], 'utf8');
  const sourceFiles = sourcePaths.map(sourceInfo);
  const methodStack = methodCandidates.filter((method) => editorialText.includes(method));
  const syncedAt = checkMode ? readExistingSyncedAt() : new Date().toISOString();

  const categoryGuideSeeds = Object.fromEntries(
    Object.entries(categoryModeMap).map(([key, modes]) => [
      key,
      buildCategoryGuideSeed(key, modes, modeContracts),
    ]),
  );

  return {
    sourceApp: 'story-maker',
    sourceVersion: String(packageJson.version),
    syncedAt,
    sourceFingerprint: hashText(sourceFiles.map((file) => `${file.path}:${file.sha256}`).join('\n')),
    sourceFiles,
    qualityMarker: modeContracts.QUALITY_MARKER,
    methodStack,
    antiPatterns: [
      '電子機器、AI、アプリ、監視、ガジェットへ安易に逃げず、入力された設定や生活場面から新しさを作る。',
      '全員が賢く優しく説明し合うだけの着地を避け、言い間違い、沈黙、未払いの代償、手触りのある行動を残す。',
      '抽象語だけで解決せず、人物が何を知っていて何を知らないかの境界を守る。',
      '実在の企業、作品、人物、サービスを物語の主役、黒幕、告発対象、続編対象にしない。',
    ],
    categoryGuideSeeds,
    evaluationRubric: [
      '事実と論理',
      '感情曲線',
      '人間的ノイズ',
      '指定遵守',
      '商業読後感',
      '物語メソッド適用',
      'カテゴリ文体ガイド遵守',
      '偏り抑制',
    ],
    updateWorkflow:
      'viral-radarを更新するときは npm run check:story-maker を実行し、差分が出たら npm run sync:story-maker でこのスナップショットを更新する。',
  };
}

function buildCategoryGuideSeed(key, modes, modeContracts) {
  const contracts = modes.map((mode) => modeContracts.buildQualityContract(mode));
  const extracted = unique(
    contracts.flatMap((contract) =>
      extractUsefulLines(contract, [
        /人物|語り手|主人公|会話|台詞/,
        /感情|欲望|障害|選択|代償|結末/,
        /具体|物理|音|沈黙|比喩|舞台/,
        /固有名詞|実在|企業|作品|AI/,
      ]),
    ),
  );
  const lengthTargets = Object.fromEntries(
    modes.map((mode) => [mode, modeContracts.MODE_LENGTH_TARGETS?.[mode] ?? null]),
  );

  return {
    label: categoryLabel(key),
    modes,
    lengthTargets,
    rules: unique([...(categoryDefaults[key] ?? []), ...extracted]).slice(0, 8),
  };
}

function extractUsefulLines(contract, patterns) {
  return String(contract)
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-\s・]+/, '').trim())
    .filter((line) => line.length >= 18 && line.length <= 180)
    .filter((line) => patterns.some((pattern) => pattern.test(line)));
}

function sourceInfo(filePath) {
  const content = readFileSync(filePath, 'utf8');
  return {
    path: relative(workspaceRoot, filePath).replaceAll('\\', '/'),
    bytes: Buffer.byteLength(content, 'utf8'),
    sha256: hashText(content),
  };
}

function hashText(value) {
  return createHash('sha256').update(value).digest('hex');
}

function readExistingSyncedAt() {
  if (!existsSync(snapshotPath)) return new Date().toISOString();
  const match = readFileSync(snapshotPath, 'utf8').match(/"syncedAt":\s*"([^"]+)"/);
  return match?.[1] ?? new Date().toISOString();
}

function formatSnapshot(snapshot) {
  return `// Generated by scripts/sync-story-maker-routines.mjs.\n// Run npm run sync:story-maker after Story Maker creative-routine updates.\n\nexport const STORY_MAKER_ROUTINE_SNAPSHOT = ${JSON.stringify(snapshot, null, 2)};\n`;
}

function assertStoryMakerSources() {
  for (const filePath of sourcePaths) {
    if (!existsSync(filePath)) {
      throw new Error(`Story Maker source not found: ${filePath}`);
    }
  }
}

function categoryLabel(key) {
  return {
    storyManga: 'ストーリー漫画',
    shortVideo: 'ショート動画',
    trendExplainer: 'トレンド解説動画',
    longNovel: '小説',
  }[key] ?? key;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeNewlines(value) {
  return value.replace(/\r\n/g, '\n');
}
