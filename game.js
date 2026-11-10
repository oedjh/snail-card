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
  initGame();
}

function resetGameToLobby() {
  isGameStarted = false;
  turn = 1; kills = { 1: 0, 2: 0 };
  board = { 1: { front_l: null, front_r: null, back_l: null, back_r: null }, 2: { front_l: null, front_r: null, back_l: null, back_r: null } };
  hands = { 1: [], 2: [] }; decks = { 1: [], 2: [] }; sharedGraveyard = [];
  hasSummoned = false; hasAttacked = false; hasUsedSkill = false; hasDrawn = false;
  selectedHandIndex = null; activeSlot = null; pendingAction = null;
  document.getElementById('action-menu').style.display = 'none';
  document.getElementById('start-overlay').style.display = 'flex';
  document.getElementById("log-box").innerHTML = '';
  clearHover();
  render();
}

function logMsg(msg) {
  const box = document.getElementById("log-box");
  box.innerHTML += `<div class="log-msg">${msg}</div>`;
  box.scrollTop = box.scrollHeight;
}

function initGame() {
  const pool = getDeckTemplates();
  for(let p=1; p<=2; p++) {
    let shuffled = [...pool].sort(() => Math.random() - 0.5);
    let my15 = shuffled.slice(0, 15);
    let deck = my15.map(t => createCard(t));
    decks[p] = deck;
    hands[p] = [];
    for(let i=0; i<3; i++) {
      if(decks[p].length > 0) hands[p].push(decks[p].pop());
    }
  }
  let modeStr = isAIMode ? "🤖 電腦對決" : "⚔️ 雙人本機對決";
  logMsg(`🌟 【${modeStr}】 正式開始！雙方各隨機獲得 15 張不重複牌庫，手牌上限 7 張。`);
  render();
}

function manualDraw() {
  if(!isGameStarted) return;
  if(isAIMode && turn === 2) return;
  if(hasDrawn) { logMsg("⚠️ 本回合已經抽過牌囉！"); playSound('error'); return; }
  if(hands[turn].length >= 7) { logMsg("⚠️ 手牌已滿 7 張上限，無法再抽！"); playSound('error'); return; }
  if(decks[turn].length === 0) { logMsg("⚠️ 牌庫已經空了！"); playSound('error'); return; }

  playSound('draw');
  let allowed = 7 - hands[turn].length;
  let drawCount = Math.min(2, decks[turn].length, allowed);
  for(let i=0; i<drawCount; i++) hands[turn].push(decks[turn].pop());
  hasDrawn = true;
  logMsg(`🃏 P${turn} 抽了 ${drawCount} 張牌，進入【召喚與戰鬥階段】！`);
  render();
}

function isFrontlineActive(p) {
  let fl = board[p]['front_l'];
  let fr = board[p]['front_r'];
  let leftValid = fl && !fl.isBurrowed;
  let rightValid = fr && !fr.isBurrowed;
  return leftValid || rightValid;
}

function canTarget(defPlayer, slot, attackerCard = null) {
  const c = board[defPlayer][slot];
  if(!c) return false;
  if(c.isBurrowed) return false;
  if(attackerCard && attackerCard.isFlying) return true; // 飛行特性直接無視掩護
  if(slot.includes('front')) return true;
  return !isFrontlineActive(defPlayer);
}

function dealDamage(target, amount, sourceCard=null, isCritical=false) {
  if(!target || target.isBurrowed) return 0;
  if(target.isSealed) { target.hp -= amount; return amount; }

  if(target.id === 'butterfly') {
    let roll = Math.floor(Math.random() * 6) + 1;
    if(roll > 3) { logMsg(`🦋 蝴蝶擲出 ${roll} 點，成功迴避！`); playSound('skill'); return 0; }
    else logMsg(`🦋 蝴蝶擲出 ${roll} 點，迴避失敗！`);
  }

  if(target.id === 'earth_dragon') {
    amount = Math.max(0, amount - 5);
    logMsg(`🛡️ 地龍王厚甲抵消 5 點傷害！實受 ${amount} 傷害！`);
  }

  if(target.id === 'golden_beetle' || target.id === 'rock') {
    if(isCritical) {
      logMsg(`💥 暴擊貫穿鋼鐵！防禦失效！`);
    } else {
      amount = Math.min(1, amount);
    }
  }

  target.hp -= amount;
  return amount;
}

