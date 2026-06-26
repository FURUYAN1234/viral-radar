import { exportTimestamp } from './fileNames.js';

const SECRET_PATTERNS = [/sk-proj-[A-Za-z0-9_-]+/g, /AIza[0-9A-Za-z_-]+/g];
const encoder = new TextEncoder();

export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function docxFileName(report) {
  const category = report?.category?.id ?? 'report';
  return `monogatari-buzz-maker-${category}-${exportTimestamp()}.docx`;
}

export function toDocxArrayBuffer(report) {
  const files = buildDocxFiles(report);
  const zipBytes = createZip(files);
  return zipBytes.buffer.slice(zipBytes.byteOffset, zipBytes.byteOffset + zipBytes.byteLength);
}

function buildDocxFiles(report) {
  return [
    { path: '[Content_Types].xml', content: contentTypesXml() },
    { path: '_rels/.rels', content: rootRelsXml() },
    { path: 'docProps/core.xml', content: coreXml(report) },
    { path: 'docProps/app.xml', content: appXml() },
    { path: 'word/document.xml', content: documentXml(report) },
    { path: 'word/styles.xml', content: stylesXml() },
    { path: 'word/settings.xml', content: settingsXml() },
    { path: 'word/footer1.xml', content: footerXml() },
    { path: 'word/_rels/document.xml.rels', content: documentRelsXml() },
  ];
}

function documentXml(report) {
  const categoryLabel = report.category?.label ?? '未設定';
  const cluster = report.trendClusters?.[0] ?? {};
  const primaryPlan = report.creativePlans?.[0];
  const plans = report.creativePlans ?? [];
  const decisionItems = [
    'この企画を読み切りで試すか、連載第1話として設計するか。',
    '主人公の年齢、職業、生活圏をどこまで具体化するか。',
    '第1話の最後に残す謎と、次回で回収する情報。',
    '実在サービス名を資料上の根拠に留め、本編ではどの架空表現へ置き換えるか。',
    '次回打ち合わせまでに用意するもの：ネーム、編集用プロット、本文サンプルの優先順位。',
  ];
  const lines = [
    paragraph(`${categoryLabel} 編集者打ち合わせ用企画書`, 'Title'),
    paragraph(
      '採否判断、修正方針、次に作る原稿サンプルを決めるための会議資料です。Webアプリ画面の丸写しではなく、編集判断に必要な材料だけに絞っています。',
      'Subtitle',
    ),
    table([
      ['項目', '内容'],
      [
        '資料の目的',
        '企画の勝ち筋、読者仮説、初回の見せ場、リスクを編集者と確認する。',
      ],
      ['対象カテゴリ', categoryLabel],
      ['分析期間', report.timeWindow ?? '未設定'],
      ['作成日時', report.generatedAt ?? '未設定'],
    ]),
    heading1('1. 提案の要点'),
    table([
      ['判断項目', '提案内容'],
      ['推奨企画', primaryPlan?.titleCandidates?.[0] ?? '未設定'],
      [
        '読者への約束',
        primaryPlan?.audiencePromise ?? report.deepAnalysis?.categoryInsight ?? '未設定',
      ],
      ['初回の見せ場', primaryPlan?.opening ?? '未設定'],
      ['中心シグナル', cluster.label ?? '未設定'],
      [
        '編集上の狙い',
        primaryPlan?.craftNotes?.[0]?.detail ?? 'AI設計メモは未生成です。ローカル定型文では埋めません。',
      ],
    ]),
    paragraph(
      '根拠データは企画判断の補助として扱います。実際の作品内では、固有名詞や実在の事件をそのまま使わず、架空の制度、UI、場所、人物へ置き換える前提です。',
    ),
    heading1('2. 制作ロードマップ'),
    ...(report.beginnerGuide ? beginnerGuideParagraphs(report.beginnerGuide) : [paragraph('制作ロードマップは未生成です。')]),
    heading1('3. 編集判断チャート'),
    table([
      ['指標', '見立て', '編集判断への使い方'],
      [
        '勢い',
        scoreBar(cluster.momentumScore),
        'いま反応が起きている強さ。初回フックを強くする根拠にする。',
      ],
      [
        '飽和リスク',
        scoreBar(cluster.saturationScore),
        '高いほど似た企画が増えやすい。先に差別化を設計する。',
      ],
      [
        '確度',
        scoreBar(cluster.confidenceScore),
        '根拠から企画へ落とす信頼度。弱い場合は追加調査する。',
      ],
      [
        '根拠量',
        `${cluster.evidenceCount ?? 0}件 / ${cluster.sourceCount ?? 0}系統`,
        '複数ソースで重なるかを確認し、単発ネタ化を避ける。',
      ],
    ]),
    heading1('4. 企画比較表'),
    table([
      ['案', 'タイトル', '読者フック', '第1話の核', '編集メモ'],
      ...plans.map((plan, index) => [
        `案${index + 1}`,
        plan.titleCandidates?.[0] ?? '',
        plan.emotionalHook ?? plan.audiencePromise ?? '',
        plan.opening ?? plan.premise ?? '',
        plan.craftNotes?.[0]?.detail ??
          plan.differentiation ??
          '',
      ]),
    ]),
    heading1('5. 推奨企画の打ち合わせメモ'),
    ...(primaryPlan ? editorPlanParagraphs(primaryPlan) : [paragraph('推奨企画がありません。')]),
    heading1('6. 読者仮説と動き筋'),
    table([
      ['読者反応の仮説', '企画でやること', '作品への落とし方'],
      ...(report.categoryFitCards ?? []).map((card) => [
        card.title,
        card.creatorMove,
        card.example,
      ]),
    ]),
    heading1('7. 根拠の扱い'),
    table([
      ['根拠', '読み取り', '企画への使い方', '注意'],
      ...(report.evidenceCards ?? []).slice(0, 4).map((card) => [
        `${card.claim}\n${card.source}`,
        card.meaningForCreator,
        card.creativeUse,
        card.limitations || '実在名は根拠欄だけに留める。',
      ]),
    ]),
    heading1('8. リスクと修正方針'),
    table([
      ['リスク', '編集段階での対応'],
      [
        '実在人物、企業、作品の連想が強くなる',
        '本文では架空制度、架空サービス、架空企業へ変換する。資料上の根拠名を作品設定へ移植しない。',
      ],
      [
        '流行語追いだけに見える',
        '人物の弱点、選択、代償を先に決め、トレンドは感情の入口に留める。',
      ],
      [
        '説明が多くなる',
        '第1話では一つの異常表示、一つの選択、一つの引きに絞る。',
      ],
      ...(report.limitations ?? []).map((item) => [
        item,
        '制作前に根拠と表現の距離を確認する。',
      ]),
    ]),
    heading1('9. 打ち合わせで決めたいこと'),
    ...decisionItems.map((item) => bullet(item)),
  ];

  return xmlDoc(`
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${lines.join('\n')}
    <w:sectPr>
      <w:footerReference w:type="default" r:id="rIdFooter1"/>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1320" w:bottom="1440" w:left="1320" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`);
}

