// Cognitive IQ Lab — qualitative combination title engine v1.
// Converts only the relative ordering of the six internal domain scores into a deterministic,
// finite public title. It never publishes numeric scores, IQ, percentile, rank, or age norms.
(() => {
  'use strict';

  const VERSION = '1.0';

  const DOMAIN_ORDER = [
    '語文理解',
    '流體推理',
    '視覺空間',
    '工作記憶',
    '處理速度',
    '量化推理'
  ];

  const DOMAIN_PROFILES = {
    '語文理解': {emoji:'📚', cue:'文字線索', action:'先拆開文字裡的關鍵線索'},
    '流體推理': {emoji:'🧩', cue:'規律推理', action:'先找出藏在題目裡的規律'},
    '視覺空間': {emoji:'🧭', cue:'空間結構', action:'先看位置、方向與結構'},
    '工作記憶': {emoji:'🧠', cue:'短期記憶', action:'先抓住剛出現的關鍵資訊'},
    '處理速度': {emoji:'⚡', cue:'快速辨識', action:'先快速掃描差異與相同點'},
    '量化推理': {emoji:'🔢', cue:'數字關係', action:'先把數字關係拆成小步驟'}
  };

  const COMBINATIONS = {
    '語文理解→流體推理': {emoji:'📚', title:'論點拼圖師', hook:'把文字拆成線索，再把線索拼成一條能走通的推理路。'},
    '語文理解→視覺空間': {emoji:'🗺️', title:'語意建築師', hook:'先抓住文字意思，再替資訊排出位置與結構。'},
    '語文理解→工作記憶': {emoji:'📝', title:'線索編輯師', hook:'把重要字句留在腦中，再重新整理成可用的線索。'},
    '語文理解→處理速度': {emoji:'🔎', title:'快讀捕手', hook:'先從文字裡快速抓到關鍵，再決定下一步怎麼走。'},
    '語文理解→量化推理': {emoji:'🔤', title:'數字翻譯官', hook:'把文字條件翻成數字關係，再把答案翻回題目的意思。'},

    '流體推理→語文理解': {emoji:'🧩', title:'邏輯說書人', hook:'先找規律，再用文字線索確認這條推理能不能說得通。'},
    '流體推理→視覺空間': {emoji:'🔍', title:'結構偵探', hook:'先找規則，再從位置與形狀裡確認蛛絲馬跡。'},
    '流體推理→工作記憶': {emoji:'🗂️', title:'規律記錄員', hook:'一邊找規律，一邊把剛出現的重要條件留在手上。'},
    '流體推理→處理速度': {emoji:'⚡', title:'閃電推理手', hook:'先快速排除不合規律的路，再集中處理剩下的可能。'},
    '流體推理→量化推理': {emoji:'🎯', title:'公式獵人', hook:'先抓住規則骨架，再用數字關係把它鎖定。'},

    '視覺空間→語文理解': {emoji:'🖼️', title:'圖像說書人', hook:'先看出空間關係，再用文字線索替畫面補上意義。'},
    '視覺空間→流體推理': {emoji:'🧭', title:'空間解謎者', hook:'先看位置與方向，再從結構裡找出規律。'},
    '視覺空間→工作記憶': {emoji:'🗺️', title:'腦內製圖師', hook:'先把位置記在腦中，再把零散空間線索拼成一張圖。'},
    '視覺空間→處理速度': {emoji:'📡', title:'視覺雷達員', hook:'先掃描畫面裡的變化，再快速抓住最有用的位置線索。'},
    '視覺空間→量化推理': {emoji:'📐', title:'座標拼圖師', hook:'先看空間結構，再用數字關係替位置做確認。'},

    '工作記憶→語文理解': {emoji:'🧠', title:'記憶編輯者', hook:'先把剛看過的資訊留住，再用文字重新整理它。'},
    '工作記憶→流體推理': {emoji:'🧵', title:'線索追蹤者', hook:'先把條件留在手上，再沿著規律一步一步追下去。'},
    '工作記憶→視覺空間': {emoji:'🗺️', title:'地圖收藏家', hook:'先記住位置與變化，再把它們重新排回一張空間地圖。'},
    '工作記憶→處理速度': {emoji:'📸', title:'快照收藏家', hook:'先快速抓住畫面或資訊，再把短暫線索留到下一步使用。'},
    '工作記憶→量化推理': {emoji:'🔢', title:'數列收藏家', hook:'先記住數字與順序，再從它們之間找出可用的關係。'},

    '處理速度→語文理解': {emoji:'⚡', title:'文字掃描員', hook:'先快速掃描重點，再用文字意思確認沒有看錯方向。'},
    '處理速度→流體推理': {emoji:'🚦', title:'快速驗證員', hook:'先快速縮小範圍，再用規律檢查最後留下的選項。'},
    '處理速度→視覺空間': {emoji:'🛰️', title:'瞬間導航員', hook:'先快速定位，再從方向與位置中找到下一步。'},
    '處理速度→工作記憶': {emoji:'💾', title:'快閃記錄員', hook:'先快速捕捉資訊，再把最重要的部分暫時留住。'},
    '處理速度→量化推理': {emoji:'⏱️', title:'秒速算式手', hook:'先快速辨識數字結構，再決定哪個關係最值得算。'},

    '量化推理→語文理解': {emoji:'🔢', title:'數字說書人', hook:'先拆數字關係，再回頭確認題目文字真正問的是什麼。'},
    '量化推理→流體推理': {emoji:'🧮', title:'邏輯計算師', hook:'先把數字關係排好，再用規律檢查整條推理。'},
    '量化推理→視覺空間': {emoji:'📐', title:'座標工程師', hook:'先處理數字關係，再把結果放回位置與空間結構裡。'},
    '量化推理→工作記憶': {emoji:'🗃️', title:'數字記憶庫', hook:'先抓住數字與條件，再把它們留在腦中組合。'},
    '量化推理→處理速度': {emoji:'⚡', title:'快速估算手', hook:'先看出數字關係，再快速縮小可能答案。'}
  };

  function domainProfile(domain) {
    return DOMAIN_PROFILES[domain] || {
      emoji:'✨',
      cue:domain || '多線索',
      action:'先找出最有用的線索'
    };
  }

  function orderedDomains(domains, stats) {
    const stableOrder = new Map(DOMAIN_ORDER.map((domain, index) => [domain, index]));
    return domains
      .map((domain, inputIndex) => ({
        domain,
        score: Number(stats?.[domain]?.score) || 0,
        stableIndex: stableOrder.has(domain) ? stableOrder.get(domain) : DOMAIN_ORDER.length + inputIndex
      }))
      .sort((a, b) => (b.score - a.score) || (a.stableIndex - b.stableIndex));
  }

  function buildProfile(domains, stats) {
    const ordered = orderedDomains(domains, stats);
    const primaryDomain = ordered[0]?.domain || DOMAIN_ORDER[0];
    const secondaryDomain = ordered[1]?.domain || DOMAIN_ORDER[1];
    const primary = domainProfile(primaryDomain);
    const secondary = domainProfile(secondaryDomain);
    const key = `${primaryDomain}→${secondaryDomain}`;
    const combo = COMBINATIONS[key] || {
      emoji: primary.emoji,
      title: '腦內探險家',
      hook: `先從${primary.cue}切入，再讓${secondary.cue}接手補位。`
    };
    const topScore = ordered[0]?.score ?? 0;
    const secondScore = ordered[1]?.score ?? 0;
    const coLead = topScore === secondScore;

    return {
      engineVersion: VERSION,
      variantId: key,
      emoji: combo.emoji,
      title: combo.title,
      signature: coLead
        ? `雙主線 · ${primary.cue} × ${secondary.cue}`
        : `${primary.cue} × ${secondary.cue}`,
      primaryDomain,
      secondaryDomain,
      coLead,
      summary: coLead
        ? `如果把這次作答畫成一張地圖，${primary.cue}和${secondary.cue}幾乎同時亮起來。`
        : `如果把這次作答畫成一條路，${primary.cue}走在前面，${secondary.cue}在旁邊補位。`,
      strategy: coLead
        ? `今天比較像讓${primary.cue}和${secondary.cue}輪流接手，而不是只靠單一路線。`
        : `${primary.action}，再讓${secondary.cue}當第二個確認點。`,
      description: `今天比較像「${combo.title}」模式：${combo.hook}`
    };
  }

  window.IQ_RESULT_TITLE_ENGINE = Object.freeze({
    version: VERSION,
    domainOrder: Object.freeze([...DOMAIN_ORDER]),
    domainProfiles: Object.freeze({...DOMAIN_PROFILES}),
    combinations: Object.freeze({...COMBINATIONS}),
    combinationCount: Object.keys(COMBINATIONS).length,
    domainProfile,
    buildProfile
  });
})();