function checkDeath(player, slot, killerCard=null) {
  const c = board[player][slot];
  if(c && c.hp <= 0) {
    playSound('death');
    logMsg(`💀 【${c.name}】 陣亡送入墓地！`);
    sharedGraveyard.push(c);
    board[player][slot] = null;
    const op = player === 1 ? 2 : 1;

    if(c.isLittleGrass) {
      logMsg(`🍃 【小草】被摧毀了，但不計入擊殺數！`);
    } else {
      kills[op]++;
    }

    if(killerCard && killerCard.id === 'snake' && !killerCard.isSealed) {
      killerCard.hp += 10; killerCard.maxHp += 10;
      logMsg(`🐍 青蛇嗜血，最大血量增加至 ${killerCard.hp}！`); playSound('skill');
    }

    if(kills[op] >= 10) {
      setTimeout(() => {
        alert(`🎉 恭喜 P${op} 達成 10 擊殺，贏得勝利！\n點擊確認返回大廳。`);
        resetGameToLobby();
      }, 300);
      return true;
    }
    if(currentHoverCard === c) clearHover();
  }
  return false;
}

function onSlotClick(p, slot) {
  if(!isGameStarted) return;
  if(isAIMode && turn === 2) return;

  if(selectedHandIndex !== null && p === turn) {
    if(hasSummoned) { logMsg("⚠️ 本回合已召喚過！"); playSound('error'); return; }
    if(board[p][slot] !== null) { logMsg("⚠️ 該位置已有怪獸！"); playSound('error'); return; }
    let c = hands[turn].splice(selectedHandIndex, 1)[0];
    if(c.isQuick) c.quickBuff = true;
    c.justSummoned = true; // 標記為剛進場
    board[p][slot] = c; hasSummoned = true; selectedHandIndex = null;
    playSound('summon');
    logMsg(`✨ P${turn} 召喚了 【${c.name}】！`); clearHover(); render(); return;
  }

  if(pendingAction === 'skill_yang') {
    if(p === turn && board[p][slot]) {
      let target = board[p][slot];
      if(target.id === 'golden_beetle' || target.id === 'rock') {
        logMsg("⚠️ 鋼鐵身軀無法受到生命治療！");
        playSound('error');
        return;
      }
      let heal = Math.min(10, target.maxHp - target.hp);
      target.hp += heal;
      playSound('skill');
      logMsg(`✨ 【陽】為【${target.name}】恢復了 ${heal} 點生命值！`);
      board[turn][activeSlot].yangHealed = true;
      if(board[turn][activeSlot].quickBuff) board[turn][activeSlot].quickBuff = false;
      else hasUsedSkill = true;
      cancelAction();
      return;
    } else {
      logMsg("⚠️ 請指定一名受傷的己方怪獸！"); playSound('error'); return;
    }
  }

  if(pendingAction !== null && p !== turn) {
    executeActionTarget(p, slot);
    return;
  }

  if(p === turn && board[p][slot] !== null && pendingAction === null) {
    activeSlot = slot;
    const c = board[p][slot];
    if(c.isBurrowed) { logMsg("⚠️ 該怪獸處於遁地狀態，暫時無法行動！"); playSound('error'); return; }
    document.getElementById('action-target-tip').textContent = `正在操作：【${c.name}】`;
    document.getElementById('action-target-tip').style.color = getRarityColor(c.rarity);
    document.getElementById('action-menu').style.display = 'flex';

    document.getElementById('btn-atk').disabled = (!c.quickBuff && hasAttacked);

    // 嚴格判定技能是否可用
    let canUseSkill = true;
    if(!c.hasActiveSkill || c.isSealed || (c.skillUsedLimit && c.id !== 'salmon')) {
      canUseSkill = false;
    } else if(c.justSummoned && !c.isQuick) {
      canUseSkill = false; // 剛進場且沒有速攻，禁止發動技能
    } else if(!c.quickBuff && hasUsedSkill) {
      canUseSkill = false;
    }
    document.getElementById('btn-skill').disabled = !canUseSkill;
    render(); return;
  }
}

function prepareAction(type) {
  const c = board[turn][activeSlot];
  if(type === 'attack') pendingAction = 'attack';
  if(type === 'skill') {
    if(c.id === 'furball') pendingAction = 'skill_furball';
    if(c.id === 'diablo') pendingAction = 'skill_diablo';
    if(c.id === 'ice_dragon') pendingAction = 'skill_ice';
    if(c.id === 'wind_dragon') pendingAction = 'skill_wind';
    if(c.id === 'yang') pendingAction = 'skill_yang';
    if(c.id === 'beetle_hero') pendingAction = 'skill_brave';
    if(c.id === 'salmon' || c.id === 'bloodmoon' || c.id === 'poison_mushroom' || c.id === 'fanny') {
      executeAutoSkill(c); return;
    }
  }
  logMsg(`🎯 請點擊目標...`); render();
}

function cancelAction() {
  activeSlot = null; pendingAction = null;
  document.getElementById('action-menu').style.display = 'none';
  render();
}

