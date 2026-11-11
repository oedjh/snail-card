// cards.js - 蝸牛戰牌專屬卡牌資料庫 (通用掛鉤完全體)

// ==========================================
// 🛠️ 主動技能字典 (所有主動招式都在這裡集中管理)
// ==========================================
const SKILL_DICT = {
  // 鍬形蟲勇者：額外斬擊
  brave_slash: (attacker, defender, ctx) => {
    ctx.logMsg(`⚔️ 【${attacker.name}】發動額外斬擊！`);
    let dmg = ctx.dealDamage(defender, attacker.atk, attacker, false);
    ctx.logMsg(`💥 勇者對【${defender.name}】造成 ${dmg} 傷害！`);
    ctx.showPopup(ctx.defP, ctx.defSlot, `-${dmg}`, 'normal');
    ctx.checkDeath(ctx.defP, ctx.defSlot, attacker);
    attacker.skillUsedLimit = true;
  },

  // 毛球：自爆刺殺
  sacrifice_kill: (attacker, defender, ctx) => {
    ctx.logMsg(`💣 【${attacker.name}】死亡發動！【${defender.name}】暴斃！`); 
    defender.hp = 0; 
    ctx.showPopup(ctx.defP, ctx.defSlot, '暴斃', 'crit');
    ctx.checkDeath(ctx.defP, ctx.defSlot, attacker); 
    attacker.hp = 0; 
    ctx.checkDeath(ctx.turn, ctx.activeSlot); 
  },

  // 迪亞布羅：收買叛逃
  bribe: (attacker, defender, ctx) => {
    ctx.logMsg(`👿 【${attacker.name}】發動收買！【${defender.name}】直接叛逃並進駐己方位置！`);
    ctx.showPopup(ctx.defP, ctx.defSlot, '叛逃', 'heal');
    ctx.board[ctx.defP][ctx.defSlot] = null; 
    ctx.board[ctx.turn][ctx.activeSlot] = defender; 
    ctx.sharedGraveyard.push(attacker); 
  },

  // 鮭魚神：自爆復活
  revive_self_destruct: (attacker, _, ctx) => {
    if(ctx.sharedGraveyard.length > 0) {
      let revived = ctx.sharedGraveyard.shift(); 
      ctx.logMsg(`🐟 【${attacker.name}】自爆！從墓地復活了【${revived.name}】！`);
      revived.hp = revived.maxHp; revived.isSealed = false; revived.quickBuff = false;
      ctx.board[ctx.turn][ctx.activeSlot] = revived; 
      ctx.showPopup(ctx.turn, ctx.activeSlot, '復活', 'heal');
      ctx.sharedGraveyard.push(attacker); 
    } else { 
      ctx.logMsg(`🐟 墓地為空，【${attacker.name}】白白自爆了...`); 
      attacker.hp = 0; ctx.checkDeath(ctx.turn, ctx.activeSlot); 
    }
  },

  // 冰龍王：永久封印
  seal: (attacker, defender, ctx) => {
    ctx.logMsg(`❄️ 【${attacker.name}】將【${defender.name}】封印了！`); 
    defender.isSealed = true; 
    ctx.showPopup(ctx.defP, ctx.defSlot, '封印', 'miss');
    attacker.skillUsedLimit = true; 
  },

  // 風龍王：大風吹 (左右路前後互換)
  great_wind: (attacker, defender, ctx) => {
    const col = ctx.defSlot.split('_')[1]; 
    const frontSlot = `front_${col}`;
    const backSlot = `back_${col}`;
    const frontCard = ctx.board[ctx.defP][frontSlot];
    const backCard = ctx.board[ctx.defP][backSlot];

    ctx.board[ctx.defP][frontSlot] = backCard;
    ctx.board[ctx.defP][backSlot] = frontCard;
    
    let colName = (col === 'l') ? '左路' : '右路';
    ctx.logMsg(`🌪️ 【${attacker.name}】發動大風吹！敵方 ${colName} 前後排被強行互換！`);
    ctx.showPopup(ctx.defP, frontSlot, '對調', 'miss');
    ctx.showPopup(ctx.defP, backSlot, '對調', 'miss');
    attacker.skillUsedLimit = true;
  },

  // 血月：全域破壞光線
  aoe_laser: (attacker, _, ctx) => {
    const op = ctx.turn === 1 ? 2 : 1;
    let hasProtect = Object.values(ctx.board[op]).some(c => c && c.aoeProtect && !c.isSealed);
    if(hasProtect) {
      ctx.logMsg(`🪨 敵方場上存在【越求的俗頭】！血月的破壞光線被徹底吸收！`);
    } else {
      ctx.logMsg(`🩸 【${attacker.name}】發射破壞光線！敵方全體受到 10 點傷害！`);
      for(let s in ctx.board[op]) { 
        if(ctx.board[op][s]) { 
          let d = ctx.dealDamage(ctx.board[op][s], 10, attacker, false); 
          ctx.showPopup(op, s, `-${d}`, 'normal');
          ctx.checkDeath(op, s, attacker); 
        } 
      }
    }
    attacker.skillUsedLimit = true;
  },

  // 陽：治療友方
  heal_ally: (attacker, defender, ctx) => {
    if(defender.isSteel) {
      ctx.logMsg("⚠️ 鋼鐵身軀無法受到生命治療！"); ctx.playSound('error'); return;
    }
    let heal = Math.min(10, defender.maxHp - defender.hp);
    if (heal <= 0) {
      ctx.logMsg("⚠️ 目標生命值已滿！"); ctx.playSound('error'); return;
    }
    defender.hp += heal;
    ctx.logMsg(`✨ 【${attacker.name}】為【${defender.name}】恢復了 ${heal} 點生命值！`);
    ctx.showPopup(ctx.defP, ctx.defSlot, `+${heal}`, 'heal');
    attacker.yangHealed = true;
  },

  // 毒蘑菇：自損無差別毒氣
  poison_gas: (attacker, _, ctx) => {
    ctx.logMsg(`🍄 【${attacker.name}】釋放無差別毒氣！全場瀰漫毒霧！`);
    for(let s in ctx.board[ctx.turn]) {
      let c = ctx.board[ctx.turn][s];
      if(c) {
        let d = ctx.dealDamage(c, 5, attacker, false);
        ctx.showPopup(ctx.turn, s, `-${d}`, 'normal');
        ctx.checkDeath(ctx.turn, s, attacker);
      }
    }
    const op = ctx.turn === 1 ? 2 : 1;
    for(let s in ctx.board[op]) {
      let c = ctx.board[op][s];
      if(c) {
        let d = ctx.dealDamage(c, 10, attacker, false);
        ctx.showPopup(op, s, `-${d}`, 'normal');
        ctx.checkDeath(op, s, attacker);
      }
    }
    attacker.skillUsedLimit = true;
  },

  // 芬妮：混亂骰子 (全新搞事版)
  fanny_chaos: (attacker, _, ctx) => {
    let roll = Math.floor(Math.random() * 6) + 1;
    ctx.logMsg(`🎲 【${attacker.name}】擲出了 ${roll} 點命運骰！`);
    
    if (roll === 1) {
      // 1 【天崩地裂】對我方場上所有怪物造成 5 傷害
      ctx.logMsg(`🌋 【天崩地裂】天搖地動！己方全體怪獸受到 5 點傷害！`);
      for (let s in ctx.board[ctx.turn]) {
        let c = ctx.board[ctx.turn][s];
        if (c) {
          let d = ctx.dealDamage(c, 5, attacker, false);
          ctx.showPopup(ctx.turn, s, `-${d}`, 'normal');
          ctx.checkDeath(ctx.turn, s, attacker);
        }
      }
    } else if (roll === 2) {
      // 2 【食品安全】每回合對我方場上所有怪物造成 2 傷害，持續 3 回合
      ctx.logMsg(`🤢 【食品安全】吃壞肚子了！己方場地陷入劇毒，每回合結束全體受 2 傷害 (剩餘 3 回合)！`);
      if (!ctx.board.poisonDebuff) ctx.board.poisonDebuff = { 1: 0, 2: 0 };
      ctx.board.poisonDebuff[ctx.turn] = 3;
      for (let s in ctx.board[ctx.turn]) {
        if (ctx.board[ctx.turn][s]) ctx.showPopup(ctx.turn, s, '中毒', 'crit');
      }
    } else if (roll === 3) {
      // 3 【天使降臨】我方場上所有怪物恢復 5 生命
      ctx.logMsg(`👼 【天使降臨】聖光沐浴！己方全體肉身怪獸恢復 5 點生命值！`);
      for (let s in ctx.board[ctx.turn]) {
        let c = ctx.board[ctx.turn][s];
        if (c && !c.isSteel) {
          let healed = Math.min(c.maxHp - c.hp, 5);
          c.hp += healed;
          ctx.showPopup(ctx.turn, s, `+5`, 'heal');
        }
      }
    } else if (roll === 4) {
      // 4 【紅溫警告】我方場上任一一隻怪物傷害 +5
      let allies = Object.keys(ctx.board[ctx.turn]).filter(s => ctx.board[ctx.turn][s]);
      if (allies.length > 0) {
        let targetSlot = allies[Math.floor(Math.random() * allies.length)];
        let targetCard = ctx.board[ctx.turn][targetSlot];
        targetCard.atk += 5;
        ctx.logMsg(`🔥 【紅溫警告】氣急敗壞！【${targetCard.name}】攻擊力永久增加 5 點！`);
        ctx.showPopup(ctx.turn, targetSlot, `+5攻`, 'crit');
      } else {
        ctx.logMsg(`🔥 【紅溫警告】場上空無一物，無人紅溫...`);
      }
    } else if (roll === 5) {
      // 5 【天降神兵】我方擊殺進度條 +1
      ctx.logMsg(`👑 【天降神兵】命運眷顧！己方擊殺進度條直接 +1！`);
      ctx.kills[ctx.turn] = Math.min(10, ctx.kills[ctx.turn] + 1);
      if (ctx.kills[ctx.turn] >= 10) ctx.checkGameWin(ctx.turn);
    } else if (roll === 6) {
      // 6 【雷暴將至】我方擊殺進度條 -1，然後所有玩家抽一張牌
      ctx.logMsg(`⚡ 【雷暴將至】災禍臨頭！己方擊殺進度條 -1，全體玩家各抽 1 張牌！`);
      ctx.kills[ctx.turn] = Math.max(0, ctx.kills[ctx.turn] - 1);
      [1, 2].forEach(p => {
        if (ctx.decks[p].length > 0 && ctx.hands[p].length < 7) {
          ctx.hands[p].push(ctx.decks[p].pop());
          ctx.logMsg(`🃏 P${p} 抽了 1 張牌！`);
        }
      });
    }
    render();
  }
}; // 👈 補上這個收尾大括號與分號！


