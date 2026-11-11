// ==========================================
// 🛠️ 後台診斷監視器 (Debug Logger)
// ==========================================
const DEBUG_MODE = true; 

function debugLog(category, message) {
  if (!DEBUG_MODE) return;
  const time = new Date().toLocaleTimeString('zh-TW', { hour12: false });
  const styles = {
    'AI': 'color: #38bdf8; font-weight: bold; background: #0c4a6e; padding: 2px 4px; border-radius: 4px;',      
    'SKILL': 'color: #c084fc; font-weight: bold; background: #3b0764; padding: 2px 4px; border-radius: 4px;',   
    'BATTLE': 'color: #f87171; font-weight: bold; background: #450a0a; padding: 2px 4px; border-radius: 4px;',  
    'SYSTEM': 'color: #4ade80; font-weight: bold; background: #052e16; padding: 2px 4px; border-radius: 4px;'   
  };
  console.log(`%c[${category}] ${time}%c ${message}`, styles[category] || 'color: #fff;', 'color: #cbd5e1;');
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === 'start') {
    osc.type = 'square'; osc.frequency.setValueAtTime(300, now); osc.frequency.setValueAtTime(450, now + 0.1); osc.frequency.setValueAtTime(600, now + 0.2);
    gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.4); osc.start(now); osc.stop(now + 0.4);
  } else if (type === 'draw') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1);
  } else if (type === 'summon') {
    osc.type = 'square'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
    gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15); osc.start(now); osc.stop(now + 0.15);
  } else if (type === 'attack') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
    gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2); osc.start(now); osc.stop(now + 0.2);
  } else if (type === 'crit') { 
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(1200, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
    gain.gain.setValueAtTime(0.4, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3); osc.start(now); osc.stop(now + 0.3);
  } else if (type === 'skill') {
    osc.type = 'triangle'; osc.frequency.setValueAtTime(600, now); osc.frequency.setValueAtTime(900, now + 0.1); osc.frequency.setValueAtTime(1200, now + 0.2);
    gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.3); osc.start(now); osc.stop(now + 0.3);
  } else if (type === 'error') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now);
    gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.15); osc.start(now); osc.stop(now + 0.15);
  } else if (type === 'death') {
    osc.type = 'square'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
    gain.gain.setValueAtTime(0.4, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4); osc.start(now); osc.stop(now + 0.4);
  }
}

function getRarityColor(rarity) {
  switch(rarity) {
    case 'N': return '#f8fafc'; case 'R': return '#38bdf8'; case 'SR': return '#c084fc';
    case 'SSR': return '#fde047'; case 'UR': return '#f43f5e'; default: return '#f8fafc';
  }
}

function showPopup(player, slot, text, type = 'normal') {
  const el = document.getElementById(`p${player}_${slot}`);
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const popup = document.createElement('div');
  popup.className = `dmg-popup dmg-${type}`;
  popup.textContent = text;
  popup.style.left = `${rect.left + rect.width / 2}px`;
  popup.style.top = `${rect.top + rect.height / 2}px`;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 800);
}

let isAIMode = false; 
let turn = 1, kills = { 1: 0, 2: 0 };
let board = { 1: { front_l: null, front_r: null, back_l: null, back_r: null }, 2: { front_l: null, front_r: null, back_l: null, back_r: null } };
let hands = { 1: [], 2: [] }, decks = { 1: [], 2: [] }, sharedGraveyard = [];
let hasSummoned = false, hasAttacked = false, hasUsedSkill = false, hasDrawn = false;
let selectedHandIndex = null, activeSlot = null, pendingAction = null; 
let currentHoverCard = null, isGameStarted = false;

function startGame(ai = false) {
  isAIMode = ai;
  document.getElementById('start-overlay').style.display = 'none';
  if (audioCtx.state === 'suspended') audioCtx.resume(); 
  playSound('start');
  isGameStarted = true; 
  debugLog('SYSTEM', `遊戲啟動 (AI 模式: ${ai})`);
  initGame();
}

function checkGameWin(op) {
  setTimeout(() => {
    alert(`🎉 恭喜 P${op} 達成 10 擊殺，贏得勝利！\n點擊確認返回大廳。`);
    resetGameToLobby();
  }, 300);
}