function beginnerGuideParagraphs(guide) {
  return [
    heading2(guide.headline ?? '制作ロードマップ'),
    paragraph(guide.promise ?? ''),
    table([
      ['項目', '内容'],
      ['最初に作るもの', guide.firstOutput ?? '未設定'],
      ...((guide.steps ?? []).map((step, index) => [
        `${index + 1}. ${step.label ?? ''}`,
        `${step.action ?? ''}\n出力: ${step.output ?? ''}`,
      ])),
    ]),
    heading3('書く前の確認'),
    ...((guide.checklist ?? []).map((item) => bullet(item))),
    heading3('外すと弱くなる点'),
    ...((guide.avoid ?? []).map((item) => bullet(item))),
  ];
}

function editorPlanParagraphs(plan) {
  const brief = plan.creatorBrief ?? {};
  return [
    heading2(plan.titleCandidates?.[0] ?? '未設定'),
    table([
      ['項目', '内容'],
      ['形式', plan.formatLabel],
      ['別タイトル案', (plan.titleCandidates ?? []).slice(1, 4).join(' / ')],
      ['ログライン', plan.audiencePromise],
      ['読者の感情フック', plan.emotionalHook],
      ['差別化', plan.differentiation],
    ]),
    heading3('物語の骨格'),
    table([
      ['要素', '内容'],
      ['主人公', brief.protagonist],
      ['舞台', brief.setting],
      ['最初の事件', brief.incitingIncident],
      ['対立', brief.conflict],
      ['最後に選ばせること', brief.choice],
      ['読後感', brief.payoff],
    ]),
    heading3('物語・台本設計'),
    table([
      ['設計項目', '打ち合わせで見る内容'],
      ...designRowsForDocx(plan.storyArchitecture?.notes),
    ]),
    heading3('第1話で見せる順番'),
    table([
      ['順番', '内容'],
      ...(plan.outline ?? []).map((item, outlineIndex) => [`${outlineIndex + 1}`, item]),
    ]),
    heading3('なぜ通す価値があるか'),
    ...(plan.reasonToWin ?? []).map((item) => bullet(item)),
    heading3('打ち合わせ用サンプル'),
    labelParagraph('企画の核', plan.premise),
    labelParagraph('初回具体例', plan.exampleDetail),
    labelParagraph('冒頭の見せ場', plan.opening),
  ];
}

