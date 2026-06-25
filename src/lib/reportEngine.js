import { CATEGORIES, getCategoryById } from './categories.js';
import { scoreCluster } from './scoring.js';
import { STORY_MAKER_ROUTINE_SNAPSHOT } from './storyMakerRoutineSnapshot.js';

const CATEGORY_CLUSTER_MAP = {
  'story-manga': {
    label: '生活不安を可視化する逆転劇',
    tags: ['漫画', 'Web漫画', 'コミック', '読者反応', 'ページ上の異常表示', '生活不安', '評価不安'],
  },
  'short-video': {
    label: '1秒で不便を見せる生活改善ショート',
    tags: ['ショート動画', '短尺動画', '縦動画', '冒頭1秒', '字幕', '保存したい', 'コメント'],
  },
  'trend-explainer': {
    label: '短尺ドラマと推薦システムの視聴習慣',
    tags: ['解説', 'トレンド', '視聴習慣', '推薦システム', '短尺動画', '炎上回避'],
  },
  'long-novel': {
    label: '不可視の評価制度を読み解く長編連載',
    tags: ['Web小説', '小説', '読者維持', '長編', '伏線', '章末', '評価制度'],
  },
};

function selectObservationsForCategory(categoryId, observations) {
  const cluster = CATEGORY_CLUSTER_MAP[categoryId];
  if (!cluster) return observations.slice(0, 4);
  const strictMatches = observations.filter((observation) => observationBelongsToCategory(observation, categoryId));
  const matches =
    strictMatches.length >= 2
      ? strictMatches
      : observations.filter((observation) => observation.tags.some((tag) => cluster.tags.includes(tag)));
  return (matches.length > 0 ? matches : observations).slice(0, 5);
}

function observationBelongsToCategory(observation, categoryId) {
  if (observation.categoryId === categoryId) return true;
  const text = `${observation.title ?? ''} ${observation.snippet ?? ''} ${observation.query ?? ''} ${observation.queryUsed ?? ''} ${(observation.tags ?? []).join(' ')}`;
  const categoryPatterns = {
    'story-manga': /漫画|マンガ|コミック|縦読み|読み切り|連載第1話|Web漫画/,
    'short-video': /ショート動画|短尺動画|縦動画|TikTok|YouTube Shorts|冒頭1秒|字幕|保存/,
    'trend-explainer': /解説|視聴習慣|推薦システム|アルゴリズム|炎上回避|ショートドラマ/,
    'long-novel': /Web小説|小説|ライトノベル|なろう|読者維持|伏線|長編/,
  };
  return categoryPatterns[categoryId]?.test(text) ?? false;
}

function buildCluster(categoryId, observations) {
  const base = CATEGORY_CLUSTER_MAP[categoryId] ?? {
    label: '創作トレンド',
    tags: ['創作'],
  };
  const rawTags = [...new Set(observations.flatMap((item) => item.tags))].slice(0, 8);
  const topTags = displayTopTagsForCategory(categoryId, rawTags);
  const cluster = {
    id: `${categoryId}-cluster-1`,
    label: base.label,
    categoryId,
    evidenceCount: observations.length,
    sourceCount: new Set(observations.map((item) => item.source)).size,
    topQueries: observations.map((item) => item.queryUsed).slice(0, 4),
    topTags,
    creatorSignals: buildCreatorSignals(categoryId),
    sourceSignals: buildSourceSignals(observations, rawTags, categoryId),
    tags: base.tags,
    observations,
    risks: [
      '実在の企業や作品を創作の主役にせず、構造だけを抽象化する必要があります。',
      '公開RSS/検索フィードの取得結果は、制作前に人間が出典と時刻を確認してください。',
    ],
  };
  return {
    ...cluster,
    ...scoreCluster(cluster),
  };
}

function displayTopTagsForCategory(categoryId, rawTags) {
  const displayTags = {
    'story-manga': ['生活不安', '評価不安', '見えない仕組み', 'ページ上の異常表示', '小さな救済'],
    'long-novel': ['評価制度', '章ごとの謎', '長期アーク', '伏線', '救済'],
    'short-video': ['冒頭1秒', '字幕', '保存理由', 'コメント誘発', 'BeforeAfter'],
  };
  return displayTags[categoryId] ?? rawTags;
}

function buildCreatorSignals(categoryId) {
  const signals = {
    'story-manga': [
      {
        label: '冒頭で損失を見せる',
        detail: '通知、レシート、検索候補、点数欄など、読者が1コマで理解できる小道具に不安を置く。',
      },
      {
        label: '見えない仕組みを読む',
        detail: '個人の悪意ではなく、評価欄、共有メモ、審査表などの仕組みが人を追い詰める構造にする。',
      },
      {
        label: '小さな救済で終える',
        detail: '復讐ではなく、読者が自分の生活に持ち帰れる一言、手順、視点の回復で読後感を作る。',
      },
    ],
    'short-video': [
      {
        label: '0秒目に変化後を置く',
        detail: '結論の画を先に見せ、途中で原因と手順を回収すると離脱されにくい。',
      },
      {
        label: '保存理由を一文にする',
        detail: '最後に「明日使う場面」が残るよう、生活の小ワザや判断基準を短く置く。',
      },
      {
        label: 'コメントで次案を作る',
        detail: '二択、失敗例募集、別パターン希望など、視聴者の反応が次の台本になる余地を残す。',
      },
    ],
    'trend-explainer': [
      {
        label: '現象を先に見せる',
        detail: 'バズった事実ではなく、視聴者がなぜ見続けたかを先に提示する。',
      },
      {
        label: '制作手順へ翻訳する',
        detail: '根拠を「冒頭」「保存理由」「コメント誘発」「炎上回避」の実務項目に落とす。',
      },
      {
        label: '固有名詞は根拠に留める',
        detail: '作品化では架空の制度や画面へ置き換え、実在対象への断定や攻撃にしない。',
      },
    ],
    'long-novel': [
      {
        label: '長く残る痛みに変換する',
        detail: '短尺の不安を、誤解、未返信、評価ログ、返せなかった言葉など章をまたぐ傷にする。',
      },
      {
        label: '章ごとに謎を増やす',
        detail: '各章末に新しい証拠や別人物の痛みを置き、読者が次章を読む理由を作る。',
      },
      {
        label: '救済を急がない',
        detail: 'すぐ逆転させず、主人公の誤解が少しずつほどける過程で中長編の厚みを出す。',
      },
    ],
  };

  return signals[categoryId] ?? signals['story-manga'];
}

function buildSourceSignals(observations, topTags, categoryId) {
  if (!observations.length) return [];
  if (categoryId === 'story-manga') {
    return [
      { label: '公開Web/RSS取得', detail: '取得した記事・急上昇語・ホットエントリーを、漫画の冒頭場面へ変換する根拠。' },
      { label: '読者反応の周辺文脈', detail: '単独タイトルではなく、複数ソースで近い不安や関心が出ているかを見る根拠。' },
      { label: '企画化できる具体語', detail: 'タイトルや説明文から、小道具、舞台、最初の事件に落とせる語を拾う根拠。' },
    ];
  }
  if (categoryId === 'long-novel') {
    return [
      { label: '公開Web/RSS取得', detail: '取得した話題を、長期的な謎、伏線、章ごとの発見へ広げる根拠。' },
      { label: '読者維持の周辺文脈', detail: '一時的な話題ではなく、章をまたいで扱える痛みや問いがあるかを見る根拠。' },
      { label: '世界観化できる具体語', detail: '取得タイトルや説明文から、架空制度、町、記録文書へ変換できる語を拾う根拠。' },
    ];
  }
  const sourceNames = observations.map((observation) => normalizeSourceName(observation.source));
  const sourceTags = topTags.filter(isSourceTag).map(normalizeSourceName);
  return unique([...sourceNames, ...sourceTags])
    .slice(0, 6)
    .map((label) => ({
      label,
      detail: sourceSignalDetail(label),
    }));
}

function normalizeSourceName(value = '') {
  if (value.includes('Google Trends')) return 'Google Trends RSS';
  if (value.includes('Google News')) return 'Google News RSS';
  if (value.includes('はてな')) return value;
  if (value.includes('TikTok')) return 'TikTok';
  if (value.includes('YouTube')) return 'YouTube';
  if (value.includes('LINE')) return 'LINE';
  if (value.includes('Netflix')) return 'Netflix';
  if (value.includes('検索API')) return '検索API';
  return value.trim();
}

function isSourceTag(tag) {
  return /TikTok|YouTube|Google Trends|LINE|Netflix|検索API/.test(tag);
}

