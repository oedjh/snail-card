// cards.js - 蝸牛戰牌專屬卡牌資料庫

const CARD_TEMPLATES = [
  // --- 經典核心陣容 ---
  { id: 'snail', name: '蝸牛勇者', rarity: 'R', atk: 10, hp: 20, tags: '存活召喚', aiRole: 'dps', aiTarget: 'lowest_hp', skillDesc: '【存活召喚】在場上存活滿 2 個回合結束時，將自動進化為「一種魚」。' },
  { id: 'snake', name: '青蛇', rarity: 'N', atk: 10, hp: 15, tags: '嗜血', aiRole: 'dps', aiTarget: 'lowest_hp', skillDesc: '【嗜血】擊殺敵方怪獸時，獲得 10 點額外最大血量與當前血量。' },
  { id: 'beetle_elder', name: '鍬形蟲長老', rarity: 'SR', atk: 15, hp: 30, tags: '貫穿', aiRole: 'tank', aiTarget: 'front_first', skillDesc: '【貫穿】發動一般攻擊時，目標正後方的怪獸也會同時受到等量的貫穿傷害。' },
  { id: 'beetle_hero', name: '鍬形蟲勇者', rarity: 'R', atk: 10, hp: 20, tags: '速攻', isQuick: true, aiRole: 'dps', aiTarget: 'lowest_hp', skillDesc: '【速攻】召喚進場的當回合，可額外獲得一次攻擊機會。' },
  { id: 'muscle', name: '肌肉蝴蝶', rarity: 'R', atk: 12, hp: 40, tags: '白板', aiRole: 'tank', aiTarget: 'lowest_hp', skillDesc: '削弱後的健美蝴蝶，依然是堅實的純攻擊手。' },
  { id: 'golden_beetle', name: '金龜子', rarity: 'R', atk: 10, hp: 6, tags: '鋼鐵', aiRole: 'tank', aiTarget: 'lowest_hp', skillDesc: '【鋼鐵】防禦極高，每次受到的非暴擊傷害最多只會扣 1 點。' },
  { id: 'doggo', name: '狗勾', rarity: 'R', atk: 7, hp: 20, tags: '追擊', aiRole: 'dps', aiTarget: 'lowest_hp', skillDesc: '【追擊】當己方其他怪獸發動一般攻擊時，狗勾會自動對該目標追加一次攻擊。' },
  { id: 'furball', name: '毛球', rarity: 'UR', atk: 0, hp: 1, tags: '速攻 / 死亡', isQuick: true, hasActiveSkill: true, aiRole: 'assassin', aiTarget: 'highest_atk', skillDesc: '【速攻】【死亡】發動特殊能力：犧牲自己，強行指定並擊殺任意怪獸，無視前線掩護。' },
  { id: 'diablo', name: '迪亞布羅', rarity: 'UR', atk: 0, hp: 1, tags: '速攻 / 收買', isQuick: true, hasActiveSkill: true, aiRole: 'assassin', aiTarget: 'highest_atk', skillDesc: '【速攻】【收買】發動特殊能力：犧牲自己，強行收買對手一隻怪獸並直接取代自己位置。' },
  { id: 'salmon', name: '鮭魚神', rarity: 'SSR', atk: 10, hp: 20, tags: '詛咒 / 復活', hasActiveSkill: true, aiRole: 'support', aiTarget: 'none', skillDesc: '【復活】發動特殊能力：犧牲自己送入墓地，並復活當前墓地最底部的怪獸至自身空位。' },
  { id: 'ice_dragon', name: '冰龍王', rarity: 'SR', atk: 15, hp: 30, tags: '封印', hasActiveSkill: true, aiRole: 'dps', aiTarget: 'highest_atk', skillDesc: '【封印】發動特殊能力：使一名敵方怪獸永久失去特殊能力 (每局限發動一次)。' },
  { id: 'wind_dragon', name: '風龍王', rarity: 'SR', atk: 20, hp: 30, tags: '控場 / 位移', hasActiveSkill: true, aiRole: 'dps', aiTarget: 'highest_atk', skillDesc: '【控場】發動特殊能力：強行將一名敵方怪獸推向後排或拉往前排，破壞掩護。' },
  { id: 'bloodmoon', name: '血月', rarity: 'SSR', atk: 20, hp: 30, tags: '速攻 / 光線', isQuick: true, hasActiveSkill: true, aiRole: 'dps', aiTarget: 'none', skillDesc: '【破壞光線】發動特殊能力：釋放全域能量，對敵方場上所有怪獸各造成 10 點傷害。' },
  { id: 'butterfly', name: '蝴蝶', rarity: 'N', atk: 10, hp: 1, tags: '迴避', aiRole: 'tank', aiTarget: 'lowest_hp', skillDesc: '【迴避】受傷時擲 6 面骰，若點數大於 3，則完全免疫該次傷害。' },
  { id: 'dung_beetle', name: '糞金龜', rarity: 'R', atk: 5, hp: 30, tags: '必定暴擊', isCrit: true, aiRole: 'tank', aiTarget: 'steel', skillDesc: '【必定暴擊】每次攻擊必定觸發暴擊(1.5倍傷害)，且暴擊可無視鋼鐵減傷！' },

  // --- 重製卡牌 ---
  { id: 'sand', name: '沙子', rarity: 'N', atk: 2, hp: 10, tags: '三連擊 / 暴擊', isTripleStrike: true, critChance: 0.5, aiRole: 'dps', aiTarget: 'steel', skillDesc: '【三連擊】【迷眼】普攻連續判定 3 次傷害，且每次攻擊有 50% 機率暴擊(無視鋼鐵)！' },

  // --- 全新擴充陣容 ---
  { id: 'worm', name: '沙地蠕蟲', rarity: 'SR', atk: 15, hp: 20, tags: '游擊 / 遁地', aiRole: 'dps', aiTarget: 'lowest_hp', skillDesc: '【遁地】回合結束時擲骰 >= 4 暫時鑽入地下免疫攻擊與傷害，己方回合開始時鑽回地面。' },
  { id: 'diamond', name: '鑽石先生', rarity: 'SSR', atk: 10, hp: 20, tags: '發光 / 爆發', isDiamond: true, aiRole: 'dps', aiTarget: 'highest_atk', skillDesc: '【發光】普攻時擲骰：點數 4~5 觸發暴擊；點數 6 觸發【暴擊＋雙連擊】轟殺目標！' },
  { id: 'bird', name: '鳥', rarity: 'N', atk: 5, hp: 10, tags: '雙連擊', isDoubleStrike: true, aiRole: 'dps', aiTarget: 'steel', skillDesc: '【雙連擊】迅捷的小鳥，每次普通攻擊連續啄擊目標兩次。' },
  { id: 'yin', name: '陰', rarity: 'SR', atk: 10, hp: 20, tags: '雙生 / 轉化', isYin: true, aiRole: 'dps', aiTarget: 'lowest_hp', skillDesc: '【雙生】普通攻擊結算後，會立即轉換為輔助形態「陽」，並保留當前血量。' },
  { id: 'rock', name: '越求的俗頭', rarity: 'R', atk: 0, hp: 3, tags: '鋼鐵 / 防護', isRock: true, aiRole: 'tank', aiTarget: 'none', skillDesc: '【鋼鐵】【防護】極硬的神石。存在於場上時，己方全體完全免疫敵方範圍傷害(血月)。' },
  { id: 'earth_dragon', name: '地龍王', rarity: 'SSR', atk: 5, hp: 50, tags: '厚甲 / 護盾', isEarthDragon: true, aiRole: 'tank', aiTarget: 'lowest_hp', skillDesc: '【護盾】巍峨巨龍。每次受到的所有傷害直接減免 5 點。' },
  { id: 'icecream', name: '冰淇淋', rarity: 'R', atk: 0, hp: 10, tags: '光環 / 治癒', isIceCream: true, aiRole: 'support', aiTarget: 'none', skillDesc: '【治癒】己方回合結束時，為己方場上所有其他怪獸恢復 5 點生命值。' },
  { id: 'cactus', name: '仙人掌', rarity: 'R', atk: 0, hp: 30, tags: '荊棘 / 反擊', isCactus: true, aiRole: 'tank', aiTarget: 'none', skillDesc: '【反擊】每次受到傷害時，立即對攻擊者反彈 5 點傷害(多段攻擊會連續觸發)。' },

  // --- 衍生卡 (不可被抽入牌庫) ---
  { id: 'fish', name: '一種魚', rarity: 'UR', atk: 10, hp: 20, tags: '雙連擊', isDoubleStrike: true, isToken: true, aiRole: 'dps', aiTarget: 'highest_atk', skillDesc: '【雙連擊】不可思議的存在。每次攻擊對目標連續造成兩次傷害！' },
  { id: 'yang', name: '陽', rarity: 'SR', atk: 0, hp: 20, tags: '雙生 / 治療', isYang: true, hasActiveSkill: true, isToken: true, aiRole: 'support', aiTarget: 'none', skillDesc: '【治療】發動能力：為一名友方怪獸恢復 10 點血量。若本回合使用能力，回合結束將變回「陰」。' }
];

function createCard(template) { 
  return { 
    ...template, 
    maxHp: template.hp, 
    isSealed: false, 
    turnsAlive: 0, 
    quickBuff: false, 
    skillUsedLimit: false,
    isBurrowed: false, 
    yangHealed: false 
  }; 
}

function getDeckTemplates() {
  return CARD_TEMPLATES.filter(card => !card.isToken);
}