function resetGameToLobby() {
  isGameStarted = false; turn = 1; kills = { 1: 0, 2: 0 };
  board = { 1: { front_l: null, front_r: null, back_l: null, back_r: null }, 2: { front_l: null, front_r: null, back_l: null, back_r: null } };
  hands = { 1: [], 2: [] }; decks = { 1: [], 2: [] }; sharedGraveyard = [];
  hasSummoned = false; hasAttacked = false; hasUsedSkill = false; hasDrawn = false;
  selectedHandIndex = null; activeSlot = null; pendingAction = null;
  document.getElementById('action-menu').style.display = 'none';
  document.getElementById('start-overlay').style.display = 'flex';
  document.getElementById("log-box").innerHTML = '';
  clearHover(); render();
  debugLog('SYSTEM', '遊戲重置，返回大廳。');
}

function logMsg(msg) {
  const box = document.getElementById("log-box");
  const div = document.createElement("div"); div.className = "log-msg"; div.innerHTML = msg;
  box.appendChild(div);
  const pureText = msg.replace(/<[^>]*>?/gm, '').trim();
  if(pureText) debugLog('BATTLE', pureText);
  while (box.children.length > 9) { box.removeChild(box.firstChild); }
  box.scrollTop = box.scrollHeight;
}

function initGame() {
  const pool = getDeckTemplates();
  for(let p=1; p<=2; p++) {
    let shuffled = [...pool].sort(() => Math.random() - 0.5);
    let deck = shuffled.slice(0, 15).map(t => createCard(t));
    decks[p] = deck; hands[p] = [];
    for(let i=0; i<3; i++) { if(decks[p].length > 0) hands[p].push(decks[p].pop()); }
  }
  let modeStr = isAIMode ? "🤖 電腦對決" : "⚔️ 雙人本機對決";
  logMsg(`🌟 【${modeStr}】 正式開始！雙方各隨機獲得 15 張不重複牌庫，手牌上限 7 張。`); render();
}

function manualDraw() {
  if(!isGameStarted || (isAIMode && turn === 2)) return; 
  if(hasDrawn) { logMsg("⚠️ 本回合已經抽過牌囉！"); playSound('error'); return; }
  if(hands[turn].length >= 7) { logMsg("⚠️ 手牌已滿 7 張上限，無法再抽！"); playSound('error'); return; }
  if(decks[turn].length === 0) { logMsg("⚠️ 牌庫已經空了！"); playSound('error'); return; }
  
  playSound('draw');
  let allowed = 7 - hands[turn].length;
  let drawCount = Math.min(2, decks[turn].length, allowed);
  for(let i=0; i<drawCount; i++) hands[turn].push(decks[turn].pop());
  hasDrawn = true; 
  logMsg(`🃏 P${turn} 抽了 ${drawCount} 張牌，進入【召喚與戰鬥階段】！`); render();
}

function isFrontlineActive(p) { 
  let fl = board[p]['front_l']; let fr = board[p]['front_r'];
  return (fl && !fl.isBurrowed) || (fr && !fr.isBurrowed); 
}

function canTarget(defPlayer, slot, attacker = null) {
  const c = board[defPlayer][slot];
  if(!c || c.isBurrowed) return false; 
  // 🌟 飛行屬性：無視前排掩護，直擊後排！
  if(attacker && attacker.isFlying && !attacker.isSealed) return true;
  if(slot.includes('front')) return true; 
  return !isFrontlineActive(defPlayer);
}

function dealDamage(target, amount, sourceCard=null, isCritical=false) {
  if(!target || target.isBurrowed) return 0;
  if(target.isSealed) { target.hp -= amount; return amount; }

  if(target.dodgeChance) {
    let roll = Math.floor(Math.random() * 6) + 1;
    let required = 6 - (target.dodgeChance * 6) + 1; 
    if(roll >= required) { logMsg(`🦋 【${target.name}】擲出 ${roll} 點，成功迴避！`); playSound('skill'); return 0; }
    else logMsg(`🦋 【${target.name}】擲出 ${roll} 點，迴避失敗！`);
  }

  if(target.armor) {
    amount = Math.max(0, amount - target.armor);
    logMsg(`🛡️ 【${target.name}】厚甲抵消 ${target.armor} 點傷害！實受 ${amount} 傷害！`);
  }

  if(target.isSteel) {
    if(isCritical) logMsg(`💥 暴擊貫穿鋼鐵！防禦失效！`);
    else amount = Math.min(1, amount);
  }

  target.hp -= amount; 
  return amount;
}