function executeActionTarget(defP, defSlot) {
  const attacker = board[turn][activeSlot];
  const defender = board[defP][defSlot];

  if(pendingAction === 'attack') {
    if(!defender) return;
    if(!canTarget(defP, defSlot, attacker)) { logMsg("🛡️ 目標受到掩護或處於遁地，無法攻擊！"); playSound('error'); return; }
    if(attacker.quickBuff) attacker.quickBuff = false; else hasAttacked = true;

    let strikes = 1;
    let isDiamondSix = false;
    if(attacker.isDoubleStrike) strikes = 2;
    if(attacker.isTripleStrike) strikes = 3;
    if(attacker.isDiamond) {
      let roll = Math.floor(Math.random() * 6) + 1;
      logMsg(`💎 鑽石先生擲出了 ${roll} 點！`);
      if(roll >= 4 && roll <= 5) attacker.tempCrit = true;
      if(roll === 6) { attacker.tempCrit = true; strikes = 2; isDiamondSix = true; logMsg(`✨✨ 雙重暴擊觸發！！`); }
    }

    for(let i=0; i<strikes; i++) {
      if(!board[defP][defSlot]) break;
      let isCrit = false;
      let finalAtk = attacker.atk;

      let willCrit = attacker.isCrit || attacker.tempCrit || (attacker.critChance && Math.random() < attacker.critChance);
      if(willCrit) {
        isCrit = true;
        finalAtk = Math.floor(attacker.atk * 1.5);
        playSound('crit');
        logMsg(`⚡⚡⚡ 【${attacker.name}】 觸發 1.5 倍暴擊！攻擊力為 ${finalAtk}！`);
      } else {
        playSound('attack');
      }

      // 屠龍者特效
      if(attacker.isDragonSlayer && defender.isDragon) {
        finalAtk *= 2;
        logMsg(`🐉 屠龍者發揮全力！對龍族造成雙倍傷害！`);
      }

      let dmg = dealDamage(board[defP][defSlot], finalAtk, attacker, isCrit);
      let comboText = strikes > 1 ? ` (第 ${i+1} 擊)` : '';
      logMsg(`⚔️ 【${attacker.name}】 攻擊 【${board[defP][defSlot].name}】 造成 ${dmg} 傷害！${comboText}`);

      // 火龍王濺射
      if(attacker.isFireSplash && !attacker.isSealed) {
        let col = defSlot.split('_')[1]; let oppCol = col === 'l' ? 'r' : 'l';
        let row = defSlot.split('_')[0]; let splashSlot = `${row}_${oppCol}`;
        if(board[defP][splashSlot] && !board[defP][splashSlot].isBurrowed) {
          let sDmg = dealDamage(board[defP][splashSlot], 7, attacker);
          logMsg(`🔥 火龍王濺射！【${board[defP][splashSlot].name}】 同時受到 ${sDmg} 傷害！`);
          checkDeath(defP, splashSlot, attacker);
        }
      }

      if(defender.id === 'cactus' && !defender.isSealed && dmg > 0 && board[turn][activeSlot]) {
        let retDmg = dealDamage(attacker, 5, defender);
        logMsg(`🌵 仙人掌反彈刺傷！【${attacker.name}】 受到 ${retDmg} 反彈傷害！`);
        checkDeath(turn, activeSlot, defender);
      }

      if(attacker.id === 'beetle_elder' && !attacker.isSealed) {
        const col = defSlot.split('_')[1]; const backSlot = `back_${col}`;
        if(defSlot.includes('front') && board[defP][backSlot] && !board[defP][backSlot].isBurrowed) {
          let pDmg = dealDamage(board[defP][backSlot], attacker.atk, attacker);
          logMsg(`🌪️ 長老貫穿！後排 【${board[defP][backSlot].name}】 受到 ${pDmg} 傷害！`);
          checkDeath(defP, backSlot, attacker);
        }
      }
      checkDeath(defP, defSlot, attacker);
    }

    // 鮭魚洄游
    if(attacker.isBoomerang && !attacker.isSealed && board[turn][activeSlot]) {
      if(Math.random() < 0.5 && hands[turn].length < 7) {
        logMsg(`🐟 【${attacker.name}】 攻擊完畢，瞬間洄游彈回了手牌！`);
        playSound('skill');
        hands[turn].push(board[turn][activeSlot]);
        board[turn][activeSlot] = null;
      }
    }

    delete attacker.tempCrit;

    if(attacker.id === 'yin' && board[turn][activeSlot] && !attacker.isSealed) {
      playSound('skill');
      logMsg(`☯️ 【陰】轉化為【陽】形態！`);
      let currentHp = attacker.hp;
      board[turn][activeSlot] = {
        id: 'yang', name: '陽', rarity: 'SR', atk: 0, hp: currentHp, maxHp: 20,
        tags: '雙生 / 治療', isYang: true, hasActiveSkill: true, isToken: true,
        aiRole: 'support', aiTarget: 'none', yangHealed: false,
        skillDesc: '【治療】發動能力：為一名友方怪獸恢復 10 點血量。若本回合使用能力，回合結束將變回「陰」。'
      };
    }

    for(let s in board[turn]) {
      let ally = board[turn][s];
      if(ally && ally.id === 'doggo' && !ally.isSealed && s !== activeSlot && board[defP][defSlot] && !board[defP][defSlot].isBurrowed) {
        let dDmg = dealDamage(board[defP][defSlot], ally.atk, ally);
        logMsg(`🐕 狗勾追擊！咬了 【${defender.name}】 造成 ${dDmg} 傷害！`); playSound('attack');
        checkDeath(defP, defSlot, ally);
      }
    }
  }
  else {
    if(!defender) return;
    if(attacker.quickBuff) attacker.quickBuff = false; else hasUsedSkill = true;

    playSound('skill');
    if(pendingAction === 'skill_furball') {
      logMsg(`💣 【毛球】死亡發動！【${defender.name}】暴斃！`); defender.hp = 0; checkDeath(defP, defSlot, attacker); attacker.hp = 0; checkDeath(turn, activeSlot);
    } else if(pendingAction === 'skill_diablo') {
      logMsg(`👿 【迪亞布羅】發動收買！【${defender.name}】直接叛逃並進駐己方位置！`);
      board[defP][defSlot] = null; board[turn][activeSlot] = defender; sharedGraveyard.push(attacker);
    } else if(pendingAction === 'skill_ice') {
      logMsg(`❄️ 【冰龍王】將【${defender.name}】封印了！`); defender.isSealed = true; attacker.skillUsedLimit = true;
    } else if(pendingAction === 'skill_wind') {
      const col = defSlot.split('_')[1]; const isFront = defSlot.includes('front'); const otherSlot = isFront ? `back_${col}` : `front_${col}`;
      let temp = board[defP][otherSlot];
      board[defP][otherSlot] = defender;
      board[defP][defSlot] = temp;
      logMsg(`🌪️ 【風龍王】強行將【${defender.name}】與前後方位置對調！`);
    } else if(pendingAction === 'skill_brave') {
      logMsg(`⚔️ 【鍬形蟲勇者】發動額外斬擊！`);
      let dmg = dealDamage(defender, attacker.atk, attacker);
      logMsg(`💥 勇者對【${defender.name}】造成 ${dmg} 傷害！`);
      checkDeath(defP, defSlot, attacker);
    }
  }
  cancelAction();
}

