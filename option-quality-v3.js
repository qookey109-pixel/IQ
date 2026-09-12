// QB4 Option Quality v3 — targeted distractor repair before answer-position balancing.
// Changes only options/answer index for approved families; semantic answer content remains explicit.
(() => {
  'use strict';

  const scenes = [
    ['館員','借書','借閱證','圖書館'],['園丁','澆花','水壺','溫室'],
    ['旅客','搭車','車票','車站'],['演員','登台','通行證','劇院'],
    ['學員','入場練習','預約單','球館'],['訪客','參觀','入場券','展館'],
    ['技師','維修','工單','工坊'],['讀者','取書','領取單','書店'],
    ['船員','出港','許可證','碼頭'],['廚師','備餐','訂單','廚房'],
    ['畫家','布展','核准單','畫廊'],['登山客','進山','登記證','登山口']
  ];

  function variantIndex(q) {
    const m = String(q?.id || '').match(/-(\d{3})$/);
    return m ? Number(m[1]) - 1 : -1;
  }

  function setOptions(q, correct, wrong) {
    const options = [String(correct), ...wrong.map(String)];
    if (options.length !== 4 || new Set(options).size !== 4) throw new Error(`Option Quality v3 invalid choices: ${q.id}`);
    q.o = options;
    q.a = 0;
    q.optionQualityRevision = '3.0';
    q.distractorDesign = 'qb4-v3-targeted-near-peer';
  }

  function rewrite(q) {
    const n = variantIndex(q);
    if (!q || n < 0) return false;

    switch (q.taskFamily) {
      case 'necessary-condition': {
        const [who,act,permit] = scenes[n % 12];
        setOptions(q,
          `這位${who}不具備${act}資格`,
          [`這位${who}已具備${act}資格`,`所有${who}都不具備${act}資格`,`持有${permit}的人一定會${act}`]
        );
        return true;
      }
      case 'reported-vs-fact': {
        const [who,act] = scenes[n % 12];
        setOptions(q,
          `這幾位${who}表示打算${act}`,
          [`這幾位${who}已經完成${act}`,`這幾位${who}明天一定會${act}`,`其他${who}都不打算${act}`]
        );
        return true;
      }
      case 'scope-negation': {
        const [,act] = scenes[n % 12];
        setOptions(q,
          `至少有一位受訪者不願意${act}`,
          [`所有受訪者都不願意${act}`,`至少有一位受訪者願意${act}`,`恰好有一位受訪者不願意${act}`]
        );
        return true;
      }
      case 'evidence-strength': {
        const [,act] = scenes[n % 12];
        setOptions(q,
          `所有受訪者都表示喜歡${act}`,
          [`所有未受訪者都表示喜歡${act}`,`所有本地居民都表示喜歡${act}`,`喜歡${act}會讓所有人更快樂`]
        );
        return true;
      }
      case 'quant-remainder': {
        const r = 1 + (n % 6);
        const candidates = [];
        for (const value of [r-1,r+1,r-2,r+2,0,1,2,3,4,5,6]) {
          if (value >= 0 && value <= 6 && value !== r && !candidates.includes(value)) candidates.push(value);
        }
        setOptions(q, String(r), candidates.slice(0,3).map(String));
        return true;
      }
      default:
        return false;
    }
  }

  const seen = new Set();
  const counts = {};
  let modifiedItems = 0;
  for (const collection of [window.IQ_QUESTION_BANK, window.IQ_QUESTIONS]) {
    if (!Array.isArray(collection)) continue;
    for (const q of collection) {
      if (!q || seen.has(q)) continue;
      seen.add(q);
      if (rewrite(q)) {
        modifiedItems += 1;
        counts[q.taskFamily] = (counts[q.taskFamily] || 0) + 1;
      }
    }
  }

  window.IQ_OPTION_QUALITY_V3 = {
    version: '3.0',
    modifiedItems,
    modifiedFamilies: Object.keys(counts).length,
    counts,
    targetedFamilies: ['necessary-condition','reported-vs-fact','scope-negation','evidence-strength','quant-remainder'],
    principle: 'remove answer cues and impossible distractors without changing the construct'
  };
})();