function checkDeath(player, slot, killerCard=null) {
  const c = board[player][slot];
  if(c && c.hp <= 0) {
    playSound('death'); logMsg(`💀 【${c.name}】 陣亡送入墓地！`);
    sharedGraveyard.push(c); board[player][slot] = null;
    const op = player === 1 ? 2 : 1; 

    // 小草被消滅不計擊殺分數
    if(!c.noKillScore) {
      kills[op]++;
    } else {
      logMsg(`🌱 【小草】化作春泥，不計入敵方擊殺數！`);
    }

    if(killerCard && killerCard.killGainHp && !killerCard.isSealed) {
      killerCard.hp += killerCard.killGainHp; killerCard.maxHp += killerCard.killGainHp;
      logMsg(`🧛 【${killerCard.name}】嗜血發動！最大血量增加至 ${killerCard.hp}！`); playSound('skill');
    }

    if(kills[op] >= 10) {
      checkGameWin(op);
      return true;
    }
    if(currentHoverCard === c) clearHover(); 
  }
  return false;
}

function onSlotClick(p, slot) {
  if(!isGameStarted || (isAIMode && turn === 2)) return;
  
  if(selectedHandIndex !== null && p === turn) {
    if(hasSummoned) { logMsg("⚠️ 本回合已召喚過！"); playSound('error'); return; }
    if(board[p][slot] !== null) { logMsg("⚠️ 該位置已有怪獸！"); playSound('error'); return; }
    let c = hands[turn].splice(selectedHandIndex, 1)[0];
    if(c.isQuick) c.quickBuff = true;
    c.justSummoned = true;
    board[p][slot] = c; hasSummoned = true; selectedHandIndex = null;
    playSound('summon'); logMsg(`✨ P${turn} 召喚了 【${c.name}】！`); clearHover(); render(); return;
  }
  
  if(pendingAction === 'skill') {
    const attacker = board[turn][activeSlot];
    if (attacker.skillTarget === 'ally' && p !== turn) { logMsg("⚠️ 該技能只能指定己方怪獸！"); playSound('error'); return; }
    if (attacker.skillTarget === 'enemy' && p === turn) { cancelAction(); return; }
    executeActionTarget(p, slot);
    return;
  } else if (pendingAction === 'attack') {
    if (p === turn) { cancelAction(); return; }
    executeActionTarget(p, slot);
    return;
  }
  
  if(p === turn && board[p][slot] !== null && pendingAction === null) {
    activeSlot = slot; const c = board[p][slot];
    if(c.isBurrowed) { logMsg("⚠️ 該怪獸處於遁地狀態，暫時無法行動！"); playSound('error'); return; }
    document.getElementById('action-target-tip').textContent = `正在操作：【${c.name}】`;
    document.getElementById('action-target-tip').style.color = getRarityColor(c.rarity);
    document.getElementById('action-menu').style.display = 'flex';
    
    document.getElementById('btn-atk').disabled = hasAttacked;
    if(!c.hasActiveSkill || c.isSealed || (c.skillUsedLimit && c.id !== 'salmon' && c.id !== 'fanny')) {
      document.getElementById('btn-skill').disabled = true;
    } else {
      document.getElementById('btn-skill').disabled = (c.justSummoned && !c.isQuick) || hasUsedSkill;
    }
    render(); return;
  }
}

function prepareAction(type) {
  const c = board[turn][activeSlot];
  pendingAction = type;
  if(type === 'skill' && c.skillTarget === 'none') { executeAutoSkill(c); return; }
  logMsg(`🎯 請點擊目標...`); render();
}

function cancelAction() { activeSlot = null; pendingAction = null; document.getElementById('action-menu').style.display = 'none'; render(); }

// 🌟 引擎化：通用 Context 封裝 (包含戰鬥與跳字等功能)
function getGameContext() {
  return { 
    dealDamage, checkDeath, logMsg, playSound, showPopup, checkGameWin,
    board, turn, sharedGraveyard, activeSlot, decks, hands, kills 
  };
}