function executeAutoSkill(attacker) {
  if(attacker.quickBuff) attacker.quickBuff = false; else hasUsedSkill = true;
  playSound('skill');
  if(attacker.id === 'salmon') {
    if(sharedGraveyard.length > 0) {
      let revived = sharedGraveyard.shift();
      logMsg(`🐟 【鮭魚神】自爆！從墓地復活了【${revived.name}】！`);
      revived.hp = revived.maxHp; revived.isSealed = false; revived.quickBuff = false;
      board[turn][activeSlot] = revived; sharedGraveyard.push(attacker);
    } else { logMsg(`🐟 墓地為空，【鮭魚神】白白自爆了...`); attacker.hp = 0; checkDeath(turn, activeSlot); }
  }
  else if(attacker.id === 'bloodmoon') {
    const op = turn === 1 ? 2 : 1;
    let hasRock = Object.values(board[op]).some(c => c && c.id === 'rock' && !c.isSealed);
    if(hasRock) {
      logMsg(`🪨 敵方場上存在【越求的俗頭】！血月的破壞光線被徹底吸收！`);
    } else {
      logMsg(`🩸 【血月】發射破壞光線！敵方全體受到 10 點傷害！`);
      for(let s in board[op]) {
        if(board[op][s]) {
          dealDamage(board[op][s], 10, attacker);
          checkDeath(op, s, attacker);
        }
      }
    }
    attacker.skillUsedLimit = true;
  }
  else if(attacker.id === 'poison_mushroom') {
    logMsg(`🍄 【毒蘑菇】釋放毒氣！全場受到波及！`);
    for(let s in board[turn]) { if(board[turn][s]) { dealDamage(board[turn][s], 5, attacker); checkDeath(turn, s, attacker); } }
    const op = turn === 1 ? 2 : 1;
    for(let s in board[op]) { if(board[op][s]) { dealDamage(board[op][s], 10, attacker); checkDeath(op, s, attacker); } }
    attacker.skillUsedLimit = true;
  }
  else if(attacker.id === 'fanny') {
    let effect = Math.floor(Math.random() * 6) + 1;
    const op = turn === 1 ? 2 : 1;
    logMsg(`🎲 【芬妮】搖出了事件 ${effect} 號！`);
    if(effect === 1) {
      logMsg(`💥 【全場毒爆】己方全體受到 5 點傷害！`);
      for(let s in board[turn]) { if(board[turn][s]) { dealDamage(board[turn][s], 5, attacker); checkDeath(turn, s, attacker); } }
    } else if(effect === 2) {
      logMsg(`👼 【大天使恩惠】己方血肉怪獸恢復 10 點生命值！`);
      for(let s in board[turn]) { if(board[turn][s] && board[turn][s].id !== 'golden_beetle' && board[turn][s].id !== 'rock') { board[turn][s].hp = Math.min(board[turn][s].maxHp, board[turn][s].hp + 10); } }
    } else if(effect === 3) {
      let p = Math.random() < 0.5 ? turn : op; logMsg(`🎁 【補給箱】隨機 P${p} 獲得一張手牌！`);
      if(hands[p].length < 7 && decks[p].length > 0) hands[p].push(decks[p].pop());
    } else if(effect === 4) {
      let p = Math.random() < 0.5 ? turn : op; let targets = Object.keys(board[p]).filter(s => board[p][s]);
      if(targets.length > 0) { let s = targets[Math.floor(Math.random() * targets.length)]; board[p][s].atk += 5; logMsg(`💉 【亢奮注入】P${p} 的【${board[p][s].name}】攻擊力永久 +5！`); }
    } else if(effect === 5) {
      let p = Math.random() < 0.5 ? turn : op; kills[p] = Math.max(0, kills[p] - 1); logMsg(`⏳ 【時光倒流】P${p} 的擊殺數減少 1！`);
    } else if(effect === 6) {
      let p = Math.random() < 0.5 ? turn : op; kills[p]++; logMsg(`☠️ 【死神收割】P${p} 的擊殺數增加 1！`);
      if(kills[p] >= 10) { setTimeout(() => { alert(`🎉 恭喜 P${p} 達成 10 擊殺贏得勝利！`); resetGameToLobby(); }, 300); }
    }
  }
  cancelAction();
}

