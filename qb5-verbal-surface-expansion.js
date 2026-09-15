// Cognitive IQ Lab — verbal seventh-surface completion
// Adds exactly one genuinely new surface to each of the 14 verbal constructs.
// Final production topology: 294 constructs × 7 surfaces = 2,058 items.
(() => {
  'use strict';
  const bank=Array.isArray(window.IQ_QUESTION_BANK)?window.IQ_QUESTION_BANK:[];
  if(bank.length!==2044)return;
  const families=['necessary-condition','reported-vs-fact','contrast-focus','scope-negation','instruction-exception','pronoun-reference','evidence-strength'];
  const specs={
    'necessary-condition':[
      ['資料庫規定：要取得下載權限，必須完成雙重驗證。小禾尚未完成雙重驗證。哪一項必然成立？','小禾目前沒有下載權限',['小禾一定永久不能下載','所有完成驗證的人都會下載','小禾已經取得下載權限'],'雙重驗證是取得下載權限的必要條件；缺少必要條件就不能推出已取得權限。'],
      ['實驗室規定：要操作儀器，必須同時完成安全課程並持有當日授權。小安完成了安全課程，但沒有當日授權。哪一項必然成立？','小安目前不能操作儀器',['小安一定永遠不能操作儀器','安全課程不是必要條件','小安已有完整操作資格'],'兩個條件都被明列為必要條件；少一項就尚未符合操作資格。']
    ],
    'reported-vs-fact':[
      ['社區中心的聯絡紀錄寫道：「幾位志工表示，下週想參加場地整理。」只根據這份紀錄，哪個結論最穩妥？','目前能確定的是，有志工表達了下週參與整理的意向',['這些志工已經完成場地整理','這些志工下週一定會到場','所有志工都有相同的安排'],'紀錄支持的是有人表達意向；不能把意向升級成已完成、必然發生或所有人都一樣。'],
      ['戶外活動公告寫道：「依目前天氣預報，明天下午活動可能改到室內。」只根據這份公告，哪個結論最穩妥？','明天下午活動有可能改到室內，但目前並未確定',['明天下午活動一定改到室內','今天下午活動已經改到室內','所有後續活動都會改到室內'],'公告描述的是帶不確定性的預測，不能改寫成已發生、必然發生或擴大到未提及範圍。']
    ],
    'contrast-focus':[
      ['小岑說：「這雙鞋的外型不錯，但如果只能優先一項，我會選支撐性。」她最優先考量什麼？','支撐性',['外型','價格','外型與支撐性完全同等'],'「只能優先一項」直接指出支撐性順位較高。'],
      ['小岑比較兩條路線後說：「甲比較短，乙比較安全；這次我願意多走一點。」她最後優先考量什麼？','安全',['距離最短','兩者完全同等','只看沿途店家數量'],'願意接受較長距離，表示這次把安全放在較高順位。']
    ],
    'scope-negation':[
      ['「並非每位參賽者都完成熱身」與哪一句邏輯上等價？','至少有一位參賽者沒有完成熱身',['所有參賽者都沒有完成熱身','大多數參賽者沒有完成熱身','恰好一位參賽者完成熱身'],'否定「每一位都」只需要至少存在一個反例。'],
      ['「不是所有借閱者都歸還了書」最合理的等價敘述是？','至少有一位借閱者沒有歸還書',['所有借閱者都沒有歸還書','恰好一位借閱者歸還了書','只要歸還書就一定是借閱者'],'「不是所有 A 都 B」等價於「至少存在一個 A 不是 B」。']
    ],
    'instruction-exception':[
      ['器材室規則：「一般訪客不得領取器材；當日值班志工例外。」小禾是當日值班志工。依規則，哪項成立？','小禾符合例外，可以領取器材',['小禾仍一定不得領取器材','所有訪客都可以領取器材','規則無法判斷'],'一般限制後明列例外，而小禾符合該例外。'],
      ['展間規則：「一般飲料不得帶入；密封飲用水除外。但玻璃容器即使密封也不得帶入。」小禾帶的是非玻璃材質的密封飲用水。依規則，哪項成立？','可以依例外帶入',['任何飲料都不得帶入','只有玻璃容器可以帶入','規則無法判斷'],'物品符合允許的例外，而且沒有落入再次排除的玻璃容器條件。']
    ],
    'pronoun-reference':[
      ['小晴對小宇說：「你明天記得把地圖帶來。」句中的「你」指誰？','小宇',['小晴','地圖','無法由句子判斷'],'直接引語中的「你」指說話者正在對話的對象。'],
      ['阿澤把手冊交給小林，並說：「請把它放回抽屜。」句中的「它」指什麼？','手冊',['阿澤','小林','抽屜'],'「它」承接前面剛提到且可以被放回抽屜的物件：手冊。']
    ],
    'evidence-strength':[
      ['一份調查只訪問某圖書館的 40 位讀者，40 人都表示喜歡安靜座位。哪個結論得到資料直接支持？','這 40 位受訪讀者都表示喜歡安靜座位',['所有讀者都喜歡安靜座位','安靜座位一定使每個人更專心','沒有受訪的人大多不喜歡安靜座位'],'資料直接支持的是這批受訪者的回答，不能自動外推到所有人。'],
      ['觀察資料顯示：在這批學員中，複習次數較多的人，回憶分數平均也較高。只看這份資料，哪個說法最合理？','這批資料中複習次數與回憶分數呈現關聯',['增加複習次數一定造成分數提高','分數提高一定是複習造成','資料已排除所有其他因素'],'觀察資料能支持關聯，但不能單獨證明因果方向或排除所有其他因素。']
    ]
  };
  const added=[];
  for(const family of families){
    for(let v=0;v<2;v++){
      const key=`${family}:v${v+1}`;
      const base=bank.find(q=>q.taskFamily===family&&q.semanticKey===key);
      if(!base)throw new Error(`verbal seventh surface base missing: ${key}`);
      const [question,correct,wrong,explanation]=specs[family][v];
      const q={...base,o:[String(correct),...wrong.map(String)],a:0,correctContent:String(correct),q:question,e:explanation,id:`qb5x-${family}-v${v+1}-s7`,source:'verbal-surface-expansion-v2',surfaceVariant:7,constructVariant:v+1,semanticKey:key,model:`v5-${family}-v${v+1}`,visual:null,diagramType:null,diagramData:null,optionCueFlags:[]};
      if(window.QB5_FORM_EQUIVALENCE?.itemLoad)q.formLoad=window.QB5_FORM_EQUIVALENCE.itemLoad(q);
      bank.push(q);added.push(q);
    }
  }
  if(added.length!==14||bank.length!==2058)throw new Error(`verbal seventh surface expected 14/2058, got ${added.length}/${bank.length}`);
  const semanticCounts=new Map();
  for(const q of bank)semanticCounts.set(q.semanticKey,(semanticCounts.get(q.semanticKey)||0)+1);
  if(semanticCounts.size!==294||[...semanticCounts.values()].some(n=>n!==7))throw new Error('final production bank must keep exactly 7 surfaces for all 294 constructs');
  const sig=q=>JSON.stringify([q.q,q.stim||'',q.cells||[],q.visual||'',[...(q.o||[])].map(String).sort()]);
  const unique=new Set(bank.map(sig)).size;
  if(unique!==2058)throw new Error(`verbal seventh surface concrete uniqueness expected 2058, got ${unique}`);
  const spatial=bank.filter(q=>q.d==='視覺空間').length;
  const memory=bank.filter(q=>q.d==='工作記憶').length;
  const speed=bank.filter(q=>q.d==='處理速度').length;
  window.IQ_BANK_META={...(window.IQ_BANK_META||{}),totalItems:2058,verbalItems:98,spatialSvgItems:spatial,memoryItems:memory,processingSpeedItems:speed,surfaceVariantsPerConstruct:7,bankTopology:'294x7=2058',generation:'294-semantic-constructs-times-7-controlled-surfaces'};
  window.IQ_BANK_VALIDATION={...(window.IQ_BANK_VALIDATION||{}),total:2058,uniqueTaskSignatures:2058,semanticTemplates:294};
  window.IQ_QB5={...(window.IQ_QB5||{}),uniqueTaskSignatures:2058,bankTopology:'294x7=2058'};
  window.IQ_COMPACT_BANK={...(window.IQ_COMPACT_BANK||{}),version:'CBT-2026.09.3',total:2058,semanticConstructs:294,surfacesPerConstruct:7,spatialItems:spatial,memoryItems:memory,processingSpeedItems:speed};
  window.IQ_VERBAL_SURFACE_EXPANSION={version:'VSE-2026.09.2',added:14,verbalItems:98,totalItems:2058,semanticConstructs:294,surfacesPerConstruct:7};
})();