function designRowsForDocx(notes) {
  if (Array.isArray(notes) && notes.length > 0) {
    return notes.map((note) => [note.label, note.detail]);
  }
  return [['AI未生成', 'API応答がまだないため未生成です。ローカル定型文では埋めません。']];
}

function heading1(text) {
  return paragraph(text, 'Heading1');
}

function heading2(text) {
  return paragraph(text, 'Heading2');
}

function heading3(text) {
  return paragraph(text, 'Heading3');
}

function bullet(text) {
  return paragraph(`・${text}`, 'ListParagraph');
}

function scoreBar(value) {
  const score = Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : 0;
  const filled = Math.round(score / 10);
  return `${score} / 100 [${'#'.repeat(filled)}${'-'.repeat(10 - filled)}]`;
}

function table(rows) {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const columnWidth = String(Math.max(1200, Math.floor(9600 / Math.max(1, columnCount))));
  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="5000" w:type="pct"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="6" w:space="0" w:color="AAB4BE"/>
        <w:left w:val="single" w:sz="6" w:space="0" w:color="AAB4BE"/>
        <w:bottom w:val="single" w:sz="6" w:space="0" w:color="AAB4BE"/>
        <w:right w:val="single" w:sz="6" w:space="0" w:color="AAB4BE"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="D4DAE0"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="D4DAE0"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid>
      ${Array.from({ length: columnCount }, () => `<w:gridCol w:w="${columnWidth}"/>`).join('\n')}
    </w:tblGrid>
    ${rows.map((row, rowIndex) => tableRow(row, rowIndex === 0)).join('\n')}
  </w:tbl>`;
}

function tableRow(cells, isHeader = false) {
  return `<w:tr>
    ${cells.map((cell) => tableCell(cell, isHeader)).join('\n')}
  </w:tr>`;
}

function tableCell(value, isHeader = false) {
  const fill = isHeader ? '<w:shd w:val="clear" w:fill="E9F3F1"/>' : '';
  const bold = isHeader ? '<w:b/>' : '';
  return `<w:tc>
    <w:tcPr><w:tcW w:w="2400" w:type="dxa"/>${fill}</w:tcPr>
    <w:p>
      <w:pPr><w:spacing w:after="80"/></w:pPr>
      ${runsForText(scrubSecrets(String(value ?? '')), bold)}
    </w:p>
  </w:tc>`;
}

function labelParagraph(label, value) {
  return `<w:p><w:pPr><w:pStyle w:val="Normal"/><w:spacing w:after="120"/><w:ind w:firstLine="420"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${escapeXml(`${label}：`)}</w:t></w:r><w:r><w:t xml:space="preserve">${escapeXml(String(value ?? ''))}</w:t></w:r></w:p>`;
}

function paragraph(text, style = 'Normal') {
  const indent = style === 'Normal' ? '<w:ind w:firstLine="420"/>' : '';
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/>${indent}</w:pPr>${runsForText(scrubSecrets(String(text ?? '')))}</w:p>`;
}

function runsForText(text, runProps = '') {
  const parts = text.split('\n');
  return parts
    .map((part, index) => {
      const br = index === 0 ? '' : '<w:br/>';
      return `<w:r>${runProps ? `<w:rPr>${runProps}</w:rPr>` : ''}${br}<w:t xml:space="preserve">${escapeXml(part)}</w:t></w:r>`;
    })
    .join('');
}

function stylesXml() {
  return xmlDoc(`
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Yu Gothic" w:hAnsi="Yu Gothic" w:eastAsia="Yu Gothic"/><w:sz w:val="22"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  ${style('Normal', 'Normal', 22, false, '16181D', 120, 0, 420)}
  ${style('Title', 'Title', 40, true, '16181D', 360)}
  ${style('Subtitle', 'Subtitle', 24, false, '46515F', 240)}
  ${style('Heading1', 'Heading 1', 30, true, '0B7F78', 240)}
  ${style('Heading2', 'Heading 2', 26, true, '16181D', 180)}
  ${style('Heading3', 'Heading 3', 23, true, 'D44732', 120)}
  ${style('ListParagraph', 'List Paragraph', 22, false, '16181D', 100, 360)}
  ${style('Quote', 'Quote', 22, false, '16181D', 160, 360)}
  ${style('Prompt', 'Prompt', 19, false, '16181D', 80, 240)}
</w:styles>`);
}