function selectHand(idx) {
  if(!isGameStarted) return;
  if(isAIMode && turn === 2) return;
  if(hasSummoned) { logMsg("⚠️ 本回合已召喚過！"); playSound('error'); return; }
  selectedHandIndex = selectedHandIndex === idx ? null : idx; cancelAction();
}

function endTurn(isAuto = false) {
  if(!isGameStarted) return;
  if(isAIMode && turn === 2 && !isAuto) return;

  for(let s in board[turn]) {
    let c = board[turn][s];
    if(!c) continue;

    if(c.id === 'icecream' && !c.isSealed) {
      let healedAny = false;
      for(let os in board[turn]) {
        let ally = board[turn][os];
        if(os !== s && ally && ally.id !== 'golden_beetle' && ally.id !== 'rock') {
          ally.hp = Math.min(ally.maxHp, ally.hp + 5);
          healedAny = true;
        }
      }
      if(healedAny) logMsg(`🍦 【冰淇淋】為己方肉身怪獸各恢復 5 點生命值！`);
    }

    if(c.id === 'worm' && !c.isSealed) {
      let roll = Math.floor(Math.random() * 6) + 1;
      if(roll >= 4) {
        c.isBurrowed = true;
        logMsg(`🪱 沙地蠕蟲擲出 ${roll} 點，成功鑽入地下！`);
      } else {
        logMsg(`🪱 沙地蠕蟲擲出 ${roll} 點，遁地失敗！`);
      }
    }

    if(c.id === 'yang' && c.yangHealed) {
      playSound('skill');
      logMsg(`☯️ 【陽】回歸為【陰】形態！`);
      board[turn][s] = {
        id: 'yin', name: '陰', rarity: 'SR', atk: 10, hp: c.hp, maxHp: 20,
        tags: '雙生 / 轉化', isYin: true, aiRole: 'dps', aiTarget: 'lowest_hp',
        skillDesc: '【雙生】普通攻擊結算後，會立即轉換為輔助形態「陽」，並保留當前血量。'
      };
    }

    if(c.id === 'snail' && !c.isSealed) {
      c.turnsAlive++;
      if(c.turnsAlive >= 2) {
        playSound('skill');
        logMsg(`🐌✨ 蝸牛存活兩回合，進化為【一種魚】！！`);
        board[turn][s] = { id: 'fish', name: '一種魚', rarity: 'UR', atk: 10, hp: 20, tags: '雙連擊', isDoubleStrike:true, maxHp:20, isSealed:false, skillDesc: '【雙連擊】不可思議的存在。每次攻擊對目標連續造成兩次傷害！' };
      }
    }

    // 草 蔓延
    if(c.isGrass && !c.isSealed) {
      let emptySlots = Object.keys(board[turn]).filter(es => !board[turn][es]);
      if(emptySlots.length > 0 && Math.random() < 0.5) {
        let spawnSlot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
        board[turn][spawnSlot] = createCard(CARD_TEMPLATES.find(t => t.id === 'little_grass'));
        board[turn][spawnSlot].justSummoned = false; // 長出來的小草下回合就能動
        logMsg(`🌱 【草】蔓延了！在空位生成了一株小草！`);
      }
    }

    c.quickBuff = false;
  }

  turn = turn === 1 ? 2 : 1;
  hasSummoned = false; hasAttacked = false; hasUsedSkill = false; hasDrawn = false;
  cancelAction(); selectedHandIndex = null;

  // 新回合開始：解鎖進場冷卻與恢復遁地
  for(let s in board[turn]) {
    let c = board[turn][s];
    if(c) {
      c.justSummoned = false; // 正式解鎖技能！
      if(c.isBurrowed) {
        c.isBurrowed = false;
        logMsg(`🪱 【${c.name}】 從地下鑽出地面！`);
      }
    }
  }

  logMsg(`<br>🔄 輪到 P${turn} 回合！請點擊「🃏 抽 2 張」。`);
  render();

  if(isAIMode && turn === 2) {
    setTimeout(runAITurn, 800);
  }
}

