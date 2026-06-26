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
  const topTags = displayTopTagsForCategory(categoryId, rawTags, observations);
  const label = buildEvidenceClusterLabel(categoryId, topTags, observations, base.label);
  const cluster = {
    id: `${categoryId}-cluster-1`,
    label,
    categoryId,
    evidenceCount: observations.length,
    sourceCount: new Set(observations.map((item) => item.source)).size,
    topQueries: observations.map((item) => item.queryUsed).slice(0, 4),
    topTags,
    creatorSignals: buildCreatorSignals(categoryId, observations, topTags),
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

function displayTopTagsForCategory(categoryId, rawTags, observations = []) {
  const evidenceTerms = observations.flatMap((observation) => storyFacingTermsForObservation(observation, categoryId));
  const filteredTags = (rawTags ?? [])
    .map(cleanFocusTerm)
    .filter((tag) => isUsableEvidenceTerm(tag))
    .filter((tag) => categoryId === 'trend-explainer' || !isSourceTag(tag))
    .filter((tag) => !usesFictionalizedTerms(categoryId) || isStorySafeEvidenceTerm(tag));
  const fallbackTags = {
    'story-manga': ['人物の選択', '画面化できる違和感', '1ページ目の事件'],
    'short-video': ['冒頭の変化', '字幕化できる損失', 'コメント余白'],
    'trend-explainer': ['観測根拠', '視聴心理', '制作判断'],
    'long-novel': ['章をまたぐ問い', '記録化できる証拠', '人物の誤解'],
  };
  return uniqueList([...filteredTags, ...evidenceTerms, ...(fallbackTags[categoryId] ?? fallbackTags['story-manga'])]).slice(0, 6);
}

function buildEvidenceClusterLabel(categoryId, topTags, observations, fallbackLabel) {
  const focus = uniqueList([
    ...(topTags ?? []),
    ...observations.flatMap((observation) => storyFacingTermsForObservation(observation, categoryId)),
  ]).slice(0, 2);
  if (focus.length === 0) return fallbackLabel;
  const mediumMove = {
    'story-manga': '漫画の入口に読み替える制作判断',
    'short-video': '短尺の冒頭に変える制作判断',
    'trend-explainer': '解説の章立てに分解する制作判断',
    'long-novel': '章をまたぐ問いへ広げる制作判断',
  };
  return `${focus.join('と')}を${mediumMove[categoryId] ?? '企画へ変換する制作判断'}`;
}

function buildCreatorSignals(categoryId, observations = [], topTags = []) {
  const anchors = planObservationsForCluster(observations, 3).map((observation, index) => {
    const insight = classifyObservationInsight(observation ?? {});
    return deriveEvidenceAnchor(observation, insight, 0, index, categoryId);
  });
  if (anchors.length === 0) {
    return (topTags.length ? topTags : ['取得語', '読者心理', '制作角度']).slice(0, 3).map((tag, index) => ({
      label: `${tag}を企画要素にする`,
      detail: `取得結果の${index + 1}番目の論点を、媒体に合わせて人物、場面、最初の事件へ分解する。`,
    }));
  }

  const labels = {
    'story-manga': ['絵で読める具体物にする', '主人公の誤解へ落とす', '最後の選択を変える'],
    'short-video': ['0秒目の変化にする', '字幕で損失を切る', 'コメント余白を残す'],
    'trend-explainer': ['根拠と推測を分ける', '視聴心理に翻訳する', '制作手順へ落とす'],
    'long-novel': ['章の証拠にする', '人物ごとに読み替える', '回収前の余白を残す'],
  }[categoryId] ?? ['見せ場にする', '心理へ翻訳する', '安全に架空化する'];

  return anchors.map((anchor, index) => ({
    label: labels[index] ?? `${anchor.focusTerm}を別視点で扱う`,
    detail: `「${anchor.focusTerm}」を起点に、${anchor.scene}で${anchor.artifact}を見せる。判断軸は「${anchor.tension}」。`,
  }));
}

function buildSourceSignals(observations, topTags, categoryId) {
  if (!observations.length) return [];
  if (categoryId === 'story-manga') {
    const terms = uniqueList(observations.flatMap((observation) => storyFacingTermsForObservation(observation, categoryId))).slice(0, 4);
    return [
      { label: '取得語の具体性', detail: `今回拾った語は「${terms.join(' / ') || '具体語不足'}」。漫画では人物名ではなく画面上の手がかりへ変換する。` },
      { label: '周辺文脈の近さ', detail: `${new Set(observations.map((item) => item.sourceUrl || item.title)).size}件の取得結果から、同じ不安ではなく近い構造を持つ反応を比較する。` },
      { label: '架空化の余地', detail: '実在対象を出さず、取得語を人物の選択、確認欄、記録票、場面の違和感へ読み替える。' },
    ];
  }
  if (categoryId === 'long-novel') {
    const terms = uniqueList(observations.flatMap((observation) => storyFacingTermsForObservation(observation, categoryId))).slice(0, 4);
    return [
      { label: '章に残せる取得語', detail: `「${terms.join(' / ') || '取得語'}」を、章ごとの証拠、人物の誤解、後半で意味が変わる記録へ広げる。` },
      { label: '読者維持の周辺文脈', detail: `${observations.length}件の取得結果から、単発の話題ではなく読み進める問いに変わるかを見る。` },
      { label: '世界観化の余地', detail: '固有名詞ではなく、架空の町、組織、受付票、記録庫、章末の余白へ変換する。' },
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
    return '取得した話題を、1ページ目で見える小道具、人物の弱点、最後の一コマの救済へ変換して使います。';
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
    regret: { read: '後悔は、過去のコマと現在のコマの対比、消せない記録、戻れない分岐として描くと刺さる。', use: '冒頭で「戻れない選択」を1枚の絵にし、終盤で主人公が今できる小さな一手を選ぶ。' },
    unfairness: { read: '理不尽は、抗議できないまま流れる評価欄・張り紙・画面として見せ、最後の一コマで小さく反転させる。', use: '前半で言い返せない理不尽を画面表現で積み、ラストで読者がスッとする視点の逆転を置く。' },
    relatable: { read: 'あるあるは、取得語に近い具体物へ置き換えると1ページ目で共感が立つ。', use: '冒頭1ページに読者が見覚えのある具体物を置き、そこに小さな異常を1つ足す。' },
    evaluation: { read: '見えない評価は、架空の採点表・確認欄・記録票として可視化すると、怒りでなく発見の漫画になる。', use: '主人公に「評価が見える」能力や小道具を与え、隠れた採点理由を1話ごとに暴く。' },
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
      evaluationMeaning: '評価や選考を、確認欄・採点表・記録票として見せると、怒りではなく発見の漫画になります。',
      saveMeaning: '保存や共有の欲求は、各話の最後に読者が持ち帰れる一言や小さな手順へ変換できます。',
      beforeAfterMeaning: '変化前後の差は、ページ前半とラスト1コマの反転にすると読み切りでも伝わります。',
      explainerMeaning: '仕組みへの関心は、黒幕説明ではなく、画面や書類の矛盾を読者に発見させる材料になります。',
      meaningForCreator: `この話題は「${material}」として扱い、主人公が最初に見つける小道具や画面表示へ変換できます。`,
      creativeUse: `第1ページに「${hit}」を連想させる架空の確認欄・記録票・入力フォームを置き、最後のコマで意味を反転させる。`,
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
      evaluationHook: '見えない評価欄、保留記録、確認語などを可視化する能力に変換する。',
      saveHook: '読者が自分の生活にも置き換えられる小さな救済を、各話の結末に置く。',
      beforeAfterHook: '1話の前半で理不尽な状態、後半で構造の見え方が変わる反転を作る。',
      explainerHook: '物語内の架空制度を通じて、現実の視聴習慣や評価不安を安全に抽象化する。',
      defaultHook: '取得語を架空UI、小道具、人物の選択へ置き換え、1話の発見にする。',
    },
    'short-video': {
      lossHook: '0秒目に困りごとの映像、1秒目に損失字幕、最後に真似できる解決を置く。',
      evaluationHook: '点数化や確認疲れを、1画面のビフォーアフターとして見せる。',
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
  const fallback = {
    surfacePattern: ['取得根拠が不足しているため、制作判断はまだ確定しません。'],
    humanMotivation: ['根拠語が取れたら読者・視聴者の欲求へ分解する'],
    narrativeMechanism: ['根拠不足時は仮説を表示せず、取得できた語から再分析する'],
    productionMechanism: ['媒体、冒頭、回収点を取得語から決める'],
    opportunityGap: ['根拠が空の時は、固定例を本分析として出さない。'],
    categoryInsight: '取得根拠が空のため、カテゴリ固有の分析は未確定です。',
  };
  return enrichDeepAnalysisWithEvidence(fallback, categoryId, cluster, variantSeed);
}

function buildCategoryReasons(categoryId, cluster = null) {
  const anchors = analysisAnchorsForCluster(cluster, 0);
  const medium = {
    'story-manga': { unit: '1ページ目のコマ', move: '読者が先に気づく画面上の違和感', output: '冒頭コマ' },
    'short-video': { unit: '0秒目の画', move: '視聴者が手元で試せる変化', output: '秒数つき台本' },
    'trend-explainer': { unit: '冒頭の問い', move: '根拠と推測を分ける章立て', output: '解説構成' },
    'long-novel': { unit: '第1章の証拠', move: '章をまたいで意味が変わる記録', output: '章末フック' },
  }[categoryId] ?? { unit: '冒頭', move: '媒体に合う見せ場', output: '構成' };
  const baseAnchors = anchors.length > 0 ? anchors : [0, 1, 2].map((index) => ({
    focusTerm: ['取得語', '別視点', '安全な架空化'][index],
    artifact: ['確認欄', '記録票', '比較表'][index],
    tension: '根拠が不足しているため、人間が取得状態を確認する必要がある',
    perspective: ['観測事実', '別人物', '媒体差'][index],
    readerNeed: '根拠が取れてから判断したい',
    productionAngle: '取得語を媒体別の見せ場へ変える',
  }));
  return baseAnchors.slice(0, 3).map((anchor, index) => ({
    title: index === 0 ? `${anchor.focusTerm}を${medium.unit}に置ける` : index === 1 ? `${anchor.focusTerm}で視点を変えられる` : `実在名を出さず${medium.move}へ変換できる`,
    detail: index === 0
      ? `取得語を説明で並べず、「${anchor.artifact}」として見せると、${anchor.tension}が最初の判断材料になります。`
      : index === 1
        ? `同じ方向の話題でも、${anchor.perspective}から入ることで、構成、主人公、回収点を別案にできます。`
        : `${cluster?.label ?? anchor.focusTerm}を根拠に留め、本文や台本では架空の人物、場面、記録へ置き換えます。`,
    example: index === 0 ? `${medium.output}: ${anchor.perspective}で始める。` : `${anchor.focusTerm}を${anchor.productionAngle}として扱う。`,
  }));
}

const PLAN_BATCH_SIZE = 3;

function addDraftPrompt(plan, categoryId, cluster) {
  const creatorBrief = buildCreatorBrief(plan, categoryId);
  const retentionDesign = buildRetentionDesign(plan, categoryId);
  const internalRoutineNotes = buildStoryMakerRoutineNotes(categoryId);
  const storyArchitecture = buildAiDesignPlaceholder('storyArchitecture');
  const craftNotes = [];
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
    'AI生成時の設計条件:',
    'プロ向け設計メモと物語・台本設計は、根拠、創作ブリーフ、構成、媒体条件を読み直して新規に書く。',
    '固定テンプレ、単語差し替え、全案で同じ文型、ラベルだけ違う同文は禁止。',
    '編集判断、制作手順、物語構造はそれぞれ別の観点で、取得根拠に固有の判断として書く。',
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

function buildAiDesignPlaceholder(section) {
  return {
    status: 'awaiting-ai',
    source: 'provider-required',
    section,
    notes: [],
  };
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

  const anchor = plan.evidenceAnchor ?? {};
  const focus = anchor.focusTerm ?? plan.titleCandidates?.[0] ?? '取得語';
  const object = anchor.artifact ?? inferRecurringMotif(plan);
  const scene = anchor.scene ?? plan.outline?.[0] ?? plan.opening ?? '冒頭場面';
  const tension = anchor.tension ?? plan.emotionalHook ?? '説明されない違和感が残る';
  const readerNeed = anchor.readerNeed ?? plan.audiencePromise ?? '根拠を自分ごととして確かめたい';
  const categoryDefaults = {
    'short-video': {
      protagonist: `${focus}で迷う視聴者の代わりに、1つだけ試す投稿者。`,
      setting: `縦画面で撮れる${scene}。`,
      choice: `${object}を増やさず、最初の変化だけを見せる。`,
      payoff: '視聴後に同じ場面で試せる一手を残す。',
    },
    'trend-explainer': {
      protagonist: `${focus}を企画に使いたいが、根拠と推測を分けたい語り手。`,
      setting: `観測結果と${object}を並べる解説画面。`,
      choice: '断定ではなく、観測、心理、制作手順へ分けて話す。',
      payoff: '見終わった人が自分の媒体へ置き換えられる判断軸を残す。',
    },
    'long-novel': {
      protagonist: `${readerNeed}主人公。最初は${focus}を自分だけの問題だと思っている。`,
      setting: `${object}が章ごとに意味を変える架空の町や記録庫。`,
      choice: `${object}を自分のためだけに使うか、他者の誤解をほどくために使うか。`,
      payoff: '章を重ねるほど人物と世界の見え方が変わる余韻を残す。',
    },
    'story-manga': {
      protagonist: `${readerNeed}主人公。最初は${tension}を自分の弱さだと思い込む。`,
      setting: `${scene}。`,
      choice: `${object}を見なかったことにするか、意味を読み替えて誰かに返すか。`,
      payoff: '小さな救済と次話へ残る問いを置く。',
    },
  };
  const defaults = categoryDefaults[categoryId] ?? categoryDefaults['story-manga'];
  return {
    protagonist: defaults.protagonist,
    setting: defaults.setting,
    incitingIncident: plan.outline?.[0] ?? plan.opening ?? `${object}が冒頭で見つかる。`,
    conflict: tension,
    choice: defaults.choice,
    payoff: defaults.payoff,
  };
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
      continuationHook: '各章末に「まだ読まれていない記録」「誰かの保留された言葉」など次章の具体物を残す。',
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

function buildBeginnerGuide(categoryId, primaryPlan, cluster) {
  const planTitle = primaryPlan?.titleCandidates?.[0] ?? '推奨企画';
  const opening = primaryPlan?.opening ?? '冒頭で異常や損失を見せる';
  const promise = primaryPlan?.audiencePromise ?? '読者が自分ごと化できる企画にする';
  const brief = primaryPlan?.creatorBrief ?? {};
  const anchor = primaryPlan?.evidenceAnchor ?? {};
  const anchorObject = anchor.artifact ?? '画面上の具体物';
  const anchorFocus = anchor.focusTerm ?? cluster?.topTags?.[0] ?? '取得語';
  const anchorPerspective = anchor.perspective ?? '別視点';
  const sharedChecklist = [
    `タイトルは仮でよいので「${planTitle}」を置いて、冒頭と結末の役割を先に決める。`,
    `実在名は根拠欄に留め、本文では架空の人物、架空UI、架空制度、架空の町へ置き換える。`,
    `根拠シグナル「${cluster?.label ?? '取得シグナル'}」を、説明ではなく主人公の困りごとと${anchorObject}へ変換する。`,
  ];

  const guides = {
    'story-manga': {
      headline: '最初の1ページを作る順番',
      promise: `${promise} まずネーム前の骨組みを作ります。`,
      firstOutput: '1ページ目の4コマ構成と最後の引き',
      steps: [
        {
          label: '1コマ目に異常を置く',
          action: `「${opening}」を、${anchorObject}として描く。${anchorFocus}を説明語ではなく、読者が見て気づける変化にする。`,
          output: '読者が1秒で「何かおかしい」と分かる絵。',
        },
        {
          label: '主人公の困りごとへ落とす',
          action: `${brief.protagonist ?? '主人公'}が、その異常で今日どんな損をするかを1場面で見せる。`,
          output: `${anchorPerspective}から見た具体的な損失と、主人公が隠したい弱点。`,
        },
        {
          label: '仕組みの違和感を増やす',
          action: `悪役を出す前に、${anchorObject}の意味が1つずれる瞬間を増やす。`,
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
      promise: `${promise} 最初に秒数と見返す理由を決めます。`,
      firstOutput: '0秒、1秒、ラスト3秒の字幕',
      steps: [
        {
          label: '0秒目に結果を置く',
          action: `完成後、解決後、失敗直前など、見た瞬間に差が分かる画を先に置く。`,
          output: '無音でも分かる最初のカット。',
        },
        {
          label: '1秒目に悩みを字幕化',
          action: `視聴者の損失を「${primaryPlan?.emotionalHook ?? `${anchorFocus}で迷う瞬間`}」として13字前後で出す。`,
          output: 'スクロールを止める短い字幕。',
        },
        {
          label: '中盤を3手順に削る',
          action: '理由、手順、変化を3カットだけにして、説明を増やさない。',
          output: '真似できる最小手順。',
        },
        {
          label: '最後に保存理由を置く',
          action: `「${anchorFocus}で次に試す場面」か「コメントで聞く二択」を1行で出す。`,
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
          action: `各章末に${anchorObject}の未解決点を1つ置き、次章で別人物から意味を変える。`,
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
  const anchors = analysisAnchorsForCluster(cluster, 0);
  const medium = {
    'story-manga': { nouns: ['ページ', 'コマ', '吹き出し', '縦読み'], moves: ['冒頭の画面変化', '主人公の誤解', 'ラストの選択'] },
    'short-video': { nouns: ['冒頭1秒', '字幕', '保存', 'コメント'], moves: ['最初の変化', '短い理由回収', '視聴後の一手'] },
    'trend-explainer': { nouns: ['解説', '根拠', '章立て', 'ナレーション'], moves: ['観測事実', '心理の分解', '制作チェック'] },
    'long-novel': { nouns: ['章', '伏線', '読者維持', '長期'], moves: ['第1章の証拠', '別人物の読み替え', '終盤の回収'] },
  }[categoryId] ?? { nouns: ['冒頭', '構成', '回収', '注意点'], moves: ['冒頭', '中盤', '結末'] };
  const cardAnchors = anchors.length > 0 ? anchors.slice(0, 3) : [0, 1, 2].map((index) => ({
    focusTerm: ['取得語', '別視点', '安全な架空化'][index],
    artifact: ['確認欄', '記録票', '比較表'][index],
    tension: '取得根拠が空のため、確定判断は保留する',
    perspective: ['観測事実', '別人物', '媒体差'][index],
    readerNeed: '根拠を確認してから企画化したい',
    actionLabel: '取得語を読み替える',
    scene: '取得後の企画画面',
  }));
  return cardAnchors.map((anchor, index) => ({
    title: `${anchor.focusTerm}を${medium.moves[index] ?? medium.moves[0]}に使う`,
    whyThisMedium: `${medium.nouns.join('、')}の中で「${anchor.artifact}」を見せると、${anchor.tension}を説明に頼らず伝えられます。`,
    creatorMove: `${anchor.perspective}から入り、${anchor.readerNeed}へつなげる。`,
    example: `${anchor.scene}で${anchor.actionLabel}場面を作る。`,
    evidenceAnchor,
  }));
}

function regeneratePlans(plans, seed = 1, cluster = null) {
  if (!Array.isArray(plans) || plans.length === 0) return [];
  const categoryId = plans[0]?.id?.split('-').slice(0, 2).join('-') ?? 'story-manga';
  const numericSeed = Number(seed) || 0;
  const observations = planObservationsForCluster(cluster?.observations, PLAN_BATCH_SIZE);
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
  const anchor = deriveEvidenceAnchor(observation, insight, seed, index, categoryId);
  const signalAnchor = categoryId === 'trend-explainer' ? anchor : { ...anchor, title: anchor.focusTerm };
  const signal = observationSignalForPlan(observation, insight, signalAnchor, categoryId);
  const keyword = anchor.focusTerm;
  const artifact = anchor.artifact;
  const planAnchor = evidenceAnchorForPlan(anchor, categoryId);
  const lens = anchor.perspective;
  const opening = openingForPlan(categoryId, anchor, seed, index);

  if (categoryId === 'short-video') {
    return {
      titleCandidates: titleCandidatesForCategory(categoryId, null, anchor, seed, index),
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
      opening,
      productionNotes: ['縦画面固定', '実在サービス名や個人情報を映さない', '効果を盛らず1つの改善に絞る'],
      differentiation: `総まとめ動画ではなく、観測データ1件から${anchor.scene}の1場面へ落とす。`,
      riskNotes: ['健康・金銭効果を断定しない'],
      draftInstructions: '秒数、映像、字幕、ナレーション、撮影小物、保存誘導まで具体化してください。',
      evidenceAnchor: planAnchor,
    };
  }

  if (categoryId === 'trend-explainer') {
    return {
      titleCandidates: titleCandidatesForCategory(categoryId, null, anchor, seed, index),
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
      opening,
      productionNotes: ['実在人物を告発対象にしない', '画面例は自作モックにする', '出典と推測を分ける'],
      differentiation: 'ニュース解説ではなく、創作者の制作判断へ落とす。',
      riskNotes: ['内部事情や因果関係を断定しない'],
      draftInstructions: '7分から10分の解説台本として、章立て、ナレーション、図解、作例、注意点を書いてください。',
      evidenceAnchor: planAnchor,
    };
  }

  if (categoryId === 'long-novel') {
    return {
      titleCandidates: titleCandidatesForCategory(categoryId, null, anchor, seed, index),
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
      opening,
      productionNotes: ['実在サービス名は出さない', '章末ごとに新しい証拠を置く', '救済を急がない'],
      differentiation: '単発の能力ものではなく、記録を読む長期ミステリーにする。',
      riskNotes: ['実在企業や特定制度の告発にしない'],
      draftInstructions: '短編・中編・長編のどれに伸ばせるかを示しつつ、第1章本文、章末の引き、長期展開メモを書いてください。',
      evidenceAnchor: planAnchor,
    };
  }

  return buildStoryMangaFrame({
    anchor,
    signal,
    keyword,
    artifact,
    planAnchor,
    opening,
    seed,
    index,
  });
}



function buildStoryMangaFrame({ anchor, signal, keyword, artifact, planAnchor, opening, seed, index }) {
  const titleCandidates = titleCandidatesForCategory('story-manga', null, anchor, seed, index);
  const surface = anchor.surface ?? '確認欄';
  const secondary = anchor.secondaryTerm ?? '別視点';
  const variants = [
    {
      protagonist: `${surface}の端に出た違和感を、視線で先に拾ってしまう新人記録係。${anchor.readerNeed}`,
      setting: `閉館前の受付窓口。${artifact}だけが画面の欄外に残り、周囲はそれを通常処理として流している。`,
      incitingIncident: `最初の大ゴマで${surface}の一列だけがずれ、主人公の視線が${keyword}の違和感に止まる。`,
      conflict: `${anchor.tension}。声に出せば窓口全体の処理が止まり、黙れば欄外の説明が消える。`,
      choice: `欄を閉じて通常処理に戻るか、画面の端に残った${secondary}を読者にも見える形で示すか。`,
      payoff: `ラストは同じ${surface}が別の意味で再表示され、読者が次の欄を探したくなる余韻にする。`,
      reason: `${artifact}は1ページ目の視線誘導と小道具の異常で読ませやすい`,
      promise: `${keyword}を、画面上の違和感と欄外の手がかりで読ませる漫画案。`,
      premise: `取得根拠の「${keyword}」を実名の話題ではなく、受付画面の欄外に残る異常として扱う。主人公は説明されない欄を見つけ、読者は先に違和感へ気づく。`,
      example: `1コマ目は窓口全景、2コマ目は${surface}の拡大、3コマ目は周囲が何も見ていない表情、ラストは欄外に残る${secondary}で引く。`,
      outline: [
        `冒頭: ${surface}の一列だけがずれる`,
        `中盤: ${keyword}の違和感を主人公だけが追う`,
        `転機: ${secondary}が説明不足の証拠になる`,
        `結末: 欄外の表示を閉じずに残す`,
      ],
      differentiation: `ニュース名や人物名ではなく、${surface}と視線誘導だけで読者に発見させる。`,
    },
    {
      protagonist: `${secondary}について語らない周囲の沈黙を聞き分ける、控えめな聞き取り係。`,
      setting: `${artifact}を挟んで、証言、会話、掲示板の短文が少しずつ食い違う放課後の相談室。`,
      incitingIncident: `主人公が${keyword}の記録を整理すると、同じ出来事なのに証言の順番だけが合わない。`,
      conflict: `${anchor.tension}。誰かを責めるほど単純ではなく、沈黙を守るほど誤読だけが広がる。`,
      choice: `正しい犯人探しを始めるか、会話の欠けた順番を並べ替えて見落としを返すか。`,
      payoff: `最後は誰かの短い証言で${artifact}の読み方が反転し、次話では別の人物の沈黙へ進める。`,
      reason: `${keyword}を会話と証言のズレに変えると、同じ題材でも人物関係から読ませられる`,
      promise: `${keyword}を、周囲の沈黙と証言の順番で読み解く群像寄りの漫画案。`,
      premise: `取得根拠を告発にせず、複数人物の証言が少しずつずれる相談室の場面へ変換する。読者は会話の空白から${anchor.tension}を推理する。`,
      example: `冒頭は掲示板の短文。中盤で三人の証言を並べ、最後に一番短い沈黙が${secondary}の意味を変える。`,
      outline: [
        `冒頭: ${keyword}の記録が相談室に届く`,
        `中盤: 証言と会話の順番が食い違う`,
        `転機: 周囲の沈黙が見落としの証拠になる`,
        `結末: 誰かを責めずに記録の順番を戻す`,
      ],
      differentiation: `画面の異常だけでなく、証言、会話、沈黙を使って別角度の読後感にする。`,
    },
    {
      protagonist: `${keyword}の欄に丸を付ける係だったが、最後の選択だけは自分で引き受けたい人物。`,
      setting: `白い余白の多い申請窓口。${artifact}は結末で意味が回収される約束として置かれる。`,
      incitingIncident: `主人公が${surface}に丸を付けた瞬間、${secondary}の空欄だけが消えずに残る。`,
      conflict: `${anchor.tension}。安全な処理を選べば自分は守れるが、空欄の理由は誰にも返らない。`,
      choice: `自分の署名だけを残すか、${secondary}の空欄に説明を返して次の人の判断を変えるか。`,
      payoff: `結末では冒頭の丸印を回収し、読者に「次なら自分はどう書くか」を残す。`,
      reason: `${keyword}を選択と回収の型に置くと、ラストの一コマで読後の余韻を作れる`,
      promise: `${keyword}を、最後の選択と回収で読者の判断に返す読み切り漫画案。`,
      premise: `取得根拠の構造を、責める物語ではなく「記入するか、空欄にするか」の選択へ変換する。冒頭の丸印が結末で別の意味を持つ。`,
      example: `冒頭で丸印、中盤で空欄、終盤で署名を見せる。最後は主人公の一筆が${artifact}の意味を変える。`,
      outline: [
        `冒頭: ${surface}に丸印を付ける`,
        `中盤: ${secondary}の空欄が消えない`,
        `転機: 正しい処理より返す言葉を選ぶ`,
        `結末: 丸印の意味を回収して余韻を残す`,
      ],
      differentiation: `構造分析をそのまま説明せず、選択、返す言葉、回収の流れへ落として読み切れる形にする。`,
    },
  ];
  const variant = variants[index % variants.length];
  return {
    titleCandidates,
    protagonist: variant.protagonist,
    setting: variant.setting,
    incitingIncident: variant.incitingIncident,
    conflict: variant.conflict,
    choice: variant.choice,
    payoff: variant.payoff,
    reasonToWin: [signal, variant.reason, `${keyword}を架空UIや場面の役割へ変換するため、実在名を出さずに感情へ届く`],
    audiencePromise: variant.promise,
    emotionalHook: anchor.emotionalHook,
    premise: variant.premise,
    exampleDetail: variant.example,
    outline: variant.outline,
    opening,
    productionNotes: ['実在サービス名は出さない', '固有名詞を架空UIへ変換する', '1話1つの小道具に絞る'],
    differentiation: variant.differentiation,
    riskNotes: ['実在人物や企業への告発にしない'],
    draftInstructions: 'ストーリー漫画の第1話として、ページごとの流れ、重要コマ、セリフ、ラストの引きを具体的に書いてください。',
    evidenceAnchor: planAnchor,
  };
}

function pickVariant(items, offset) {
  if (!Array.isArray(items) || items.length === 0) return '物語の種';
  return items[offset % items.length];
}

function titleCandidatesForCategory(categoryId, concept, anchor, seed, index) {
  const focus = cleanFocusTerm(anchor?.focusTerm ?? concept?.keyword ?? '取得語');
  const secondary = cleanFocusTerm(anchor?.secondaryTerm ?? anchor?.terms?.[1] ?? '別視点');
  const pair = uniqueList([focus, secondary]).join('・');
  const rawSurface = anchor?.surface ?? anchor?.artifact ?? pickVariant(anchorSurfacesForCategory(categoryId), stableHash(`${focus}|${seed}|${index}`));
  const surface = compactEvidenceText(
    String(rawSurface)
      .replace(`${focus}を示す`, '')
      .replace(`${secondary}を示す`, '')
      .replace(`${focus}の`, '')
      .replace(`${secondary}の`, '')
      .replace(`${pair}だけが残る`, '')
      .replace(`${focus}だけが残る`, '')
      .replace(`${secondary}だけが残る`, '')
      .trim() || rawSurface,
    22,
  );
  const titleShapes = {
    'story-manga': [
      `${focus}の${surface}`,
      `${secondary}だけが残る確認欄`,
      `${pair}を読む第1ページ`,
    ],
    'short-video': [
      `${focus}を3カットで見る`,
      `${secondary}の前後比較`,
      `${pair}の短尺チェック`,
    ],
    'trend-explainer': [
      `${focus}が反応された理由`,
      `${pair}を制作判断に変える`,
      `${compactEvidenceText(anchor?.title ?? focus, 22)}の読み方`,
    ],
    'long-novel': [
      `${focus}の記録庫`,
      `${secondary}が残る町`,
      `${pair}の章末記録`,
    ],
  };
  return uniqueList(titleShapes[categoryId] ?? titleShapes['story-manga']).slice(0, 3);
}



function openingForPlan(categoryId, anchor, seed, index) {
  const focus = anchor?.focusTerm ?? '取得語';
  const secondary = anchor?.secondaryTerm ?? '別視点';
  const artifact = anchor?.artifact ?? '確認欄';
  const perspective = anchor?.perspective ?? '別視点';
  const offset = stableHash(`${anchor?.sourceUrl ?? anchor?.id ?? focus}|${seed}|${index}`);
  const openings = {
    'story-manga': [
      `${artifact}の端に、${focus}だけが薄く浮かんだ。`,
      `${secondary}の列だけ、主人公には別の意味で読めた。`,
      `${perspective}を見た瞬間、${focus}はただの話題ではなくなった。`,
      `${artifact}を閉じようとした指が、${secondary}の一行で止まった。`,
    ],
    'short-video': [
      `最初の画面に出すのは、${focus}ではなく${secondary}が変わる瞬間。`,
      `${artifact}を0秒目に置き、${perspective}から字幕を入れる。`,
      `${focus}で迷う前と後を、同じ手元で並べる。`,
      `「${secondary}、ここで止まってない？」から始める。`,
    ],
    'trend-explainer': [
      `今日は${focus}そのものではなく、${secondary}が反応された理由を分けて見ます。`,
      `まず観測事実、次に${perspective}、最後に制作への置き換えです。`,
      `${artifact}に整理すると、${focus}の使いどころが見えてきます。`,
      `${secondary}を煽らず使うには、どこまでが根拠でどこからが解釈かを分けます。`,
    ],
    'long-novel': [
      `${artifact}の最初のページに、${focus}という語だけが残されていた。`,
      `${secondary}を記した台帳は、主人公の名前だけを空けていた。`,
      `${perspective}から始まった章は、${focus}の意味を少しだけ変えた。`,
      `町の記録庫で、${artifact}だけがまだ閉じられていなかった。`,
    ],
  };
  return pickVariant(openings[categoryId] ?? openings['story-manga'], offset);
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

function planObservationsForCluster(observations, limit = PLAN_BATCH_SIZE) {
  const pool = Array.isArray(observations) ? observations.filter(Boolean) : [];
  if (pool.length === 0) return [];
  const seen = new Set();
  const stablePool = pool.filter((observation) => {
    const key = observation?.sourceUrl || observation?.id || observation?.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const source = stablePool.length > 0 ? stablePool : pool;
  return Array.from({ length: limit }).map((_, index) => source[index % source.length]);
}



function focusTermsFromValues(values) {
  return uniqueList(
    values
      .flatMap((value) => String(value ?? '').split(/[\s、,／/・]+/))
      .map(cleanFocusTerm)
      .filter((value) => isUsableEvidenceTerm(value)),
  ).slice(0, 2);
}

function cleanFocusTerm(value) {
  return compactEvidenceText(value, 14)
    .replace(/への反応|の反応|周辺の反応|反応/g, '')
    .replace(/\s*[-–—]\s*[^-–—]{1,24}$/u, '')
    .replace(/public Web\/RSS round \d+/gi, '')
    .replace(/公開Web\/RSS取得\d*/g, '')
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

const EVIDENCE_TERM_STOPWORDS = new Set([
  'ニュース',
  '記事',
  '話題',
  '議論',
  '共感',
  '反応',
  '賛否',
  '公開',
  '取得',
  '検索',
  '根拠',
  '周辺',
  '不安',
  '理由',
  '方法',
  'まとめ',
  '速報',
  '公式',
  '今年',
  '今日',
  '明日',
  '昨日',
  '今回',
  '複数',
  '日本',
  '国内',
  '海外',
  '男性',
  '女性',
  '自分',
  '相手',
  '公開Web',
  'Web',
  'RSS',
]);

const FICTIONALIZED_TERM_CATEGORIES = new Set(['story-manga', 'short-video', 'long-novel']);

const STORY_SAFE_TERM_STEMS = [
  '確認',
  '確認欄',
  '記録',
  '記録票',
  '受付',
  '受付票',
  '掲示',
  '掲示板',
  '申請',
  '申請欄',
  '説明',
  '説明不足',
  '証言',
  '発言',
  '会話',
  '沈黙',
  '整列',
  '行列',
  '比較',
  '比喩',
  '読み方',
  '手続き',
  '欄外',
  '余白',
  '空欄',
  '表示',
  '入力',
  '通知',
  '保存',
  '共有',
  '選択',
  '誤解',
  '見落とし',
  '台帳',
  '書類',
  '制度',
  '仕組み',
  '導線',
  '損失',
  '不便',
  '予定',
  '日程',
  '発売日',
  '公開日',
  '配信日',
  '締切',
  '期限',
  '通知',
  '暦',
  'カレンダー',
];

const STORY_STRUCTURAL_PATTERNS = [
  /確認欄/g,
  /記録票/g,
  /受付票/g,
  /掲示板/g,
  /申請欄/g,
  /説明不足/g,
  /整列(?:問題|ルール)?/g,
  /行列(?:問題|ルール)?/g,
  /記録(?:の読み方|不足|欄)?/g,
  /確認(?:不足|疲れ|手順)?/g,
  /受付(?:手順|窓口|記録)?/g,
  /説明(?:不足|責任|欄)?/g,
  /証言(?:欄|記録)?/g,
  /発言(?:記録|欄)?/g,
  /比較(?:表|欄)?/g,
  /比喩/g,
  /読み方/g,
  /見落とし/g,
  /誤解/g,
  /選択/g,
  /空欄/g,
  /余白/g,
  /欄外/g,
  /台帳/g,
  /書類/g,
  /制度/g,
  /仕組み/g,
  /手続き/g,
  /導線/g,
  /損失/g,
  /不便/g,
  /発売日/g,
  /公開日/g,
  /配信日/g,
  /予定/g,
  /日程/g,
  /締切/g,
  /期限/g,
  /通知/g,
  /暦/g,
  /カレンダー/g,
];

const STORY_SAFE_FALLBACK_TERMS = {
  'story-manga': ['確認欄', '記録票', '受付票', '掲示板', '説明不足', '選択'],
  'short-video': ['冒頭の変化', '比較カード', '字幕', '保存理由', '手元の手順', 'コメント余白'],
  'long-novel': ['記録庫', '台帳', '証言', '章末記録', '誤解', '選択'],
};

function evidenceTermsForObservation(observation = {}) {
  const tagTerms = focusTermsFromValues(Array.isArray(observation.tags) ? observation.tags : []);
  const textTerms = [
    observation.title,
    observation.snippet,
    observation.queryUsed,
    observation.query,
  ].flatMap(extractEvidenceTerms);
  return uniqueList([...tagTerms, ...textTerms])
    .filter(isUsableEvidenceTerm)
    .slice(0, 6);
}

function usesFictionalizedTerms(categoryId) {
  return FICTIONALIZED_TERM_CATEGORIES.has(categoryId);
}

function storyFacingTermsForObservation(observation = {}, categoryId = 'story-manga') {
  const rawTerms = evidenceTermsForObservation(observation);
  if (!usesFictionalizedTerms(categoryId)) return rawTerms;
  const structuralTerms = extractStoryStructuralTerms(observationEvidenceText(observation));
  const safeRawTerms = rawTerms.filter(isStorySafeEvidenceTerm);
  return uniqueList([
    ...structuralTerms,
    ...safeRawTerms,
    ...(STORY_SAFE_FALLBACK_TERMS[categoryId] ?? STORY_SAFE_FALLBACK_TERMS['story-manga']),
  ])
    .map(normalizeStoryFacingTerm)
    .filter(isUsableEvidenceTerm)
    .slice(0, 6);
}

function extractStoryStructuralTerms(value) {
  const text = String(value ?? '').normalize('NFKC');
  const patternTerms = STORY_STRUCTURAL_PATTERNS.flatMap((pattern) => text.match(pattern) ?? []);
  const extractedTerms = extractEvidenceTerms(text).filter(isStorySafeEvidenceTerm);
  return uniqueList([...patternTerms, ...extractedTerms])
    .map(normalizeStoryFacingTerm)
    .filter(isStorySafeEvidenceTerm)
    .slice(0, 8);
}

function normalizeStoryFacingTerm(value) {
  const normalized = cleanFocusTerm(value);
  if (/(発売日|公開日|配信日|予定|日程|締切|期限|予約|明日|カレンダー|暦)/.test(normalized)) return '予定';
  if (/(通知|リマインド|アラーム|知らせ)/.test(normalized)) return '通知';
  if (/(後悔|忘れ|遅れ|間に合わ)/.test(normalized)) return '後悔';
  return normalized;
}

function isStorySafeEvidenceTerm(value) {
  const normalized = cleanFocusTerm(String(value ?? '').normalize('NFKC'));
  if (!isUsableEvidenceTerm(normalized)) return false;
  if (/[のがをへと]/.test(normalized) && normalized.length > 8) return false;
  if (containsLikelyRealEntity(normalized)) return false;
  if (hasStorySafeStem(normalized)) return true;
  if (/^[一-龯々]{2}$/.test(normalized)) return true;
  if (/^[一-龯々ぁ-んァ-ヴー]{2,6}$/.test(normalized) && !looksLikeProperNoun(normalized)) return true;
  return false;
}

function hasStorySafeStem(value) {
  const normalized = String(value ?? '');
  return STORY_SAFE_TERM_STEMS.some((stem) => normalized.includes(stem));
}

function containsLikelyRealEntity(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return false;
  if (/(?:氏|さん|氏ら|選手|監督|社長|会長|議員|教授|容疑者|被告|アナ|俳優|女優|芸人|タレント|クリエイター|YouTuber)/.test(normalized)) return true;
  if (/(株式会社|有限会社|合同会社|Inc\.?|LLC|Corp\.?|Corporation|公式)/i.test(normalized)) return true;
  if (/^[A-Za-z][A-Za-z0-9!?.&-]{2,}$/.test(normalized)) return true;
  if (/^[ァ-ヴー・ー]{5,}$/.test(normalized) && !hasStorySafeStem(normalized)) return true;
  if (/^[一-龯々]{3,5}$/.test(normalized) && !hasStorySafeStem(normalized)) return true;
  if (/^[ぁ-んァ-ヴー一-龯々]{4,12}$/.test(normalized) && /[ぁ-ん]/.test(normalized) && /[ァ-ヴー]/.test(normalized) && !hasStorySafeStem(normalized)) return true;
  return false;
}

function looksLikeProperNoun(value) {
  const normalized = String(value ?? '').trim();
  if (containsLikelyRealEntity(normalized)) return true;
  if (/^[ァ-ヴー・ー]{4,}$/.test(normalized) && !hasStorySafeStem(normalized)) return true;
  if (/^[一-龯々]{3,5}$/.test(normalized) && !hasStorySafeStem(normalized)) return true;
  return false;
}

function extractEvidenceTerms(value) {
  const text = String(value ?? '')
    .normalize('NFKC')
    .replace(/\s*[-–—]\s*(ABEMA|Yahoo!ニュース|Google News|Bing News|ITmedia|NHK|朝日新聞|読売新聞|毎日新聞|産経ニュース|PR TIMES|ねとらぼ|Impress Watch|CNET Japan|THE ANSWER).*$/iu, ' ')
    .replace(/public Web\/RSS round \d+/gi, ' ')
    .replace(/公開Web\/RSS取得\d*/g, ' ')
    .replace(/\b\d+d\b/gi, ' ')
    .replace(/[「」『』【】（）()[\]"”“]/g, ' ');
  const alnumTerms = text.match(/[A-Za-z]*\d+[A-Za-z0-9０-９]*/g) ?? [];
  const compactTerms = text.match(/[一-龯々〆ヵヶァ-ヴーA-Za-z0-9０-９]{2,16}/g) ?? [];
  return uniqueList([...alnumTerms, ...compactTerms].map(cleanFocusTerm)).filter(isUsableEvidenceTerm);
}

function isUsableEvidenceTerm(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized || normalized.length < 2) return false;
  if (isMetaFocusTerm(normalized)) return false;
  if (isSourceTag(normalized)) return false;
  if (EVIDENCE_TERM_STOPWORDS.has(normalized)) return false;
  if (/^(Google|Bing|Yahoo|TikTok|YouTube|LINE|Netflix|RSS|Web)$/i.test(normalized)) return false;
  if (/^[\d０-９]+$/.test(normalized) && normalized.length < 3) return false;
  return true;
}

function anchorSurfacesForCategory(categoryId) {
  const surfaces = {
    'story-manga': ['確認欄', '受付票', '掲示板', '白い余白', '記録票', '入力フォーム', '封筒', '申請欄'],
    'short-video': ['比較カード', '手元カット', '字幕カード', 'チェック欄', 'ビフォー画面', '検証ボード'],
    'trend-explainer': ['根拠カード', '比較表', '章立てボード', '注意点リスト', '制作判断表', '観測ログ'],
    'long-novel': ['記録庫', '受付票', '町の台帳', '章末記録', '封印された書類', '白紙の索引'],
  };
  return surfaces[categoryId] ?? surfaces['story-manga'];
}

function perspectiveAnglesForCategory(categoryId) {
  const perspectives = {
    'story-manga': ['当事者の誤解', '周囲の沈黙', '制度の見落とし', '第三者の証言', '場面の裏側', '最後の選択'],
    'short-video': ['失敗直前', '変化後の比較', '視聴者の手元', 'コメントの二択', '試す前の迷い', '保存後の再確認'],
    'trend-explainer': ['観測事実', '視聴心理', '制作手順', '安全な言い換え', '媒体別の差', '次回検証'],
    'long-novel': ['第1章の誤解', '別人物の証言', '記録の欠落', '町のルール', '章末の再解釈', '終盤の回収'],
  };
  return perspectives[categoryId] ?? perspectives['story-manga'];
}

function deriveEvidenceAnchor(observation, insight, seed = 0, index = 0, categoryId = 'story-manga') {
  const terms = storyFacingTermsForObservation(observation, categoryId);
  const numericSeed = Math.abs(Number(seed) || 0);
  const hash = stableHash(`${observation?.id ?? ''}|${observation?.title ?? ''}|${observation?.sourceUrl ?? ''}|${index}`);
  const offset = Math.abs(hash + numericSeed * 17 + index * 11);
  const fallbackTerms = STORY_SAFE_FALLBACK_TERMS[categoryId] ?? STORY_SAFE_FALLBACK_TERMS['story-manga'];
  const fallbackFocus = usesFictionalizedTerms(categoryId)
    ? fallbackTerms[index % fallbackTerms.length]
    : cleanFocusTerm(insight?.material ?? '取得シグナル');
  const focusTerm = terms[0] ?? fallbackFocus;
  const fallbackSecondary = usesFictionalizedTerms(categoryId)
    ? fallbackTerms[(index + 1) % fallbackTerms.length]
    : cleanFocusTerm(insight?.type ?? '別視点');
  const secondaryTerm = terms.find((term) => term !== focusTerm) ?? fallbackSecondary;
  const surface = pickVariant(anchorSurfacesForCategory(categoryId), offset + 1);
  const perspective = pickVariant(perspectiveAnglesForCategory(categoryId), offset + 2);
  const focusPair = uniqueList([focusTerm, secondaryTerm]).join('・');
  const title = usesFictionalizedTerms(categoryId)
    ? `${focusPair}の取得根拠`
    : compactEvidenceText(observation?.title ?? focusPair, 72);
  const scenePrefix = {
    'story-manga': '1ページ目で',
    'short-video': '縦画面で',
    'trend-explainer': '解説画面で',
    'long-novel': '第1章で',
  }[categoryId] ?? '冒頭で';
  const artifact = `${focusTerm}を示す${surface}`;
  const scene = `${scenePrefix}${surface}に${focusTerm}の違和感が現れる`;
  const tension = pickVariant(
    [
      `${focusTerm}が急いで片付けられるほど、${secondaryTerm}に残った説明不足が大きくなる`,
      `${secondaryTerm}の一行が、${focusTerm}をめぐる判断の空白を照らす`,
      `${focusTerm}を普通の手続きとして流すほど、${secondaryTerm}の違和感が消えずに残る`,
      `${focusTerm}の見方が一つに固定され、${secondaryTerm}から見た事情がこぼれ落ちる`,
    ],
    offset + 3,
  );
  const readerNeed = pickVariant(
    [
      `${focusTerm}の奥にある説明不足を、自分の生活感覚でも確かめたい`,
      `${secondaryTerm}に残った違和感を、誰かのせいにせず読み解きたい`,
      `${focusTerm}をめぐる判断がなぜずれたのか、画面上の手がかりから追いたい`,
      `${secondaryTerm}の小さな変化から、見落とされた事情を拾い直したい`,
    ],
    offset + 4,
  );
  const emotionalHook = pickVariant(
    [
      `${focusTerm}はただの話題に見えるのに、${secondaryTerm}を見た瞬間だけ意味が変わる不安。`,
      `${secondaryTerm}の一行を読み飛ばすと、誰かの説明が最初からなかったことになる怖さ。`,
      `${focusTerm}を正しく処理したはずなのに、画面の端だけが納得していない感覚。`,
      `${focusTerm}の判断を急ぐほど、${secondaryTerm}に残った余白が読者の目に刺さる。`,
    ],
    offset + 5,
  );
  const actionPrefix = {
    'story-manga': '読み替える',
    'short-video': '試して見せる',
    'trend-explainer': '分解する',
    'long-novel': '章ごとに追う',
  }[categoryId] ?? '企画化する';
  return {
    id: observation?.id ?? '',
    source: observation?.source ?? '公開Web/RSS',
    sourceUrl: observation?.sourceUrl ?? '',
    title,
    query: safeQueryForPlan(observation?.queryUsed ?? observation?.query),
    observedAt: observation?.observedAt ?? '',
    publishedAt: observation?.publishedAt ?? '',
    insightType: insight?.type ?? 'topic',
    conceptType: insight?.type ?? 'topic',
    terms,
    focusTerm,
    secondaryTerm,
    perspective,
    surface,
    scene,
    artifact,
    tension,
    readerNeed,
    emotionalHook,
    actionLabel: `${focusTerm}を${actionPrefix}`,
    productionAngle: `${focusPair}を${surface}と${perspective}の見せ場に変える`,
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
    terms: anchor.terms,
    secondaryTerm: anchor.secondaryTerm,
    perspective: anchor.perspective,
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
  return planObservationsForCluster(cluster?.observations, PLAN_BATCH_SIZE).map((observation, index) => {
    const insight = classifyObservationInsight(observation ?? {});
    return deriveEvidenceAnchor(observation, insight, seed, index, cluster?.categoryId ?? 'story-manga');
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
    'short-video': `${primary.actionLabel}を1本1手順に絞り、視聴後の行動理由を最後の字幕に置く`,
    'trend-explainer': `観測、心理、制作手順、注意点の順で${primary.productionAngle}を説明する`,
    'long-novel': `${primary.artifact}を章末証拠として反復し、回収前の余白を作る`,
  };
  const mediumTerms = {
    'story-manga': ['1ページ目のコマ設計', '吹き出し外の情報', '縦読みの余白', 'ラスト1コマの選択'],
    'short-video': ['0秒目の画', '短い字幕', '前後比較', 'コメントで広がる余白'],
    'trend-explainer': ['観測根拠', '推測の境界', '章立て解説', '制作チェック'],
    'long-novel': ['第1章の痛み', '章末の証拠', '複数視点', '長期回収'],
  }[categoryId] ?? ['冒頭', '中盤', '回収'];

  return {
    surfacePattern: uniqueList([
      `今回の切り口: ${anchorSummary}。${observationPhrase}を、${primary.scene}の見せ場へ変換します。`,
      categoryMoves[categoryId] ?? categoryMoves['story-manga'],
      ...anchors.slice(1).map((anchor) => `${anchor.focusTerm}は、${anchor.perspective}から見ると${anchor.artifact}として扱えます。`),
      `${mediumTerms.slice(0, 2).join(' / ')}を使い、根拠語を説明文ではなく画面上の変化へ移します。`,
    ]).slice(0, 5),
    humanMotivation: uniqueList([
      primary.readerNeed,
      ...anchors.slice(1).map((anchor) => anchor.readerNeed),
      `${primary.secondaryTerm}を自分ごととして確かめたい`,
      `${primary.focusTerm}を一面的に扱われたくない`,
    ]).slice(0, 5),
    narrativeMechanism: uniqueList([
      primary.tension,
      `${primary.artifact}を使った見せ場`,
      ...anchors.slice(1).map((anchor) => `${anchor.focusTerm}を別人物・別場面で読み替える`),
      `${mediumTerms.at(-1)}で最初の意味を更新する`,
    ]).slice(0, 5),
    productionMechanism: uniqueList([
      productionMoves[categoryId] ?? productionMoves['story-manga'],
      primary.productionAngle,
      ...mediumTerms,
    ]).slice(0, 5),
    opportunityGap: uniqueList([
      `${queryPhrase}で見えた反応は、そのまま流行語にせず「${primary.focusTerm}」として扱うと、反復ではなく今回固有の企画判断になります。`,
      `${anchors.map((anchor) => anchor.focusTerm).join(' / ')}を横並びにせず、各案で主人公、場面、最初の事件、回収点を分ける余地があります。`,
      `同じ方向に寄る場合は、${primary.perspective}、${anchors[1]?.perspective ?? '別人物'}、${anchors[2]?.perspective ?? '別媒体'}のように視点を変えます。`,
    ]).slice(0, 3),
    categoryInsight: `今回の分析では、取得語をそのまま人物名や企業名として使わず、${primary.focusTerm}を${primary.surface ?? primary.artifact}と${primary.perspective}へ読み替える。核は「${primary.tension}」。補助視点は${anchors.slice(1).map((anchor) => anchor.perspective || anchor.focusTerm).join(' / ') || primary.secondaryTerm}。取得順は根拠として残し、企画案ごとに画面、証言、選択の役割を分ける。`,
  };
}

function observationSignalForPlan(observation, insight, anchor, categoryId = 'story-manga') {
  const observedAt = observation?.observedAt ? `取得時刻 ${formatShortDateTime(observation.observedAt)}` : '取得時刻未取得';
  const safeTerms = uniqueList([anchor?.focusTerm, anchor?.secondaryTerm, ...(anchor?.terms ?? [])]).slice(0, 3).join(' / ');
  const query =
    categoryId === 'trend-explainer' && observation?.queryUsed
      ? `検索語「${safeQueryForPlan(observation.queryUsed)}」`
      : `取得根拠語「${safeTerms || anchor?.focusTerm || '取得語'}」`;
  const title =
    categoryId === 'trend-explainer' && anchor?.title
      ? `取得タイトル「${anchor.title}」`
      : `${anchor?.focusTerm ?? insight.material}に近い反応`;
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
  const categoryPlans = planSkeletonsForCategory(categoryId, properNounUsage, safeFlags);
  const acquiredObservations = (cluster?.observations ?? []).filter(
    (observation) => observation.sourceType === 'public-web-rss' || observation.sourceType === 'fixture' || observation.sourceType === undefined,
  );
  return regeneratePlans(categoryPlans, variantSeed, {
    ...cluster,
    observations: acquiredObservations,
  }).map((plan) => addDraftPrompt({ ...plan, whyNow: cluster.label }, categoryId, cluster));
}

function planSkeletonsForCategory(categoryId, properNounUsage, sourceSimilarityFlags) {
  const skeletons = {
    'story-manga': [
      ['story-manga-frame-1', 'ストーリー漫画', '連載第1話'],
      ['story-manga-frame-2', 'ストーリー漫画', '読み切り'],
      ['story-manga-frame-3', 'ストーリー漫画', '縦読み漫画'],
    ],
    'short-video': [
      ['short-video-frame-1', '短尺動画', '30秒ショート'],
      ['short-video-frame-2', '短尺動画', '45秒ショート'],
      ['short-video-frame-3', '短尺動画', 'シリーズ初回'],
    ],
    'trend-explainer': [
      ['trend-explainer-frame-1', '解説動画', '7分解説'],
      ['trend-explainer-frame-2', '解説動画', '章立て解説'],
      ['trend-explainer-frame-3', '解説動画', '制作者向け分析'],
    ],
    'long-novel': [
      ['long-novel-frame-1', '長編小説', '第1章'],
      ['long-novel-frame-2', '中編小説', '中編小説'],
      ['long-novel-frame-3', '長編小説', '連作長編'],
    ],
  };
  return (skeletons[categoryId] ?? skeletons['story-manga']).map(([id, targetFormat, formatLabel]) => ({
    id,
    targetFormat,
    formatLabel,
    properNounUsage,
    sourceSimilarityFlags,
  }));
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
    categoryReasons: buildCategoryReasons(category.id, cluster),
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
