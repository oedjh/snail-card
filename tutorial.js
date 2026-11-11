// tutorial.js - 新手教學專屬狀態機與劇本引擎

let isTutorialMode = false;
let tutorialStep = 0;

// 備份原有的函數，教學結束或退出時可還原
const originalOnSlotClick = onSlotClick;
const originalManualDraw = manualDraw;
const originalEndTurn = endTurn;
const originalPrepareAction = prepareAction;
const originalSelectHand = selectHand;
const originalExecuteAutoSkill = executeAutoSkill;
const originalRender = render;
const originalCheckGameWin = checkGameWin;
checkGameWin = function(op) { if (!isTutorialMode) originalCheckGameWin(op); };
const originalRunAITurn = runAITurn;
runAITurn = async function() { if (!isTutorialMode) await originalRunAITurn(); };

function startTutorial() {
  document.getElementById('start-overlay').style.display = 'none';
  if (audioCtx.state === 'suspended') audioCtx.resume();
  playSound('start');

  isTutorialMode = true;
  isGameStarted = true;
  isAIMode = true; // 🌟 補上這行！告訴系統這是打電腦，就不會顯示對手手牌了！
  tutorialStep = 0;
  
  document.getElementById('tutorial-banner').style.display = 'flex';

  // --- 9-9 賽點殘局 ---
  turn = 1; kills = { 1: 9, 2: 9 }; 
  board = { 1: { front_l: null, front_r: null, back_l: null, back_r: null }, 2: { front_l: null, front_r: null, back_l: null, back_r: null } };
  hands = { 1: [], 2: [] }; decks = { 1: [], 2: [] }; sharedGraveyard = [];
  hasSummoned = false; hasAttacked = false; hasUsedSkill = false; hasDrawn = false;
  selectedHandIndex = null; activeSlot = null; pendingAction = null;
  document.getElementById("log-box").innerHTML = '';
  
  sharedGraveyard.push(createCard(CARD_TEMPLATES.find(t => t.id === 'fish')));
  hands[1] = []; // 開局 0 手牌
  // 牌庫底到牌庫頂：pop() 會先抽最右邊的兩張 (鮭魚神、地龍王)
  decks[1] = [
    createCard(CARD_TEMPLATES.find(t => t.id === 'beetle_hero')),
    createCard(CARD_TEMPLATES.find(t => t.id === 'earth_dragon')),
    createCard(CARD_TEMPLATES.find(t => t.id === 'salmon'))
  ];
  
  hands[2] = [
    createCard(CARD_TEMPLATES.find(t => t.id === 'muscle')),
    createCard(CARD_TEMPLATES.find(t => t.id === 'ice_dragon'))
  ];

  logMsg(`🎓 【新手教學模式】正式啟動！`);
  render();
  advanceTutorial(1); // 啟動第一步
}

// 💡 修正 1 & 2：退出教學時徹底切斷狀態
function exitTutorial() {
  if (!isTutorialMode) return;
  isTutorialMode = false;
  document.getElementById('tutorial-banner').style.display = 'none';
  removeHighlights();
  resetGameToLobby();
}

function updateBanner(title, desc) {
  document.getElementById('tutorial-title').textContent = title;
  document.getElementById('tutorial-desc').innerHTML = desc;
}

function removeHighlights() {
  document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
}
function addHighlight(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('tutorial-highlight');
}

// 💡 修正 5：攔截渲染，動態給手牌上光圈
render = function() {
  originalRender();
  if (!isTutorialMode) return;
  
  if (tutorialStep === 2.1 && hands[1].length > 0) {
    const handCards = document.querySelectorAll('#hand-list .hand-card');
    if(handCards[0] && selectedHandIndex !== 0) handCards[0].classList.add('tutorial-highlight');
  }
  if (tutorialStep === 4.1 && hands[1].length > 0) {
    const handCards = document.querySelectorAll('#hand-list .hand-card');
    if(handCards[0] && selectedHandIndex !== 0) handCards[0].classList.add('tutorial-highlight');
  }
  if (tutorialStep === 6.1 && hands[1].length > 0) {
    const handCards = document.querySelectorAll('#hand-list .hand-card');
    if(handCards[0] && selectedHandIndex !== 0) handCards[0].classList.add('tutorial-highlight');
  }
};