function executeActionTarget(defP, defSlot) {
  const attacker = board[turn][activeSlot]; const defender = board[defP][defSlot];
  
  if(pendingAction === 'attack') {
    if(!defender) return;
    if(!canTarget(defP, defSlot, attacker)) { logMsg("🛡️ 目標受到掩護或處於遁地，無法攻擊！"); playSound('error'); return; }
    hasAttacked = true;
    
    let strikes = 1; 
    if(attacker.isDoubleStrike) strikes = 2; 
    if(attacker.isTripleStrike) strikes = 3;
    if(attacker.isDiamond) {
      let roll = Math.floor(Math.random() * 6) + 1;
      logMsg(`💎 【${attacker.name}】擲出了 ${roll} 點！`);
      if(roll >= 4 && roll <= 5) attacker.tempCrit = true;
      if(roll === 6) { attacker.tempCrit = true; strikes = 2; logMsg(`✨✨ 雙重暴擊觸發！！`); }
    }

    for(let i=0; i<strikes; i++) {
      if(!board[defP][defSlot]) break; 
      let isCrit = false; let finalAtk = attacker.atk;
      
      // 屠龍者加成
      if(attacker.vsDragonDouble && defender.isDragon && !attacker.isSealed) {
        finalAtk *= 2; logMsg(`🗡️ 屠龍寶刀發動！對龍族造成 2 倍傷害 (${finalAtk})！`);
      }

      let willCrit = attacker.isCrit || attacker.tempCrit || (attacker.critChance && Math.random() < attacker.critChance);
      if(willCrit) { 
        isCrit = true; finalAtk = Math.floor(finalAtk * 1.5); 
        playSound('crit'); logMsg(`⚡⚡⚡ 【${attacker.name}】 觸發暴擊！攻擊力為 ${finalAtk}！`); 
      } else { 
        playSound('attack'); 
      }
      
      let dmg = dealDamage(board[defP][defSlot], finalAtk, attacker, isCrit);
      let comboText = strikes > 1 ? ` (第 ${i+1} 擊)` : '';
      logMsg(`⚔️ 【${attacker.name}】 攻擊 【${board[defP][defSlot].name}】 造成 ${dmg} 傷害！${comboText}`);
      showPopup(defP, defSlot, `-${dmg}`, isCrit ? 'crit' : 'normal');
      
      // 仙人掌反擊
      if(defender.thorns && !defender.isSealed && dmg > 0 && board[turn][activeSlot]) {
        let retDmg = dealDamage(attacker, defender.thorns, defender);
        logMsg(`🌵 【${defender.name}】反彈刺傷！【${attacker.name}】 受到 ${retDmg} 傷害！`);
        showPopup(turn, activeSlot, `-${retDmg}`, 'normal');
        checkDeath(turn, activeSlot, defender);
      }

      // 鍬形蟲長老貫穿
      if(attacker.pierce && !attacker.isSealed) {
        const col = defSlot.split('_')[1]; const backSlot = `back_${col}`;
        if(defSlot.includes('front') && board[defP][backSlot] && !board[defP][backSlot].isBurrowed) {
          let pDmg = dealDamage(board[defP][backSlot], attacker.atk, attacker);
          logMsg(`🌪️ 【${attacker.name}】貫穿！後排 【${board[defP][backSlot].name}】 受到 ${pDmg} 傷害！`);
          showPopup(defP, backSlot, `-${pDmg}`, 'normal');
          checkDeath(defP, backSlot, attacker);
        }
      }

      // 火龍王左右排濺射
      if(attacker.splashSameRow && !attacker.isSealed) {
        const [row, col] = defSlot.split('_');
        const otherCol = (col === 'l') ? 'r' : 'l';
        const sideSlot = `${row}_${otherCol}`;
        if(board[defP][sideSlot] && !board[defP][sideSlot].isBurrowed) {
          let sDmg = dealDamage(board[defP][sideSlot], attacker.atk, attacker);
          logMsg(`🔥 【火龍王】烈焰濺射！同排【${board[defP][sideSlot].name}】受到 ${sDmg} 傷害！`);
          showPopup(defP, sideSlot, `-${sDmg}`, 'normal');
          checkDeath(defP, sideSlot, attacker);
        }
      }

      checkDeath(defP, defSlot, attacker);
    }
    delete attacker.tempCrit;

    // 陰陽轉化
    if(attacker.transformOnAttack && board[turn][activeSlot] && !attacker.isSealed) {
      playSound('skill'); logMsg(`☯️ 【${attacker.name}】形態轉化！`);
      let newCard = createCard(CARD_TEMPLATES.find(t => t.id === attacker.transformOnAttack));
      newCard.hp = attacker.hp; board[turn][activeSlot] = newCard;
      showPopup(turn, activeSlot, '轉化', 'heal');
    }

    // 鮭魚洄游
    if(attacker.returnHandChance && board[turn][activeSlot] && !attacker.isSealed && hands[turn].length < 7) {
      if(Math.random() < attacker.returnHandChance) {
        logMsg(`🐟 【${attacker.name}】洄游！彈回了手牌！`);
        let myCard = board[turn][activeSlot];
        board[turn][activeSlot] = null;
        hands[turn].push(myCard);
        showPopup(turn, activeSlot, '洄游', 'heal');
      }
    }

    // 狗勾追擊
    for(let s in board[turn]) {
      let ally = board[turn][s];
      if(ally && ally.pursuit && !ally.isSealed && s !== activeSlot && board[defP][defSlot] && !board[defP][defSlot].isBurrowed) { 
        let dDmg = dealDamage(board[defP][defSlot], ally.atk, ally);
        logMsg(`🐕 【${ally.name}】追擊！對 【${board[defP][defSlot].name}】 造成 ${dDmg} 傷害！`); playSound('attack');
        showPopup(defP, defSlot, `-${dDmg}`, 'normal');
        checkDeath(defP, defSlot, ally);
      }
    }
  } 
  else if (pendingAction === 'skill') {
    if(!defender && attacker.skillTarget !== 'none') return;
    hasUsedSkill = true;
    playSound('skill');

    // 🌟 通用主動技能掛鉤 (Universal Hook)
    if (attacker.onSkill) {
       const ctx = { ...getGameContext(), defP, defSlot };
       attacker.onSkill(attacker, defender, ctx);
    }
  }
  cancelAction(); 
}