// ================= AI 核心大腦 =================
function chooseAITarget(pref) {
  let targets = [];
  for(let s in board[1]) {
    if(board[1][s] && canTarget(1, s)) targets.push({slot: s, card: board[1][s]});
  }
  if(targets.length === 0) return null;

  if (pref === 'highest_atk') targets.sort((a,b) => b.card.atk - a.card.atk);
  else if (pref === 'lowest_hp') targets.sort((a,b) => a.card.hp - b.card.hp);
  else if (pref === 'steel') {
    let st = targets.find(t => t.card.id === 'golden_beetle' || t.card.id === 'rock');
    if(st) return st.slot;
  }
  let nonSteel = targets.filter(t => t.card.id !== 'golden_beetle' && t.card.id !== 'rock');
  if (pref !== 'steel' && nonSteel.length > 0) return nonSteel[0].slot;
  return targets[0].slot;
}

async function runAITurn() {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  let isMatchPoint = (kills[1] >= 9);

  if(!hasDrawn && decks[2].length > 0 && hands[2].length < 7) {
    await delay(1000);
    hasDrawn = true;
    let allowed = 7 - hands[2].length;
    let drawCount = Math.min(2, decks[2].length, allowed);
    for(let i=0; i<drawCount; i++) hands[2].push(decks[2].pop());
    playSound('draw');
    logMsg(`🤖 電腦抽了 ${drawCount} 張牌，進入【召喚與戰鬥階段】！`);
    render();
  } else {
    hasDrawn = true;
  }

  await delay(1000);

  let hand = hands[2];
  for(let slot of ['front_l', 'front_r']) {
    if(!board[2][slot] && hand.length > 0 && !hasSummoned) {
      let idx = hand.findIndex(c => c.aiRole === 'tank');
      if(idx === -1 && !isFrontlineActive(2)) {
        idx = hand.findIndex(c => c.aiRole !== 'assassin' && !(isMatchPoint && c.id === 'salmon'));
        if(idx === -1) idx = 0;
      }
      if(idx !== -1) {
        let c = hand.splice(idx, 1)[0];
        if(c.isQuick) c.quickBuff = true;
        c.justSummoned = true;
        board[2][slot] = c; hasSummoned = true;
        playSound('summon'); logMsg(`🤖 電腦將 【${c.name}】 召喚至前排！`); render();
        await delay(1200);
      }
    }
  }
  for(let slot of ['back_l', 'back_r']) {
    if(!board[2][slot] && hand.length > 0 && !hasSummoned) {
      let idx = hand.findIndex(c => c.aiRole === 'dps' || c.aiRole === 'support');
      if(idx === -1) {
        idx = hand.findIndex(c => c.aiRole !== 'assassin' && !(isMatchPoint && c.id === 'salmon'));
      }
      if(idx !== -1) {
        let c = hand.splice(idx, 1)[0];
        if(c.isQuick) c.quickBuff = true;
        c.justSummoned = true;
        board[2][slot] = c; hasSummoned = true;
        playSound('summon'); logMsg(`🤖 電腦將 【${c.name}】 召喚至後排！`); render();
        await delay(1200);
      }
    }
  }
  let p1Threats = Object.values(board[1]).filter(c => c && (c.atk >= 15 || c.hp >= 30));
  if(p1Threats.length > 0 && hand.length > 0 && !hasSummoned && !isMatchPoint) {
    let emptySlot = Object.keys(board[2]).find(s => !board[2][s]);
    let idx = hand.findIndex(c => c.aiRole === 'assassin');
    if(idx !== -1 && emptySlot) {
      let c = hand.splice(idx, 1)[0];
      if(c.isQuick) c.quickBuff = true;
      c.justSummoned = true;
      board[2][emptySlot] = c; hasSummoned = true;
      playSound('summon'); logMsg(`🤖 電腦察覺威脅，派出了刺客 【${c.name}】！`); render();
      await delay(1200);
    }
  }

  let sanityCheck = 0;
  while(sanityCheck < 10) {
    sanityCheck++;
    let actors = [];
    for(let s in board[2]) {
      let c = board[2][s];
      if(c && !c.aiSkip && !c.isBurrowed) {
        let canAtk = (c.quickBuff || !hasAttacked);
        let canSkill = c.hasActiveSkill && !c.isSealed && (!c.skillUsedLimit || c.id === 'salmon');
        if(c.justSummoned && !c.isQuick) canSkill = false;
        else if(!c.quickBuff && hasUsedSkill) canSkill = false;

        if(canAtk || canSkill) actors.push({slot: s, card: c, canAtk, canSkill});
      }
    }
    if(actors.length === 0) break;

    actors.sort((a,b) => b.card.atk - a.card.atk);
    let actor = actors[0];
    activeSlot = actor.slot;

    let useSkill = actor.canSkill && (['assassin', 'support'].includes(actor.card.aiRole) || ['ice_dragon', 'wind_dragon', 'bloodmoon', 'yang', 'beetle_hero', 'poison_mushroom', 'fanny'].includes(actor.card.id));
    let isSuicideCard = ['furball', 'diablo', 'salmon'].includes(actor.card.id);
    if(isMatchPoint && isSuicideCard) useSkill = false;
    if(actor.card.id === 'salmon' && sharedGraveyard.length === 0) useSkill = false;

    let acted = false;

    if(actor.card.id === 'yang' && useSkill) {
      let allies = Object.keys(board[2])
      .map(s => ({slot: s, card: board[2][s]}))
      .filter(o => o.card && o.card.hp < o.card.maxHp && o.card.id !== 'golden_beetle' && o.card.id !== 'rock');

      if(allies.length > 0) {
        allies.sort((a,b) => (a.card.maxHp - a.card.hp) - (b.card.maxHp - b.card.hp));
        pendingAction = 'skill_yang';
        onSlotClick(2, allies[0].slot);
        await delay(1500); acted = true;
      } else {
        useSkill = false;
      }
    }

    if(useSkill && actor.card.id !== 'yang') {
      if(['furball', 'diablo', 'ice_dragon', 'wind_dragon', 'beetle_hero'].includes(actor.card.id)) {
        if (actor.card.id === 'beetle_hero') pendingAction = 'skill_brave';
        else pendingAction = 'skill_' + actor.card.id;
        let t = chooseAITarget(actor.card.aiTarget);
        if(t) {
          executeActionTarget(1, t); await delay(1500); acted = true;
        } else {
          cancelAction();
          if (actor.canAtk) {
            pendingAction = 'attack';
            let atk_t = chooseAITarget(actor.card.aiTarget);
            if (atk_t) { executeActionTarget(1, atk_t); await delay(1500); acted = true; }
            else { cancelAction(); }
          }
        }
      } else {
        executeAutoSkill(actor.card); await delay(1500); acted = true;
      }
    } else if(actor.canAtk) {
      pendingAction = 'attack';
      let t = chooseAITarget(actor.card.aiTarget);
      if(t) { executeActionTarget(1, t); await delay(1500); acted = true; }
      else { cancelAction(); }
    }

    if (!acted) {
      actor.card.aiSkip = true;
    }
  }

  activeSlot = null; pendingAction = null;
  for(let s in board[2]) { if(board[2][s]) board[2][s].aiSkip = false; }
  await delay(1000);
  endTurn(true);
}
// ===============================================