// 💡 修正 4：嚴格攔截抽牌
manualDraw = function() {
  if (!isTutorialMode) return originalManualDraw();
  if (tutorialStep === 1) {
    originalManualDraw();
    advanceTutorial(2.1);
  } else if (tutorialStep === 4.0) { // 🌟 新增：第二回合抽牌
    originalManualDraw();
    advanceTutorial(4.1);
  } else {
    playSound('error'); logMsg("⚠️ 蝸牛教官：請點擊發光的區域喔！");
  }
};

// 💡 修正 5：嚴格攔截手牌點擊，且只高亮空位
selectHand = function(idx) {
  if (!isTutorialMode) return originalSelectHand(idx);
  
  if (tutorialStep === 2.1 && idx === 0) {
    originalSelectHand(idx); removeHighlights();
    if (selectedHandIndex !== null) {
      if (!board[1]['back_l']) addHighlight('p1_back_l'); 
      if (!board[1]['back_r']) addHighlight('p1_back_r');
      updateBanner("任務 2：放置怪獸", "💡 點擊發光的後排空位，將【鮭魚神】部署上場！");
    } else { render(); }
  } else if (tutorialStep === 4.1 && hands[1][idx]?.id === 'earth_dragon') { 
    originalSelectHand(idx); removeHighlights();
    if (selectedHandIndex !== null) {
      if (!board[1]['front_l']) addHighlight('p1_front_l'); 
      if (!board[1]['front_r']) addHighlight('p1_front_r');
      updateBanner("任務 3：前排掩護", "💡 點擊發光的前排空位，部署【地龍王】！");
    } else { render(); }
  } else if (tutorialStep === 6.1 && hands[1][idx]?.id === 'beetle_hero') { 
    originalSelectHand(idx); removeHighlights();
    if (selectedHandIndex !== null) {
      if (!board[1]['back_l']) addHighlight('p1_back_l'); 
      if (!board[1]['back_r']) addHighlight('p1_back_r');
      updateBanner("任務 6：部署速攻手", "💡 將【鍬形蟲勇者】部署至發光的後排『空位』！");
    } else { render(); }
  } else {
    playSound('error'); logMsg("⚠️ 蝸牛教官：請選擇發光的卡牌！");
  }
};

// 💡 修正 4 & 5：嚴格攔截棋盤點擊
onSlotClick = function(p, slot) {
  if (!isTutorialMode) return originalOnSlotClick(p, slot);

  if (tutorialStep === 2.1 && selectedHandIndex !== null && p === 1 && (slot === 'back_l' || slot === 'back_r')) {
    if (board[1][slot] !== null) { playSound('error'); logMsg("⚠️ 蝸牛教官：該位置已有怪獸！"); return; }
    originalOnSlotClick(p, slot); advanceTutorial(2.3); return;
  }
  if (tutorialStep === 4.1 && selectedHandIndex !== null && p === 1 && (slot === 'front_l' || slot === 'front_r')) {
    if (board[1][slot] !== null) { playSound('error'); logMsg("⚠️ 蝸牛教官：該位置已有怪獸！"); return; }
    originalOnSlotClick(p, slot); advanceTutorial(4.5); return;
  }
  if (tutorialStep === 4.5 && p === 1 && board[1][slot]?.id === 'salmon') {
    originalOnSlotClick(p, slot); removeHighlights(); addHighlight('btn-skill'); return;
  }
  if (tutorialStep === 5.1 && p === 1 && board[1][slot]?.id === 'fish') {
    originalOnSlotClick(p, slot); removeHighlights(); addHighlight('btn-atk'); return;
  }
  if (tutorialStep === 5.1 && pendingAction === 'attack' && p === 2 && board[2][slot]?.id === 'muscle') {
    originalOnSlotClick(p, slot); advanceTutorial(5.2); return;
  }
  if (tutorialStep === 6.1 && selectedHandIndex !== null && p === 1 && (slot === 'back_l' || slot === 'back_r')) {
    if (board[1][slot] !== null) { playSound('error'); logMsg("⚠️ 蝸牛教官：這裡已經有怪獸了，請點擊發光的空位！"); return; }
    originalOnSlotClick(p, slot); advanceTutorial(6.5); return;
  }
  if (tutorialStep === 6.5 && p === 1 && board[1][slot]?.id === 'beetle_hero') {
    originalOnSlotClick(p, slot); removeHighlights();
    if (!hasUsedSkill) addHighlight('btn-skill'); else if (!hasAttacked) addHighlight('btn-atk');
    return;
  }
  if (tutorialStep === 6.5 && pendingAction && p === 2 && board[2][slot]?.id === 'muscle') {
    originalOnSlotClick(p, slot);
    if (kills[1] >= 10) {
      setTimeout(() => { alert("🎉 教學通關！你已經掌握了戰鬥精髓！\n點擊確認返回大廳。"); exitTutorial(); }, 500);
    } else {
      removeHighlights(); addHighlight(`p1_${activeSlot}`);
      updateBanner("任務 6：絕殺收尾！", "💡 再次點擊【鍬形蟲勇者】，選擇【⚔️ 發動攻擊】收掉殘血蝴蝶！");
    }
    return;
  }
  playSound('error'); logMsg("⚠️ 蝸牛教官：不對喔！請依照指示點擊發光的區域！");
};