function sourceSignalDetail(label) {
  if (label.includes('Google News')) return '公開ニュース検索に出ている周辺話題を確認する根拠。';
  if (label.includes('Google Trends')) return '日次急上昇語として浮上している関心を見る根拠。';
  if (label.includes('はてな')) return '国内Webで共有・議論されている話題を見る根拠。';
  if (label.includes('TikTok')) return '短尺の冒頭フックと反応速度を見る根拠。';
  if (label.includes('YouTube')) return '保存、視聴維持、実用ネタの伸びを見る根拠。';
  if (label.includes('LINE')) return '共有、保存、生活ノウハウ化のしやすさを見る根拠。';
  if (label.includes('Netflix')) return '短尺と長尺の視聴習慣差を見る根拠。';
  return '検索結果や横断観測から補助的に読む根拠。';
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildEvidenceCards(cluster) {
  return cluster.observations.map((observation) => ({
    claim: evidenceClaimForCategory(observation, cluster.categoryId),
    sourceUrls: [observation.sourceUrl],
    source: evidenceSourceForCategory(observation, cluster.categoryId),
    metricsSummary: summarizeMetrics(observation.metrics),
    timeWindow: observation.observedAt,
    whyItMatters: evidenceMeaningForCategory(observation, cluster.categoryId),
    ...interpretObservation(observation, cluster.categoryId),
    limitations: observation.sourceType === 'public-web-rss' ? '公開RSS/検索フィード由来です。制作前にリンク先を確認してください。' : '',
  }));
}

function evidenceClaimForCategory(observation, categoryId) {
  if (categoryId === 'story-manga' || categoryId === 'long-novel') {
    if (observation.tags.includes('ショートドラマ') || observation.tags.includes('冒頭1秒')) {
      return categoryId === 'story-manga'
        ? '生活不安を冒頭で見せる反応シグナル'
        : '生活不安を物語の発端にする反応シグナル';
    }
    if (observation.tags.includes('AI') && observation.tags.includes('評価')) {
      return categoryId === 'story-manga' ? '評価不安を可視化する題材シグナル' : '評価制度を長期謎にする題材シグナル';
    }
    if (observation.tags.includes('LINE') || observation.tags.includes('保存したい')) {
      return categoryId === 'story-manga' ? '保存・共有される小さな救済シグナル' : '章末の救済に広げやすい生活シグナル';
    }
  }
  return observation.title;
}

function evidenceSourceForCategory(observation, categoryId) {
  return normalizeSourceName(observation.source);
}

function evidenceMeaningForCategory(observation, categoryId) {
  if (categoryId === 'story-manga') {
    return '取得した話題を、1ページ目で見える小道具、主人公の欠落、最後の一コマの救済へ変換して使います。';
  }
  if (categoryId === 'long-novel') {
    return '取得した話題を、章をまたいで残る疑問、評価制度の謎、主人公が救う対象の連鎖へ変換して使います。';
  }
  return observation.snippet;
}

function interpretObservation(observation, categoryId) {
  const insight = classifyObservationInsight(observation);
  const topic = topicExcerpt(observation);
  const craft = craftForInsight(categoryId, insight.type);
  return {
    observation: summarizeObservationForDisplay(observation, insight),
    meaningForCreator: `「${topic}」を${insight.material}として読む。${craft.read}`,
    creativeUse: craft.use,
  };
}

// 取得タイトルから、出典サフィックスや記号を落とした短い話題見出しを作る。
function topicExcerpt(observation) {
  let text = String(observation.title ?? observation.snippet ?? '').trim();
  text = text.replace(/\s*[-|｜–—]\s*[^-|｜–—]{1,24}$/u, ''); // 末尾の「 - 媒体名」を除去
  text = text.replace(/[【】「」『』（）()[\]"”“]/g, '').replace(/\s+/g, ' ').trim();
  if (text.length > 28) text = `${text.slice(0, 28)}…`;
  return text || '世の中で動いた感情';
}

// 媒体（カテゴリ）× 感情タイプごとに、読み取り(read)と企画への使い方(use)を完全に変える。
// これがこのアプリの核心: 同じ社会トレンドの素材を、漫画/動画/解説/小説で別の制作判断へ翻訳する。
function craftForInsight(categoryId, insightType) {
  const table = CRAFT_TABLE[categoryId] ?? CRAFT_TABLE['story-manga'];
  return table[insightType] ?? table.topic;
}

const CRAFT_TABLE = {
  'story-manga': {
    relation: { read: '関係のこじれは、既読・未返信・並んだ吹き出しなど1コマで見える形にすると、説明なしで主人公の孤立が伝わる。', use: '第1ページで関係の歪みを画面表示や小道具に置き換え、最後のコマで距離が縮む/壊れる瞬間を見せる。' },
    regret: { read: '後悔は、過去のコマと現在のコマの対比、消せない通知、戻れない分岐として描くと刺さる。', use: '冒頭で「戻れない選択」を1枚の絵にし、終盤で主人公が今できる小さな一手を選ぶ。' },
    unfairness: { read: '理不尽は、抗議できないまま流れる評価欄・張り紙・画面として見せ、最後の一コマで小さく反転させる。', use: '前半で言い返せない理不尽を画面表現で積み、ラストで読者がスッとする視点の逆転を置く。' },
    relatable: { read: 'あるあるは、読者が自分の生活で見た小道具（レシート・通知・家電）に置き換えると1ページ目で共感が立つ。', use: '冒頭1ページに「自分も見たことがある」小道具を置き、そこに小さな異常を1つ足す。' },
    evaluation: { read: '見えない評価は、架空の採点表・通知・検索候補として可視化すると、怒りでなく発見の漫画になる。', use: '主人公に「評価が見える」能力や小道具を与え、隠れた採点理由を1話ごとに暴く。' },
    saving: { read: '役立つ知は、各話の最後に読者が生活へ持ち帰れる一言・手順として置くと保存・共有されやすい。', use: 'ラストのコマに「明日試せる一手」を1つだけ残し、説教でなく主人公の行動で見せる。' },
    life: { read: '生きづらさは、家賃・残高・シフト表など生活の数字が見える小道具に落とすと一目で伝わる。', use: '第1ページに生活の数字を小道具で見せ、その重さを主人公の選択で動かす。' },
    continuity: { read: '長く続く問いは、章をまたぐ謎として1話目の隅に仕込むと連載の引きになる。', use: '初回の背景に回収前提の違和感を1つ置き、各話末で別の証拠を足していく。' },
    system: { read: '見えない仕組みは、黒幕ではなく書類や画面の矛盾として読者に発見させると安全に現代性を出せる。', use: '架空制度の画面・書類の矛盾を主人公に見つけさせ、実名を出さず構造を描く。' },
    topic: { read: '感情が動いた話題は、主人公が最初に気づく架空の表示・小道具に変換すると漫画の入口になる。', use: '話題を架空UIや小道具へ置き換え、1話の発見として最後のコマで意味を反転させる。' },
  },
  'short-video': {
    relation: { read: '関係のすれ違いは、冒頭1秒の気まずい一場面＋短い字幕で再現すると、コメントで共感が集まる。', use: '0秒目に気まずい瞬間の画、中央に本音の字幕、最後に「あなたならどうする？」でコメント誘導。' },
    regret: { read: '後悔は「もっと早く知りたかった」の一手として見せると、保存される動画になる。', use: '冒頭に失敗の結果、途中で原因、最後に今すぐできる対策を1行字幕で置く。' },
    unfairness: { read: '理不尽あるあるは再現ドラマ化し、最後に視聴者がスカッとする一言・対処で締めると伸びる。', use: '0秒で理不尽な場面を再現、ラストで言い返す/かわす一手を見せて保存・共有を促す。' },
    relatable: { read: 'あるあるは冒頭1秒の画で見せ、字幕で言語化すると「自分だ」と保存・共有される。', use: '0秒目に共感画、字幕で言語化、最後に「保存して明日やってみて」で締める。' },
    evaluation: { read: '比較や点数化のモヤモヤは、1画面のビフォーアフターと短い字幕にすると数秒で伝わる。', use: '左右比較の1画面＋数字字幕で見せ、最後に判断基準を1行残す。' },
    saving: { read: '時短・工夫は手元カットで見せ、最後に「明日使う場面」を1行にすると保存理由が明確になる。', use: '手元アップで手順を3カット、締めに保存理由の一文を大きい字幕で出す。' },
    life: { read: '生活の困りごとは0秒で映し、途中で原因、最後に真似できる解決を置くと最後まで見られる。', use: '冒頭に困りごとの画、3カットで理由、最後に真似できる一手で締める。' },
    continuity: { read: '続きが気になる問いは冒頭に置き、コメントで次回の題材を集めると連作になる。', use: '冒頭に問いを出し、結論を次回に回し、コメントの反応を次の台本にする。' },
    system: { read: '「なぜ伸びる/なぜ起きる」は3カットの比較＋締めのチェックリストにすると実用動画になる。', use: '現象を3カットで比較し、最後に保存できるチェックリスト字幕で締める。' },
    topic: { read: '感情が動いた話題は、冒頭1秒の画・理由字幕・保存理由の3点に分けて短尺化する。', use: '0秒で結論画、中央で理由字幕、最後で保存したくなる一手という3段にする。' },
  },
  'trend-explainer': {
    relation: { read: '関係のこじれが共感される理由は、視聴者心理として導入の問いにできる。', use: '「なぜこの人間関係の話は刺さるのか」を問いに立て、心理→構造→制作応用の順で解く。' },
    regret: { read: '後悔の話が伸びる仕組みは、感情の普遍性と共有動機に分けて説明できる。', use: '後悔が拡散する理由を心理と構造で示し、制作で使える型に翻訳する。' },
    unfairness: { read: '理不尽への共感が広がる仕組みは、感情の動きと拡散の構造の両面で説明できる。', use: '怒り・共感が拡散する流れを根拠つきで分解し、煽りでなく構造分析にする。' },
    relatable: { read: 'あるあるが共感される理由は、具体例→共通点→制作への応用の順で解ける。', use: '複数の実例から共通点を抽出し、視聴者心理と制作手順へ落とす。' },
    evaluation: { read: '評価やAIへの不安は、透明性・訂正可能性・責任の所在に分けると解説になる。', use: '不安の対象を3点に分けて整理し、特定企業の断定は避けて構造で語る。' },
    saving: { read: '共有される情報の条件は、相手への気遣いと自分の実用性に分けて説明できる。', use: '「なぜ送りたくなるか」を2軸で分解し、制作に使える保存・共有設計へ翻訳する。' },
    life: { read: '生きづらさが話題になる背景は、根拠を示しつつ断定を避けて分解できる。', use: '社会データや複数事例を根拠に提示し、視聴者心理と注意点まで述べる。' },
    continuity: { read: '長く議論される問いは、現象→根拠→残る論点の順で扱うと信頼を保てる。', use: '結論を急がず、現象・根拠・未解決の論点を分けて提示する。' },
    system: { read: '炎上・アルゴリズム・制度は、現象・根拠・制作への応用・注意の4章で構成できる。', use: '現象を入口に、根拠・視聴者心理・制作応用・注意点の4章で構成する。' },
    topic: { read: '話題は現象名でなく、視聴者心理と制作手順に分解すると解説動画になる。', use: '現象→なぜ見られたか→制作にどう使うか→注意点の順で分解する。' },
  },
  'long-novel': {
    relation: { read: '関係のこじれは、誤解と未返信が章をまたいで増える長期の痛みにできる。', use: '序盤の小さなすれ違いを、章ごとに別人物の視点で再解釈させ、終盤で和解か決別へ向かわせる。' },
    regret: { read: '後悔は、主人公の半生をかけてほどく中心テーマとして据えられる。', use: '冒頭で取り返しのつかない選択を置き、各章で過去を掘り下げ、終盤で意味を更新させる。' },
    unfairness: { read: '理不尽は架空制度の記録文書として描き、章ごとに別人物の痛みを重ねられる。', use: '理不尽を架空制度のログや手紙として読ませ、救う対象を章ごとに連鎖させる。' },
    relatable: { read: '共感されるあるあるは、序盤の入口にして徐々に深い人生の問いへ広げられる。', use: '誰もが分かる日常から入り、章を追うごとに価値観を揺さぶる問いへ深める。' },
    evaluation: { read: '評価制度は、ログ・説明書・記録として章ごとに読ませる謎にできる。', use: '評価の仕組みを断片的な記録で見せ、真相を長期アークで明かす。' },
    saving: { read: '救いになる知恵は、章末に「次に誰を救うのか」として連鎖させられる。', use: '各章末に救済対象を残し、主人公の行動が次の章の誰かにつながる構造にする。' },
    life: { read: '生きづらさは、世界の見方を更新していく章構成の軸にできる。', use: '主人公の認識が章ごとに変わる構成にし、生きづらさの正体を少しずつ見せる。' },
    continuity: { read: '長期の問いは、伏線として序盤に置き、終盤で再解釈させられる。', use: '初期に意味の分からない描写を仕込み、終盤で全く別の意味だったと回収する。' },
    system: { read: '社会の不条理は、社会批評でなく架空制度の真相として長期アーク化できる。', use: '現実批評を架空の町・制度へ移し、その真相を最終盤の山場にする。' },
    topic: { read: '感情が動いた話題は、第1章の痛み・章末の謎・終盤の救済へ分けて伸ばせる。', use: '話題を架空制度や町のルールに変換し、章ごとに別人物の痛みを回収する。' },
  },
};

function observationText(observation) {
  return `${observation.title ?? ''} ${observation.snippet ?? ''} ${(observation.tags ?? []).join(' ')}`;
}

function classifyObservationInsight(observation) {
  const text = observationText(observation);
  const matches = (words) => words.filter((word) => text.includes(word));
  const keywordGroups = [
    {
      type: 'relation',
      words: ['家族', '夫婦', '夫', '妻', '親', '母', '父', '娘', '息子', '子育て', '恋愛', '友人', '友達', '親友', '同僚', '上司', '職場', '人間関係', 'すれ違い', '未返信', '結婚', '離婚', '介護'],
      material: '近い相手との関係でこじれる本音',
    },
    {
      type: 'regret',
      words: ['後悔', '選択', 'あの時', 'やり直', '報われ', '間に合', '失っ', '遅すぎ', '気づけば'],
      material: '取り返しのつかない選択への後悔',
    },
    {
      type: 'unfairness',
      words: ['理不尽', 'モヤ', 'もや', '愚痴', '怒り', '我慢', '損', 'ずるい', '不公平', 'スカッと', '反論'],
      material: '言い返せなかった理不尽さ',
    },
    {
      type: 'relatable',
      words: ['あるある', '共感', '分かる', 'リアル', '思わず', 'やってしま',  '失敗', 'うっかり'],
      material: '多くの人が思わずうなずく日常のあるある',
    },
    {
      type: 'evaluation',
      words: ['評価', '査定', 'AI', '生成', '選考', 'ランキング', '点数', '比較', '勝ち組', '格差'],
      material: '見えない評価・点数・選考理由',
    },
    {
      type: 'saving',
      words: ['保存', '共有', 'ブックマーク', 'メモ', 'あとで', '便利', 'ノウハウ', '時短', '工夫', '裏ワザ', '節約'],
      material: 'あとで見返したくなる生活知',
    },
    {
      type: 'life',
      words: ['生活', '仕事', '転職', '家計', 'お金', '貧困', '不安', '悩み', '暮らし', '生き方', '価値観', '世代'],
      material: '日常で小さく積もる生きづらさ',
    },
    {
      type: 'continuity',
      words: ['章', '伏線', '長編', '継続', '読者維持', '連載', '回収', '人生', '半生', '長年'],
      material: '時間をかけて回収したくなる問い',
    },
    {
      type: 'system',
      words: ['仕組み', '推薦', '制度', 'アルゴリズム', '視聴習慣', '炎上', '構造', '議論', '賛否', '社会', '世の中'],
      material: '人の行動を左右する見えない仕組み',
    },
  ];
  const scored = keywordGroups
    .map((group) => ({ ...group, hits: matches(group.words) }))
    .sort((left, right) => right.hits.length - left.hits.length);
  const best = scored[0];
  if (best?.hits.length) return best;
  return {
    type: 'topic',
    words: [],
    material: '多くの人の感情が動いた話題',
    hits: [],
  };
}

function summarizeObservationForDisplay(observation, insight) {
  const title = String(observation.title ?? '').trim();
  const snippet = String(observation.snippet ?? '').trim();
  const base = snippet || title || '取得した公開Web/RSSの話題';
  const keyword = insight.hits?.[0] ?? insight.material;
  return `${base} ここでは「${keyword}」を、${insight.material}として読む。`;
}

function categoryInterpretationView(categoryId, insight) {
  const material = insight.material;
  const hit = insight.hits?.[0] ?? material;
  const byCategory = {
    'story-manga': {
      lossMeaning: '読者は説明より先に、1コマで分かる損失や違和感を見たい状態です。',
      evaluationMeaning: '評価や選考を、通知欄・採点表・検索候補として見せると、怒りではなく発見の漫画になります。',
      saveMeaning: '保存や共有の欲求は、各話の最後に読者が持ち帰れる一言や小さな手順へ変換できます。',
      beforeAfterMeaning: '変化前後の差は、ページ前半とラスト1コマの反転にすると読み切りでも伝わります。',
      explainerMeaning: '仕組みへの関心は、黒幕説明ではなく、画面や書類の矛盾を読者に発見させる材料になります。',
      meaningForCreator: `この話題は「${material}」として扱い、主人公が最初に見つける小道具や画面表示へ変換できます。`,
      creativeUse: `第1ページに「${hit}」を連想させる架空の通知・レシート・検索候補を置き、最後のコマで意味を反転させる。`,
    },
    'short-video': {
      lossMeaning: '視聴者は背景説明より、最初の画で困りごとが分かる映像を待っています。',
      evaluationMeaning: '点数化や判定不安は、1画面の失敗例と短い字幕にすると数秒で伝わります。',
      saveMeaning: '保存や共有の欲求は、最後に「明日使う場面」を見せることで行動に変わります。',
      beforeAfterMeaning: '変化の差は、完成後を先に置き、途中で理由を短く回収する構成に向きます。',
      explainerMeaning: '仕組みへの関心は、3カットの比較と締めのチェックリストにすると実用動画になります。',
      meaningForCreator: `この話題は「${material}」として扱い、冒頭画、字幕、保存理由の3点に分けて短尺化できます。`,
      creativeUse: `0秒目に「${hit}」を連想させる困りごとの画、中央に理由字幕、最後に保存したくなる一手を置く。`,
    },
    'trend-explainer': {
      lossMeaning: '損失感は、なぜ人が続きを見たくなるのかを説明する導入の問いになります。',
      evaluationMeaning: '評価やAIへの関心は、透明性、訂正可能性、責任の所在に分けると解説になります。',
      saveMeaning: '保存や共有は、相手に送る理由と自分が後で使う理由を分けて説明できます。',
      beforeAfterMeaning: 'Before/Afterは、理解速度を上げる構造として分解できます。',
      explainerMeaning: '視聴習慣や推薦への関心は、現象、根拠、制作への応用の順で説明できます。',
      meaningForCreator: `この話題は「${material}」として扱い、現象名ではなく視聴者心理と制作手順に分解できます。`,
      creativeUse: `「${hit}」を入口に、根拠、視聴者心理、制作への応用、注意点の4章で構成する。`,
    },
    'long-novel': {
      lossMeaning: '損失感は、序盤の事件だけでなく、章をまたいで増える誤解や未解決の痛みにできます。',
      evaluationMeaning: '評価や判定への不安は、架空制度のログ、説明書、記録文書として章ごとに読ませられます。',
      saveMeaning: '保存や共有の欲求は、章末に誰かを救う手がかりとして再登場させられます。',
      beforeAfterMeaning: '変化前後の差は、主人公が世界の見方を更新する章構成に向きます。',
      explainerMeaning: '仕組みへの関心は、社会批評ではなく、架空制度の謎として長期アーク化できます。',
      meaningForCreator: `この話題は「${material}」として扱い、第1章の痛み、章末の謎、終盤の救済へ分けて伸ばせます。`,
      creativeUse: `「${hit}」を架空制度の記録文書や町のルールに変換し、章ごとに別人物の痛みを回収する。`,
    },
  };
  return byCategory[categoryId] ?? byCategory['story-manga'];
}

function creativeUseByCategory(categoryId) {
  const uses = {
    'story-manga': {
      lossHook: '第1ページに「評価不能」「家賃更新」「却下理由」など、損失が一目でわかる画面を置く。',
      evaluationHook: '見えない評価欄、隠しメモ、検索候補などを可視化する能力に変換する。',
      saveHook: '読者が自分の生活にも置き換えられる小さな救済を、各話の結末に置く。',
      beforeAfterHook: '1話の前半で理不尽な状態、後半で構造の見え方が変わる反転を作る。',
      explainerHook: '物語内の架空制度を通じて、現実の視聴習慣や評価不安を安全に抽象化する。',
      defaultHook: '取得語を架空UI、小道具、人物の選択へ置き換え、1話の発見にする。',
    },
    'short-video': {
      lossHook: '0秒目に困りごとの映像、1秒目に損失字幕、最後に真似できる解決を置く。',
      evaluationHook: '点数化や通知疲れを、1画面のビフォーアフターとして見せる。',
      saveHook: '最後に「明日使う場面」を1行で出し、保存理由を明確にする。',
      beforeAfterHook: '完成後を先に見せ、途中で原因と手順を3カットだけ回収する。',
      explainerHook: '制作者向けの短いチェックリストとして、保存・コメント・冒頭設計に落とす。',
      defaultHook: '冒頭で不便、中央で理由、最後で保存理由という3段にする。',
    },
    'trend-explainer': {
      lossHook: '短尺ドラマの冒頭がなぜ損失感から入るのかを、視聴者心理として説明する。',
      evaluationHook: 'AI評価不安を、透明性・訂正可能性・責任の所在の3点で整理する。',
      saveHook: '共有される情報の条件を、相手への気遣いと実用性に分けて説明する。',
      beforeAfterHook: '伸びた表現を真似る話ではなく、Before/Afterが理解を速くする理由を説明する。',
      explainerHook: '固有名詞は市場例にとどめ、内部事情の断定を避けて構造分析にする。',
      defaultHook: '現象を「視聴者心理」「制作形式」「安全な応用」の順で分解する。',
    },
    'long-novel': {
      lossHook: '序盤に主人公だけの痛み、中盤に他者の痛み、終盤に制度の矛盾へ広げる。',
      evaluationHook: '却下理由、評価ログ、説明書など、章ごとに読める謎を置く。',
      saveHook: '各章末に「次に誰を救うのか」が残るよう、救済対象を連鎖させる。',
      beforeAfterHook: '主人公が世界を見る前後で、人間関係の解釈が変わる章構成にする。',
      explainerHook: '現実批評を架空制度へ変換し、長期連載の世界観として育てる。',
      defaultHook: '短期の復讐ではなく、読み解き、誤解、救済の長いアークにする。',
    },
  };

  return uses[categoryId] ?? uses['story-manga'];
}

function summarizeMetrics(metrics = {}) {
  const parts = [];
  if (metrics.views) parts.push(`再生 ${metrics.views.toLocaleString('ja-JP')}`);
  if (metrics.likes) parts.push(`高評価 ${metrics.likes.toLocaleString('ja-JP')}`);
  if (metrics.comments) parts.push(`コメント ${metrics.comments.toLocaleString('ja-JP')}`);
  if (metrics.shares) parts.push(`共有 ${metrics.shares.toLocaleString('ja-JP')}`);
  if (metrics.rank) parts.push(`取得順位 ${metrics.rank}`);
  if (metrics.recencyScore) parts.push(`新しさ指標 ${metrics.recencyScore}`);
  if (metrics.sourceWeight) parts.push(`取得元重み ${metrics.sourceWeight}`);
  if (metrics.coOccurrenceScore) parts.push(`共起 ${metrics.coOccurrenceScore}`);
  if (metrics.categoryMatchScore) parts.push(`検索角度一致 ${metrics.categoryMatchScore}`);
  if (metrics.hatenaHotEntryScore) parts.push(`はてな反応 ${metrics.hatenaHotEntryScore}`);
  if (metrics.sourceDiversity) parts.push(`取得元数 ${metrics.sourceDiversity}`);
  return parts.join(' / ') || '公開RSS取得';
}

function buildDeepAnalysis(categoryId, cluster, variantSeed = 0) {
  const analysis = {
    'story-manga': {
      surfacePattern: [
        '生活不安、評価不安、見えない仕組みを、ページ上の異常表示として見せる構造が強いです。',
        '読者が1コマで理解できる小道具に落とすと、説明より先に感情が立ち上がります。',
        '根拠名ではなく、通知、レシート、査定欄、吹き出し外の文字へ変換して使います。',
      ],
      humanMotivation: ['不安の言語化', '見えない理不尽を読みたい欲求', '自分にも起きそうな怖さ', '小さな救済を見たい気持ち'],
      narrativeMechanism: ['1ページ目の異常表示', '隠れた仕組みの発見', 'コマ上の反転', '次話へ残す小さな謎'],
      productionMechanism: ['冒頭1ページ', '縦読みの余白', '吹き出し外テキスト', '架空UI'],
      opportunityGap: ['外部サービス名を出さず、読者の生活感に近い架空制度へ変換すると漫画企画として扱いやすいです。'],
      categoryInsight: '読者が感じている不公平を、架空の評価制度として可視化すると連載の引きになります。',
    },
    'short-video': {
      surfacePattern: [
        '冒頭1秒、字幕、Before/After、保存理由を先に見せる構造が強いです。',
        '視聴者は説明を待つより、変化後の画と損失字幕で続きを判断します。',
        'コメント欄で次の失敗例や別パターンを回収できる形式が伸ばしやすいです。',
      ],
      humanMotivation: ['すぐ役に立つ', '失敗を避けたい', '誰かに共有したい', '自分も試せそう'],
      narrativeMechanism: ['0秒目の結論画', '1秒目の損失字幕', '3カットの理由回収', '保存したくなる締め'],
      productionMechanism: ['冒頭1秒', '大きい字幕', '手元カット', 'コメント誘発'],
      opportunityGap: ['流行語ではなく、保存される理由とコメントされる余白まで設計すると短尺動画化しやすいです。'],
      categoryInsight: 'Before/Afterを冒頭で先に見せ、途中で理由を回収する構成が保存に向きます。',
    },
    'trend-explainer': {
      surfacePattern: [
        `${cluster.topTags.slice(0, 4).join(' / ')} が共起しています。`,
        '現象名ではなく、なぜ見続けられたかを根拠、視聴心理、制作手順に分ける構造が強いです。',
        '固有名詞は証拠として扱い、特定企業や個人の内部事情の断定は避けます。',
      ],
      humanMotivation: ['裏側を知りたい', '自分の制作に応用したい', '炎上を避けたい', '根拠つきで理解したい'],
      narrativeMechanism: ['冒頭の問い', '根拠提示', '章立て解説', '安全な応用'],
      productionMechanism: ['ナレーション', '引用風カード', '比較表', '締めのチェックリスト'],
      opportunityGap: ['外部サービス名は根拠として使いつつ、断定ではなく観測から制作判断へ翻訳すると信頼を保てます。'],
      categoryInsight: '固有名詞は証拠として使い、特定企業への断定は避けます。',
    },
    'long-novel': {
      surfacePattern: [
        '評価制度、章ごとの謎、伏線、長期的な救済へ広げやすい構造です。',
        '冒頭の不安を単発の逆転にせず、主人公以外の痛みへ連鎖させると読者維持につながります。',
        '根拠名ではなく、架空の町、組織、制度、記録文書へ変換して世界観化します。',
      ],
      humanMotivation: ['長く残る不安を読み解きたい', '理不尽の正体を知りたい', '誤解がほどける快感', '救われる人が増える期待'],
      narrativeMechanism: ['章ごとの証拠', '伏線の再解釈', '救済対象の連鎖', '制度の真相'],
      productionMechanism: ['章末の引き', '記録文書', '複数視点', '長期アーク'],
      opportunityGap: ['短期の復讐ではなく、読み解き、誤解、救済を積み上げると長編小説として伸ばしやすいです。'],
      categoryInsight: '短期的な復讐より、制度を読み解いて周囲を救う長期アークが伸ばしやすいです。',
    },
  };

  const base = analysis[categoryId] ?? analysis['story-manga'];
  return enrichDeepAnalysisWithEvidence(base, categoryId, cluster, variantSeed);
}

function buildCategoryReasons(categoryId) {
  const reasons = {
    'story-manga': [
      {
        title: '感情を一目で絵にできる',
        detail: '評価不安、生活不安、SNS疲れのような見えない痛みを、通知、点数、レシート、検索窓などの画面表現に変換できます。',
        example: '「評価不能」の通知の下に、本当の却下理由だけが灰色で見える。',
      },
      {
        title: '毎話の引きを作りやすい',
        detail: '隠れた理由、誤記された評価、誰かの本音など、1話ごとに小さな謎と回収を置けます。',
        example: '次回は同僚の評価欄にだけ「本人のせいではない」と表示される。',
      },
      {
        title: '実名を使わず現代性を出せる',
        detail: '実在サービス名は根拠側に置き、物語本編は架空UIにすれば、炎上告発ではなく安全な構造ドラマになります。',
        example: 'LINE風ではなく架空の社内チャットで、共有される不安だけを描く。',
      },
    ],
    'short-video': [
      {
        title: '最初の1秒で悩みが伝わる',
        detail: 'つまずく、探す、迷う、通知に邪魔されるなど、説明前に不便を映像で見せられます。',
        example: '充電ケーブルに足を引っかける瞬間を冒頭に置く。',
      },
      {
        title: '保存する理由を作りやすい',
        detail: '無料で真似できる配置変更、時短手順、判断基準は、あとで実行するために保存されやすい構造です。',
        example: '最後に「明日の朝ここだけ変えて」と1行で保存理由を出す。',
      },
      {
        title: 'コメントが企画の続きになる',
        detail: 'A/B選択、代替食材、片づけ判断など、視聴者の経験が次回案になります。',
        example: '「あなたならどっちを残す？」で終わり、次回に理由を分類する。',
      },
    ],
    'trend-explainer': [
      {
        title: '固有名詞を根拠として扱える',
        detail: 'TikTok、YouTube Shorts、Netflixなどは作品化せず、視聴行動や配信形式を説明する材料にできます。',
        example: '特定企業の内情ではなく、短尺視聴で反転が効く理由を説明する。',
      },
      {
        title: '視聴者の自分ごと化が早い',
        detail: '「なぜ次を見てしまうのか」「なぜ保存するのか」のように、自分の行動を分析対象にできます。',
        example: '冒頭で「1分なのに続きを待った経験」を問いかける。',
      },
      {
        title: '創作者向けの実用に落とせる',
        detail: '炎上解説ではなく、冒頭設計、保存理由、コメント誘発などの制作手順へ変換できます。',
        example: '最後に漫画、ショート動画、小説へ応用するチェックリストを出す。',
      },
    ],
    'long-novel': [
      {
        title: '長期的な痛みを追える',
        detail: '評価されない、選ばれない、返せないなどの痛みは、短い復讐より長い成長と救済に向きます。',
        example: '却下理由を読む能力で、最初は自分、次に他者を救う。',
      },
      {
        title: '章ごとの謎を積める',
        detail: '理由、ログ、説明書、ランキングなどの形式を使うと、各章に発見と次の疑問を置けます。',
        example: '章末に「自分の説明書」だけ白紙で出てくる。',
      },
      {
        title: '現実批評を架空制度に変換できる',
        detail: '実在企業やサービスを告発せず、架空の制度や町で構造だけを描けます。',
        example: '採用サービス名は出さず、架空組織の却下ログとして扱う。',
      },
    ],
  };

  return reasons[categoryId] ?? [];
}

const PLAN_BATCH_SIZE = 3;

function addDraftPrompt(plan, categoryId, cluster) {
  const creatorBrief = buildCreatorBrief(plan, categoryId);
  const craftNotes = buildCraftNotes(plan, categoryId, creatorBrief);
  const retentionDesign = buildRetentionDesign(plan, categoryId);
  const internalRoutineNotes = buildStoryMakerRoutineNotes(categoryId);
  const storyArchitecture = buildStoryArchitecture(plan, categoryId, creatorBrief, retentionDesign);
  const primaryTitle = plan.titleCandidates[0];
  const promptLines = [
    'あなたは日本語コンテンツの商業創作者です。',
    `この企画をもとに、${plan.formatLabel}として読者・視聴者が続きを見たくなる具体的な本文を書いてください。`,
    `カテゴリ: ${getCategoryById(categoryId)?.label ?? categoryId}`,
    `使用タイトル: ${primaryTitle}`,
    `別タイトル案: ${plan.titleCandidates.slice(1).join(' / ') || 'なし'}`,
    '創作ブリーフ:',
    `主人公: ${creatorBrief.protagonist}`,
    `舞台: ${creatorBrief.setting}`,
    `最初の事件: ${creatorBrief.incitingIncident}`,
    `対立: ${creatorBrief.conflict}`,
    `最後に選ばせること: ${creatorBrief.choice}`,
    `読後感: ${creatorBrief.payoff}`,
    '物語設計:',
    ...storyArchitecture.notes.map((note) => `${note.label}: ${note.detail}`),
    'プロ向け設計メモ:',
    ...craftNotes.map((note) => `${note.label}: ${note.detail}`),
    '創作ルーチン:',
    ...internalRoutineNotes.map((note) => `- ${note}`),
    ...(retentionDesign
      ? [
          '読者維持設計:',
          `尺の狙い: ${retentionDesign.lengthGoal}`,
          `冒頭: ${retentionDesign.openingHook}`,
          `中盤: ${retentionDesign.middleKeep}`,
          `章末: ${retentionDesign.payoff}`,
          `次へ読ませる仕掛け: ${retentionDesign.continuationHook}`,
        ]
      : []),
    `なぜ今ウケそうか: ${plan.reasonToWin.join('。')}`,
    `核となる約束: ${plan.audiencePromise}`,
    `感情フック: ${plan.emotionalHook}`,
    `設定: ${plan.premise}`,
    `具体例: ${plan.exampleDetail}`,
    `構成: ${plan.outline.join(' / ')}`,
    `冒頭: ${plan.opening}`,
    `差別化: ${plan.differentiation}`,
    `制作上の注意: ${plan.productionNotes.join(' / ')}`,
    `外部根拠の扱い: ${externalSignalInstruction(categoryId)}`,
    `安全条件: ${plan.riskNotes.join(' / ')}`,
    `トレンド根拠: ${cluster.label}`,
    '実在の人物、企業、作品、クリエイター、既存キャラクターを物語の主役・黒幕・告発対象・続編対象にしないでください。',
    '固有名詞は市場や配信形式の根拠としてだけ扱い、物語内の組織名や人物名は架空名にしてください。',
    plan.draftInstructions,
  ];

  const enrichedPlan = {
    ...plan,
    creatorBrief,
    storyArchitecture,
    craftNotes,
    retentionDesign,
    aiDraftPrompt: promptLines.filter(Boolean).join('\n'),
  };
  Object.defineProperty(enrichedPlan, 'internalRoutineNotes', {
    value: internalRoutineNotes,
    enumerable: false,
  });
  return enrichedPlan;
}

function externalSignalInstruction(categoryId) {
  if (categoryId === 'trend-explainer') {
    return 'YouTube Shorts、TikTok、LINEなどの実在名は市場例としてだけ扱い、企業の内部事情や個別人物の意図は断定しない。';
  }
  if (categoryId === 'short-video') {
    return '短尺動画で反応しやすい冒頭フック、字幕、保存理由、コメント誘発の形式だけを参照し、実在サービス名を本文に出さない。';
  }
  if (categoryId === 'long-novel') {
    return '検索関心や短尺反応は読者欲求の根拠としてだけ使い、作中には架空制度・架空組織・架空の町として変換する。';
  }
  return '外部プラットフォーム名は読者欲求の根拠としてだけ使い、漫画本文には出さず、架空UI・架空制度・架空の生活場面へ変換する。';
}

function buildStoryMakerRoutineNotes(categoryId) {
  const categoryKey = storyMakerCategoryKey(categoryId);
  const snapshot = STORY_MAKER_ROUTINE_SNAPSHOT;
  const seed = snapshot.categoryGuideSeeds[categoryKey] ?? snapshot.categoryGuideSeeds.storyManga;
  const methodSummary = [
    '伏線と回収（Setup-Payoff）',
    '感情差分（Emotion Gap Design）',
    'モチーフ再登場（Motif Recurrence）',
    '目的・動機・障害・利害（GMC+S）',
    '説明より描写（Show Don’t Tell）',
    '人物が知り得ることの境界（Character Knowledge Boundary）',
  ];

  return [
    `${seed.label}向けの品質契約として、冒頭の違和感、中盤の誤解、結末の回収を一本につなぐ。`,
    `物語メソッド: ${methodSummary.join(' / ')}を、冒頭・中盤・結末の読者維持に使う。`,
    ...seed.rules.slice(0, 3),
    `避けること: ${snapshot.antiPatterns[0]}`,
  ];
}

function storyMakerCategoryKey(categoryId) {
  return {
    'story-manga': 'storyManga',
    'short-video': 'shortVideo',
    'trend-explainer': 'trendExplainer',
    'long-novel': 'longNovel',
  }[categoryId] ?? 'storyManga';
}

function buildCreatorBrief(plan, categoryId) {
  if (plan.creatorBrief) return plan.creatorBrief;

  const overrides = {
    'story-manga-hidden-review': {
      protagonist: '契約社員の真白。自分を守るだけで精一杯だったが、同僚の評価改ざんを見て黙れなくなる。',
      setting: '社員証、評価画面、会議メモがすべて点数で管理される架空企業。',
      incitingIncident: '朝の通知に「評価不能」と出て、その下に誰にも見えない灰色の査定理由が浮かぶ。',
      conflict: '上司個人を責めれば終わる話ではなく、評価入力そのものが人を低く見せる仕組みになっている。',
      choice: '自分だけ評価を直すか、同僚の不利益まで表に出すか。',
      payoff: '怒りよりも、見えなかった仕組みを読者が理解する救済感で終える。',
    },
    'story-manga-receipt-ghost': {
      protagonist: '節約を笑いに変えて生きている会社員。自分の我慢を大したことがないと思い込んでいる。',
      setting: '夜のコンビニ、狭い台所、家計簿アプリ風の架空UI。',
      incitingIncident: 'レシートの合計欄に金額ではなく「諦めた理由」が印字される。',
      conflict: '便利な節約術に見えた現象が、周囲の言えなかった我慢まで暴いてしまう。',
      choice: '本当に欲しかったものを一つだけ買うか、いつものように棚へ戻すか。',
      payoff: '派手な逆転ではなく、小さく自分を許す読後感にする。',
    },
    'story-manga-comment-weather': {
      protagonist: '投稿前にコメント欄の空気だけ天気として見える高校生または若手社会人。',
      setting: '実名SNSではない架空投稿アプリと、雨や霧が重なる縦読み画面。',
      incitingIncident: '親友の投稿予定画面にだけ赤い警報が出る。',
      conflict: '傷つく未来が見えるから止めたいが、本人には言う必要がある言葉がある。',
      choice: '親友の投稿を止めるか、言葉を整える手伝いをするか。',
      payoff: '言葉を怖がる話ではなく、届き方を選び直す話にする。',
    },
    'story-manga-family-cache': {
      protagonist: '家族とは普通に仲がいいと思っていた学生または若手社会人。',
      setting: '深夜のリビング、家族共用Wi-Fi、架空検索窓。',
      incitingIncident: '誰も触っていない検索窓に、家族の悩みらしい候補語が出る。',
      conflict: '心配して覗くほど、家族を監視している後ろめたさが増す。',
      choice: '検索語を追い続けるか、本人に言葉で聞くか。',
      payoff: '謎解きの快感より、近い人に聞き直す勇気を残す。',
    },
  };

  if (overrides[plan.id]) return overrides[plan.id];

  const categoryDefaults = {
    'short-video': {
      protagonist: '視聴者の代わりに小さな不便を試す投稿者。',
      setting: 'スマホで撮れる部屋、台所、机まわりなどの生活空間。',
      incitingIncident: plan.outline[0] ?? plan.opening,
      conflict: plan.emotionalHook,
      choice: '一番簡単な改善だけを選び、最後に視聴者が真似できる形で見せる。',
      payoff: '保存して後で試したくなる実用感を残す。',
    },
    'trend-explainer': {
      protagonist: '視聴者の疑問を代弁する語り手。',
      setting: '自作モック画面、チャート、章立てテロップで進む解説動画。',
      incitingIncident: plan.outline[0] ?? plan.opening,
      conflict: plan.emotionalHook,
      choice: '告発や断定ではなく、構造を分解して制作者が使える教訓に変える。',
      payoff: '見終わった人が自分の企画へ応用できる理解を残す。',
    },
    'long-novel': {
      protagonist: '読者が長く追える痛みと欠点を持つ主人公。',
      setting: '現実の不安を抽象化した架空の町、制度、図書館、職場。',
      incitingIncident: plan.outline[0] ?? plan.opening,
      conflict: plan.emotionalHook,
      choice: '能力や謎を自分のためだけに使うか、他者の救済へ広げるか。',
      payoff: '章を重ねるほど世界と人物の見え方が変わる余韻を残す。',
    },
    'story-manga': {
      protagonist: '読者が自分を重ねやすい生活者。',
      setting: '現実に近いが固有名詞を避けた架空の生活空間。',
      incitingIncident: plan.outline[0] ?? plan.opening,
      conflict: plan.emotionalHook,
      choice: '違和感を見なかったことにするか、誰かと共有して動くか。',
      payoff: '小さな救済と次話への謎を残す。',
    },
  };

  const defaults = categoryDefaults[categoryId] ?? categoryDefaults['story-manga'];
  return {
    protagonist: defaults.protagonist,
    setting: defaults.setting,
    incitingIncident: defaults.incitingIncident,
    conflict: defaults.conflict,
    choice: defaults.choice,
    payoff: defaults.payoff,
  };
}

function buildCraftNotes(plan, categoryId, creatorBrief) {
  const mediumGuide = {
    'story-manga': '1ページ目の異常表示とラスト1コマの未解決で読者を次話へ送る',
    'short-video': '冒頭1秒の不便、途中の手順、最後の保存理由を1本の視線移動でつなぐ',
    'trend-explainer': '導入の体験、根拠、構造図、制作への応用を章立てで分ける',
    'long-novel': '第1章の個人的な痛みを、章を重ねるほど他者と制度の謎へ広げる',
  };
  const formatGuide = mediumGuide[categoryId] ?? mediumGuide['story-manga'];
  const firstThreeBeats = plan.outline.slice(0, 3).join('」→「');
  const anchor = plan.evidenceAnchor ?? {};
  const anchorFocus = cleanBeatLabel(anchor.focusTerm ?? plan.titleCandidates[0] ?? '今回の根拠');
  const anchorScene = cleanBeatLabel(anchor.scene ?? '冒頭場面');
  const anchorArtifact = cleanBeatLabel(anchor.artifact ?? inferRecurringMotif(plan));
  const anchorTension = cleanBeatLabel(anchor.tension ?? plan.emotionalHook);
  const anchorMove = cleanBeatLabel(anchor.productionAngle ?? plan.differentiation);

  return [
    {
      label: '編集者に通す一文',
      detail: `「${plan.titleCandidates[0]}」は、取得根拠の「${anchorFocus}」を${anchorScene}の${anchorArtifact}に置き換え、${plan.emotionalHook}を${plan.formatLabel}で可視化する企画。${plan.audiencePromise}`,
    },
    {
      label: '主人公の欠落',
      detail: `${creatorBrief.protagonist} 最初は「${anchorTension}」を自分の弱さとして処理しようとし、「${creatorBrief.choice}」を選べないことが初期弱点になる。`,
    },
    {
      label: '読者維持エンジン',
      detail: `${formatGuide}。${anchorArtifact}を「${firstThreeBeats}」の各段階で別の意味に変え、${anchorFocus}の小さな発見と未解決を置く。`,
    },
    {
      label: '凡庸化を避ける手',
      detail: `${plan.differentiation} ${anchorMove}を優先し、悪役の強さではなく、主人公の選択と画面・文章上の発見で読ませる。`,
    },
  ];
}

function buildRetentionDesign(plan, categoryId) {
  if (categoryId !== 'long-novel') return null;

  const formatText = `${plan.targetFormat ?? ''} ${plan.formatLabel ?? ''}`;
  const isShort = formatText.includes('短編');
  const isMedium = formatText.includes('中編');
  const form = isShort ? '短編' : isMedium ? '中編' : '長編';
  const chapterUnit = isShort ? '1本完結' : isMedium ? '3幕から5章' : '連載第1部から長期章';
  const firstBeat = plan.outline[0] ?? plan.opening;
  const middleBeat = plan.outline[Math.min(1, Math.max(plan.outline.length - 1, 0))] ?? plan.emotionalHook;
  const lastBeat = plan.outline.at(-1) ?? plan.creatorBrief?.payoff ?? plan.opening;

  if (isShort) {
    return {
      form,
      lengthGoal: `短編として${chapterUnit}で読後の余韻まで到達させる。1つの謎、1つの選択、1つの回収に絞る。`,
      openingHook: `冒頭1段落で「${plan.opening}」を提示し、主人公が見逃せない違和感を即座に置く。`,
      middleKeep: `中盤は「${middleBeat}」だけを深掘りし、説明を増やさず小さな証拠を2つ重ねて離脱を防ぐ。`,
      payoff: `章末で「${lastBeat}」を回収し、怖さよりも小さな救済と余韻を残す。`,
      continuationHook: '続編化する場合は、同じ仕組みが別の人物にも届く一文だけを最後に置く。',
    };
  }

  if (isMedium) {
    return {
      form,
      lengthGoal: `中編として${chapterUnit}に分け、各章末で別の未回収点を残しながら主題を1本に保つ。`,
      openingHook: `冒頭章は「${firstBeat}」で損失を見せ、主人公の誤解を読者が追える形にする。`,
      middleKeep: `中盤は「${middleBeat}」を転換点にし、味方、対立者、制度の3方向から同じ謎を見せ直す。`,
      payoff: `最終章で「${lastBeat}」を回収し、主人公の選択が周囲の見え方を変える余韻を作る。`,
      continuationHook: '各章末に「まだ読まれていない通知」「誰かの保留された言葉」など次章の具体物を残す。',
    };
  }

  return {
    form,
    lengthGoal: `長編として${chapterUnit}まで伸ばせるよう、主謎、人物謎、制度謎を分けて管理する。`,
    openingHook: `冒頭は「${firstBeat}」を個人的な痛みとして始め、世界設定の説明は後回しにする。`,
    middleKeep: `中盤は「${middleBeat}」を反復し、章ごとに救済対象を変えて読み味を単調にしない。`,
    payoff: `章末ごとに小さな回収を置き、部の終盤で「${lastBeat}」へつなげて長期の余韻を残す。`,
    continuationHook: '章末には新情報だけでなく、人間関係の未決着を置き、次回を読む理由を感情側にも作る。',
  };
}

function buildStoryArchitecture(plan, categoryId, creatorBrief, retentionDesign) {
  const firstBeat = cleanBeatLabel(plan.outline?.[0] ?? plan.opening ?? plan.audiencePromise);
  const middleBeat = cleanBeatLabel(
    plan.outline?.[Math.min(1, Math.max((plan.outline?.length ?? 1) - 1, 0))] ??
    plan.emotionalHook ??
    creatorBrief.conflict,
  );
  const lastBeat = cleanBeatLabel(plan.outline?.at(-1) ?? retentionDesign?.payoff ?? creatorBrief.payoff);
  const motif = inferRecurringMotif(plan);
  const anchor = plan.evidenceAnchor ?? {};
  const anchorArtifact = cleanBeatLabel(anchor.artifact ?? motif);
  const anchorScene = cleanBeatLabel(anchor.scene ?? firstBeat);
  const anchorTension = cleanBeatLabel(anchor.tension ?? plan.emotionalHook);
  const anchorFocus = cleanBeatLabel(anchor.focusTerm ?? plan.titleCandidates?.[0] ?? motif);

  const medium = {
    'story-manga': {
      audienceLabel: '読者',
      agentLabel: '主人公',
      setupPlace: '第1ページの最初の大ゴマ',
      middlePlace: '中盤の見開きまたは縦読みの沈黙コマ',
      payoffPlace: 'ラスト1コマ',
      readerKnows: '読者は画面や小道具の矛盾を主人公より半歩早く見つける。',
      hiddenTruth: '不利益の原因は個人の悪意ではなく、見えない仕組みや誤読にある。',
      revealRule: '人物が知り得ない情報を急に語らせず、画面、記録、行動、会話のズレで段階的に明かす。',
      execution: 'ページをめくる前に視線が止まる小道具、表情、欄外文字で説明を圧縮する。',
    },
    'short-video': {
      audienceLabel: '視聴者',
      agentLabel: '画面上の投稿者',
      setupPlace: '0秒目の画',
      middlePlace: '8秒から24秒の手順カット',
      payoffPlace: 'ラスト3秒',
      readerKnows: '視聴者は結論画を先に見て、途中でなぜ効くのかを追う。',
      hiddenTruth: '本当に欲しいのは流行語ではなく、明日同じ場面で使える小さな改善である。',
      revealRule: '説明を長くせず、画、字幕、手元の変化で根拠を順番に見せる。',
      execution: '字幕、手元、音、最後の保存理由を一つの行動に束ねる。',
    },
    'trend-explainer': {
      audienceLabel: '視聴者',
      agentLabel: '語り手',
      setupPlace: '冒頭30秒の問い',
      middlePlace: '根拠と推測を分ける中盤章',
      payoffPlace: '締めの制作チェックリスト',
      readerKnows: '視聴者は観測事実と制作者の解釈が分かれていることを確認しながら見る。',
      hiddenTruth: '反応の理由は固有名詞そのものではなく、視聴者心理と制作形式の噛み合いにある。',
      revealRule: '観測事実、推測、制作への応用を分け、断定に見える飛躍を避ける。',
      execution: '現象名、根拠、心理、制作応用、注意点の順で誤解を減らす。',
    },
    'long-novel': {
      audienceLabel: '読者',
      agentLabel: '主人公',
      setupPlace: '第1章冒頭',
      middlePlace: '中盤の章末',
      payoffPlace: '部の終盤または最終章',
      readerKnows: '読者は章ごとの記録や違和感を覚えておき、後の再解釈で意味を更新する。',
      hiddenTruth: '主人公だけの痛みに見えたものが、他者や制度の痛みへ広がる。',
      revealRule: '章ごとの証拠と人物の誤解を分け、終盤で同じ記録の意味を更新する。',
      execution: '短編は一つの回収、中編は別人物への拡張、長編は制度謎の持続で読者維持を分ける。',
    },
  }[categoryId] ?? {
    audienceLabel: '読者',
    agentLabel: '主人公',
    setupPlace: '冒頭',
    middlePlace: '中盤',
    payoffPlace: '結末',
    readerKnows: '読者は主人公より少し早く違和感に気づく。',
    hiddenTruth: '見えている問題の奥に別の原因がある。',
    revealRule: '人物が知り得ない情報を急に語らせず、段階的に明かす。',
    execution: '媒体に合わせて見せ場と回収を配置する。',
  };

  const setupPayoff = {
    method: '伏線と回収',
    setup: `${medium.setupPlace}で「${firstBeat}」を約束として置き、${motif}を${medium.audienceLabel}の記憶に残す。`,
    payoff: `${medium.payoffPlace}で「${lastBeat}」へ戻し、冒頭の${motif}の意味が変わって見えるように回収する。`,
    editorCheck: '冒頭に置いたものが、結末で別の意味を持って返ってくるかを確認する。',
  };

  const gmc = {
    method: 'GMC+S',
    goal: creatorBrief.choice,
    motivation: plan.emotionalHook,
    conflict: creatorBrief.conflict,
    stakes: `${creatorBrief.payoff} これを失うと、企画は流行語の説明だけで終わる。`,
  };

  const emotionGap = {
    method: '感情差分',
    start: `${creatorBrief.protagonist} 最初は自分の問題だと思い込む。`,
    pressure: `中盤は「${middleBeat}」とし、同じ痛みが他者や仕組みにも広がることを見せる。`,
    turn: `「${stripSentenceEnd(creatorBrief.choice)}」という選択を行動で見せ、${medium.audienceLabel}の感情を不安から小さな救済へ動かす。`,
  };

  const motifRecurrence = {
    method: 'モチーフ再登場',
    motif,
    firstAppearance: `${medium.setupPlace}で異常として出す。`,
    secondAppearance: `${medium.middlePlace}で別人物または別場面にも現れ、単発ネタではないと示す。`,
    finalAppearance: `${medium.payoffPlace}で選択の結果として再登場させる。`,
  };

  const knowledgeBoundary = {
    method: '知識境界',
    protagonistKnows: `${medium.agentLabel}は「${firstBeat}」を体験するが、最初は原因を取り違える。`,
    readerKnows: medium.readerKnows,
    hiddenTruth: `${medium.hiddenTruth} 今回は「${anchorTension}」を隠れた真相の圧力として扱う。`,
    revealRule: medium.revealRule,
  };

  const mediumExecution = {
    method: '媒体実装',
    focus: `${medium.execution} 具体物は「${anchorArtifact}」、場面は「${anchorScene}」、根拠焦点は「${anchorFocus}」に固定する。`,
    firstOutput: categoryId === 'short-video' ? '秒数つき台本' : categoryId === 'trend-explainer' ? '章立て台本' : categoryId === 'long-novel' ? '第1章と章末フック' : '第1ページのネーム',
    revisionTarget: plan.draftInstructions,
  };

  const notes = [
    {
      label: setupPayoff.method,
      detail: `${setupPayoff.setup} ${setupPayoff.payoff}`,
    },
    {
      label: gmc.method,
      detail: `目的は「${gmc.goal}」、動機は「${gmc.motivation}」、障害は「${gmc.conflict}」、失うものは「${gmc.stakes}」。`,
    },
    {
      label: emotionGap.method,
      detail: `${emotionGap.start} ${emotionGap.pressure} ${emotionGap.turn}`,
    },
    {
      label: motifRecurrence.method,
      detail: `${motifRecurrence.motif}を、冒頭、中盤、結末で意味を変えながら再登場させる。`,
    },
    {
      label: knowledgeBoundary.method,
      detail: `${knowledgeBoundary.protagonistKnows} ${knowledgeBoundary.readerKnows} ${knowledgeBoundary.hiddenTruth} ${knowledgeBoundary.revealRule}`,
    },
    {
      label: mediumExecution.method,
      detail: `${mediumExecution.focus} 最初の出力は「${mediumExecution.firstOutput}」。`,
    },
  ];

  return {
    setupPayoff,
    gmc,
    emotionGap,
    motifRecurrence,
    knowledgeBoundary,
    mediumExecution,
    notes,
  };
}

function inferRecurringMotif(plan) {
  const candidates = [
    plan.titleCandidates?.[0],
    plan.opening,
    plan.premise,
    plan.exampleDetail,
  ];
  const text = candidates.find((item) => typeof item === 'string' && item.trim()) ?? '最初の違和感';
  return text
    .replace(/[「」『』]/g, '')
    .replace(/^今日は、?/, '')
    .replace(/。.*$/, '')
    .replace(/、.*$/, '')
    .replace(/[はがをにでとの]+$/, '')
    .trim()
    .slice(0, 34) || '最初の違和感';
}

function cleanBeatLabel(value) {
  return String(value ?? '')
    .replace(/^[^:：]{1,12}[:：]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripSentenceEnd(value) {
  return String(value ?? '').replace(/[。.!！?？]+$/, '').trim();
}

function buildBeginnerGuide(categoryId, primaryPlan, cluster) {
  const planTitle = primaryPlan?.titleCandidates?.[0] ?? '推奨企画';
  const opening = primaryPlan?.opening ?? '冒頭で異常や損失を見せる';
  const promise = primaryPlan?.audiencePromise ?? '読者が自分ごと化できる企画にする';
  const brief = primaryPlan?.creatorBrief ?? {};
  const sharedChecklist = [
    `タイトルは仮でよいので「${planTitle}」を置いて、冒頭と結末を先に固定する。`,
    `実在名は根拠欄に留め、本文では架空の人物、架空UI、架空制度、架空の町へ置き換える。`,
    `根拠シグナル「${cluster?.label ?? '取得シグナル'}」を、説明ではなく主人公の困りごとへ変換する。`,
  ];

  const guides = {
    'story-manga': {
      headline: '最初の1ページを作る順番',
      promise: `${promise} まずネーム前の骨組みを作ります。`,
      firstOutput: '1ページ目の4コマ構成と最後の引き',
      steps: [
        {
          label: '1コマ目に異常を置く',
          action: `「${opening}」を、通知、レシート、検索窓、欄外文字のどれか1つに絞って描く。`,
          output: '読者が1秒で「何かおかしい」と分かる絵。',
        },
        {
          label: '主人公の困りごとへ落とす',
          action: `${brief.protagonist ?? '主人公'}が、その異常で今日どんな損をするかを1場面で見せる。`,
          output: '仕事、家族、買い物、投稿など生活上の具体被害。',
        },
        {
          label: '仕組みの違和感を増やす',
          action: '悪役を出す前に、画面、表、メモ、吹き出し外の文字で矛盾を1つ増やす。',
          output: '読者が先に気づける小さな証拠。',
        },
        {
          label: '最後のコマで選択を迫る',
          action: `${brief.choice ?? '見なかったことにするか、誰かに共有するか'}を、セリフではなく行動で見せる。`,
          output: '次話を読みたくなる未解決の1コマ。',
        },
      ],
      checklist: [
        ...sharedChecklist,
        '1ページ目に説明文を置きすぎず、画面上の異常と表情で読ませる。',
        '第1話だけで全部解決せず、次に読む理由を1つだけ残す。',
      ],
      avoid: [
        '実在サービスや企業をそのまま悪役にする。',
        '主人公が最初から正解を知っていて、葛藤がない。',
        '読者が絵で理解する前に長い説明を入れる。',
      ],
    },
    'short-video': {
      headline: '撮影前に30秒台本へ落とす順番',
      promise: `${promise} 最初に秒数と保存理由を固定します。`,
      firstOutput: '0秒、1秒、ラスト3秒の字幕',
      steps: [
        {
          label: '0秒目に結果を置く',
          action: `完成後、解決後、失敗直前など、見た瞬間に差が分かる画を先に置く。`,
          output: '無音でも分かる最初のカット。',
        },
        {
          label: '1秒目に悩みを字幕化',
          action: `視聴者の損失を「${primaryPlan?.emotionalHook ?? '毎日の小さな不便'}」として13字前後で出す。`,
          output: 'スクロールを止める短い字幕。',
        },
        {
          label: '中盤を3手順に削る',
          action: '理由、手順、変化を3カットだけにして、説明を増やさない。',
          output: '真似できる最小手順。',
        },
        {
          label: '最後に保存理由を置く',
          action: '「明日使う場面」か「コメントで聞く二択」を1行で出す。',
          output: '保存またはコメントの行動理由。',
        },
      ],
      checklist: [
        ...sharedChecklist,
        '字幕だけ読んでも内容が追える。',
        '撮影場所、手元、音、最後の質問が台本に入っている。',
      ],
      avoid: [
        '便利グッズ紹介だけで終わり、視聴者の悩みがない。',
        '冒頭で前置きや自己紹介を入れる。',
        '保存理由が「保存してね」だけになる。',
      ],
    },
    'trend-explainer': {
      headline: '解説動画を作る順番',
      promise: `${promise} 断定ではなく、根拠から制作判断へ翻訳します。`,
      firstOutput: '冒頭の問い、3章構成、締めのチェックリスト',
      steps: [
        {
          label: '冒頭で視聴者の体験を問う',
          action: `「なぜ${cluster?.label ?? 'この現象'}が気になるのか」を、自分にもある行動として問いにする。`,
          output: '見る理由が分かる最初の問い。',
        },
        {
          label: '根拠と推測を分ける',
          action: '記事リンク、取得元、観測時刻と、制作者としての解釈を別の章に分ける。',
          output: '断定に見えない構成。',
        },
        {
          label: '制作に使う型へ翻訳する',
          action: '冒頭、保存理由、コメント誘導、章末フックのどれに使うかを明示する。',
          output: '視聴後に実行できる制作メモ。',
        },
        {
          label: '安全な扱いで締める',
          action: '固有名詞は根拠として扱い、物語化する時は架空設定へ変えると締める。',
          output: '炎上回避と実用を両立する結論。',
        },
      ],
      checklist: [
        ...sharedChecklist,
        '実在企業の意図や内部事情を断定していない。',
        '最後に漫画、動画、小説へ応用する一文がある。',
      ],
      avoid: [
        '特定企業や個人への告発動画に見える。',
        '根拠リンクなしで「伸びている」と言い切る。',
        '視聴者が何を作ればいいか分からない。',
      ],
    },
    'long-novel': {
      headline: '短編・中編・長編に伸ばす順番',
      promise: `${promise} まず第1章の痛みと、章末の未解決を作ります。`,
      firstOutput: '第1章の冒頭、章末フック、短編/中編/長編の伸ばし方',
      steps: [
        {
          label: '第1章の痛みを1つに絞る',
          action: `「${opening}」から始め、世界説明より先に主人公の損失を見せる。`,
          output: '読者が主人公を追う理由。',
        },
        {
          label: '短編なら1回で回収する',
          action: '謎、選択、読後感を1本に絞り、余韻の一文で終える。',
          output: '読み切り可能な最小構成。',
        },
        {
          label: '中編なら別人物へ広げる',
          action: '2章目以降で別人物の痛みを見せ、主人公の誤解をほどく。',
          output: '3章から5章の関係変化。',
        },
        {
          label: '長編なら制度謎を残す',
          action: '各章末に記録、通知、説明書、未返信などの未解決物を1つ置く。',
          output: '連載で追える主謎と章末フック。',
        },
      ],
      checklist: [
        ...sharedChecklist,
        '第1章で世界観を説明しすぎず、人物の痛みから入る。',
        '章末に新情報だけでなく、感情の未決着を残す。',
      ],
      avoid: [
        '設定説明から始まり、主人公の困りごとが遅い。',
        '短編・中編・長編の違いが分量だけになっている。',
        '伏線を増やすだけで、章ごとの小さな回収がない。',
      ],
    },
  };

  return guides[categoryId] ?? guides['story-manga'];
}

function evidenceAnchorForCategory(categoryId, cluster) {
  if (categoryId === 'trend-explainer') {
    return `参照シグナル: ${cluster.topTags.slice(0, 4).join(' / ')}`;
  }
  if (categoryId === 'short-video') {
    return `参照シグナル: 冒頭フック / 保存行動 / コメント誘発 / ${cluster.sourceCount}系統`;
  }
  if (categoryId === 'long-novel') {
    return '取得データは小説内では架空制度、架空組織、架空の町へ変換する。';
  }
  return '取得データは漫画案では架空UI、人物の選択、ページ上の発見へ変換する。';
}

function buildCategoryFitCards(categoryId, cluster) {
  const evidenceAnchor = evidenceAnchorForCategory(categoryId, cluster);
  const cards = {
    'story-manga': [
      {
        title: '漫画なら「見えない不安」を1ページで見せられる',
        whyThisMedium:
          '評価、家計、SNSの空気のような抽象的な不安を、灰色の欄、吹き出し外の文字、通知画面、縦読みの余白としてコマに置けます。',
        creatorMove: '第1ページで異常な表示を見せ、2ページ目で主人公の生活被害へ落とす。',
        example: '通知の下にだけ本当の査定理由が浮かび、主人公以外にはただの空白に見える。',
        evidenceAnchor,
      },
      {
        title: '連載の引きを毎話作りやすい',
        whyThisMedium:
          '毎話ひとつのメモ、レシート、検索語、コメント欄を解く形式にできるため、短い読後でも次の謎を残せます。',
        creatorMove: '最後のコマに次の人物の隠しメモや未読通知を置く。',
        example: '第1話の最後に、優しい先輩の評価欄にも同じ灰色の理由が出る。',
        evidenceAnchor,
      },
      {
        title: '読者の怒りを人物攻撃ではなく構造の発見に変えられる',
        whyThisMedium:
          '悪役の顔ではなく、入力欄、表、タグ、吹き出し外の小文字を積み上げると、理不尽の仕組みを安全に描けます。',
        creatorMove: '黒幕を出す前に、画面や書類の矛盾で読者に気づかせる。',
        example: '会議室の全員が普通に話しているのに、評価タグだけが主人公を低く塗り替えている。',
        evidenceAnchor,
      },
    ],
    'short-video': [
      {
        title: '冒頭1秒で「自分の不便だ」とわかる',
        whyThisMedium:
          'ショート動画は説明前に共感を取る媒体なので、家計、通知疲れ、部屋の動線などを最初の映像で見せるほど強いです。',
        creatorMove: '失敗カット、困った手元、散らかった画面を先に出してから字幕で理由を言う。',
        example: 'ケーブルにつまずく0.7秒の映像から入り、「この3秒、毎朝やってませんか？」と出す。',
        evidenceAnchor,
      },
      {
        title: '保存される理由を動画内に作れる',
        whyThisMedium:
          '生活改善・節約・設定変更は、視聴後すぐ試せない人が保存するため、再利用できる字幕と手順が武器になります。',
        creatorMove: '最後に「明日やる1手順」を1行で固定表示する。',
        example: '冷蔵庫の半端食材を3つだけ並べ、完成品より「買い足さない条件」を字幕に残す。',
        evidenceAnchor,
      },
      {
        title: 'コメントで次回案を作れる',
        whyThisMedium:
          '視聴者が自分の生活に置き換えられるテーマは、A/B選択や代替案コメントを誘発しやすいです。',
        creatorMove: '結論を一つ残しつつ、最後に「あなたならどっち？」を具体的に聞く。',
        example: '捨てる物をA/Bで見せ、次回はコメント理由を分類して判断する。',
        evidenceAnchor,
      },
    ],
    'trend-explainer': [
      {
        title: '固有名詞を物語化せず、根拠として扱える',
        whyThisMedium:
          '解説動画ならTikTok、YouTube Shorts、LINEなどを市場例として出しつつ、特定企業の内部告発にしない形で深掘りできます。',
        creatorMove: '実在名は導入と根拠欄に限定し、本文は自作モックと構造図で説明する。',
        example: '「特定企業の話ではなく、短尺視聴が物語の形を変えた話です」と最初に置く。',
        evidenceAnchor,
      },
      {
        title: '章立てで複数カテゴリへ応用できる',
        whyThisMedium:
          '漫画、ショート、小説へ横展開したい制作者に、フック、反転、保存、コメントという部品で渡せます。',
        creatorMove: '1章1論点にし、各章の最後に制作チェックを置く。',
        example: '「冒頭の損失」「中盤の反転」「最後の保存理由」を3章で分ける。',
        evidenceAnchor,
      },
      {
        title: 'ナレーションとチャートで深情報分析にできる',
        whyThisMedium:
          '単なるバズ紹介ではなく、なぜ人が反応するかを欲求、媒体形式、安全な応用の順に整理できます。',
        creatorMove: '数字を断定せず、観測シグナルと創作判断を分けて見せる。',
        example: 'グラフで勢いと飽和リスクを出し、最後に使える企画型へ落とす。',
        evidenceAnchor,
      },
    ],
    'long-novel': [
      {
        title: '長期的な痛みを章で積み上げられる',
        whyThisMedium:
          '評価不安や生活の我慢は一発解決より、誤解、発見、救済を章ごとに重ねる方が読者維持に向きます。',
        creatorMove: '第1章は主人公個人の痛み、第2章以降は他者の痛みへ広げる。',
        example: '却下理由を読む能力が、最初は自分の救済、次に他者の救済へ変わる。',
        evidenceAnchor,
      },
      {
        title: '伏線を「ログ」や「説明書」として残せる',
        whyThisMedium:
          '小説は情報の遅延が強いので、理由、説明書、検索語、図書館の本などを章末の伏線にできます。',
        creatorMove: '章末に一行だけ、次章で意味が変わる記録を置く。',
        example: '主人公の説明書だけ白紙で出てきて、読者が次章を待つ理由になる。',
        evidenceAnchor,
      },
      {
        title: '現実批評を架空制度に変換しやすい',
        whyThisMedium:
          '長編なら世界観や制度を育てられるため、実在企業を出さずに評価社会やランキング疲れを扱えます。',
        creatorMove: '実在名を避け、架空の町・組織・図書館にルールを持たせる。',
        example: '一晩だけ順位が消える街で、主人公が初めて自分の基準で選ぶ。',
        evidenceAnchor,
      },
    ],
  };

  return cards[categoryId] ?? cards['story-manga'];
}


function regeneratePlans(plans, seed = 1, cluster = null) {
  if (!Array.isArray(plans) || plans.length === 0) return [];
  const categoryId = plans[0]?.id?.split('-').slice(0, 2).join('-') ?? 'story-manga';
  const numericSeed = Number(seed) || 0;
  const observations = rotatePlanObservations(cluster?.observations, numericSeed, PLAN_BATCH_SIZE);
  if (observations.length === 0) return [];
  const searchFrames = Array.from({ length: PLAN_BATCH_SIZE }).map((_, index) =>
    buildSearchDrivenFrame(categoryId, observations[index], numericSeed, index),
  );

  return Array.from({ length: PLAN_BATCH_SIZE }).map((_, index) => {
    const basePlan = plans[index % plans.length];
    const frame = searchFrames[index];
    return {
      ...basePlan,
      id: `${categoryId}-search-${seed}-${index + 1}-${slugForId(frame.titleCandidates[0])}`,
      titleCandidates: frame.titleCandidates,
      reasonToWin: frame.reasonToWin,
      audiencePromise: frame.audiencePromise,
      emotionalHook: frame.emotionalHook,
      premise: frame.premise,
      exampleDetail: frame.exampleDetail,
      outline: frame.outline,
      opening: frame.opening,
      productionNotes: frame.productionNotes,
      differentiation: frame.differentiation,
      riskNotes: frame.riskNotes,
      draftInstructions: frame.draftInstructions,
      evidenceAnchor: frame.evidenceAnchor,
      creatorBrief: {
        protagonist: frame.protagonist,
        setting: frame.setting,
        incitingIncident: frame.incitingIncident,
        conflict: frame.conflict,
        choice: frame.choice,
        payoff: frame.payoff,
      },
    };
  });
}

function buildSearchDrivenFrame(categoryId, observation, seed, index) {
  const insight = classifyObservationInsight(observation ?? {});
  const anchor = deriveEvidenceAnchor(observation, insight, seed, index);
  const concept = conceptForInsight(anchor.conceptType || insight.type, seed + (stableHash(anchor.sourceUrl || anchor.title || anchor.focusTerm) % 97), index);
  const signalAnchor = categoryId === 'trend-explainer' ? anchor : { ...anchor, title: anchor.focusTerm };
  const signal = observationSignalForPlan(observation, insight, signalAnchor);
  const keyword = anchor.focusTerm || concept.keyword;
  const artifact = anchor.artifact || concept.artifact;
  const planAnchor = evidenceAnchorForPlan(anchor, categoryId);
  const lens = pickVariant(['基点', '別視点', '余白', '反転', '深層', '再読'], (Number(seed) || 0) * 5 + index);
  const moment = pickVariant(['朝', '夜', '記録', '街', '章', '窓'], (Number(seed) || 0) * 5 + index + 1);

  if (categoryId === 'short-video') {
    return {
      titleCandidates: titleCandidatesForCategory(categoryId, concept, anchor, seed, index),
      protagonist: `${keyword}に反応した視聴者自身。${anchor.readerNeed}を、顔出し人物ではなく手元と生活動線で見せる。`,
      setting: `縦画面の${anchor.scene}。スマホだけで撮れ、視聴者が同じ場所で試せる。`,
      incitingIncident: `${artifact}を冒頭0秒に置き、説明前に「困った瞬間」か「改善後」を見せる。`,
      conflict: '説明が長いと離脱されるが、手順が浅いと保存する理由が残らない。',
      choice: 'ネタを広げるより、1つの不便と1つの改善だけに絞る。',
      payoff: '最後に明日使う理由を1行字幕で残し、保存やコメントにつなげる。',
      reasonToWin: [
        signal,
        `${anchor.tension}を冒頭1秒で損失や変化として見せやすい`,
        '1本の中で「困った瞬間」「直す手順」「保存理由」まで短く完結できる',
      ],
      audiencePromise: `${anchor.readerNeed}を、短尺で真似できる改善に変える。`,
      emotionalHook: anchor.emotionalHook,
      premise: `取得根拠から抽出した「${keyword}」を、${lens}の視点で${artifact}と${anchor.tension}に落とし、視聴者が${anchor.scene}で${anchor.actionLabel}を1つだけ試せる短尺動画にする。`,
      exampleDetail: `冒頭は${artifact}を説明せずに見せる。次に${anchor.tension}を短字幕で分解し、最後に${anchor.actionLabel}を1つだけ改善した画を置く。`,
      outline: ['0秒: 結論か困りごとを見せる', '1-7秒: 原因を短字幕で分解', '8-24秒: 1つだけ直す', 'ラスト: 保存理由とコメント誘導'],
      opening: `「${keyword}、毎日ちょっと損してませんか？」`,
      productionNotes: ['縦画面固定', '実在サービス名や個人情報を映さない', '効果を盛らず1つの改善に絞る'],
      differentiation: `総まとめ動画ではなく、観測データ1件から${anchor.scene}の1場面へ落とす。`,
      riskNotes: ['健康・金銭効果を断定しない'],
      draftInstructions: '秒数、映像、字幕、ナレーション、撮影小物、保存誘導まで具体化してください。',
      evidenceAnchor: planAnchor,
    };
  }

  if (categoryId === 'trend-explainer') {
    return {
      titleCandidates: titleCandidatesForCategory(categoryId, concept, anchor, seed, index),
      protagonist: `${keyword}を企画に使いたいが、根拠と安全な変換方法を知りたい制作者向けの語り手。`,
      setting: '観測データ、架空UI、ホワイトボード、媒体別作例を並べる解説画面。',
      incitingIncident: `${signal} そこから、なぜ反応が起きるのかを問いにする。`,
      conflict: '流行語をそのまま使うと浅く危険だが、抽象化しすぎると実用性が消える。',
      choice: '固有名詞を追うのではなく、視聴者行動と創作手順へ分解する。',
      payoff: '視聴者が自分の漫画、動画、小説へ転用できるチェックリストを持ち帰る。',
      reasonToWin: [
        signal,
        `${anchor.readerNeed}は解説の入口として共感を取りやすい`,
        '観測、理由、制作手順、注意点の順にすると打ち合わせや企画書へ転用しやすい',
      ],
      audiencePromise: `${keyword}を、創作で使える構造と注意点に分解する。`,
      emotionalHook: `流行を追っているのに、${anchor.tension}をどう企画に変えるか分からない焦り。`,
      premise: `取得データを起点に、伸びた表層ではなく、${lens}の視点で${anchor.tension}を読み、${anchor.readerNeed}と${anchor.productionAngle}を解説する。`,
      exampleDetail: `前半で${anchor.title}の観測を示し、中盤で${anchor.tension}を分解し、後半で漫画・短尺・小説への変換例を出す。`,
      outline: ['導入: 観測結果', '理由: 反応した心理', '変換: 媒体別の作り方', '注意: 実在名と断定を避ける'],
      opening: `「今日は、${keyword}がなぜ企画に使えるのかを分解します。」`,
      productionNotes: ['実在人物を告発対象にしない', '画面例は自作モックにする', '出典と推測を分ける'],
      differentiation: 'ニュース解説ではなく、創作者の制作判断へ落とす。',
      riskNotes: ['内部事情や因果関係を断定しない'],
      draftInstructions: '7分から10分の解説台本として、章立て、ナレーション、図解、作例、注意点を書いてください。',
      evidenceAnchor: planAnchor,
    };
  }

  if (categoryId === 'long-novel') {
    return {
      titleCandidates: titleCandidatesForCategory(categoryId, concept, anchor, seed, index),
      protagonist: `${anchor.readerNeed}を避けて生きてきた主人公。最初は自分の問題だけを解決したいが、${anchor.tension}に巻き込まれる。`,
      setting: `${artifact}が、${anchor.scene}を起点に架空の町・図書館・記録庫・職場制度として広がる世界。`,
      incitingIncident: `主人公が${artifact}に触れ、自分だけの悩みだと思っていたものが町全体の記録だと知る。`,
      conflict: `${anchor.tension}を読み解けば救われる人がいる一方で、他人の痛みを覗く危うさもある。`,
      choice: `${artifact}を自分の救いだけに使うか、${anchor.tension}の記録として他者にも返すか。`,
      payoff: `${anchor.readerNeed}が章を重ねて他者の痛みへ広がり、誤解がほどける救済へ向かう。`,
      reasonToWin: [
        signal,
        `${artifact}は章ごとの謎や記録として長期連載に広げやすい`,
        `${anchor.tension}を、世界観と伏線に変換できる`,
      ],
      audiencePromise: `${keyword}を長期の謎と救済に変えるWeb小説企画。`,
      emotionalHook: anchor.emotionalHook,
      premise: `取得根拠から抽出した「${keyword}」を、${lens}の視点で${artifact}と${anchor.tension}に変換する。主人公が記録、制度、町のルールを読み解き、章ごとに他者の事情へ近づく中長編にする。`,
      exampleDetail: `第1章では${artifact}を発見する。章末で${anchor.tension}が別人物にも関わる証拠を置き、次章へ読ませる。`,
      outline: [
        `第1部: ${artifact}の発見`,
        `第2部: ${keyword}が他者の痛みへ広がる`,
        `第3部: ${anchor.tension}の誤読を暴く`,
        `終盤: ${anchor.actionLabel}を救済として連鎖させる`,
      ],
      opening: `${artifact}には、主人公の名前だけが空白で残されていた。`,
      productionNotes: ['実在サービス名は出さない', '章末ごとに新しい証拠を置く', '救済を急がない'],
      differentiation: '単発の能力ものではなく、記録を読む長期ミステリーにする。',
      riskNotes: ['実在企業や特定制度の告発にしない'],
      draftInstructions: '短編・中編・長編のどれに伸ばせるかを示しつつ、第1章本文、章末の引き、長期展開メモを書いてください。',
      evidenceAnchor: planAnchor,
    };
  }

  return {
    titleCandidates: titleCandidatesForCategory('story-manga', concept, anchor, seed, index),
    protagonist: `${anchor.readerNeed}を抱えた主人公。最初は${anchor.tension}を自分の弱さだと思い込んでいる。`,
    setting: `${artifact}が、${anchor.scene}の中で漫画で一目で読める小道具として現れる世界。`,
    incitingIncident: `主人公が${artifact}を1ページ目で目撃し、日常の見え方が変わる。`,
    conflict: `${anchor.tension}を個人の弱さとして片付けると楽だが、${artifact}を追うほど見えない仕組みや誤読が現れる。`,
    choice: `${anchor.actionLabel}を自分だけの解決で終わらせるか、${artifact}の意味を読み替えて誰かに言葉として返すか。`,
    payoff: `${anchor.actionLabel}の小さな行動で、読者が自分の生活へ持ち帰れる救済を置く。`,
    reasonToWin: [
      signal,
      `${artifact}は漫画の冒頭1ページで異常として見せやすい`,
      `${keyword}を架空UIや小道具にすると、説明より先に感情が伝わる`,
    ],
    audiencePromise: `${keyword}の不安を、1ページ目でわかる異常表示と小さな救済に変える。`,
    emotionalHook: anchor.emotionalHook,
    premise: `取得根拠から抽出した「${keyword}」を、主人公が${artifact}を通じて読み解く漫画企画にする。${anchor.tension}を、1話の感情反転として見せる。`,
    exampleDetail: `冒頭は${artifact}を大ゴマで見せる。主人公は${keyword}を自分だけの問題だと思うが、別人物にも同じ兆候が出て、仕組みを読む物語に変わる。`,
    outline: [
      `冒頭: ${artifact}の異常表示`,
      `中盤: ${keyword}が自分だけではないと知る`,
      `転機: ${anchor.tension}の仕組みを見抜く`,
      `結末: ${anchor.actionLabel}で小さな救済を返す`,
    ],
    opening: `${artifact}は、誰にも見えないはずの欄にだけ残っていた。`,
    productionNotes: ['実在サービス名は出さない', '固有名詞を架空UIへ変換する', '1話1つの小道具に絞る'],
    differentiation: `既存トレンド名ではなく、観測された${anchor.focusTerm}を漫画的な見せ場へ変換する。`,
    riskNotes: ['実在人物や企業への告発にしない'],
    draftInstructions: 'ストーリー漫画の第1話として、ページごとの流れ、重要コマ、セリフ、ラストの引きを具体的に書いてください。',
    evidenceAnchor: planAnchor,
  };
}

function conceptForInsight(insightType, seed, index) {
  const offset = Math.abs((Number(seed) || 0) * PLAN_BATCH_SIZE + index);
  const bank = {
    relation: {
      keyword: '届かなかった本音',
      actionNoun: '返事の整え方',
      readerNeed: '近い相手ほど言葉を飲み込んでしまう不安',
      emotionalHook: '本当は悪意ではなかった言葉が、届かないまま関係を変えてしまう痛み。',
      artifact: '未送信の返事が届く改札',
      artifactVariants: ['未送信の返事が届く改札', '相手に届かなかった一文だけが光る通知欄', '返せなかった言葉を預かる駅の窓口', '既読にならない手紙の束', '送信前で止まった返信箱', '終電後だけ開く連絡帳'],
      visualCue: '送れなかった一文だけが光る通知欄',
      shortSetting: '玄関、駅前、スマホの通知画面',
      storyTitles: ['未送信改札', '返事のない夜行線', '届かなかった窓口', '既読にならない朝', '言えない切符', '終電後の返信箱'],
      shortTitles: ['その返事、まだ送れます', '未返信を3秒でほどく', '気まずい一言の直し方', '返信前の深呼吸', '届く言葉の作り方', '既読の前に見る動画'],
      explainerTitles: ['未返信が刺さる理由', '関係フックの作り方', '本音の遅延を企画にする', 'すれ違いが読まれる構造', 'コメントが増える関係設計', '対話の引きを分解する'],
      novelTitles: ['未送信通知局', '返事を預かる駅', '既読にならない町', '届かなかった言葉の図書館', '夜間返信係', '返信箱の番人'],
    },
    regret: {
      keyword: '取り戻せない時間',
      actionNoun: '予定の見直し方',
      readerNeed: '時間だけが早く過ぎてしまう後悔',
      emotionalHook: 'まだ間に合うと思っていた予定が、気づいた時には遠く過ぎている怖さ。',
      artifact: '明日だけが先に届くカレンダー',
      artifactVariants: ['明日だけが先に届くカレンダー', '三年後の予定だけが印字されるレシート', '過ぎた日付を配達する郵便受け', '一晩で月が進む予定表', '昨日の予定だけが残るスマホ通知', '未来の自分から届く不在票'],
      visualCue: '予定表の日付だけが勝手にめくれる画面',
      shortSetting: '机のカレンダー、スマホ予定表、朝の部屋',
      storyTitles: ['明日だけが届く部屋', '置き去りカレンダー', '時間差通知の夜', '三年後のレシート', '遅れてきた予定表', '昨日を配る郵便受け'],
      shortTitles: ['時間が消える前にやる1つ', '予定表の見直し3カット', '明日を取り戻す30秒', '後悔を減らす朝の一手', '先延ばしを止める字幕', '一日を拾い直す動画'],
      explainerTitles: ['時間不安が刺さる理由', '後悔フックを企画に変える', 'なぜ時間喪失は読まれるのか', '予定表モチーフの作り方', '共感される後悔の設計', '時間感覚を物語化する方法'],
      novelTitles: ['明日配達局', '置き去り暦の町', '時間差郵便の夜', '昨日を読む図書館', '予定表の空白', '一年を返す記録係'],
    },
    unfairness: {
      keyword: '言い返せない理不尽',
      actionNoun: 'かわす一言',
      readerNeed: 'その場で言い返せなかった悔しさ',
      emotionalHook: '正しいことを言うほど立場が悪くなる理不尽さ。',
      artifact: '言えなかった台詞が貼られる掲示板',
      artifactVariants: ['言えなかった台詞が貼られる掲示板', '反論だけが赤字で残る回覧板', '悔しさを印字する職場メモ', '声にできなかった一文の貼り紙', '沈黙だけが採点される申請欄', '赤線で消された抗議文'],
      visualCue: '赤線の引かれた言い返せない一言',
      shortSetting: '職場の机、レジ前、学校の廊下',
      storyTitles: ['反論掲示板', '赤線のついた沈黙', '言えなかった欄外', '悔しさの貼り紙', '声にならない通知', '理不尽の回覧板'],
      shortTitles: ['言い返せない時の一手', '理不尽をかわす3秒', 'その場で折れない字幕', '赤線の消し方', '悔しさを持ち帰らない方法', '反論しない反撃'],
      explainerTitles: ['理不尽あるあるが伸びる理由', '怒りを煽らず企画にする方法', '共感と救済の設計', '反論フックの作り方', 'スカッとしすぎない物語術', '不公平感の扱い方'],
      novelTitles: ['反論掲示板の町', '沈黙係の記録', '赤線都市', '言えなかった手紙', '理不尽を預かる役所', '欄外の抗議文'],
    },
    relatable: {
      keyword: '生活の小さな違和感',
      actionNoun: '違和感の直し方',
      readerNeed: '自分だけだと思っていた小さなあるある',
      emotionalHook: '誰にも説明するほどではない違和感が、毎日少しずつ積もる感覚。',
      artifact: '違和感だけに赤丸が付くレシート',
      artifactVariants: ['違和感だけに赤丸が付くレシート', '日用品の横にだけ浮く赤い丸', '生活のズレを記録する買い物メモ', '朝だけ光る違和感タグ', '小さな不便を告げる家計簿', 'あるあるだけを拾う通知欄'],
      visualCue: '日用品の横に浮く小さな赤丸',
      shortSetting: '台所、洗面所、バッグの中',
      storyTitles: ['赤丸レシート', '違和感だけが残る朝', '生活欄の赤い丸', '小さなズレの通知', 'あるある採集帳', '日用品の告げ口'],
      shortTitles: ['その違和感これです', '生活のズレを3秒で直す', 'あるあるを1つ消す', '朝のモヤモヤ保存版', '小さな不便の正体', '毎日の赤丸を消す'],
      explainerTitles: ['あるあるが共有される理由', '共感フックの作り方', '生活違和感を企画にする', '小さな不便が伸びる構造', 'なぜ日用品は物語になるのか', '共感を雑にしない設計'],
      novelTitles: ['赤丸商店街', '違和感採集帳', '日用品の声がする町', '小さなズレの図書館', '生活欄の番人', '朝だけ赤くなる部屋'],
    },
    evaluation: {
      keyword: '見えない評価',
      actionNoun: '判断基準の見直し方',
      readerNeed: '理由の見えない点数に振り回される不安',
      emotionalHook: '点数だけが先に届き、理由だけが誰にも見えない怖さ。',
      artifact: '理由だけが浮かぶ評価欄',
      artifactVariants: ['理由だけが浮かぶ評価欄', '点数の下にだけ出る灰色メモ', '採点理由を隠す通知票', '自分だけ読める査定ログ', '比較結果だけが届く封筒', '評価不能と書かれた空白欄'],
      visualCue: '点数の下にだけ出る灰色の理由',
      shortSetting: 'スマホ画面、通知欄、提出物の横',
      storyTitles: ['灰色の評価欄', '点数の裏メモ', '理由だけが見える朝', '評価不能通知', '採点表の余白', '見えない理由欄'],
      shortTitles: ['比較で疲れた時の一手', '点数に飲まれない3秒', '評価欄の見方を変える', '比べすぎを止める字幕', '理由のない点数から降りる', '判断基準の保存版'],
      explainerTitles: ['評価不安が伸びる理由', '点数化社会を企画にする', '見えない評価の描き方', '比較疲れの分析', 'AI評価不安の扱い方', 'ランキング疲れを物語にする'],
      novelTitles: ['理由欄の読者', '灰色評価局', '点数のない朝', '採点表の町', '評価不能の記録係', '選ばれなかった理由書'],
    },
    saving: {
      keyword: 'あとで助かる知恵',
      actionNoun: '保存される一手',
      readerNeed: '今すぐは無理でもあとで見返したい安心感',
      emotionalHook: '自分だけで抱えていた不便に、小さな逃げ道が見つかる安心。',
      artifact: '未来の自分から届くメモ',
      artifactVariants: ['未来の自分から届くメモ', '明日の自分宛ての付箋', '困った時だけ開く生活ノート', 'あとで助かる一行が増える冷蔵庫', '保存した覚えのない手順メモ', '小さな逃げ道を書いたカード'],
      visualCue: '明日の自分宛ての付箋',
      shortSetting: '机、冷蔵庫、玄関、メモアプリ',
      storyTitles: ['明日の付箋', '未来メモの貼られる部屋', '助け舟ノート', '保存された小さな逃げ道', 'あとで読む冷蔵庫', '自分宛ての生活メモ'],
      shortTitles: ['保存して明日やる1つ', 'あとで助かる3カット', '生活メモの作り方', '明日の自分に渡す動画', '不便を減らす保存版', '1手順だけ残す'],
      explainerTitles: ['保存される企画の条件', '共有したくなる知恵の作り方', '役立つ情報が伸びる理由', '保存動機を設計する', 'ノウハウを物語に変える', '実用フックの分解'],
      novelTitles: ['明日の付箋係', '未来メモ図書館', '助け舟ノートの町', '保存された逃げ道', '自分宛ての棚', 'あとで読む手紙'],
    },
    life: {
      keyword: '生活不安',
      actionNoun: '我慢の減らし方',
      readerNeed: '生活の数字に追われる不安',
      emotionalHook: '残高や予定表を見るたび、自分の選択肢が少しずつ削られる感覚。',
      artifact: '我慢の回数が印字されるレシート',
      artifactVariants: ['我慢の回数が印字されるレシート', '買えなかった理由だけが残る棚札', '残高ではなく諦めた数が出る家計簿', '夜だけ赤字になる生活通知', '戻した商品の理由を書くレジ', '自分に使わなかった金額のメモ'],
      visualCue: '金額の代わりに我慢回数が出る紙片',
      shortSetting: '財布、コンビニ、台所、帰宅後の机',
      storyTitles: ['我慢レシート', '残高のない家計簿', '諦めた理由欄', '生活通知の赤字', '夜の家計簿', '買えなかったものの棚'],
      shortTitles: ['今日の我慢を1つ減らす', '家計モヤモヤ3カット', '買い足さない夜の工夫', '生活不安の小さな逃げ道', '節約疲れをほどく字幕', '明日ラクになる一手'],
      explainerTitles: ['生活不安が刺さる理由', '家計フックを安全に使う', '我慢の物語化', '節約疲れを企画にする', '生活数字の見せ方', '不安を煽らない構成'],
      novelTitles: ['我慢レシート図書館', '夜の家計簿係', '買えなかったものの町', '生活通知局', '諦めた理由の棚', '残高のない商店街'],
    },
    continuity: {
      keyword: '章をまたぐ謎',
      actionNoun: '次回の残し方',
      readerNeed: '答えを急がず追い続けたい問い',
      emotionalHook: '一度ではわからない違和感が、読み進めるほど別の意味に変わる快感。',
      artifact: '章末だけに現れる白紙ログ',
      artifactVariants: ['章末だけに現れる白紙ログ', '最後の欄だけ空いた記録票', '次話の証拠だけが消えたノート', '回収前の伏線を預かる引き出し', '読了後に一行増える目次', '空欄のまま届く章末メモ'],
      visualCue: '最後の欄だけ空白の記録',
      shortSetting: 'ノート、動画のラスト字幕、未完成の図',
      storyTitles: ['白紙ログ', '最後の欄だけ空いた日', '回収待ちノート', '次話の余白', '空欄の記録係', '続きのないメモ'],
      shortTitles: ['次回を見たくなる残し方', '最後の1秒に置く謎', 'コメントで続く仕掛け', '回収待ち字幕', '次を見る理由の作り方', 'ラストの空欄テク'],
      explainerTitles: ['読者維持の作り方', '章末フックを分析する', '続きが見たくなる構造', '伏線と回収の設計', '連載企画の伸ばし方', '未解決を残す技術'],
      novelTitles: ['白紙ログの記録係', '章末図書館', '回収待ちの町', '最後の欄の読者', '空欄年代記', '続きのない手紙'],
    },
    system: {
      keyword: '見えない仕組み',
      actionNoun: '構造の見抜き方',
      readerNeed: '自分のせいに見える不利益の裏側を知りたい欲求',
      emotionalHook: '自分の失敗だと思っていたことが、実は仕組みで誘導されていたと知る衝撃。',
      artifact: '見えないルールだけが出る掲示板',
      artifactVariants: ['見えないルールだけが出る掲示板', '細則だけが増える駅の貼り紙', '自分の行動を誘導する透明な規約欄', '選択肢の裏側を示す導線図', '誰も読まないルールブックの余白', '街の動きを変える隠し回覧'],
      visualCue: '誰も見ていない掲示板に増える細則',
      shortSetting: 'アプリ画面、駅掲示板、職場の貼り紙',
      storyTitles: ['見えない規約掲示板', 'ルールの裏窓', '細則だけが増える朝', '仕組みの張り紙', '誘導線の街', '透明な規約欄'],
      shortTitles: ['その仕組みを3秒で見る', '損する導線を直す', '見えないルールの見分け方', 'なぜそうなるのか字幕', '構造を1画面で分解', '誘導に気づく動画'],
      explainerTitles: ['見えない仕組みの解説', 'アルゴリズム不安を安全に扱う', '制度を物語化する方法', '構造分析の作り方', '炎上せずに分解する', '仕組みを企画に変える'],
      novelTitles: ['透明規約の町', '細則掲示板の夜', '見えないルール係', '誘導線都市', '規約欄の読者', '仕組みを読む図書館'],
    },
    topic: {
      keyword: '世の中で動いた感情',
      actionNoun: '感情の見せ方',
      readerNeed: '言葉にしにくい違和感を誰かに代弁してほしい欲求',
      emotionalHook: '何に反応したのか自分でもわからない感情が、画面上に形を持つ瞬間。',
      artifact: '感情だけが残る通知欄',
      artifactVariants: ['感情だけが残る通知欄', '本文が消えて気持ちだけ残ったメモ', '名前のない反応を集める画面', '言えない言葉だけが光る窓', '誰のものでもない感情タグ', '匿名の本音が浮かぶ掲示板'],
      visualCue: '本文が消えて感情だけが残った通知',
      shortSetting: 'スマホ画面、机、移動中の手元',
      storyTitles: ['感情通知欄', '言えない言葉の窓', '反応だけが残る朝', '匿名の感情メモ', '心だけが光る画面', '名前のない通知'],
      shortTitles: ['その感情を1秒で見せる', 'モヤモヤを3カットにする', '共感の正体を字幕にする', '言えない気持ちの見せ方', '反応が増える冒頭', '感情フックの保存版'],
      explainerTitles: ['感情フックの作り方', '話題を企画に変える方法', '共感が動く理由', '反応の正体を分解する', '流行語に頼らない設計', '世の中の感情を読む'],
      novelTitles: ['感情通知局', '名前のない反応録', '言えない言葉の町', '匿名感情図書館', '心だけが光る夜', '反応を預かる人'],
    },
  };
  const concept = bank[insightType] ?? bank.topic;
  const artifact = pickVariant(concept.artifactVariants ?? concept.storyTitles ?? [concept.artifact], offset);
  return {
    ...concept,
    artifact,
    storyTitle: pickVariant(concept.storyTitles, offset),
    shortTitle: pickVariant(concept.shortTitles, offset),
    explainerTitle: pickVariant(concept.explainerTitles, offset),
    novelTitle: pickVariant(concept.novelTitles, offset),
  };
}

function pickVariant(items, offset) {
  if (!Array.isArray(items) || items.length === 0) return '物語の種';
  return items[offset % items.length];
}

function titleCandidatesForCategory(categoryId, concept, anchor, seed, index) {
  const fallbackTitles = {
    'story-manga': [
      concept?.storyTitle,
      anchor?.artifact,
      ...(concept?.storyTitles ?? []),
    ],
    'long-novel': [
      concept?.novelTitle,
      anchor?.artifact,
      ...(concept?.novelTitles ?? []),
    ],
    'short-video': [
      concept?.shortTitle,
      `${anchor?.actionLabel ?? concept?.actionNoun ?? '一手'}を3カットで見せる`,
      `保存用・${anchor?.artifact ?? concept?.artifact ?? '生活メモ'}`,
      ...(concept?.shortTitles ?? []),
    ],
    'trend-explainer': [
      concept?.explainerTitle,
      `${anchor?.focusTerm ?? concept?.keyword ?? '話題'}が刺さる理由`,
      `${anchor?.productionAngle ?? '制作判断'}を企画に変える方法`,
      `${compactEvidenceText(anchor?.title, 24)}の反応を読む`,
      ...(concept?.explainerTitles ?? []),
    ],
  };
  return rotatedTitleCandidates(fallbackTitles[categoryId] ?? fallbackTitles['story-manga'], seed, index);
}

function rotatedTitleCandidates(candidates, seed, index) {
  const items = uniqueList(candidates);
  if (items.length === 0) return ['物語の種'];
  const start = Math.abs((Number(seed) || 0) * (PLAN_BATCH_SIZE + 2) + index) % items.length;
  return Array.from({ length: Math.min(3, items.length) }).map((_, candidateIndex) => items[(start + candidateIndex) % items.length]);
}

function uniqueList(items) {
  const seen = new Set();
  return (items ?? []).filter((item) => {
    const value = String(item ?? '').trim();
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function stableHash(value) {
  return Array.from(String(value ?? '')).reduce((hash, char) => ((hash * 31 + char.charCodeAt(0)) >>> 0), 2166136261);
}

function compactEvidenceText(value, maxLength = 56) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function observationEvidenceText(observation) {
  return [
    observation?.title,
    observation?.snippet,
    observation?.queryUsed,
    observation?.query,
    ...(Array.isArray(observation?.tags) ? observation.tags : []),
  ]
    .filter(Boolean)
    .join(' ');
}

function rotatePlanObservations(observations, seed = 0, limit = PLAN_BATCH_SIZE) {
  const pool = Array.isArray(observations) ? observations.filter(Boolean) : [];
  if (pool.length === 0) return [];
  const start = Math.abs(Number(seed) || 0) % pool.length;
  return Array.from({ length: limit }).map((_, index) => pool[(start + index) % pool.length]);
}

function evidenceTraits() {
  return [
    {
      key: 'reply',
      test: /返信|未返信|通知|既読|連絡|言葉|本音|メッセージ|返事/,
      fallbackInsights: ['relation'],
      focusTerms: ['返せなかった一言', '届かなかった本音', '未返信の後悔'],
      scenes: ['玄関とスマホ通知の間', '駅前の待ち合わせ場所', '夜の部屋と未読欄'],
      artifacts: ['返せなかった一文だけが光る通知欄', '未送信の言葉を預かる改札', '既読にならない手紙の束'],
      tensions: ['近い相手ほど本音を飲み込む', '言うほどでもない一言が関係を変える', '返せなかった時間だけが残る'],
      readerNeeds: ['近い相手ほど言葉を飲み込んでしまう不安', '小さなすれ違いを取り戻したい気持ち'],
      emotionalHooks: ['悪意ではなかった言葉が届かないまま関係を変える痛み。', '一通だけ返せなかったことが、後から大きく見えてくる怖さ。'],
      actionLabels: ['返事の整え方', '言えなかった一言の戻し方'],
      productionAngles: ['対話の遅延を見せ場にする', '未返信を回収フックにする'],
    },
    {
      key: 'public-rule',
      test: /駅|通勤|制度|ルール|貼り紙|不公平|理不尽|職場|申請|規約|構造/,
      fallbackInsights: ['unfairness', 'system'],
      focusTerms: ['見えないルールの不公平', '言い返せない理不尽', '透明な制度疲れ'],
      scenes: ['駅前や職場の掲示板', '申請窓口と通勤導線', '誰も読まない規約が増える場所'],
      artifacts: ['細則だけが増える貼り紙', '反論だけが赤字で残る回覧板', '選択肢の裏側を示す導線図'],
      tensions: ['ルールはあるのに理由が見えない', '正しいことを言うほど立場が悪くなる', '自分の失敗に見える不利益が仕組みから来る'],
      readerNeeds: ['自分のせいに見える不利益の裏側を知りたい欲求', 'その場で言い返せなかった悔しさ'],
      emotionalHooks: ['自分の失敗だと思っていたことが、実は仕組みで誘導されていたと知る衝撃。', '正しいことを言うほど立場が悪くなる理不尽さ。'],
      actionLabels: ['仕組みの見抜き方', '理不尽をかわす一手'],
      productionAngles: ['構造を小道具化する', '反論の余白を見せ場にする'],
    },
    {
      key: 'family-life',
      test: /家族|家庭|冷蔵庫|買い物|節約|家計|我慢|暮らし|生活|子育て|親子/,
      fallbackInsights: ['life', 'relatable'],
      focusTerms: ['生活の小さな我慢', '家族に言えない不便', '節約疲れの違和感'],
      scenes: ['台所や帰宅後の机', '冷蔵庫の前と買い物メモ', '家族の生活動線が重なる場所'],
      artifacts: ['買い忘れと我慢が並ぶ冷蔵庫メモ', '我慢の回数が印字されるレシート', '生活のズレを記録する買い物メモ'],
      tensions: ['近い相手ほど小さな我慢を言い出せない', '節約や家事の小さな差が感情に変わる', '便利なはずの生活メモが負担を可視化する'],
      readerNeeds: ['生活の数字に追われる不安', '自分だけだと思っていた小さなあるある'],
      emotionalHooks: ['誰にも説明するほどではない違和感が、毎日少しずつ積もる感覚。', '残高や予定表を見るたび、選択肢が少しずつ削られる感覚。'],
      actionLabels: ['我慢の減らし方', '生活違和感の直し方'],
      productionAngles: ['生活小道具から感情を出す', '我慢の回数を物語化する'],
    },
    {
      key: 'time-regret',
      test: /時間|期限|予定|後悔|遅れ|間に合|年後|今日|明日/,
      fallbackInsights: ['regret'],
      focusTerms: ['取り戻せない時間', '期限を過ぎた後悔', '先延ばしの痛み'],
      scenes: ['机のカレンダーと通知欄', '朝の部屋と予定表', '期限だけが光る画面'],
      artifacts: ['明日だけが先に届くカレンダー', '過ぎた日付を配達する郵便受け', '昨日の予定だけが残るスマホ通知'],
      tensions: ['まだ間に合うと思っていた予定が遠く過ぎる', '小さな先延ばしが取り戻せない差になる', '時間だけが自分を置いて進む'],
      readerNeeds: ['時間だけが早く過ぎてしまう後悔', 'まだ間に合う方法を知りたい焦り'],
      emotionalHooks: ['まだ間に合うと思っていた予定が、気づいた時には遠く過ぎている怖さ。', '一日を失った感覚が、生活全体の不安に変わる痛み。'],
      actionLabels: ['予定の見直し方', '後悔を減らす一手'],
      productionAngles: ['時間差をフックにする', '予定表を謎として扱う'],
    },
    {
      key: 'evaluation',
      test: /評価|採点|点数|査定|ランキング|比較|AI|合格|却下/,
      fallbackInsights: ['evaluation'],
      focusTerms: ['見えない評価', '理由のない点数', '比較疲れ'],
      scenes: ['通知欄と提出物の横', 'ランキング画面の外側', '採点理由が隠れた画面'],
      artifacts: ['理由だけが浮かぶ評価欄', '点数の下に出る灰色メモ', '評価不能と書かれた空白欄'],
      tensions: ['点数だけが先に届き理由だけが見えない', '比べるほど自分の基準が消える', '評価されているのに改善点が読めない'],
      readerNeeds: ['理由の見えない点数に振り回される不安', '比較され続ける疲れから降りたい気持ち'],
      emotionalHooks: ['点数だけが先に届き、理由だけが誰にも見えない怖さ。', '比べられるほど、自分の輪郭が薄くなる不安。'],
      actionLabels: ['判断基準の見直し方', '比較疲れから降りる方法'],
      productionAngles: ['評価欄を謎にする', '点数の裏側を安全に見せる'],
    },
    {
      key: 'saving',
      test: /保存|ノウハウ|方法|手順|便利|知恵|対策|コツ|あとで/,
      fallbackInsights: ['saving'],
      focusTerms: ['あとで助かる知恵', '保存したくなる一手', '明日の自分へのメモ'],
      scenes: ['机、冷蔵庫、玄関、メモアプリ', '困った時だけ開く生活ノート', '手元だけで試せる場所'],
      artifacts: ['未来の自分から届くメモ', '明日の自分宛ての付箋', 'あとで助かる一行が増える冷蔵庫'],
      tensions: ['今すぐは無理でも後で見返したい', '知っているだけでは使えない', '便利情報が多すぎて本当に使う一手が残らない'],
      readerNeeds: ['今すぐは無理でもあとで見返したい安心感', '小さな逃げ道を持っておきたい気持ち'],
      emotionalHooks: ['自分だけで抱えていた不便に、小さな逃げ道が見つかる安心。', '明日の自分が少し助かるだけで、今日の不安が軽くなる。'],
      actionLabels: ['保存される一手', '明日の自分に渡す方法'],
      productionAngles: ['保存理由を先に見せる', '手順を一つに絞る'],
    },
    {
      key: 'continuity',
      test: /続き|連載|章|伏線|考察|読了|次回|回収|謎/,
      fallbackInsights: ['continuity'],
      focusTerms: ['章をまたぐ謎', '続きが気になる余白', '回収待ちの伏線'],
      scenes: ['章末の白紙ログ', '未完成の図と次話予告', '読了後に一行増える目次'],
      artifacts: ['章末だけに現れる白紙ログ', '次話の証拠だけが消えたノート', '空欄のまま届く章末メモ'],
      tensions: ['一度ではわからない違和感が後で意味を変える', '答えが出ないから読み続けたくなる', '回収前の余白が不安と期待を同時に残す'],
      readerNeeds: ['答えを急がず追い続けたい問い', '読み進めるほど意味が変わる快感'],
      emotionalHooks: ['一度ではわからない違和感が、読み進めるほど別の意味に変わる快感。', '空欄が残るほど、次の章を開きたくなる。'],
      actionLabels: ['次回の残し方', '章末フックの作り方'],
      productionAngles: ['章末の空欄を使う', '伏線の再解釈を設計する'],
    },
  ];
}

function evidenceTraitFor(observation, insight) {
  const text = observationEvidenceText(observation);
  const traits = evidenceTraits();
  return (
    traits.find((trait) => trait.test.test(text)) ??
    traits.find((trait) => trait.fallbackInsights?.includes(insight?.type)) ??
    {
      key: 'topic',
      focusTerms: ['世の中で動いた感情', '言葉にしにくい違和感', '名前のない反応'],
      scenes: ['スマホ画面と机の上', '移動中の手元', '匿名の反応が集まる画面'],
      artifacts: ['感情だけが残る通知欄', '本文が消えて気持ちだけ残ったメモ', '名前のない反応を集める画面'],
      tensions: ['何に反応したのか自分でもわからない', '言葉にしにくい違和感が画面上に形を持つ', '匿名の反応だけが先に増える'],
      readerNeeds: ['言葉にしにくい違和感を誰かに代弁してほしい欲求', '自分の反応の正体を知りたい気持ち'],
      emotionalHooks: ['何に反応したのか自分でもわからない感情が、画面上に形を持つ瞬間。', '名前がつかない違和感ほど、誰かに形にしてほしくなる。'],
      actionLabels: ['感情の見せ方', '違和感の言語化'],
      productionAngles: ['感情だけを小道具化する', '反応の正体を分解する'],
    }
  );
}

function focusTermForObservation(observation, trait, offset) {
  const tags = focusTermsFromValues(Array.isArray(observation?.tags) ? observation.tags : []);
  if (tags.length > 0) return tags.join('・');
  const queryTerms = focusTermsFromValues([safeQueryForPlan(observation?.queryUsed ?? observation?.query)]);
  if (queryTerms.length > 0) return queryTerms.join('・');
  return pickVariant(trait.focusTerms, offset);
}

function focusTermsFromValues(values) {
  return uniqueList(
    values
      .flatMap((value) => String(value ?? '').split(/[\s、,／/・]+/))
      .map(cleanFocusTerm)
      .filter((value) => value && !isMetaFocusTerm(value)),
  ).slice(0, 2);
}

function cleanFocusTerm(value) {
  return compactEvidenceText(value, 14)
    .replace(/への反応|の反応|周辺の反応|反応/g, '')
    .replace(/[【】「」『』（）()[\]"”“]/g, '')
    .trim();
}

function isMetaFocusTerm(value) {
  const normalized = String(value ?? '').trim();
  return (
    /^(漫画|まんが|マンガ|小説|動画|ショート|ショート動画|縦読み|4コマ|企画|解説|トレンド|話題|カテゴリ|媒体|対象|読者|視聴者|公開Web|RSS|Web|検索|取得|分析|ニュース|SNS|note|GitHub|日本|国内|JP|JAPAN|public|general|round)$/i.test(
      normalized,
    ) || /^\d+d?$/.test(normalized)
  );
}

function deriveEvidenceAnchor(observation, insight, seed = 0, index = 0) {
  const trait = evidenceTraitFor(observation, insight);
  const hash = stableHash(`${observation?.id ?? ''}|${observation?.title ?? ''}|${observation?.sourceUrl ?? ''}|${seed}|${index}`);
  const offset = Math.abs((Number(seed) || 0) * 7 + index + hash);
  const title = compactEvidenceText(observation?.title ?? insight?.material ?? pickVariant(trait.focusTerms, offset), 72);
  return {
    id: observation?.id ?? '',
    source: observation?.source ?? '公開Web/RSS',
    sourceUrl: observation?.sourceUrl ?? '',
    title,
    query: safeQueryForPlan(observation?.queryUsed ?? observation?.query),
    observedAt: observation?.observedAt ?? '',
    publishedAt: observation?.publishedAt ?? '',
    insightType: insight?.type ?? 'topic',
    conceptType: trait.fallbackInsights?.[0] ?? insight?.type ?? 'topic',
    focusTerm: focusTermForObservation(observation, trait, offset),
    scene: pickVariant(trait.scenes, offset + 1),
    artifact: pickVariant(trait.artifacts, offset + 2),
    tension: pickVariant(trait.tensions, offset + 3),
    readerNeed: pickVariant(trait.readerNeeds, offset + 4),
    emotionalHook: pickVariant(trait.emotionalHooks, offset + 5),
    actionLabel: pickVariant(trait.actionLabels, offset + 6),
    productionAngle: pickVariant(trait.productionAngles, offset + 7),
  };
}

function evidenceAnchorForPlan(anchor, categoryId) {
  const base = {
    id: anchor.id,
    sourceUrl: anchor.sourceUrl,
    observedAt: anchor.observedAt,
    publishedAt: anchor.publishedAt,
    focusTerm: anchor.focusTerm,
    query: categoryId === 'trend-explainer' ? anchor.query : undefined,
    scene: anchor.scene,
    artifact: anchor.artifact,
    tension: anchor.tension,
    readerNeed: anchor.readerNeed,
    productionAngle: anchor.productionAngle,
  };
  if (categoryId === 'trend-explainer') {
    return {
      ...base,
      title: anchor.title,
      source: anchor.source,
    };
  }
  return base;
}

function analysisAnchorsForCluster(cluster, seed = 0) {
  return rotatePlanObservations(cluster?.observations, seed, PLAN_BATCH_SIZE).map((observation, index) => {
    const insight = classifyObservationInsight(observation ?? {});
    return deriveEvidenceAnchor(observation, insight, seed, index);
  });
}

function enrichDeepAnalysisWithEvidence(base, categoryId, cluster, variantSeed = 0) {
  const anchors = analysisAnchorsForCluster(cluster, variantSeed);
  if (anchors.length === 0) return base;
  const primary = anchors[0];
  const anchorSummary = uniqueList(anchors.map((anchor) => `「${anchor.focusTerm}」`)).slice(0, 3).join(' / ');
  const observationPhrase =
    categoryId === 'trend-explainer'
      ? `取得タイトル「${primary.title}」周辺の反応`
      : `取得根拠から抽出した「${primary.focusTerm}」`;
  const queryPhrase = categoryId === 'trend-explainer' ? primary.query : primary.focusTerm;
  const categoryMoves = {
    'story-manga': `${primary.artifact}を冒頭1ページの異常表示にし、${primary.tension}を読者が先に感じる構造にする。`,
    'short-video': `${primary.scene}で${primary.artifact}を冒頭0秒に置き、${primary.actionLabel}までを3カットで回収する。`,
    'trend-explainer': `${primary.title}を現象名として消費せず、${primary.tension}と${primary.productionAngle}に分解する。`,
    'long-novel': `${primary.artifact}を章ごとの記録にし、${primary.tension}を他者の痛みへ連鎖させる。`,
  };
  const productionMoves = {
    'story-manga': `${primary.scene}を舞台に、固有名詞ではなく${primary.artifact}で現代性を見せる`,
    'short-video': `${primary.actionLabel}を1本1手順に固定し、保存理由を最後の字幕に置く`,
    'trend-explainer': `観測、心理、制作手順、注意点の順で${primary.productionAngle}を説明する`,
    'long-novel': `${primary.artifact}を章末証拠として反復し、回収前の余白を作る`,
  };

  return {
    ...base,
    surfacePattern: uniqueList([
      `今回の切り口: ${anchorSummary}。${observationPhrase}を、${primary.scene}の見せ場へ変換します。`,
      categoryMoves[categoryId] ?? categoryMoves['story-manga'],
      ...base.surfacePattern,
    ]).slice(0, 5),
    humanMotivation: uniqueList([
      primary.readerNeed,
      ...anchors.slice(1).map((anchor) => anchor.readerNeed),
      ...base.humanMotivation,
    ]).slice(0, 5),
    narrativeMechanism: uniqueList([
      primary.tension,
      `${primary.artifact}を使った見せ場`,
      ...base.narrativeMechanism,
    ]).slice(0, 5),
    productionMechanism: uniqueList([
      productionMoves[categoryId] ?? productionMoves['story-manga'],
      primary.productionAngle,
      ...base.productionMechanism,
    ]).slice(0, 5),
    opportunityGap: uniqueList([
      `${queryPhrase}で見えた反応は、そのまま流行語にせず「${primary.focusTerm}」として扱うと、反復ではなく今回固有の企画判断になります。`,
      ...base.opportunityGap,
    ]).slice(0, 3),
    categoryInsight: `今回の分析では、${primary.focusTerm}を${primary.tension}という読者・視聴者心理に変換できる。今回は${primary.artifact}を核にすると、再検索ごとに別の企画角度を作れます。`,
  };
}

function observationSignalForPlan(observation, insight, anchor) {
  const observedAt = observation?.observedAt ? `取得時刻 ${formatShortDateTime(observation.observedAt)}` : '取得時刻未取得';
  const query = observation?.queryUsed ? `検索語「${safeQueryForPlan(observation.queryUsed)}」` : '公開Web/RSS取得';
  const title = anchor?.title ? `取得タイトル「${anchor.title}」` : `${insight.material}に近い反応`;
  return `${query}で、${title}を確認（${observedAt}）。企画では「${anchor?.readerNeed ?? '読者欲求'}」として扱う。`;
}

function safeQueryForPlan(query) {
  return String(query ?? '')
    .replace(/\s*\/\s*公開Web\/RSS取得\d*/g, '')
    .replace(/[【】「」『』（）()[\]"”“]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 36) || '公開Web/RSS';
}

function formatShortDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  const parts = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}/${byType.month}/${byType.day} ${byType.hour}:${byType.minute}`;
}

function compactTitle(title) {
  return String(title ?? '観測シグナル')
    .replace(/[【】「」]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 28);
}

function primaryCreativeKeyword(observation) {
  const tags = observation?.tags ?? [];
  const ignored = new Set(['TikTok', 'YouTube Shorts', 'Google Trends', 'Netflix', 'LINE', '保存したい']);
  return tags.find((tag) => !ignored.has(tag)) ?? compactTitle(observation?.title ?? '生活不安');
}

function slugForId(value) {
  return String(value ?? 'plan')
    .normalize('NFKD')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 40) || 'plan';
}

function planForCategory(categoryId, cluster, variantSeed = 0) {
  const properNounUsage = properNounUsageForCategory(categoryId);
  const safeFlags = [
    {
      severity: 'safe',
      note: '実在サービス名は証拠・配信文脈でのみ使用し、架空物語の黒幕や登場人物にはしていません。',
    },
  ];

  const plans = {
    'story-manga': [
    {
      id: 'story-manga-hidden-review',
      targetFormat: 'ストーリー漫画',
      formatLabel: '連載第1話',
      titleCandidates: [
        '灰色の査定欄',
        'きみの評価は嘘をつく',
        '隠しメモの読み方',
        '点数の裏側',
        '評価不能の朝',
      ],
      reasonToWin: [
        'AI評価や職場査定への不安を、読者が一瞬で理解できる超能力に置き換えられる',
        '理不尽の正体が個人ではなく制度だとわかるため、怒りだけでなく救済感が出る',
        '毎話「隠しメモ」が見える形式にすると、短い引きで連載化しやすい',
      ],
      audiencePromise: '職場や生活の理不尽を、架空の評価システムでスカッと可視化する。',
      emotionalHook: '自分だけが不当に低く見られている不安。',
      premise:
        '契約社員の主人公は、社内評価システムの隠しメモだけ読めるようになる。最初は自分の評価を直すために動くが、同僚の不利益も改ざんされた入力で作られていると知る。',
      exampleDetail:
        '第1話は、主人公が「評価不能」の通知を受け取り、画面下に灰色で表示された本当の理由を読むところから始める。上司を直接悪人にせず、入力欄・会議メモ・評価タグのズレを積み上げて、最後に同僚の評価まで同じ仕組みで落とされていたと判明させる。',
      outline: [
        '第1話: 最低評価の通知と隠しメモの発見',
        '第2話: 先輩の評価が意図的に下げられている証拠',
        '第3話: 会議で正面から告発せず、評価ロジックを再現して見せる',
        '第4話: 本当の敵が個人ではなく制度設計だと判明',
      ],
      opening: '朝の通知音。画面には「評価不能」。その下に、誰にも見えていない灰色の一文が浮かぶ。',
      productionNotes: ['会社名は架空にする', '実在AIサービス名は出さない', 'チャット風の画面は架空UIにする'],
      differentiation: '復讐劇ではなく、構造の嘘を可視化する救済劇に寄せる。',
      riskNotes: ['実在企業の人事制度を連想させすぎない'],
      draftInstructions:
        '出力はストーリー漫画の第1話として、ページごとの流れ、主要コマ、セリフ、ラストの引きを具体的に書いてください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
    },
    {
      id: 'story-manga-receipt-ghost',
      targetFormat: 'ストーリー漫画',
      formatLabel: '読み切り',
      titleCandidates: ['レシートに本音が印字される', '買えなかった理由', '返品できない一日'],
      reasonToWin: [
        '節約・物価高・家計不安を、レシートという日常物で視覚化できる',
        '読者が自分の生活に置き換えやすく、SNSで感想を言いやすい',
        '短編でも「本音の印字」という一発ギミックで理解が速い',
      ],
      audiencePromise: '生活の小さな我慢を、少し不思議なレシートで可視化する。',
      emotionalHook: '本当は欲しかったものを諦める痛み。',
      premise:
        '主人公が買い物をすると、レシートに金額ではなく「買わなかった理由」が印字される。最初は節約に役立つだけだったが、家族や友人のレシートにも言えなかった本音が出てしまう。',
      exampleDetail:
        'コンビニでスイーツを棚に戻した直後、レシートに「自分にご褒美を与える資格がないと思ったため」と出る。主人公は笑ってごまかすが、次の客のレシートにも似た言葉が出て、街全体が我慢を隠していると気づく。',
      outline: ['冒頭: 変なレシート', '中盤: 他人の我慢も見える', '転機: 友人の本音を読んでしまう', '結末: ひとつだけ買う勇気'],
      opening: 'レシートの合計欄には、金額ではなく「諦めた理由」とだけ印字されていた。',
      productionNotes: ['店舗名は架空にする', '実在チェーンを描写しない', '小物と表情で見せる'],
      differentiation: '節約ノウハウではなく、我慢の心理を物語化する。',
      riskNotes: ['実在店舗や商品を貧困描写の象徴にしない'],
      draftInstructions:
        '出力は24ページ読み切り漫画のプロットとして、起承転結、重要コマ、セリフ、読後感を具体化してください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
    },
    {
      id: 'story-manga-comment-weather',
      targetFormat: 'ストーリー漫画',
      formatLabel: '縦読み漫画',
      titleCandidates: ['コメント欄の天気予報', '明日の炎上が見える', '晴れない通知'],
      reasonToWin: [
        'SNS疲れと承認不安を、天気予報のような軽い比喩で扱える',
        '実名SNSを使わず架空アプリにすれば、安全に現代性を出せる',
        '縦読みで通知・雲・雨の視覚演出を使いやすい',
      ],
      audiencePromise: 'コメント欄の空気が天気として見える世界で、言葉の重さを描く。',
      emotionalHook: '投稿する前から傷つく未来が見えてしまう怖さ。',
      premise:
        '主人公は投稿前に、コメント欄の空気が天気予報として見える。晴れなら拡散、雨なら炎上、濃霧なら誰にも届かない。ある日、親友の投稿だけ毎回「警報」になる。',
      exampleDetail:
        '主人公が何気ない写真を投稿しようとすると「弱い雨」。ところが親友の相談投稿には赤い警報が出る。主人公は止めようとするが、親友は「見えないから言えることもある」と返す。',
      outline: ['通知の天気', '親友の警報', '止めるか見守るか', '言葉を選び直す結末'],
      opening: '投稿ボタンの上に、小さな傘マークが浮いていた。',
      productionNotes: ['SNS名は架空にする', '炎上相手を実在人物にしない', '天気アイコンで説明量を減らす'],
      differentiation: '炎上バトルではなく、投稿前の心理サスペンスにする。',
      riskNotes: ['特定プラットフォームのアルゴリズムを断定しない'],
      draftInstructions:
        '出力は縦読み漫画の第1話として、スクロール演出、各画面の見せ場、セリフ、次話への引きを具体化してください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
    },
    {
      id: 'story-manga-family-cache',
      targetFormat: 'ストーリー漫画',
      formatLabel: '家族ドラマ連載',
      titleCandidates: ['家族の検索履歴だけが見える', '言えなかった検索窓', '夜中の候補語'],
      reasonToWin: [
        '検索履歴という身近な行動から、家族の孤独や不安を即座に見せられる',
        'ミステリーと生活ドラマの中間に置けるため読者層が広い',
        '毎話ひとつの検索語を解く構造にできる',
      ],
      audiencePromise: '言えなかった悩みを検索語から読み解く、近距離ミステリー。',
      emotionalHook: '近い人ほど何を抱えているかわからない寂しさ。',
      premise:
        '主人公は家のWi-Fiにつながった端末の検索候補だけ見えるようになる。家族の誰かが深夜に検索した言葉を追ううち、家族それぞれの不安と優しさに触れていく。',
      exampleDetail:
        '母の端末に「家族に迷惑をかけない 辞め方」という候補が出る。主人公は退職だと思い込むが、実際は長年続けた地域活動を辞めたいという小さなSOSだった。',
      outline: ['変な検索候補', '家族への誤解', '本当の悩み', '言葉にして助ける'],
      opening: '夜中のリビングで、誰も触っていない検索窓だけが光っていた。',
      productionNotes: ['実在検索サービス名は出さない', '家庭内監視の肯定にしない', '最後に対話で回収する'],
      differentiation: '覗き見ではなく、対話に戻る物語にする。',
      riskNotes: ['プライバシー侵害を正当化しない'],
      draftInstructions:
        '出力は連載漫画の第1話として、人物関係、画面演出、セリフ、最後の検索候補による引きを具体化してください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
    },
    {
      id: 'story-manga-lost-notice-box',
      targetFormat: 'ストーリー漫画',
      formatLabel: '読み切り',
      titleCandidates: ['押し入れの未読通知', 'しまったままの返事', '古いスマホが鳴る夜'],
      reasonToWin: [
        '通知疲れを幽霊や呪いではなく、返せなかった言葉の物語に変換できる',
        '部屋の中だけで完結するため読み切り漫画にしやすい',
        '最後に返信するか消すかの選択で読後感を作れる',
      ],
      audiencePromise: '過去に返せなかったメッセージを、古い端末の通知として可視化する。',
      emotionalHook: 'もう遅いかもしれない返事を抱えている痛み。',
      premise:
        '引っ越し準備中の主人公が、押し入れから電源の入らない古いスマホを見つける。画面には、過去に返せなかった言葉だけが通知として浮かぶ。',
      exampleDetail:
        '最初の通知はどうでもいい謝罪に見えるが、読み進めると相手が本当に待っていたのは返事ではなく、気づいてほしかった一言だったとわかる。',
      outline: ['押し入れから鳴る通知', '返せなかった言葉の発見', '最後の通知の相手', '送れない返事を別の形で届ける'],
      opening: '電源の切れたスマホが、押し入れの奥で一度だけ震えた。',
      productionNotes: ['実在メッセージアプリ名を出さない', '亡くなった人物の美談だけにしない', '部屋の小物で時間経過を見せる'],
      differentiation: '怪異ではなく、未返信の後悔を生活ミステリーとして扱う。',
      riskNotes: ['実在の事件や個人のメッセージを流用しない'],
      draftInstructions:
        '出力は32ページ読み切り漫画のプロットとして、ページ配分、重要コマ、セリフ、静かなラストを具体化してください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
    },
    {
      id: 'story-manga-town-score-board',
      targetFormat: 'ストーリー漫画',
      formatLabel: '縦読み連載',
      titleCandidates: ['町内スコアボード', '親切が点数になる街', 'いい人ランキングの終わり'],
      reasonToWin: [
        '承認欲求と地域の息苦しさを、点数が見える街として絵にできる',
        '主人公だけでなく住人ごとの短編エピソードに広げられる',
        '親切を点数化する違和感が、読者の生活感覚に刺さりやすい',
      ],
      audiencePromise: '親切が点数になる街で、本当の優しさを選び直す縦読み連載。',
      emotionalHook: '良い人でいなければ居場所がなくなる怖さ。',
      premise:
        '小さな商店街では、人助けをすると頭上のスコアが上がる。主人公は低スコアの祖母を助けようとするが、祖母だけは点数を上げる行動を拒み続ける。',
      exampleDetail:
        '雨の日、主人公は傘を配って点数を稼ぐ。だが祖母は、点数にならない裏口の片づけを一人で続けていて、その理由が次話の謎になる。',
      outline: ['頭上の点数が見える街', '低スコアの祖母', '点数にならない親切', '評価から外れた選択'],
      opening: '商店街の朝は、挨拶より先に点数が飛び交う。',
      productionNotes: ['地域名は架空にする', '善悪を単純化しない', '点数表示は記号的に見せる'],
      differentiation: 'ざまあではなく、評価されない親切の価値を描く。',
      riskNotes: ['特定地域や自治会への風刺に見えすぎないようにする'],
      draftInstructions:
        '出力は縦読み連載の第1話として、スクロール演出、住人紹介、セリフ、次話への謎を具体化してください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
    }],
    'short-video': [
    {
      id: 'short-video-room-route',
      targetFormat: 'ショート動画',
      formatLabel: '30秒生活改善',
      titleCandidates: ['この不便、30秒で消えます', '部屋のストレスを1個だけ直す', '保存用・朝の動線改善'],
      reasonToWin: [
        '冒頭1秒で「自分もやっている不便」を見せられる',
        '無料で真似できるため保存理由が明確',
        'Before/Afterが縦画面でも伝わりやすい',
      ],
      audiencePromise: 'すぐ真似できる生活改善を、最初の1秒で見せます。',
      emotionalHook: '毎日ちょっとだけ損している感覚。',
      premise:
        '狭い部屋の朝のつまずきを1つだけ選び、家にあるものだけで動線を変える。Beforeを先に見せ、最後に費用0円の変化を出す。',
      exampleDetail:
        '朝、充電ケーブルに足を引っかける映像から始める。原因を「床に置く」「毎朝探す」「片手がふさがる」の3字幕で分解し、フックで壁側に固定して、最後に歩線がまっすぐになる映像を見せる。',
      outline: ['0-1秒: つまずく瞬間', '2-8秒: 原因を字幕で分解', '9-24秒: 3つ試す', '25-30秒: 一番効いた変更'],
      opening: '「この3秒のイライラ、毎朝やってませんか？」',
      productionNotes: ['縦画面固定', '字幕は短く', '最後に保存理由を出す'],
      differentiation: '便利グッズ紹介ではなく、無料の配置変更に寄せる。',
      riskNotes: ['他人の部屋画像や商品画像を無断使用しない'],
      draftInstructions:
        '出力は30秒ショート動画の完成台本として、秒数、画面、字幕、ナレーション、撮影小物、最後の保存誘導を書いてください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
    },
    {
      id: 'short-video-meal-reset',
      targetFormat: 'ショート動画',
      formatLabel: '15秒保存ネタ',
      titleCandidates: ['疲れた日の冷蔵庫リセット', '買い足さない夜ごはん', '帰宅後3分の台所'],
      reasonToWin: [
        '疲労・節約・時短が同時に刺さる',
        '完成品より途中の手順を見せると保存されやすい',
        'コメントで代替食材が集まりやすい',
      ],
      audiencePromise: '帰宅後に買い足さず、冷蔵庫の半端食材で一食を作る。',
      emotionalHook: '料理する元気はないが、外食する余裕もない夜。',
      premise:
        '冷蔵庫に残った少量の食材を3つ選び、包丁を使わず一皿にする。完璧な料理ではなく、疲れた日に自分を責めない食事として見せる。',
      exampleDetail:
        '画面左に半端な豆腐、卵、冷凍野菜を並べ、右に完成したスープ丼を一瞬で見せる。途中は「洗い物1個」「味付け2つ」「火を見ない」の字幕に絞る。',
      outline: ['0秒: 完成品', '1-3秒: 残り物3つ', '4-11秒: 混ぜて温める', '12-15秒: 保存理由'],
      opening: '「今日はもう、ちゃんとしなくていい夜ごはんです。」',
      productionNotes: ['食品衛生に注意', '特定商品名を主役にしない', '分量は画面内で短く'],
      differentiation: '映える料理ではなく、自己責めを減らす実用にする。',
      riskNotes: ['健康効果を断定しない'],
      draftInstructions:
        '出力は15秒ショート動画の台本として、冒頭カット、字幕、手元映像、コメント誘導まで具体化してください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
    },
    {
      id: 'short-video-phone-cleanup',
      targetFormat: 'ショート動画',
      formatLabel: '60秒デジタル整理',
      titleCandidates: ['スマホの通知を1つだけ減らす', '寝る前の画面を静かにする', '朝の通知疲れを消す'],
      reasonToWin: [
        '多くの人が感じている通知疲れを扱える',
        '1設定だけなら実行ハードルが低い',
        '画面録画と手元だけで制作できる',
      ],
      audiencePromise: 'スマホを買い替えず、通知のストレスをひとつ減らす。',
      emotionalHook: '休んでいるのに通知で呼び戻される感覚。',
      premise:
        '寝る前に見なくてよい通知を1種類だけ選び、翌朝まで表示されないようにする。アプリ名は架空表示にして、設定変更の考え方を見せる。',
      exampleDetail:
        '通知が連続で鳴る画面から始め、「今すぐ必要」「あとでよい」「見なくてよい」の3分類を表示する。最後に1種類だけオフにして、寝室の画面が暗く静かになる。',
      outline: ['0-2秒: 通知音', '3-15秒: 3分類', '16-45秒: 1種類だけ止める', '46-60秒: 翌朝の差'],
      opening: '「スマホ時間を減らす前に、呼ばれる回数を1個だけ減らします。」',
      productionNotes: ['実在アプリ名を映さない', '設定画面はモックにする', '医療的効果を言わない'],
      differentiation: 'デジタル断ちではなく、通知設計の小さな改善にする。',
      riskNotes: ['個人情報が映る画面録画を使わない'],
      draftInstructions:
        '出力は60秒ショート動画の完成台本として、画面録画風モック、字幕、ナレーション、最後の行動提案を書いてください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
    },
    {
      id: 'short-video-comment-question',
      targetFormat: 'ショート動画',
      formatLabel: 'コメント誘発',
      titleCandidates: ['あなたならどっちを捨てる？', '片づけの最後の1個', 'コメントで決める棚'],
      reasonToWin: [
        '視聴者に判断を委ねるためコメントが増えやすい',
        '生活改善と参加型企画を合わせられる',
        'シリーズ化して次回の理由が作れる',
      ],
      audiencePromise: '片づけの判断を視聴者と一緒に決める。',
      emotionalHook: '捨てたいのに捨てられないものへの罪悪感。',
      premise:
        '棚の最後に残った2つの物を見せ、どちらを残すべきか視聴者に聞く。次回でコメントの理由を分類し、最終判断を見せる。',
      exampleDetail:
        '同じ用途のノート2冊を並べ、「使った回数」「思い出」「今後の用途」を各3秒で見せる。最後に「あなたならA/Bどっち？」で止める。',
      outline: ['0-2秒: 2択提示', '3-15秒: 判断材料', '16-25秒: 迷う理由', '26-30秒: コメント質問'],
      opening: '「最後の1個って、なぜか一番捨てられません。」',
      productionNotes: ['煽りすぎない', '個人情報がある物を映さない', '次回で必ず回収する'],
      differentiation: '片づけ術ではなく、判断プロセスをコンテンツ化する。',
      riskNotes: ['視聴者コメントを晒す演出にしない'],
      draftInstructions:
        '出力はコメント誘発型ショート動画の台本として、選択肢、字幕、質問文、次回予告を具体化してください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
    },
    {
      id: 'short-video-receipt-sort',
      targetFormat: 'ショート動画',
      formatLabel: '45秒家計整理',
      titleCandidates: ['レシートを3色に分けるだけ', '買わなかった理由の棚卸し', '家計メモの見える化'],
      reasonToWin: [
        '家計不安を数字だけでなく感情の分類にできる',
        '手元だけで撮れ、視聴者がすぐ真似できる',
        '保存して後で自分のレシートに使いやすい',
      ],
      audiencePromise: 'レシートを捨てる前に、支出ではなく感情を3色で整理する。',
      emotionalHook: '何に使ったかより、なぜ買ったかがわからない不安。',
      premise:
        '1週間分のレシートを「必要」「不安で買った」「本当は欲しくなかった」の3色に分ける。節約説教ではなく、買い物の理由を見える化する動画にする。',
      exampleDetail:
        '机の上にレシートを並べ、金額を隠して色だけを付ける。最後に「赤が多い日は、買い物ではなく休む予定を先に入れる」と生活改善へ落とす。',
      outline: ['0-2秒: レシート山', '3-10秒: 金額を隠す', '11-32秒: 3色分類', '33-45秒: 来週の買い方を1つ決める'],
      opening: '「節約の前に、何で買ったかだけ見ます。」',
      productionNotes: ['個人情報と店舗名を隠す', '節約額を断定しない', '色は画面左上に凡例を固定する'],
      differentiation: '家計術ではなく、買い物の感情ログとして見せる。',
      riskNotes: ['金融助言や治療効果の断定にしない'],
      draftInstructions:
        '出力は45秒ショート動画の完成台本として、撮影手順、字幕、手元の動き、保存誘導、コメント質問を具体化してください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
      creatorBrief: {
        protagonist: '家計簿が続かない投稿者。節約が苦手なのではなく、買った理由を忘れてしまう。',
        setting: '夜の机、店舗名を隠したレシート、3色のペン。',
        incitingIncident: 'レシートを金額順ではなく、買った時の気持ちで分けると赤色だけが増えていく。',
        conflict: '節約したいのに、不安を埋める買い物を責めると続かない。',
        choice: '買わない努力を増やすか、買いたくなる前の予定を変えるか。',
        payoff: '視聴者が自分のレシートでも試せる小さな整理感を残す。',
      },
    },
    {
      id: 'short-video-quiet-morning',
      targetFormat: 'ショート動画',
      formatLabel: '20秒朝支度',
      titleCandidates: ['朝の探し物を1個だけ消す', '出かける前の無言セット', '玄関前30秒の整え方'],
      reasonToWin: [
        '朝の小さな不便は多くの人が自分事化しやすい',
        'Before/Afterが短尺でも一目で伝わる',
        '家にある物だけでできるため保存されやすい',
      ],
      audiencePromise: '朝の探し物を1つだけ減らし、出発前のストレスを下げる。',
      emotionalHook: '遅刻しそうな時ほど、鍵やイヤホンが見つからない焦り。',
      premise:
        '玄関前に「持ち出す物だけの無言セット」を作る。収納紹介ではなく、朝に判断しない仕組みとして見せる。',
      exampleDetail:
        '出発直前に鍵を探す手元から始める。小皿、充電ケーブル、メモを玄関の同じ場所へ寄せ、翌朝は何も探さず出るカットで終える。',
      outline: ['0-2秒: 探す手元', '3-7秒: 原因字幕', '8-16秒: 置き場所を1つ作る', '17-20秒: 翌朝の無言出発'],
      opening: '「朝の自分は信用しない仕組みにします。」',
      productionNotes: ['家の住所や鍵形状を映さない', '収納用品の購入前提にしない', '音は環境音中心'],
      differentiation: '収納テクではなく、朝の判断回数を減らす設計にする。',
      riskNotes: ['防犯情報が映らないようにする'],
      draftInstructions:
        '出力は20秒ショート動画の完成台本として、カット割り、字幕、手元演出、最後の保存理由を具体化してください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
      creatorBrief: {
        protagonist: '朝に弱い投稿者。努力ではなく仕組みで失敗を減らしたい。',
        setting: '玄関、バッグ置き場、小皿、充電中のスマホ。',
        incitingIncident: '出発30秒前に鍵だけが見つからず、画面上の時間だけが進む。',
        conflict: '片づけを増やすと続かないが、放置すると毎朝焦る。',
        choice: '完璧な収納を目指すか、1つだけ置き場所を固定するか。',
        payoff: '明日の朝だけ真似したくなる軽い実用感。',
      },
    }],
    'trend-explainer': [
    {
      id: 'trend-explainer-short-drama',
      targetFormat: 'トレンド解説動画',
      formatLabel: '8分解説',
      titleCandidates: ['なぜ1分ドラマは止めづらいのか', '短尺視聴の正体', 'ショート動画が物語を変えた理由'],
      reasonToWin: [
        'TikTokやYouTube Shortsの視聴体験を、視聴者自身の行動として語れる',
        '企業批判ではなく構造分析に寄せると安全に深掘りできる',
        '創作者向けの制作ヒントまで落とせる',
      ],
      audiencePromise: 'TikTokやYouTube Shortsの固有名詞を根拠にしつつ、断定告発ではなく仕組みを説明する。',
      emotionalHook: 'なぜわかっていても次を見てしまうのか。',
      premise:
        '短尺ドラマが伸びる理由を、冒頭の損失提示、数十秒ごとの反転、コメント欄の参加感、推薦システムの4層で説明する。',
      exampleDetail:
        '冒頭で「1分なのに続きが気になる」体験を自作モックで再現し、その後にフック、反転、コメント、推薦の4層に分解する。実在サービス名は市場例としてだけ出し、内部事情は断定しない。',
      outline: ['導入: 1分なのに続きが気になる理由', '構造: 損失と反転', '視聴習慣: ながら見と保存', '制作側: 量産できる型', '結論: 創作者が学ぶべき点'],
      opening: '「これは特定の会社の話ではなく、短尺動画が物語の形を変えた話です。」',
      productionNotes: ['実在サービス名は証拠カードに限定', '企業の内部事情を断定しない', '画面例は自作モックにする'],
      differentiation: '炎上解説ではなく、制作者向けの構造分析にする。',
      riskNotes: ['企業・クリエイターへの未確認の意図推定を避ける'],
      draftInstructions:
        '出力は8分解説動画の台本として、導入、章立て、ナレーション、画面テロップ、締めの制作ヒントを具体化してください。',
      properNounUsage: [...properNounUsage, 'Netflix: 長尺配信との比較軸として使用'],
      sourceSimilarityFlags: safeFlags,
    },
    {
      id: 'trend-explainer-ai-evaluation',
      targetFormat: 'トレンド解説動画',
      formatLabel: '5分解説',
      titleCandidates: ['AI評価に人はなぜ不安になるのか', '見えない点数の時代', '評価される側のストレス'],
      reasonToWin: [
        '仕事・AI・評価不安の検索関心を物語ではなく解説で扱える',
        '個人の不満に見せず、評価の透明性という大きなテーマへ広げられる',
        '制作者が漫画や小説へ応用しやすい分析になる',
      ],
      audiencePromise: 'AI評価への不安を、煽りではなく構造で説明する。',
      emotionalHook: '何を見られているかわからないまま点数化される怖さ。',
      premise:
        '人がAI評価に不安を感じる理由を、透明性、訂正可能性、文脈の抜け落ち、責任の所在の4点で解説する。',
      exampleDetail:
        '架空の「作業スコア画面」を使い、数字だけが上がるのに理由が見えない場面を提示する。その後、良い評価制度に必要な説明・異議申し立て・人間の確認を整理する。',
      outline: ['導入: 点数だけ見える不安', '4つの原因', '創作で使う場合の型', '注意点', 'まとめ'],
      opening: '「怖いのはAIそのものではなく、理由を聞けない点数かもしれません。」',
      productionNotes: ['実在企業の制度を断定しない', '架空画面で説明する', '労務・法律助言にしない'],
      differentiation: 'AI脅威論ではなく、評価設計の見えなさに焦点を当てる。',
      riskNotes: ['特定企業の人事制度批判にしない'],
      draftInstructions:
        '出力は5分解説動画の台本として、ナレーション、画面例、注意喚起、創作への応用パートを具体化してください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
    },
    {
      id: 'trend-explainer-save-behavior',
      targetFormat: 'トレンド解説動画',
      formatLabel: '制作者向け講座',
      titleCandidates: ['なぜ保存される動画は伸びるのか', '保存ボタンの心理', 'あとで見るの正体'],
      reasonToWin: [
        'ショート動画制作者がすぐ制作改善に使える',
        '保存・共有という行動を心理と構成で説明できる',
        '生活ノウハウ、漫画、小説にも応用できる',
      ],
      audiencePromise: '保存されるコンテンツの共通点を、制作者向けに分解する。',
      emotionalHook: '見た瞬間はいいのに、なぜ残されるものと流れるものが分かれるのか。',
      premise:
        '保存される理由を、再利用、後で実行、誰かに共有、自分の状態確認の4タイプに分け、各タイプに合う企画例を出す。',
      exampleDetail:
        '生活改善ショートなら「明日やる」、漫画なら「あとで読み返したい感情」、小説なら「設定を追いたい謎」として保存理由を設計する。',
      outline: ['保存は褒めではなく未来の行動', '4タイプ分類', 'カテゴリ別の作り方', 'やってはいけない保存誘導'],
      opening: '「保存してね、では保存されません。保存する理由が先に必要です。」',
      productionNotes: ['数字を断定しない', 'スクショ誘導を過剰にしない', '具体例は架空にする'],
      differentiation: 'アルゴリズム攻略ではなく、視聴者の未来行動から考える。',
      riskNotes: ['プラットフォームの内部評価を断定しない'],
      draftInstructions:
        '出力は制作者向け解説動画の台本として、章ごとの要点、画面テロップ、カテゴリ別作例、締めのチェックリストを書いてください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
    },
    {
      id: 'trend-explainer-line-share',
      targetFormat: 'トレンド解説動画',
      formatLabel: '6分解説',
      titleCandidates: ['なぜ家計ネタは共有されるのか', '節約情報がLINEで回る理由', '生活ノウハウの広がり方'],
      reasonToWin: [
        '家計・節約・共有という実用関心を扱える',
        'LINEの固有名詞を配信文脈として安全に使える',
        'ショート動画や漫画の企画へ接続できる',
      ],
      audiencePromise: '生活ノウハウが人に送られる理由を、感情と実用の両面から説明する。',
      emotionalHook: '役に立つ情報を見たとき、なぜ誰かに送りたくなるのか。',
      premise:
        '共有される生活情報には、相手への気遣い、会話のきっかけ、自分も困っている確認、すぐ試せる低コスト性がある。',
      exampleDetail:
        '架空の節約ネタを例に、送る側が「押し付けにならないか」を気にする心理を出し、文章の柔らかさや実行ハードルが共有率に影響する構造を説明する。',
      outline: ['導入: 送られる情報の条件', '4つの心理', '創作への応用', '危ない表現', 'まとめ'],
      opening: '「役に立つだけでは、誰かに送られません。」',
      productionNotes: ['実在家計データを捏造しない', '節約効果を断定しない', 'LINE画面はモックにする'],
      differentiation: 'バズ技術ではなく、相手に送る心理を扱う。',
      riskNotes: ['金融助言として読める表現を避ける'],
      draftInstructions:
        '出力は6分解説動画の台本として、ナレーション、モック画面、具体例、創作者向けチェックリストを書いてください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
    },
    {
      id: 'trend-explainer-fiction-safe-transform',
      targetFormat: 'トレンド解説動画',
      formatLabel: '制作者向け10分講座',
      titleCandidates: ['実在トレンドを安全に物語化する方法', '固有名詞をネタにしない企画術', '炎上せず構造だけを使う'],
      reasonToWin: [
        '実在サービス名を扱う不安に具体的な変換手順を示せる',
        '漫画家・小説家・動画制作者の制作前チェックに使える',
        '単なる紹介ではなく実務上の事故防止まで踏み込める',
      ],
      audiencePromise: '実在トレンドから、架空設定へ安全に変換する手順を渡す。',
      emotionalHook: '流行を使いたいが、実在企業や作品を傷つけるのは怖い。',
      premise:
        '実在名を「証拠」「媒体形式」「読者欲求」に分解し、物語本文へ入れる時は架空UI、架空制度、架空の生活場面へ変換する。',
      exampleDetail:
        '短尺ドラマの伸びを例に、実在サービス名は導入の根拠に置き、作中では「灰色の通知欄」「架空評価表」「匿名の町内掲示板」へ変換する流れを図解する。',
      outline: ['導入: そのまま使う危険', '分解: 固有名詞と構造を分ける', '変換: 架空UIへ置く', '実例: 3ジャンル展開', '締め: 制作前チェック'],
      opening: '「流行を使うことと、実在名を物語の悪役にすることは別です。」',
      productionNotes: ['実在人物を例にしない', '既存作品の続編案にしない', '画面例は自作モックにする'],
      differentiation: '炎上対策だけでなく、企画の強度を上げる変換術として見せる。',
      riskNotes: ['法的助言ではなく創作上の安全設計として明記する'],
      draftInstructions:
        '出力は制作者向け10分講座の台本として、章立て、ナレーション、図解内容、変換チェックリスト、最後の実践課題を書いてください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
      creatorBrief: {
        protagonist: '実在トレンドを企画へ使いたいが、炎上と類似を避けたい制作者向けの語り手。',
        setting: 'モック画面、ホワイトボード、3つのジャンル別サンプルを並べる解説画面。',
        incitingIncident: '流行語をそのままタイトルに入れた企画が、企画会議で危険だと止められる。',
        conflict: '現実味を残したいが、実在名を物語の主役や黒幕にすると危険が増える。',
        choice: '固有名詞を残すか、構造だけを抽出して架空設定へ変換するか。',
        payoff: '視聴者が自分の企画に転用できる安全な変換表を得る。',
      },
    },
    {
      id: 'trend-explainer-comment-fatigue',
      targetFormat: 'トレンド解説動画',
      formatLabel: '7分解説',
      titleCandidates: ['コメント欄疲れはなぜ物語になるのか', '反応を見るのが怖い時代', '承認不安を企画に変える'],
      reasonToWin: [
        'SNS疲れを個人攻撃ではなく現代的な読者欲求として扱える',
        '漫画、ショート、小説それぞれの作例に橋渡しできる',
        '視聴者自身の投稿経験に置き換えやすい',
      ],
      audiencePromise: 'コメント欄への不安を、創作に使える物語エンジンとして整理する。',
      emotionalHook: '見たいのに、反応を見るのが怖い。',
      premise:
        'コメント欄疲れを、予測不能性、文脈の欠落、承認欲求、炎上への恐れの4つに分け、創作では「空気が見える」「通知が天気になる」などの架空表現へ変える。',
      exampleDetail:
        '架空投稿アプリのモックで、コメント欄が晴れ・雨・霧として予報される画面を示し、これを漫画なら吹き出し外、小説なら章末の通知、ショートなら冒頭フックへ変換する。',
      outline: ['導入: 反応を見る怖さ', '4つの原因', '架空表現への変換', 'ジャンル別作例', '注意点'],
      opening: '「コメント欄は、もう文字だけの場所ではありません。」',
      productionNotes: ['実在アカウントを晒さない', 'コメント実例は架空にする', '誹謗中傷の詳細再現を避ける'],
      differentiation: 'SNS論ではなく、創作者が扱える感情構造として整理する。',
      riskNotes: ['被害体験の消費に見えないよう、救済や選択に着地させる'],
      draftInstructions:
        '出力は7分解説動画の台本として、導入体験、章立て、図解、ジャンル別作例、制作上の注意を書いてください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
      creatorBrief: {
        protagonist: 'コメント欄を見るのが怖い視聴者の感覚を代弁する語り手。',
        setting: '架空投稿アプリ、天気図風コメント欄、漫画・小説・ショート動画の作例ボード。',
        incitingIncident: '投稿ボタンの上に、晴れではなく「弱い雨」の予報が出るモックを見せる。',
        conflict: '反応を求めるほど、反応に傷つく構造から逃げにくい。',
        choice: '恐怖を煽るか、言葉の届き方を選び直す企画へ変えるか。',
        payoff: '視聴者が不安を消費せず、物語上の選択として扱える。',
      },
    }],
    'long-novel': [
    {
      id: 'long-novel-rejection-log',
      targetFormat: '長編小説',
      formatLabel: '長編連載',
      titleCandidates: ['却下理由だけが見える私', '見えない評価欄の読み方', '不合格ログの向こう側'],
      reasonToWin: [
        '評価不安を長期的な主人公の成長へ変換できる',
        '毎章「却下理由」を読む謎解きで継続フックを作れる',
        'ざまあだけでなく救済と制度理解へ広げられる',
      ],
      audiencePromise: '理不尽を読み解く力で、自分と周囲を救う長編連載。',
      emotionalHook: 'なぜ自分だけ選ばれないのかという長期的な痛み。',
      premise:
        '主人公は、申請・面接・提案が却下された本当の理由だけ読める。最初は自分の人生を立て直すが、次第に周囲の人々の不条理も見えてくる。',
      exampleDetail:
        '序盤は就活や社内提案の却下理由を読む個人的な物語にする。中盤で、却下理由には本人の欠点ではなく組織側の都合や誤読も混じるとわかり、終盤で主人公が「選ばれなかった人の記録」を集める側に回る。',
      outline: ['1-10章: 能力の発見と自分の救済', '11-30章: 他者の却下理由を読み解く', '31章以降: 評価する側の矛盾に迫る'],
      opening: '不採用通知の下に、本来なら存在しない一行があった。「理由: 優秀すぎるため扱いにくい」。',
      productionNotes: ['実在企業名は出さず架空組織にする', '現実の制度批判は抽象化する', '章末に小さな謎を残す'],
      differentiation: 'ざまあ単発ではなく、読み解きと救済を主軸にする。',
      riskNotes: ['実在採用サービスや企業を想起させる表現を避ける'],
      draftInstructions:
        '出力はWeb長編小説の第1章として、主人公、世界観、本文、章末の引き、今後30章の展開メモを書いてください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
    },
    {
      id: 'long-novel-small-debt-library',
      targetFormat: '中編小説',
      formatLabel: '中編小説',
      titleCandidates: ['小さな借りだけが本になる図書館', '返せなかった親切', '未返却のやさしさ'],
      reasonToWin: [
        '救済・生活不安・人間関係を中編で濃く扱える',
        '1話ごとに別人物の「返せなかった借り」を読める',
        '派手な能力より感情の回収で読ませられる',
      ],
      audiencePromise: '返せなかった小さな親切を、本として読み直す中編ファンタジー。',
      emotionalHook: '誰かに助けられたのに、何も返せなかった後悔。',
      premise:
        '駅裏の図書館には、人が返せなかった小さな借りだけが本になる。主人公は自分の本を探すうち、家族や職場の人々が抱えている未返却のやさしさを知る。',
      exampleDetail:
        '主人公が最初に読む本は「雨の日に傘を半分貸してくれた人」。たった数分の出来事が、その人の人生では大きな分岐だったとわかり、主人公は直接返せない親切の返し方を探す。',
      outline: ['第1部: 図書館の発見', '第2部: 他人の本を読む危うさ', '第3部: 返すのではなく渡す結末'],
      opening: 'その図書館の本には、著者名ではなく「まだ返していない人」の名前が貼られていた。',
      productionNotes: ['実在図書館名を使わない', '説教臭くしない', '小さな出来事を重ねる'],
      differentiation: '異世界ではなく、駅裏の日常ファンタジーにする。',
      riskNotes: ['実在個人の美談を流用しない'],
      draftInstructions:
        '出力は中編小説の冒頭4000字相当の本文、主要人物、三部構成、感情の回収ポイントを具体化してください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
    },
    {
      id: 'long-novel-one-night-ranking',
      targetFormat: '短編小説',
      formatLabel: '短編小説',
      titleCandidates: ['一晩だけ順位が消えた街', 'ランキングのない朝', '誰も一番ではない夜'],
      reasonToWin: [
        'ランキング疲れを短編の一夜だけの寓話にできる',
        'SNSや評価社会を直接名指しせず抽象化できる',
        '読後に共有したくなる余韻を作れる',
      ],
      audiencePromise: '全ての順位が一晩だけ消えた街で、自分の価値を見直す短編。',
      emotionalHook: '比べられないと安心する一方で、自分の輪郭も失う怖さ。',
      premise:
        'ある夜、街中のランキング、点数、順位表が空白になる。主人公は自由を感じるが、順位を頼りにしか選べなかった自分にも気づく。',
      exampleDetail:
        '人気店の行列が消え、学校の成績表も空白になり、配信ランキングも無表示になる。主人公は初めて「一番だから」ではない選択をするが、朝になると順位は戻ってくる。',
      outline: ['夜: 順位の消失', '深夜: 自由と不安', '明け方: 自分で選ぶ', '朝: 順位が戻っても変わった視点'],
      opening: '午前零時、街のすべての一位が消えた。',
      productionNotes: ['実在ランキングサービスを出さない', '教訓で終わらせない', '最後に小さな行動を置く'],
      differentiation: '制度批判より、選ぶ感覚の回復に寄せる。',
      riskNotes: ['特定サービスのランキング批判にしない'],
      draftInstructions:
        '出力は短編小説として、完成本文、場面転換、象徴アイテム、静かなラストを具体的に書いてください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
    },
    {
      id: 'long-novel-neighbor-manual',
      targetFormat: '長編小説',
      formatLabel: '群像長編',
      titleCandidates: ['となりの人の取扱説明書', '親切の仕様書', '町内会ログブック'],
      reasonToWin: [
        '近所・家族・職場の小さな摩擦を群像劇にできる',
        '説明書という形式で人物理解を可視化できる',
        '章ごとに別人物へ焦点を移しやすい',
      ],
      audiencePromise: '人付き合いの失敗を、誰かの取扱説明書として読み直す群像長編。',
      emotionalHook: '悪い人ではないのに、どう接すればいいかわからない相手への疲れ。',
      premise:
        '主人公は、相手に対する接し方が説明書として見えるようになる。ただし説明書は本人の本音ではなく、周囲が勝手に作った思い込みも混じっている。',
      exampleDetail:
        '無愛想な隣人の説明書には「朝は話しかけないこと」とある。主人公は従うが、実はそれは昔の噂から生まれた誤記だった。説明書を信じすぎる危うさが物語の軸になる。',
      outline: ['第1章: 説明書が見える', '第2章以降: 誤記された人々', '中盤: 自分の説明書', '終盤: 読まずに向き合う選択'],
      opening: '隣人の背中に、薄い紙のタグが揺れていた。「取扱注意」と書かれている。',
      productionNotes: ['地域名は架空にする', '障害や病気を安易な説明書にしない', '対話で更新する構造にする'],
      differentiation: '便利能力ではなく、ラベル貼りの危うさを扱う。',
      riskNotes: ['属性や病名を雑に物語装置化しない'],
      draftInstructions:
        '出力は群像長編小説の第1章本文、主要キャラクター、章別焦点、長期的な関係変化を具体化してください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
    },
    {
      id: 'long-novel-search-sign-town',
      targetFormat: '長編小説',
      formatLabel: '連作長編',
      titleCandidates: ['検索候補が看板になる町', '言えない言葉の商店街', '夜だけ光る候補語'],
      reasonToWin: [
        '検索不安を町の風景として可視化できる',
        '章ごとに別の店・住人・検索語を扱えて連載化しやすい',
        'ミステリーと生活ドラマを両立できる',
      ],
      audiencePromise: '人が言えない悩みだけが夜の看板に出る町で、言葉にできない不安を拾う連作長編。',
      emotionalHook: '誰にも言っていない悩みが、検索候補として先に見えてしまう怖さ。',
      premise:
        '夜になると商店街の看板に、住人が検索しようとして飲み込んだ言葉が浮かぶ。主人公は看板を消す仕事を任されるが、消すだけでは悩みは残ると気づく。',
      exampleDetail:
        '第1章では、閉店後の薬局の看板に「眠れない 仕事 評価」と出る。主人公は誰の言葉か探すが、候補語を追うほど町の人々の沈黙が見えてくる。',
      outline: ['第1部: 夜の看板係', '第2部: 検索語を隠した住人たち', '第3部: 消す仕事から聞く仕事へ', '終盤: 自分の候補語が町に出る'],
      opening: '夜十一時、シャッター街に最初の検索候補が灯った。',
      productionNotes: ['実在検索サービス名を出さない', '病気や困窮を見世物にしない', '各章に一人ずつ救済を置く'],
      differentiation: '検索履歴の怖さではなく、言葉にできなかった悩みの受け皿として描く。',
      riskNotes: ['個人の秘密を暴く快感に寄せすぎない'],
      draftInstructions:
        '出力は連作長編小説の第1章本文、町のルール、主要住人、20章分の章題案、長期的な謎を具体化してください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
      creatorBrief: {
        protagonist: '商店街の夜間清掃をする青年。人の悩みに踏み込むのが苦手で、最初は看板を消すだけで済ませたい。',
        setting: '夜だけ検索候補が看板に灯る架空の商店街。',
        incitingIncident: '閉店後の薬局看板に、誰かが飲み込んだ評価不安の候補語が出る。',
        conflict: '候補語を消せば町は静かになるが、悩みを持つ人は救われない。',
        choice: '仕事として消し続けるか、誰かの言葉を聞きに行くか。',
        payoff: '小さな会話の積み重ねで町の見え方が変わる余韻。',
      },
    },
    {
      id: 'long-novel-last-notice-station',
      targetFormat: '中編小説',
      formatLabel: '中編小説',
      titleCandidates: ['終電後の未読通知局', '届かなかった返事の駅', '既読にならない夜'],
      reasonToWin: [
        '未読・返信不安を日常ファンタジーに変換できる',
        '中編で一晩の密度と過去の回収を両立できる',
        '恋愛、家族、仕事の後悔を安全に扱いやすい',
      ],
      audiencePromise: '送れなかった返事だけが集まる駅で、言葉を選び直す中編。',
      emotionalHook: '返せなかった一通が、関係を変えてしまったかもしれない後悔。',
      premise:
        '終電後の地下駅には、送信されなかった通知だけを預かる窓口がある。主人公は自分宛ての未送信通知を受け取り、過去の関係を誤解していたと知る。',
      exampleDetail:
        '主人公は、疎遠になった友人から送られなかった「怒ってない。ただ、疲れていただけ」という通知を読む。返事を届け直せるのは一晩に一通だけだと告げられる。',
      outline: ['第一夜: 未読通知局に迷い込む', '第二幕: 届かなかった言葉を読む', '第三幕: 一通だけ返す', '結末: 既読ではなく対話を選ぶ'],
      opening: '終電が出たあと、改札の奥に「未読通知局」と書かれた窓口が開いた。',
      productionNotes: ['実在メッセージアプリ名を出さない', '恋愛だけに限定しない', '最後は通知ではなく直接の言葉で終える'],
      differentiation: '既読スルーのあるあるではなく、言葉を送れなかった側の事情まで読む。',
      riskNotes: ['ストーカー的な監視能力に見えないよう窓口ルールを限定する'],
      draftInstructions:
        '出力は中編小説の冒頭本文、駅のルール、主要人物、三幕構成、静かな結末を具体化してください。',
      properNounUsage,
      sourceSimilarityFlags: safeFlags,
      creatorBrief: {
        protagonist: '返信が遅いことを自分の欠点だと思っている会社員。関係を壊したのは自分だと決めつけている。',
        setting: '終電後だけ開く、架空鉄道の地下駅「未読通知局」。',
        incitingIncident: '自分宛てに送られなかった通知が、窓口の封筒で渡される。',
        conflict: '届かなかった言葉を読めば救われるが、相手の沈黙を勝手に覗く怖さもある。',
        choice: '過去の通知を全部読むか、一通だけ返す言葉を選ぶか。',
        payoff: '既読や未読ではなく、直接言葉を渡す勇気で終える。',
      },
    }],
  };

  const categoryPlans = plans[categoryId] ?? plans['story-manga'];
  const acquiredObservations = (cluster?.observations ?? []).filter(
    (observation) => observation.sourceType === 'public-web-rss',
  );
  return regeneratePlans(categoryPlans, variantSeed, {
    ...cluster,
    observations: acquiredObservations,
  }).map((plan) => addDraftPrompt({ ...plan, whyNow: cluster.label }, categoryId, cluster));
}

function properNounUsageForCategory(categoryId) {
  if (categoryId === 'story-manga') {
    return [
      '外部サービス名は漫画本文・編集者向け企画書には出さず、反応傾向を架空UI、架空制度、ページ上の発見に変換する',
      '外部サービス名は制作前の根拠確認に留め、物語の黒幕や登場組織には使わない',
    ];
  }
  if (categoryId === 'long-novel') {
    return [
      '外部サービス名は小説本文・編集者向け企画書には出さず、架空の町、組織、記録文書、評価制度へ変換する',
      '外部サービス名は制作前の根拠確認に留め、長編世界観の固有名詞には使わない',
    ];
  }
  if (categoryId === 'trend-explainer') {
    return [
      '実在サービス名は証拠・配信文脈でのみ使用し、内部事情の断定には使わない',
      '実在企業や作品を批判対象ではなく、観測例として扱う',
    ];
  }
  return [
    '短尺サービス名は配信文脈の根拠としてのみ扱い、動画内の人物・敵役・告発対象にはしない',
    'コメントや保存行動は架空ケースに置き換えて説明する',
  ];
}

export function buildReport({
  categoryId,
  timeWindow = '7d',
  audience = 'general',
  observations = [],
  providerMode = 'public-web-rss',
  variantSeed = 0,
} = {}) {
  const category = getCategoryById(categoryId) ?? CATEGORIES[0];
  const selectedObservations = selectObservationsForCategory(category.id, observations);
  const cluster = buildCluster(category.id, selectedObservations);
  const evidenceCards = buildEvidenceCards(cluster);
  const creativePlans = planForCategory(category.id, cluster, variantSeed);

  return {
    reportId: `vr-${category.id}-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    locale: 'JP',
    timeWindow,
    audience,
    providerMode,
    category,
    sourcesUsed: [...new Set(selectedObservations.map((item) => item.source))],
    trendClusters: [cluster],
    evidenceCards,
    deepAnalysis: buildDeepAnalysis(category.id, cluster, variantSeed),
    categoryFitCards: buildCategoryFitCards(category.id, cluster),
    categoryReasons: buildCategoryReasons(category.id),
    beginnerGuide: buildBeginnerGuide(category.id, creativePlans[0], cluster),
    creativePlans,
    confidenceSummary: {
      label: '取得根拠の確度',
      score: cluster.confidenceScore,
      explanation:
        selectedObservations.length > 0
          ? '公開Web/RSSの取得結果とAI分析を統合しています。'
          : '公開Web/RSSの取得結果がまだありません。',
    },
    limitations: [
      '公開Web/RSSの取得結果は制作前に人間が出典確認してください。',
      '実在の人物・企業・作品を架空ストーリーの主役や告発対象にしない前提で生成しています。',
    ],
  };
}
