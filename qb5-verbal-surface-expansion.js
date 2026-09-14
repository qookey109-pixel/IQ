// Cognitive IQ Lab — verbal surface expansion
// Adds 84 genuinely new verbal surfaces: 14 verbal constructs × 6 extra surfaces.
// Production total becomes 1,848 while semantic constructs remain 294.
(() => {
  'use strict';
  const bank=Array.isArray(window.IQ_QUESTION_BANK)?window.IQ_QUESTION_BANK:[];
  if(bank.length!==1764)return;
  const families=['necessary-condition','reported-vs-fact','contrast-focus','scope-negation','instruction-exception','pronoun-reference','evidence-strength'];
  const difficulty=['easy','easy','medium','medium','hard','easy'];
  const score={easy:1,medium:2,hard:3};
  const scenes=[
    ['研究員','查閱典藏','研究證','檔案室','完成保密訓練'],['講師','使用錄音室','預約碼','錄音室','完成設備說明'],['攝影師','進入棚內','工作證','攝影棚','完成安全確認'],['志工','領取器材','領用單','活動中心','完成點交'],['學員','使用實驗台','識別證','實驗室','完成安全課程'],['編輯','進入資料庫','授權碼','資料中心','完成身分驗證']
  ];
  const reports=[
    ['志工','參加整理','社區中心'],['學員','參加複習','教室'],['技師','進行檢修','工坊'],['讀者','參加導讀','圖書館'],['隊員','加入訓練','球館'],['訪客','參加導覽','博物館']
  ];
  const priorities=[
    ['耳機','輕巧','隔音'],['水壺','外型','耐用'],['椅子','便宜','支撐'],['路線','快速','安全'],['筆電','纖薄','續航'],['背包','時髦','舒適']
  ];
  const scopePairs=[
    ['讀書會成員','參加分享場'],['志工','完成晚班'],['學員','繳交報告'],['隊員','參加加練'],['訪客','看完主展'],['工作人員','完成盤點']
  ];
  const exceptions=[
    ['資料室','一般訪客不得進入','已登記研究員','小禾是已登記研究員'],['器材室','非工作人員不得領取器材','當日值班志工','小禾是當日值班志工'],['練習場','未預約者不得入場','教練核准者','小禾已獲教練核准'],['工作坊','一般時段不得攜伴','無障礙協助者','小禾是無障礙協助者'],['會議室','外部人員不得入內','受邀講者','小禾是受邀講者'],['檔案庫','未授權者不得查閱','專案成員','小禾是該專案成員']
  ];
  const exception2=[
    ['展間','一般飲料','密封飲用水','玻璃容器','非玻璃材質的密封飲用水'],['實驗室','一般私人物品','必要醫療用品','金屬外盒','非金屬外盒的必要醫療用品'],['資料室','一般紙本資料','核准工作單','未蓋章文件','已蓋章的核准工作單'],['器材室','一般袋子','防塵收納袋','破損袋','完整的防塵收納袋'],['攝影棚','一般食物','密封能量棒','玻璃盒','非玻璃盒的密封能量棒'],['工作區','一般容器','標示清楚的樣品盒','無標籤盒','標示清楚的樣品盒']
  ];
  const refs=[
    ['小禾','小安','筆記'],['小晴','小宇','雨傘'],['阿澤','小林','地圖'],['小米','阿哲','外套'],['小安','小岑','相機'],['阿凱','小晴','手冊']
  ];
  const observations=[
    ['圖書館','受訪讀者','安靜座位'],['運動中心','受訪會員','晚間課程'],['社區中心','受訪志工','週末活動'],['展館','受訪訪客','語音導覽'],['教室','受訪學員','小組討論'],['工作坊','受訪學員','實作課程']
  ];
  const correlations=[
    ['練習時間','操作熟練度'],['閱讀時間','理解分數'],['步行量','心情評分'],['複習次數','回憶分數'],['到課次數','作業分數'],['休息時間','錯誤率']
  ];
  const install=(q,correct,wrong,e)=>{q.o=[String(correct),...wrong.map(String)];q.a=0;q.correctContent=String(correct);q.e=e;};
  function build(family,v,s,q){
    if(family==='necessary-condition'){
      const [who,act,permit,place,extra]=scenes[s];
      if(v===0){q.q=`${place}規定：要取得${act}資格，必須持有${permit}。一位${who}沒有${permit}。哪一項必然成立？`;install(q,`這位${who}不具備${act}資格`,[`這位${who}已具備${act}資格`,`這位${who}一定會取得${act}資格`,`所有${who}都不具備${act}資格`],`${permit}是必要條件；缺少它只能推出這位${who}尚未取得資格。`);}else{q.q=`${place}規定：取得${act}資格必須同時「持有${permit}」並「${extra}」。一位${who}已有${permit}，但尚未${extra}。哪一項必然成立？`;install(q,`這位${who}目前不具備${act}資格`,[`這位${who}已具備${act}資格`,`${permit}不是必要條件`,`${extra}之後一定會實際${act}`],'兩項都被規定為必要條件；少一項就尚未取得資格。');}
    } else if(family==='reported-vs-fact'){
      const [who,act,place]=reports[s];
      if(v===0){q.q=`${place}紀錄寫道：「幾位${who}表示下週打算${act}。」哪一句沒有把「打算」說成已發生？`;install(q,`幾位${who}表示打算${act}`,[`幾位${who}已完成${act}`,`下週一定有人${act}`,`所有${who}都會${act}`],'紀錄只支持有人表達打算，不能推出行動已完成或必然發生。');}else{q.q=`${place}公告寫道：「主辦方預測明天可能有${who}${act}。」哪一句最忠實保留原文的證據強度？`;install(q,`主辦方預測明天可能有${who}${act}`,[`明天確定有${who}${act}`,`今天已經有${who}${act}`,`所有${who}都被要求${act}`],'「預測」和「可能」都表示不確定，不能改寫成確定事實。');}
    } else if(family==='contrast-focus'){
      const [obj,a,b]=priorities[s];
      if(v===0){q.q=`小岑說：「${obj}的${a}固然不錯，但如果只能優先一項，我會選${b}。」她最優先考量什麼？`;install(q,`優先考量${b}`,[`只考量${a}`,`${a}與${b}完全同等`,`完全不在乎${a}`],`「只能優先一項」明確把${b}放在較高順位。`);}else{q.q=`小岑比較兩款${obj}後說：「甲款的${a}較好；乙款的${b}較好。這次我願意犧牲一點${a}。」她最後優先考量什麼？`;install(q,b,[a,'兩者完全同等','只看價格'],`願意犧牲${a}，表示她把${b}放在較高順位。`);}
    } else if(family==='scope-negation'){
      const [group,act]=scopePairs[s];
      if(v===0){q.q=`「並非每位${group}都${act}」與哪一句邏輯上等價？`;install(q,`至少有一位${group}沒有${act}`,[`所有${group}都沒有${act}`,`大多數${group}沒有${act}`,`恰好一位${group}有${act}`],'否定「每一位都」只需要至少一個反例。');}else{q.q=`「不是所有${group}都${act}」最合理的等價敘述是？`;install(q,`至少有${group}沒有${act}`,[`所有${group}都沒有${act}`,`只要${act}就一定是${group}`,`恰好一位${group}${act}`],'「不是所有 A 都是 B」等價於「至少存在一個 A 不是 B」。');}
    } else if(family==='instruction-exception'){
      if(v===0){const [place,rule,exception,fact]=exceptions[s];q.q=`${place}規則：「${rule}；${exception}例外。」${fact}。依規則，哪項成立？`;install(q,'小禾符合例外，可以依例外規定辦理',['小禾仍一定不得辦理','所有人都因此可以辦理','規則完全無法判斷'],'一般規則之後明列例外，而小禾符合該例外。');}else{const [place,general,exception,blocked,fact]=exception2[s];q.q=`${place}規則：「${general}不得帶入；${exception}除外。但${blocked}即使符合例外也不得帶入。」小禾帶的是${fact}。依規則，哪項成立？`;install(q,'可以依例外帶入',['任何物品都不得帶入','只有被再次排除的物品能帶入','規則無法判斷'],'小禾符合允許的例外，且不屬於再次排除的情況。');}
    } else if(family==='pronoun-reference'){
      const [a,b,obj]=refs[s];
      if(v===0){q.q=`${a}對${b}說：「你明天記得把${obj}帶來。」句中的「你」指誰？`;install(q,b,[a,obj,'無法由句子判斷'],'直接引語中的「你」指說話者正在對話的對象。');}else{q.q=`${a}把${obj}交給${b}，並說：「請把它放回櫃子。」句中的「它」指什麼？`;install(q,obj,[a,b,'櫃子'],`「它」承接前面剛提到、可以被放回櫃子的物件：${obj}。`);}
    } else if(family==='evidence-strength'){
      if(v===0){const [place,group,thing]=observations[s];q.q=`一份調查只訪問${place}的${group}，結果所有受訪者都表示喜歡${thing}。哪個結論得到資料直接支持？`;install(q,`${group}一致表示喜歡${thing}`,[`所有人一致表示喜歡${thing}`,`${thing}一定讓每個人更滿意`,`沒有受訪的人大多不喜歡${thing}`],'樣本資料直接支持的是受訪者本身的回答，不能自動外推到所有人。');}else{const [x,y]=correlations[s];q.q=`觀察資料顯示：在這批受測者中，${x}較高的人，${y}平均也較高。只看這份資料，哪個說法最合理？`;install(q,`這批資料中${x}與${y}呈現關聯`,[`${x}一定造成${y}改變`,`${y}一定是${x}造成`,`資料已排除其他因素同時影響兩者`],'觀察資料顯示關聯，但不能單獨證明因果方向或排除其他因素。');}
    }
  }

  const added=[];
  families.forEach((family,fi)=>{
    for(let v=0;v<2;v++)for(let s=0;s<6;s++){
      const level=difficulty[s];
      const base=bank.find(q=>q.taskFamily===family&&q.semanticKey===`${family}:v${v+1}`&&q.difficulty===level);
      if(!base)throw new Error(`verbal expansion base missing: ${family}/v${v+1}/${level}`);
      const q={...base,o:[...base.o],id:`qb5x-${family}-${String(601+fi*12+v*6+s).padStart(3,'0')}`,source:'verbal-surface-expansion-v1',surfaceVariant:7+s,difficulty:level,complexityScore:score[level],constructVariant:v+1,semanticKey:`${family}:v${v+1}`,model:`v5-${family}-v${v+1}`,visual:null,diagramType:null,diagramData:null,optionCueFlags:[]};
      build(family,v,s,q);
      if(window.QB5_FORM_EQUIVALENCE?.itemLoad)q.formLoad=window.QB5_FORM_EQUIVALENCE.itemLoad(q);
      added.push(q);bank.push(q);
    }
  });
  if(added.length!==84||bank.length!==1848)throw new Error(`verbal expansion expected 84/1848, got ${added.length}/${bank.length}`);
  const sig=q=>JSON.stringify([q.q,q.stim||'',q.cells||[],q.visual||'',[...(q.o||[])].map(String).sort()]);
  const unique=new Set(bank.map(sig)).size;
  if(unique!==1848)throw new Error(`verbal expansion concrete uniqueness expected 1848, got ${unique}`);
  window.IQ_BANK_META={...(window.IQ_BANK_META||{}),totalItems:1848,verbalItems:168,verbalSurfaceVariantsPerConstruct:12,otherSurfaceVariantsPerConstruct:6,bankTopology:'14x12+280x6=1848',generation:'14-verbal-constructs-times-12-surfaces-plus-280-other-constructs-times-6'};
  window.IQ_BANK_VALIDATION={...(window.IQ_BANK_VALIDATION||{}),total:1848,uniqueTaskSignatures:1848,semanticTemplates:294};
  window.IQ_QB5={...(window.IQ_QB5||{}),uniqueTaskSignatures:1848,bankTopology:'14x12+280x6=1848'};
  window.IQ_VERBAL_SURFACE_EXPANSION={version:'VSE-2026.09.1',added:84,verbalItems:168,totalItems:1848,semanticConstructs:294};
})();
