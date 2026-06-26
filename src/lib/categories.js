export const CATEGORIES = [
  {
    id: 'story-manga',
    label: 'ストーリー漫画',
    shortLabel: '漫画',
    description: '公開根拠を、読み切り・連載第1話・縦読み漫画の制作案へ整理します。',
    controls: {
      audience: ['general', 'working-adults', 'youth'],
      formats: ['one-shot', 'serial-first-episode', 'vertical-manga'],
    },
    outputContract: [
      '根拠マップ',
      '取得データの読み取り',
      '物語・台本設計',
      'ページ/コマ確認項目',
      '制作案の根拠',
    ],
  },
  {
    id: 'short-video',
    label: 'ショート動画',
    shortLabel: 'ショート',
    description: '公開根拠を、冒頭1秒、字幕、保存理由、コメント誘発点の制作案へ整理します。',
    controls: {
      audience: ['general', 'youth', 'working-adults'],
      formats: ['15s', '30s', '60s'],
    },
    outputContract: [
      '冒頭フック',
      '字幕/視覚テンポ確認',
      'コメント誘発確認',
      '保存理由確認',
      '台本の要点',
    ],
  },
  {
    id: 'trend-explainer',
    label: 'トレンド解説動画',
    shortLabel: '解説動画',
    description: '実在の根拠を、告発や実名ドラマ化を避ける制作案へ整理します。',
    controls: {
      audience: ['general', 'working-adults', 'creator'],
      formats: ['5min', '8min', '12min'],
    },
    outputContract: [
      '根拠マップ',
      '取得データの読み取り',
      '根拠の重なり',
      '追加確認点',
      '台本の要点',
    ],
  },
  {
    id: 'long-novel',
    label: '小説',
    shortLabel: '長編小説',
    description: '公開根拠を、短編・中編・長編の制作案へ整理します。',
    controls: {
      audience: ['general', 'working-adults', 'web-fiction'],
      formats: ['short', 'medium', 'long'],
    },
    outputContract: [
      '取得データの読み取り',
      '仮タイトル',
      '関係性確認項目',
      '章構成',
      '連載フック',
    ],
  },
];

export function getCategoryById(id) {
  return CATEGORIES.find((category) => category.id === id);
}
