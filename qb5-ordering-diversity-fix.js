// QB5 ordering concrete-diversity completion.
// Keeps semanticKey at the rule-template level while giving every concrete item
// a natural, non-ID surface context so no two emitted ordering items are identical.
(() => {
  'use strict';
  const E = window.QB5E;
  if (!E) return;
  const previous = E.handlers.get('ordering-constraints');
  if (!previous) return;

  const contexts = [
    '圖書館','車站','展館','劇院','球館','工坊','書店','碼頭','畫廊',
    '山屋','市集','茶館','教室','工作室','博物館','實驗室','運動中心','社區中心'
  ];
  const flows = [
    '開館準備流程','活動佈置流程','設備檢查流程','交付流程',
    '採樣流程','舞台準備流程','工作坊流程','展覽撤場流程'
  ];

  E.register('ordering-constraints', (q, ctx) => {
    previous(q, ctx);
    const s = E.mod(ctx.n, 18);
    const flow = flows[ctx.v] || flows[0];
    q.q = `在${contexts[s]}進行「${flow}」時，${q.q}`;
    q.surfaceVariant = s + 1;
    q.surfaceContext = `${contexts[s]}:${flow}`;
  });
})();