function executeAutoSkill(attacker) {
  hasUsedSkill = true;	
  playSound('skill');
  if (attacker.onSkill) {
     const ctx = getGameContext();
     attacker.onSkill(attacker, null, ctx);
  }
  cancelAction();
}

function selectHand(idx) {
  if(!isGameStarted || (isAIMode && turn === 2)) return;
  if(hasSummoned) { logMsg("⚠️ 本回合已召喚過！"); playSound('error'); return; }
  selectedHandIndex = selectedHandIndex === idx ? null : idx; cancelAction(); 
}

function endTurn(isAuto = false) {
  if(!isGameStarted || (isAIMode && turn === 2 && !isAuto)) return; 

  for(let s in board[turn]) {
    let c = board[turn][s];
    if(!c) continue;

    // 通用回合結束群體治療 (如冰淇淋)
    if(c.endTurnHealAllies && !c.isSealed) {
      let healedAny = false;
      for(let os in board[turn]) {
        let ally = board[turn][os];
        if(os !== s && ally && !ally.isSteel) {
          ally.hp = Math.min(ally.maxHp, ally.hp + c.endTurnHealAllies); 
          showPopup(turn, os, `+${c.endTurnHealAllies}`, 'heal');
          healedAny = true;
        }
      }
      if(healedAny) logMsg(`✨ 【${c.name}】為己方肉身怪獸各恢復 ${c.endTurnHealAllies} 點生命值！`);
    }

    // 通用回合結束掛鉤 (如遁地、小草蔓延、陽轉化)
    if(c.onTurnEnd && !c.isSealed) {
       const ctx = { ...getGameContext(), slot: s };
       c.onTurnEnd(c, ctx);
    }

    // 通用進化機制 (如蝸牛進化)
    if(c.evolveTurns && !c.isSealed) {
      c.turnsAlive++;
      if(c.turnsAlive >= c.evolveTurns) {
        playSound('skill'); logMsg(`🐌✨ 【${c.name}】進化為【一種魚】！！`);
        let newCard = createCard(CARD_TEMPLATES.find(t => t.id === c.evolveTo));
        board[turn][s] = newCard;
        showPopup(turn, s, '進化', 'crit');
      }
    }
    c.quickBuff = false; 
    c.justSummoned = false;
  }
// 🤢 【食品安全】回合結束流血結算
  if (board.poisonDebuff && board.poisonDebuff[turn] > 0) {
    board.poisonDebuff[turn]--;
    logMsg(`🤢 【食品安全】毒性發作！P${turn} 全體怪獸受到 2 點傷害！(剩餘 ${board.poisonDebuff[turn]} 回合)`);
    for (let s in board[turn]) {
      let c = board[turn][s];
      if (c) {
        let d = dealDamage(c, 2, null, false);
        showPopup(turn, s, `-${d}`, 'normal');
        checkDeath(turn, s);
      }
    }
  }
  turn = turn === 1 ? 2 : 1;
  hasSummoned = false; hasAttacked = false; hasUsedSkill = false; hasDrawn = false;
  cancelAction(); selectedHandIndex = null;

  for(let s in board[turn]) {
    let c = board[turn][s];
    if(c && c.isBurrowed) { 
      c.isBurrowed = false; 
      logMsg(`🪱 【${c.name}】 從地下鑽出地面！`); 
      showPopup(turn, s, '出土', 'miss');
    }
  }

  logMsg(`🔄 輪到 P${turn} 回合！請點擊「🃏 抽 2 張」。`); render();
  if(isAIMode && turn === 2) { debugLog('AI', `========== 🤖 進入電腦 P2 回合 ==========`); setTimeout(runAITurn, 800); }
}