// ==========================================
// 🛠️ 回合結束 / 被動觸發字典
// ==========================================
const PASSIVE_DICT = {
  burrow: (card, ctx) => {
    let roll = Math.floor(Math.random() * 6) + 1;
    if(roll >= 4) {
      card.isBurrowed = true;
      ctx.logMsg(`🪱 【${card.name}】擲出 ${roll} 點，成功鑽入地下！`);
      ctx.showPopup(ctx.turn, ctx.slot, '遁地', 'miss');
    }
  },
  yang_revert: (card, ctx) => {
    if (card.yangHealed) {
      ctx.playSound('skill'); ctx.logMsg(`☯️ 【陽】回歸為【陰】形態！`);
      let newCard = createCard(CARD_TEMPLATES.find(t => t.id === 'yin'));
      newCard.hp = card.hp; ctx.board[ctx.turn][ctx.slot] = newCard;
      ctx.showPopup(ctx.turn, ctx.slot, '轉化', 'heal');
    }
  },
  grass_spread: (card, ctx) => {
    let emptySlots = ['front_l', 'front_r', 'back_l', 'back_r'].filter(s => !ctx.board[ctx.turn][s]);
    if(emptySlots.length > 0 && Math.random() < 0.5) {
      let targetSlot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
      let sprout = createCard(CARD_TEMPLATES.find(t => t.id === 'little_grass'));
      ctx.board[ctx.turn][targetSlot] = sprout;
      ctx.logMsg(`🌱 【草】蔓延了！在空位生成了一株小草！`);
      ctx.showPopup(ctx.turn, targetSlot, '蔓延', 'heal');
    }
  }
};