function style(styleId, name, size, bold = false, color = '16181D', after = 120, left = 0, firstLine = 0) {
  const firstLineAttr = firstLine ? ` w:firstLine="${firstLine}"` : '';
  return `<w:style w:type="paragraph" w:styleId="${styleId}">
    <w:name w:val="${name}"/>
    <w:pPr><w:spacing w:after="${after}"/><w:ind w:left="${left}"${firstLineAttr}/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Yu Gothic" w:hAnsi="Yu Gothic" w:eastAsia="Yu Gothic"/>${bold ? '<w:b/>' : ''}<w:color w:val="${color}"/><w:sz w:val="${size}"/></w:rPr>
  </w:style>`;
}

function footerXml() {
  return xmlDoc(`
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:r><w:t xml:space="preserve">Page </w:t></w:r>
    <w:r><w:fldChar w:fldCharType="begin"/></w:r>
    <w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
    <w:r><w:fldChar w:fldCharType="separate"/></w:r>
    <w:r><w:t>1</w:t></w:r>
    <w:r><w:fldChar w:fldCharType="end"/></w:r>
  </w:p>
</w:ftr>`);
}

function documentRelsXml() {
  return xmlDoc(`
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rIdFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>`);
}

function rootRelsXml() {
  return xmlDoc(`
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);
}

function contentTypesXml() {
  return xmlDoc(`
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`);
}

function settingsXml() {
  return xmlDoc(`
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:updateFields w:val="true"/>
</w:settings>`);
}

function coreXml(report) {
  const categoryLabel = report.category?.label ?? '未設定';
  const now = new Date().toISOString();
  return xmlDoc(`
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(`${categoryLabel} 企画書`)}</dc:title>
  <dc:creator>物語バズメーカー</dc:creator>
  <cp:keywords>企画書, 漫画, 動画, 小説</cp:keywords>
  <dc:description>トレンド分析から創作企画へ落とすための提案書</dc:description>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`);
}

function appXml() {
  return xmlDoc(`
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>物語バズメーカー</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company>Antigravity</Company>
</Properties>`);
}

function xmlDoc(body) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${body.trim()}`;
}

function escapeXml(value) {
  return scrubSecrets(normalizeDocxText(String(value ?? '')))
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function normalizeDocxText(value) {
  return value
    .replace(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{1,2}):(\d{2})/g, '$1年$2月$3日 $4時$5分')
    .replace(/(\d{1,2}):(\d{2})/g, '$1時$2分')
    .replace(/: /g, '：')
    .replace(/ \/ /g, '・');
}

function scrubSecrets(value) {
  return SECRET_PATTERNS.reduce((result, pattern) => result.replace(pattern, '[redacted-key]'), value);
}

function createZip(files) {
  const chunks = [];
  const centralEntries = [];
  let offset = 0;
  const { dosTime, dosDate } = zipDateTime(new Date());

  for (const file of files) {
    const name = encoder.encode(file.path);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const localHeader = new Uint8Array(30);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, dosTime, true);
    localView.setUint16(12, dosDate, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);

    chunks.push(localHeader, name, data);
    centralEntries.push({ name, dataLength: data.length, crc, offset, dosTime, dosDate });
    offset += localHeader.length + name.length + data.length;
  }

  const centralOffset = offset;
  for (const entry of centralEntries) {
    const centralHeader = new Uint8Array(46);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, entry.dosTime, true);
    centralView.setUint16(14, entry.dosDate, true);
    centralView.setUint32(16, entry.crc, true);
    centralView.setUint32(20, entry.dataLength, true);
    centralView.setUint32(24, entry.dataLength, true);
    centralView.setUint16(28, entry.name.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, entry.offset, true);
    chunks.push(centralHeader, entry.name);
    offset += centralHeader.length + entry.name.length;
  }

  const centralSize = offset - centralOffset;
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, centralEntries.length, true);
  eocdView.setUint16(10, centralEntries.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, centralOffset, true);
  eocdView.setUint16(20, 0, true);
  chunks.push(eocd);

  return concatChunks(chunks);
}

function concatChunks(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function zipDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    dosDate: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

const CRC_TABLE = buildCrcTable();

function buildCrcTable() {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[index] = crc >>> 0;
  }
  return table;
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