// ================= AI 核心大腦 (全泛用化) =================
function chooseAITarget(pref, isSkill = false, attacker = null) {
  let targets = [];
  for(let s in board[1]) {
     if(board[1][s]) {
        if(!isSkill && !canTarget(1, s, attacker)) continue;
        targets.push({slot: s, card: board[1][s]});
     }
  }
  if(targets.length === 0) return null;
  
  if (pref === 'highest_atk') targets.sort((a,b) => b.card.atk - a.card.atk);
  else if (pref === 'lowest_hp') targets.sort((a,b) => a.card.hp - b.card.hp);
  else if (pref === 'steel') { let st = targets.find(t => t.card.isSteel); if(st) return st.slot; }
  
  let nonSteel = targets.filter(t => !t.card.isSteel);
  if (pref !== 'steel' && nonSteel.length > 0) return nonSteel[0].slot; 
  return targets[0].slot;
}

async function runAITurn() {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  let isMatchPoint = (kills[1] >= 9);
  
  if(!hasDrawn && decks[2].length > 0 && hands[2].length < 7) { 
    await delay(1000); hasDrawn = true;
    let drawCount = Math.min(2, decks[2].length, 7 - hands[2].length);
    for(let i=0; i<drawCount; i++) hands[2].push(decks[2].pop());
    playSound('draw'); logMsg(`🤖 電腦抽了 ${drawCount} 張牌！`); debugLog('AI', `抽了牌，目前手牌: ${hands[2].length}`); render();
  } else { hasDrawn = true; }
  
  await delay(1000);
  
  let hand = hands[2];
  for(let slot of ['front_l', 'front_r']) {
    if(!board[2][slot] && hand.length > 0 && !hasSummoned) {
       let idx = hand.findIndex(c => c.aiRole === 'tank');
       if(idx === -1 && !isFrontlineActive(2)) { idx = hand.findIndex(c => c.aiRole !== 'assassin' && !(isMatchPoint && c.isSuicide)); if(idx === -1) idx = 0; }
       if(idx !== -1) {
         let c = hand.splice(idx, 1)[0]; if(c.isQuick) c.quickBuff = true;
         c.justSummoned = true;
         board[2][slot] = c; hasSummoned = true; playSound('summon'); logMsg(`🤖 電腦召喚 【${c.name}】 至前排！`); render(); await delay(1200);
       }
    }
  }
  for(let slot of ['back_l', 'back_r']) {
    if(!board[2][slot] && hand.length > 0 && !hasSummoned) {
       let idx = hand.findIndex(c => c.aiRole === 'dps' || c.aiRole === 'support');
       if(idx === -1) idx = hand.findIndex(c => c.aiRole !== 'assassin' && !(isMatchPoint && c.isSuicide));
       if(idx !== -1) {
         let c = hand.splice(idx, 1)[0]; if(c.isQuick) c.quickBuff = true;
         c.justSummoned = true;
         board[2][slot] = c; hasSummoned = true; playSound('summon'); logMsg(`🤖 電腦召喚 【${c.name}】 至後排！`); render(); await delay(1200);
       }
    }
  }
  let p1Threats = Object.values(board[1]).filter(c => c && (c.atk >= 15 || c.hp >= 30));
  if(p1Threats.length > 0 && hand.length > 0 && !hasSummoned && !isMatchPoint) {
     let emptySlot = Object.keys(board[2]).find(s => !board[2][s]);
     let idx = hand.findIndex(c => c.aiRole === 'assassin');
     if(idx !== -1 && emptySlot) {
        let c = hand.splice(idx, 1)[0]; if(c.isQuick) c.quickBuff = true;
        c.justSummoned = true;
        board[2][emptySlot] = c; hasSummoned = true; playSound('summon'); logMsg(`🤖 電腦派出刺客 【${c.name}】！`); render(); await delay(1200);
     }
  }
  
  let sanityCheck = 0;
  while(sanityCheck < 10) {
    sanityCheck++; let actors = [];
    for(let s in board[2]) {
       let c = board[2][s];
       if(c && !c.aiSkip && !c.isBurrowed) {
         // 🌟 修正：普攻全隊一回合就是 1 次，拔掉 quickBuff 特權
         let canAtk = !hasAttacked && c.atk > 0;
         
         // 🌟 修正：技能判斷，剛召喚且無速攻不能放招；整隊已放過技能也不能放招
         let canSkill = c.hasActiveSkill && !c.isSealed && (!c.skillUsedLimit || c.needsGraveyard || c.id === 'fanny');
         if(c.justSummoned && !c.isQuick) canSkill = false;
         if(hasUsedSkill) canSkill = false;
         
         if(canAtk || canSkill) actors.push({slot: s, card: c, canAtk, canSkill});
       }
    }
    
    if(actors.length === 0) { debugLog('AI', `無可動怪獸，準備結束回合。`); activeSlot = null; break; }
    
    actors.forEach(a => {
      let c = a.card; let wantSkill = a.canSkill;
      if(isMatchPoint && c.isSuicide) wantSkill = false;
      if(c.needsGraveyard && sharedGraveyard.length === 0) wantSkill = false;
      if(c.skillTarget === 'ally' && wantSkill) {
        let hasHurt = Object.values(board[2]).some(ally => ally && ally.hp < ally.maxHp && !ally.isSteel);
        if(!hasHurt) wantSkill = false;
      }
      a.wantsSkill = wantSkill;
    });

    actors.sort((a, b) => {
      if (a.wantsSkill && !b.wantsSkill) return -1;
      if (!a.wantsSkill && b.wantsSkill) return 1;
      return b.card.atk - a.card.atk;
    });

    let actor = actors[0]; activeSlot = actor.slot; let useSkill = actor.wantsSkill; let acted = false; 

    if(useSkill) {
      let c = actor.card;
      if(c.skillTarget === 'ally') {
        let allies = Object.keys(board[2]).map(s => ({slot: s, card: board[2][s]})).filter(o => o.card && o.card.hp < o.card.maxHp && !o.card.isSteel);
        if(allies.length > 0) {
          allies.sort((a,b) => (a.card.maxHp - a.card.hp) - (b.card.maxHp - b.card.hp));
          pendingAction = 'skill'; executeActionTarget(2, allies[0].slot); acted = true;
        }
      } 
      else if(c.skillTarget === 'none') {
        executeAutoSkill(c); acted = true;
      } 
      else {
        pendingAction = 'skill';
        let t = chooseAITarget(c.aiTarget, true, c);
        if(t) { executeActionTarget(1, t); acted = true; } 
        else { 
           cancelAction();
           if (actor.canAtk && c.atk > 0) {
              pendingAction = 'attack'; let atk_t = chooseAITarget('front_or_back', false, c);
              if (atk_t) { executeActionTarget(1, atk_t); acted = true; } else { cancelAction(); }
           }
        }
      }
    } 
    else if(actor.canAtk && actor.card.atk > 0) {
       pendingAction = 'attack'; let t = chooseAITarget('front_or_back', false, actor.card);
       if(t) { executeActionTarget(1, t); acted = true; } else { cancelAction(); } 
    }
    
    if (!acted) { actor.card.aiSkip = true; } else { await delay(1200); }
  }
  
  activeSlot = null; pendingAction = null;
  for(let s in board[2]) { if(board[2][s]) board[2][s].aiSkip = false; }
  await delay(1000); endTurn(true); 
}