// ==========================================
// 🎴 卡牌資料庫 (全數值、模組標籤與主動掛鉤)
// ==========================================
const CARD_TEMPLATES = [
  // --- 經典核心陣容 ---
  { id: 'snail', name: '蝸牛勇者', rarity: 'R', atk: 10, hp: 20, tags: '存活召喚', aiRole: 'dps', aiTarget: 'lowest_hp', evolveTurns: 2, evolveTo: 'fish', skillDesc: '【存活召喚】在場上存活滿 2 個回合結束時，將自動進化為「一種魚」。' },
  { id: 'snake', name: '青蛇', rarity: 'N', atk: 10, hp: 15, tags: '嗜血', aiRole: 'dps', aiTarget: 'lowest_hp', killGainHp: 10, skillDesc: '【嗜血】擊殺敵方怪獸時，獲得 10 點額外最大血量與當前血量。' },
  { id: 'beetle_elder', name: '鍬形蟲長老', rarity: 'SR', atk: 15, hp: 30, tags: '貫穿', aiRole: 'tank', aiTarget: 'front_first', pierce: true, skillDesc: '【貫穿】發動一般攻擊時，目標正後方的怪獸也會同時受到等量的貫穿傷害。' },
  { id: 'beetle_hero', name: '鍬形蟲勇者', rarity: 'R', atk: 10, hp: 20, tags: '速攻', isQuick: true, hasActiveSkill: true, aiRole: 'dps', aiTarget: 'lowest_hp', skillTarget: 'enemy', onSkill: SKILL_DICT.brave_slash, skillDesc: '【速攻】發動能力：對一名敵方目標進行額外攻擊（造成自身攻擊力傷害）。' },
  { id: 'muscle', name: '肌肉蝴蝶', rarity: 'R', atk: 12, hp: 40, tags: '白板', aiRole: 'tank', aiTarget: 'lowest_hp', skillDesc: '肌肉蝴蝶，堅實的純坦克。' },
  { id: 'golden_beetle', name: '金龜子', rarity: 'R', atk: 10, hp: 6, tags: '鋼鐵', isSteel: true, aiRole: 'tank', aiTarget: 'lowest_hp', skillDesc: '【鋼鐵】防禦極高，每次受到的非暴擊傷害最多只會扣 1 點。' },
  { id: 'doggo', name: '狗勾', rarity: 'R', atk: 7, hp: 20, tags: '追擊', aiRole: 'dps', aiTarget: 'lowest_hp', pursuit: true, skillDesc: '【追擊】當己方其他怪獸發動一般攻擊時，狗勾會自動對該目標追加一次攻擊。' },
  { id: 'furball', name: '毛球', rarity: 'UR', atk: 0, hp: 1, tags: '速攻 / 死亡', isQuick: true, hasActiveSkill: true, aiRole: 'assassin', aiTarget: 'highest_atk', skillTarget: 'enemy', isSuicide: true, onSkill: SKILL_DICT.sacrifice_kill, skillDesc: '【速攻】【死亡】發動特殊能力：犧牲自己，強行指定並擊殺任意怪獸，無視前線掩護。' },
  { id: 'diablo', name: '迪亞布羅', rarity: 'UR', atk: 0, hp: 1, tags: '速攻 / 收買', isQuick: true, hasActiveSkill: true, aiRole: 'assassin', aiTarget: 'highest_atk', skillTarget: 'enemy', isSuicide: true, onSkill: SKILL_DICT.bribe, skillDesc: '【速攻】【收買】發動特殊能力：犧牲自己，強行收買對手一隻怪獸並直接取代自己位置。' },
  { id: 'salmon', name: '鮭魚神', rarity: 'SSR', atk: 10, hp: 20, tags: '詛咒 / 復活', hasActiveSkill: true, aiRole: 'support', aiTarget: 'none', skillTarget: 'none', isSuicide: true, needsGraveyard: true, onSkill: SKILL_DICT.revive_self_destruct, skillDesc: '【復活】發動特殊能力：犧牲自己送入墓地，並復活當前墓地最底部的怪獸至自身空位。' },
  { id: 'ice_dragon', name: '冰龍王', rarity: 'SR', atk: 15, hp: 30, tags: '封印', isDragon: true, hasActiveSkill: true, aiRole: 'dps', aiTarget: 'highest_atk', skillTarget: 'enemy', onSkill: SKILL_DICT.seal, skillDesc: '【封印】發動特殊能力：使一名敵方怪獸永久失去特殊能力 (每局限發動一次)。' },
  { id: 'wind_dragon', name: '風龍王', rarity: 'SR', atk: 15, hp: 20, tags: '控場 / 大風吹', isDragon: true, hasActiveSkill: true, aiRole: 'support', aiTarget: 'highest_atk', skillTarget: 'enemy', onSkill: SKILL_DICT.great_wind, skillDesc: '【控場】發動能力：發動大風吹！將目標所在的一路(左或右)的前後排強制互換位置 (限一次)。' },
  { id: 'bloodmoon', name: '血月', rarity: 'SSR', atk: 20, hp: 30, tags: '速攻 / 光線', isQuick: true, hasActiveSkill: true, aiRole: 'dps', aiTarget: 'none', skillTarget: 'none', onSkill: SKILL_DICT.aoe_laser, skillDesc: '【破壞光線】發動特殊能力：釋放全域能量，對敵方場上所有怪獸各造成 10 點傷害。' },
  { id: 'butterfly', name: '蝴蝶', rarity: 'N', atk: 10, hp: 1, tags: '迴避', aiRole: 'tank', aiTarget: 'lowest_hp', dodgeChance: 0.5, skillDesc: '【迴避】受傷時擲 6 面骰，若點數大於 3，則完全免疫該次傷害。' },
  { id: 'dung_beetle', name: '糞金龜', rarity: 'R', atk: 5, hp: 30, tags: '必定暴擊', isCrit: true, aiRole: 'tank', aiTarget: 'steel', skillDesc: '【必定暴擊】每次攻擊必定觸發暴擊(1.5倍傷害)，且暴擊可無視鋼鐵減傷！' },

  // --- 重製卡牌 ---
  { id: 'sand', name: '沙子', rarity: 'N', atk: 2, hp: 10, tags: '三連擊 / 暴擊', isTripleStrike: true, critChance: 0.5, aiRole: 'dps', aiTarget: 'steel', skillDesc: '【三連擊】【迷眼】普攻連續判定 3 次傷害，且每次攻擊有 50% 機率暴擊(無視鋼鐵且傷害1.5倍)！' },

  // --- 全新擴充陣容 ---
  { id: 'worm', name: '沙地蠕蟲', rarity: 'SR', atk: 15, hp: 20, tags: '游擊 / 遁地', aiRole: 'dps', aiTarget: 'lowest_hp', onTurnEnd: PASSIVE_DICT.burrow, skillDesc: '【遁地】回合結束時擲骰 >= 4 暫時鑽入地下免疫攻擊與傷害，己方回合開始時鑽回地面。' },
  { id: 'diamond', name: '鑽石先生', rarity: 'SSR', atk: 10, hp: 20, tags: '發光 / 爆發', isDiamond: true, aiRole: 'dps', aiTarget: 'highest_atk', skillDesc: '【發光】普攻時擲骰：點數 4~5 觸發暴擊；點數 6 觸發【暴擊＋雙連擊】轟殺目標！' },
  { id: 'bird', name: '鳥', rarity: 'N', atk: 5, hp: 10, tags: '雙連擊 / 飛行', isDoubleStrike: true, isFlying: true, aiRole: 'assassin', aiTarget: 'lowest_hp', skillDesc: '【雙連擊】【飛行】無視前排掩護可直擊後排。每次普攻連續攻擊兩次。' },
  { id: 'yin', name: '陰', rarity: 'SR', atk: 10, hp: 20, tags: '雙生 / 轉化', transformOnAttack: 'yang', aiRole: 'dps', aiTarget: 'lowest_hp', skillDesc: '【雙生】普通攻擊結算後，會立即轉換為輔助形態「陽」，並保留當前血量。' },
  { id: 'rock', name: '越求的俗頭', rarity: 'R', atk: 0, hp: 3, tags: '鋼鐵 / 防護', isSteel: true, aoeProtect: true, isRock: true, aiRole: 'tank', aiTarget: 'none', skillDesc: '【鋼鐵】【防護】極硬的神石，每次受傷只受到1點傷害。存在於場上時，己方全體完全免疫敵方範圍傷害。' },
  { id: 'earth_dragon', name: '地龍王', rarity: 'SSR', atk: 5, hp: 40, tags: '厚甲 / 護盾', isDragon: true, armor: 5, aiRole: 'tank', aiTarget: 'lowest_hp', skillDesc: '【護盾】巍峨巨龍。每次受到的所有傷害直接減免 5 點。' },
  { id: 'icecream', name: '冰淇淋', rarity: 'R', atk: 0, hp: 10, tags: '光環 / 治癒', endTurnHealAllies: 5, aiRole: 'support', aiTarget: 'none', skillDesc: '【治癒】己方回合結束時，為己方場上所有其他怪獸恢復 5 點生命值。' },
  { id: 'cactus', name: '仙人掌', rarity: 'R', atk: 0, hp: 30, tags: '荊棘 / 反擊', thorns: 5, aiRole: 'tank', aiTarget: 'none', skillDesc: '【反擊】每次受到傷害時，對攻擊者造成 5 點傷害。' },

  // --- 擴充包陣容 ---
  { id: 'orc', name: '半獸人', rarity: 'R', atk: 20, hp: 15, tags: '白板', aiRole: 'dps', aiTarget: 'steel', skillDesc: '簡單粗暴的強大打手，沒有任何特殊能力，但一拳極痛。' },
  { id: 'grass', name: '草', rarity: 'R', atk: 5, hp: 10, tags: '蔓延', onTurnEnd: PASSIVE_DICT.grass_spread, aiRole: 'support', aiTarget: 'none', skillDesc: '【蔓延】己方回合結束時，若場上有空位，有 50% 機率生成一株「小草」。' },
  { id: 'salmon_fish', name: '鮭魚', rarity: 'R', atk: 10, hp: 10, tags: '洄游', returnHandChance: 0.5, aiRole: 'dps', aiTarget: 'lowest_hp', skillDesc: '【洄游】普通攻擊結算後，有 50% 機率直接彈回手牌中。' },
  { id: 'poison_mushroom', name: '毒蘑菇', rarity: 'N', atk: 5, hp: 10, tags: '毒氣', hasActiveSkill: true, skillTarget: 'none', onSkill: SKILL_DICT.poison_gas, aiRole: 'support', aiTarget: 'none', skillDesc: '【毒氣】發動能力：自損八百的無差別範圍攻擊，己方全體受 5 傷，敵方全體受 10 傷 (限一次)。' },
  { id: 'fire_dragon', name: '火龍王', rarity: 'SSR', atk: 7, hp: 20, tags: '飛行 / 濺射', isDragon: true, isFlying: true, splashSameRow: true, aiRole: 'dps', aiTarget: 'lowest_hp', skillDesc: '【飛行】【火焰】無視掩護直擊後排。攻擊命中時，對同排左右兩側造成等量濺射傷害。' },
  { id: 'dragon_slayer', name: '屠龍者', rarity: 'SR', atk: 10, hp: 15, tags: '屠龍', vsDragonDouble: true, aiRole: 'dps', aiTarget: 'highest_atk', skillDesc: '【屠龍】對付龍族時刀刃越發鋒利。攻擊帶有「龍族」標籤的目標時，傷害翻倍！' },
  { id: 'fanny', name: '芬妮', rarity: 'SR', atk: 10, hp: 10, tags: '芬妮玩家', hasActiveSkill: true, skillTarget: 'none', onSkill: SKILL_DICT.fanny_chaos, aiRole: 'support', aiTarget: 'none', skillDesc: '【芬妮玩家】每回合可發動一次：觸發隨機事件。' },

  // --- 衍生卡 (不可被抽入牌庫) ---
  { id: 'fish', name: '一種魚', rarity: 'UR', atk: 10, hp: 20, tags: '雙連擊', isDoubleStrike: true, isToken: true, aiRole: 'dps', aiTarget: 'highest_atk', skillDesc: '【雙連擊】不可思議的存在。每次攻擊對目標連續造成兩次傷害！' },
  { id: 'yang', name: '陽', rarity: 'SR', atk: 0, hp: 20, tags: '雙生 / 治療', hasActiveSkill: true, skillTarget: 'ally', onSkill: SKILL_DICT.heal_ally, onTurnEnd: PASSIVE_DICT.yang_revert, isToken: true, aiRole: 'support', aiTarget: 'none', skillDesc: '【治療】發動能力：為一名友方怪獸恢復 10 點血量。若本回合使用能力，回合結束將變回「陰」。' },
  { id: 'little_grass', name: '小草', rarity: 'N', atk: 0, hp: 10, tags: '雜魚', noKillScore: true, isToken: true, aiRole: 'tank', aiTarget: 'none', skillDesc: '【雜魚】隨風飄搖的雜草，被摧毀時「不會」使敵方的擊殺進度條增加。' }
];

function createCard(template) { 
  return { 
    ...template, 
    maxHp: template.hp, 
    isSealed: false, 
    turnsAlive: 0, 
    quickBuff: false, 
    justSummoned: false,
    skillUsedLimit: false, 
    isBurrowed: false, 
    yangHealed: false 
  }; 
}

function getDeckTemplates() {
  return CARD_TEMPLATES.filter(card => !card.isToken);
}