prepareAction = function(type) {
  if (!isTutorialMode) return originalPrepareAction(type);
  if (tutorialStep === 4.5 && type === 'skill') { originalPrepareAction(type); } 
  else if (tutorialStep === 5.1 && type === 'attack') {
    originalPrepareAction(type); removeHighlights();
    let mSlot = board[2]['front_l']?.id === 'muscle' ? 'p2_front_l' : 'p2_front_r'; addHighlight(mSlot);
  } 
  else if (tutorialStep === 6.5) {
     originalPrepareAction(type); removeHighlights();
     let mSlot = board[2]['front_l']?.id === 'muscle' ? 'p2_front_l' : 'p2_front_r'; addHighlight(mSlot);
  } else { playSound('error'); logMsg("⚠️ 蝸牛教官：請選擇發光的正確動作！"); }
};

// 💡 修正 6：攔截自爆技能，手動推進教學
executeAutoSkill = function(attacker) {
  originalExecuteAutoSkill(attacker);
  if (isTutorialMode && tutorialStep === 4.5 && attacker.id === 'salmon') advanceTutorial(5.1);
};

// 💡 修正 5：嚴格攔截結束回合
endTurn = function(isAuto = false) {
  if (!isTutorialMode) return originalEndTurn(isAuto);
  if (tutorialStep === 2.3) { originalEndTurn(isAuto); advanceTutorial(3.1); } 
  else if (tutorialStep === 5.2) { originalEndTurn(isAuto); advanceTutorial(5.5); } 
  else { playSound('error'); logMsg("⚠️ 蝸牛教官：還有任務沒完成，現在還不能結束回合喔！"); }
};