function hoverBoard(p, slot) { if(board[p][slot]) showCardInfo(board[p][slot]); }
function hoverHand(idx) { if(hands[turn][idx]) showCardInfo(hands[turn][idx]); }
function clearHover() {
  currentHoverCard = null;
  document.getElementById('info-panel').innerHTML = `<div class="info-placeholder">游標移至卡牌<br>以查看詳細說明與狀態</div>`;
}

function showCardInfo(c) {
  currentHoverCard = c; let statusHtml = '';
  if(c.isSealed) statusHtml += `<div class="info-status" style="display:block;">⚠️ 此卡已被【封印】，失去所有特殊效果。</div>`;
  if(c.quickBuff) statusHtml += `<div class="info-status" style="display:block; background:rgba(56,189,248,0.1); color:#38bdf8;">⚡ 目前擁有【速攻】狀態</div>`;
  if(c.isBurrowed) statusHtml += `<div class="info-status" style="display:block; background:rgba(234,179,8,0.1); color:#eab308;">🪱 目前處於【遁地】狀態</div>`;
  let nameColor = getRarityColor(c.rarity);
  document.getElementById('info-panel').innerHTML = `
    <div class="info-name" style="color: ${nameColor}; text-shadow: 0 0 4px rgba(0,0,0,0.8);">${c.name}</div>
    <div class="info-tags">[ ${c.rarity} | ${c.tags} ]</div>
    <div class="info-stats-box">
      <div class="info-stat"><span class="info-stat-value atk">⚔️ ${c.atk}</span><span class="info-stat-label">攻擊力</span></div>
      <div class="info-stat"><span class="info-stat-value hp">❤️ ${c.hp}/${c.maxHp}</span><span class="info-stat-label">生命值</span></div>
    </div>
    <div class="info-desc-title">卡牌效果說明</div>
    <div class="info-desc">${c.skillDesc || '這是一張沒有特殊效果的卡牌。'}</div>
    ${statusHtml}
  `;
}

