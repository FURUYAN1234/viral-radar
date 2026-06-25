export const CATEGORIES = [
  {
    id: 'story-manga',
    label: 'ストーリー漫画',
    shortLabel: '漫画',
    description: '読者欲求から、読み切り・連載第1話・縦読み漫画の企画へ変換します。',
    controls: {
      audience: ['general', 'working-adults', 'youth'],
      formats: ['one-shot', 'serial-first-episode', 'vertical-manga'],
    },
    outputContract: [
      '根拠マップ',
      '読者欲求分析',
      'ストーリー機構',
      'ページ/コマ設計',
      '制作案',
    ],
  },
  {
    id: 'short-video',
    label: 'ショート動画',
    shortLabel: 'ショート',
    description: '冒頭1秒、字幕、保存理由、コメント誘発点から短尺動画案を作ります。',
    controls: {
      audience: ['general', 'youth', 'working-adults'],
      formats: ['15s', '30s', '60s'],
    },
    outputContract: [
      '冒頭フック',
      '字幕/視覚テンポ',
      'コメント誘発',
      '保存理由',
      '台本',
    ],
  },
  {
    id: 'trend-explainer',
    label: 'トレンド解説動画',
    shortLabel: '解説動画',
    description: '実在の根拠を使いながら、告発や実名ドラマ化を避けた解説動画企画を作ります。',
    controls: {
      audience: ['general', 'working-adults', 'creator'],
      formats: ['5min', '8min', '12min'],
    },
    outputContract: [
      '根拠マップ',
      'なぜ今か',
      '構造的緊張',
      '不足している切り口',
      '台本構成',
    ],
  },
  {
    id: 'long-novel',
    label: '小説',
    shortLabel: '長編小説',
    description: '短編・中編・長編の読者維持設計まで落とし込むWeb小説企画を作ります。',
    controls: {
      audience: ['general', 'working-adults', 'web-fiction'],
      formats: ['short', 'medium', 'long'],
    },
    outputContract: [
      '読者欲求',
      'タイトル型',
      '関係性エンジン',
      '章構成',
      '連載フック',
    ],
  },
];

export function getCategoryById(id) {
  return CATEGORIES.find((category) => category.id === id);
}