function hoverBoard(p, slot) { if(board[p][slot]) showCardInfo(board[p][slot]); }
function hoverHand(idx) { if(hands[turn][idx]) showCardInfo(hands[turn][idx]); }
function clearHover() {
  currentHoverCard = null;
  document.getElementById('info-panel').innerHTML = `<div class="info-placeholder">游標移至卡牌<br>以查看詳細說明與狀態</div>`;
}

function showCardInfo(c) {
  currentHoverCard = c;
  let statusHtml = '';
  if(c.isSealed) statusHtml += `<div class="info-status" style="display:block;">⚠️ 此卡已被冰龍王【封印】，失去所有特殊效果。</div>`;
  if(c.quickBuff) statusHtml += `<div class="info-status" style="display:block; background:rgba(56,189,248,0.1); color:#38bdf8;">⚡ 目前擁有【速攻】增益狀態</div>`;
  if(c.isBurrowed) statusHtml += `<div class="info-status" style="display:block; background:rgba(234,179,8,0.1); color:#eab308;">🪱 目前處於【遁地】狀態（無法被指定與攻擊）</div>`;

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
  if(!hasDrawn) { phaseEl.textContent = "階段: 抽牌階段"; phaseEl.style.color = "#fbbf24"; }
  else { phaseEl.textContent = "階段: 召喚與戰鬥"; phaseEl.style.color = "#4ade80"; }

  document.getElementById("turn-txt").innerHTML = `當前輪到: <b style="color:${turn===1?'#4ade80':'#f43f5e'};">P${turn}</b>`;
  document.getElementById("kill-txt").textContent = `擊殺 - P1: ${kills[1]}/10 | P2: ${kills[2]}/10`;
  document.getElementById("grave-txt").textContent = `墓地: ${sharedGraveyard.length}張`;
  document.getElementById("deck-txt").textContent = `牌庫 - P1: ${decks[1].length} | P2: ${decks[2].length}`;

  const drawBtn = document.getElementById("btn-draw");
  let handFull = hands[turn] && hands[turn].length >= 7;
  if(hasDrawn || (isAIMode && turn === 2) || handFull) {
    drawBtn.disabled = true; drawBtn.style.opacity = '0.5';
  } else {
    drawBtn.disabled = false; drawBtn.style.opacity = '1';
  }

  for(let p=1; p<=2; p++) {
    for(let slot of ['front_l', 'front_r', 'back_l', 'back_r']) {
      const el = document.getElementById(`p${p}_${slot}`);
      el.className = 'slot'; el.style.borderColor = ''; el.innerHTML = '';
      const c = board[p][slot];

      if(c) {
        let nameColor = getRarityColor(c.rarity);
        let burrowText = c.isBurrowed ? '[遁地]' : '';
        el.innerHTML = `
        <div class="card ${c.isSealed ? 'sealed' : ''}" style="${c.isBurrowed ? 'opacity: 0.5; filter: grayscale(0.6);' : ''}">
        <div class="card-tags">${c.tags} ${c.quickBuff?'[速]':''} ${burrowText}</div>
        <div class="card-title" style="color: ${nameColor}; text-shadow: 0 0 2px #000;">${c.name}</div>
        <div class="card-stats"><span class="atk">⚔️${c.atk}</span><span class="hp">❤️${c.hp}</span></div>
        </div>
        `;
      }
      if(selectedHandIndex !== null && p === turn && !c && !(isAIMode && turn===2)) el.classList.add('selectable');
      if(activeSlot === slot && p === turn) el.style.borderColor = '#38bdf8';
      if(pendingAction !== null) {
        if(pendingAction === 'skill_yang' && p === turn && c) el.classList.add('targetable');
        else if(pendingAction === 'attack' && p !== turn && canTarget(p, slot, board[turn][activeSlot])) el.classList.add('targetable');
        else if(pendingAction !== 'attack' && pendingAction !== 'skill_yang' && p !== turn && c && !c.isBurrowed) el.classList.add('targetable');
      }
    }
  }

  const handList = document.getElementById("hand-list");
  handList.innerHTML = '';

  if(isAIMode && turn === 2) {
    handList.innerHTML = `<div style="color:#94a3b8; padding: 20px; font-weight: bold; font-size: 16px; width: 100%; text-align: center;">🤖 電腦正在思考中... (手牌: ${hands[2].length} 張)</div>`;
    document.querySelector(".btn-end").disabled = true;
  } else {
    document.querySelector(".btn-end").disabled = false;
    hands[turn].forEach((c, idx) => {
      const hCard = document.createElement("div");
      hCard.className = `hand-card ${selectedHandIndex === idx ? 'selected' : ''}`;
      hCard.onclick = () => selectHand(idx);
      hCard.onmouseenter = () => hoverHand(idx);
      hCard.onmouseleave = () => clearHover();
      let nameColor = getRarityColor(c.rarity);
      hCard.innerHTML = `
      <div class="card-tags">${c.tags}</div>
      <div class="card-title" style="color: ${nameColor}; text-shadow: 0 0 2px #000;">${c.name}</div>
      <div class="card-stats"><span class="atk">⚔️${c.atk}</span><span class="hp">❤️${c.hp}</span></div>
      `;
      handList.appendChild(hCard);
    });
  }
}

render();