function render() {
  const phaseEl = document.getElementById("phase-txt");
  if(!hasDrawn) { phaseEl.textContent = "階段: 抽牌階段"; phaseEl.style.color = "#fbbf24"; } else { phaseEl.textContent = "階段: 召喚與戰鬥"; phaseEl.style.color = "#4ade80"; }
  document.getElementById("turn-txt").innerHTML = `當前輪到: <b style="color:${turn===1?'#4ade80':'#f43f5e'};">P${turn}</b>`;
  document.getElementById("kill-txt").textContent = `擊殺 - P1: ${kills[1]}/10 | P2: ${kills[2]}/10`;
  document.getElementById("grave-txt").textContent = `墓地: ${sharedGraveyard.length}張`;
  document.getElementById("deck-txt").textContent = `牌庫 - P1: ${decks[1].length} | P2: ${decks[2].length}`;
  const drawBtn = document.getElementById("btn-draw");
  if(hasDrawn || (isAIMode && turn === 2) || (hands[turn] && hands[turn].length >= 7)) { drawBtn.disabled = true; drawBtn.style.opacity = '0.5'; } else { drawBtn.disabled = false; drawBtn.style.opacity = '1'; }

  for(let p=1; p<=2; p++) {
    for(let slot of ['front_l', 'front_r', 'back_l', 'back_r']) {
      const el = document.getElementById(`p${p}_${slot}`);
      el.className = 'slot'; el.style.borderColor = ''; el.innerHTML = ''; const c = board[p][slot];
      if(c) {
        let nameColor = getRarityColor(c.rarity); let burrowText = c.isBurrowed ? '[遁地]' : '';
        el.innerHTML = `<div class="card ${c.isSealed ? 'sealed' : ''}" style="${c.isBurrowed ? 'opacity: 0.5; filter: grayscale(0.6);' : ''}"><div class="card-tags">${c.tags} ${c.quickBuff?'[速]':''} ${burrowText}</div><div class="card-title" style="color: ${nameColor}; text-shadow: 0 0 2px #000;">${c.name}</div><div class="card-stats"><span class="atk">⚔️${c.atk}</span><span class="hp">❤️${c.hp}</span></div></div>`;
      }
      if(selectedHandIndex !== null && p === turn && !c && !(isAIMode && turn===2)) el.classList.add('selectable');
      if(activeSlot === slot && p === turn) el.style.borderColor = '#38bdf8'; 
      if(pendingAction !== null) {
        const attacker = board[turn][activeSlot];
        if(pendingAction === 'skill' && attacker?.skillTarget === 'ally' && p === turn && c) el.classList.add('targetable');
        else if(pendingAction === 'attack' && p !== turn && canTarget(p, slot, attacker)) el.classList.add('targetable');
        else if(pendingAction === 'skill' && attacker?.skillTarget === 'enemy' && p !== turn && c && !c.isBurrowed) el.classList.add('targetable');
      }
    }
  }

  const handList = document.getElementById("hand-list"); handList.innerHTML = '';
  if(isAIMode && turn === 2) {
    handList.innerHTML = `<div style="color:#94a3b8; padding: 20px; font-weight: bold; font-size: 16px; width: 100%; text-align: center;">🤖 電腦思考中... (手牌: ${hands[2].length} 張)</div>`;
    document.querySelector(".btn-end").disabled = true;
  } else {
    document.querySelector(".btn-end").disabled = false;
    hands[turn].forEach((c, idx) => {
      const hCard = document.createElement("div");
      hCard.className = `hand-card ${selectedHandIndex === idx ? 'selected' : ''}`;
      hCard.onclick = () => selectHand(idx); hCard.onmouseenter = () => hoverHand(idx); hCard.onmouseleave = () => clearHover();
      let nameColor = getRarityColor(c.rarity);
      hCard.innerHTML = `<div class="card-tags">${c.tags}</div><div class="card-title" style="color: ${nameColor}; text-shadow: 0 0 2px #000;">${c.name}</div><div class="card-stats"><span class="atk">⚔️${c.atk}</span><span class="hp">❤️${c.hp}</span></div>`;
      handList.appendChild(hCard);
    });
  }
}
render();