async function advanceTutorial(specificStep = null) {
  tutorialStep = specificStep || tutorialStep + 1;
  removeHighlights(); render();
  const delay = ms => new Promise(r => setTimeout(r, ms));

  if (tutorialStep === 1) {
    updateBanner("任務 1：補充手牌", "💡 歡迎來到蝸牛戰牌！先取得 10 次擊殺者就贏了。目前為 <b style='color:#fbbf24;'>9:9 賽點</b>！我們先點擊「🃏 抽 2 張」吧。");
    addHighlight('btn-draw');
  } 
  else if (tutorialStep === 2.1) {
    updateBanner("任務 2：召喚怪獸", "💡 點選剛抽到的【鮭魚神】卡牌！");
  }
  else if (tutorialStep === 2.3) {
    updateBanner("任務 2：結束回合", "💡 怪獸剛進場無法施放技能，只能攻擊，但敵方場上並沒有怪獸。點擊「⏩ 結束回合」輪換給對手。");
    document.querySelector('.btn-end').classList.add('tutorial-highlight');
  }
  else if (tutorialStep === 3.1) {
    updateBanner("敵方回合：掩護機制展示", "💡 電腦召喚了肌肉蝴蝶！<br><span style='color:#fca5a5;'>⚠️ 當前排沒有怪獸時，後排會失去掩護就會遭受攻擊！</span>");
    
    await delay(1000); // ⏳ 放慢節奏：等 1 秒再召喚
    if(!isTutorialMode) return; 
    let muscle = hands[2].shift(); muscle.quickBuff = true; 
    board[2]['front_r'] = muscle;
    playSound('summon'); logMsg(`🤖 電腦召喚 【${muscle.name}】 至前排！`); render();
    
    await delay(1500); // ⏳ 放慢節奏：召喚完等 1.5 秒再攻擊
    if(!isTutorialMode) return;
    pendingAction = 'attack'; activeSlot = 'front_r'; turn = 2;
    let targetSlot = board[1]['back_l'] ? 'back_l' : 'back_r';
    executeActionTarget(1, targetSlot);
    
    await delay(1000); if(!isTutorialMode) return;
    originalEndTurn(true); advanceTutorial(4.0);
  }
  else if (tutorialStep === 4.0) {
    updateBanner("任務 3：回合抽牌", "💡 輪到你的回合！先按右下角的「🃏 抽 2 張」補充手牌（牌庫僅剩 1 張的話就只會抽 1 張）！");
    addHighlight('btn-draw');
  }
  else if (tutorialStep === 4.1) {
    updateBanner("任務 3：前排掩護", "💡 點擊手牌中的【地龍王】！準備將牠部署至前排提供掩護吧！");
  }
  else if (tutorialStep === 4.5) {
    updateBanner("任務 4：發動特殊能力", "💡 經過一回合，【鮭魚神】可以發動能力了！點擊場上的【鮭魚神】，按下【✨ 特殊能力】。");
    let sSlot = board[1]['back_l']?.id === 'salmon' ? 'p1_back_l' : 'p1_back_r';
    addHighlight(sSlot);
  }
  else if (tutorialStep === 5.1) {
    updateBanner("任務 5：發起反擊！", "💡 復活了【一種魚】！點擊牠發動【⚔️ 發動攻擊】，痛扁前排的肌肉蝴蝶！");
    let fSlot = board[1]['back_l']?.id === 'fish' ? 'p1_back_l' : 'p1_back_r';
    addHighlight(fSlot);
  }
  else if (tutorialStep === 5.2) {
    updateBanner("任務 5：結束回合", "💡 攻擊完畢！點擊「⏩ 結束回合」。");
    document.querySelector('.btn-end').classList.add('tutorial-highlight');
  }
  else if (tutorialStep === 5.5) {
    updateBanner("敵方回合：異常狀態反制", "💡 糟了！電腦召喚了【冰龍王】並施放了封印！<br><span style='color:#38bdf8;'>❄️ 【封印】會使怪獸永久失去所有能力。</span>");
    
    await delay(1000); // ⏳ 放慢節奏
    if(!isTutorialMode) return;
    let ice = hands[2].shift(); ice.quickBuff = true; 
    board[2]['back_l'] = ice;
    playSound('summon'); logMsg(`🤖 電腦召喚 【${ice.name}】 至後排！`); render();
    
    await delay(1500); // ⏳ 放慢節奏
    if(!isTutorialMode) return;
    pendingAction = 'skill'; activeSlot = 'back_l'; turn = 2;
    let targetSlot = board[1]['back_l']?.id === 'fish' ? 'back_l' : 'back_r';
    executeActionTarget(1, targetSlot);
    
    await delay(1000); // ⏳ 放慢節奏
    if(!isTutorialMode) return;
    originalEndTurn(true); advanceTutorial(6.1); 
  }
  else if (tutorialStep === 6.1) {
    updateBanner("任務 6：速攻收尾！", "💡 輪到你了！上回合抽到的【鍬形蟲勇者】擁有【速攻】能力。帶有【速攻】的怪獸進場當下就能使用技能。點選牠！");
  }
  else if (tutorialStep === 6.5) {
    updateBanner("任務 6：絕殺收尾！", "💡 點擊【鍬形蟲勇者】，發動【✨ 特殊能力】斬擊，然後發動【⚔️ 普通攻擊】收掉蝴蝶！");
    let hSlot = board[1]['back_l']?.id === 'beetle_hero' ? 'p1_back_l' : 'p1_back_r';
    addHighlight(hSlot);
  }
}