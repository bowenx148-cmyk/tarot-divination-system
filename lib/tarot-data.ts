// 塔罗牌数据类型定义
export interface TarotCard {
  id: string;
  name: string;
  nameEn: string;
  arcana: "major" | "minor";
  suit?: "wands" | "cups" | "swords" | "pentacles";
  number?: number;
  keywordsUpright: string[];
  keywordsReversed: string[];
  meaningUpright: string;
  meaningReversed: string;
  image: string;
}

// 78张韦特塔罗牌完整数据
export const tarotCards: TarotCard[] = [
  // ==================== 大阿尔卡纳 (22张) ====================
  {
    id: "major-00",
    name: "愚者",
    nameEn: "The Fool",
    arcana: "major",
    number: 0,
    keywordsUpright: ["新开始", "冒险", "天真", "自由", "潜力"],
    keywordsReversed: ["鲁莽", "冒险主义", "愚蠢", "风险"],
    meaningUpright:
      "愚者代表新的开始和无限的可能性。它象征着勇敢踏上未知旅程的精神，保持开放和好奇的心态。这是一张充满潜力和机会的牌，鼓励你相信直觉，勇敢尝试新事物，不被过去的经验所束缚。",
    meaningReversed:
      "逆位的愚者警告不要过于鲁莽或不负责任。可能表示缺乏计划、盲目冒险或忽视重要的细节。需要在追求自由和承担责任之间找到平衡。",
    image: "/tarot-images/major/major-00-fool.jpg",
  },
  {
    id: "major-01",
    name: "魔术师",
    nameEn: "The Magician",
    arcana: "major",
    number: 1,
    keywordsUpright: ["显化", "创造力", "力量", "技能", "行动"],
    keywordsReversed: ["操纵", "欺骗", "未使用的天赋", "拖延"],
    meaningUpright:
      "魔术师象征着运用现有资源创造奇迹的能力。你拥有实现目标所需的所有工具和技能，关键在于如何运用。这张牌鼓励你采取行动，将想法转化为现实，充分发挥自己的潜力。",
    meaningReversed:
      "逆位的魔术师可能表示滥用才能、操纵他人或缺乏自信。也可能暗示你没有充分利用自己的能力，或在某些方面表现得不够真诚。",
    image: "/tarot-images/major/major-01-magician.jpg",
  },
  {
    id: "major-02",
    name: "女祭司",
    nameEn: "The High Priestess",
    arcana: "major",
    number: 2,
    keywordsUpright: ["直觉", "神秘", "潜意识", "智慧", "静默"],
    keywordsReversed: ["秘密", "隐藏的议程", "忽视直觉", "表面肤浅"],
    meaningUpright:
      "女祭司代表内在智慧和直觉的力量。她提醒你倾听内心的声音，关注梦境和潜意识的信息。这是一张鼓励内省和精神探索的牌，答案往往藏在内心深处而非外部世界。",
    meaningReversed:
      "逆位的女祭司可能表示忽视直觉、过度理性分析或被表象蒙蔽。也可能暗示秘密即将揭露，或需要更深入地探索自己的内心世界。",
    image: "/tarot-images/major/major-02-high-priestess.jpg",
  },
  {
    id: "major-03",
    name: "皇后",
    nameEn: "The Empress",
    arcana: "major",
    number: 3,
    keywordsUpright: ["丰饶", "滋养", "创造", "美丽", "自然"],
    keywordsReversed: ["依赖", "窒息", "空虚", "缺乏成长"],
    meaningUpright:
      "皇后象征丰盛、滋养和创造力。她代表生命的繁荣、感官的愉悦和与自然的连接。这张牌鼓励你享受生活的美好，关注身心健康，培育你关心的事物和关系。",
    meaningReversed:
      "逆位的皇后可能表示过度依赖他人、创造力受阻或忽视自我照顾。也可能暗示过度保护或窒息性的关系。",
    image: "/tarot-images/major/major-03-empress.jpg",
  },
  {
    id: "major-04",
    name: "皇帝",
    nameEn: "The Emperor",
    arcana: "major",
    number: 4,
    keywordsUpright: ["权威", "结构", "控制", "领导力", "稳定"],
    keywordsReversed: ["专制", "僵化", "缺乏纪律", "权力滥用"],
    meaningUpright:
      "皇帝代表权威、秩序和结构。他象征着建立规则、维持稳定和承担责任的能力。这张牌鼓励你发挥领导力，建立明确的界限，用理性和逻辑处理问题。",
    meaningReversed:
      "逆位的皇帝可能表示过度控制、僵化或滥用权力。也可能暗示缺乏纪律、逃避责任或反抗权威。",
    image: "/tarot-images/major/major-04-emperor.jpg",
  },
  {
    id: "major-05",
    name: "教皇",
    nameEn: "The Hierophant",
    arcana: "major",
    number: 5,
    keywordsUpright: ["传统", "教育", "信仰", "智慧", "引导"],
    keywordsReversed: ["叛逆", "打破常规", "质疑传统", "非正统"],
    meaningUpright:
      "教皇象征传统智慧、精神指引和集体价值观。他代表教育、仪式和寻求更深层意义的渴望。这张牌鼓励你向有经验的人学习,尊重传统,同时寻找精神上的指引。",
    meaningReversed:
      "逆位的教皇可能表示质疑传统、挑战权威或寻找自己的道路。也可能暗示过度依赖他人的建议或需要打破限制性的信念。",
    image: "/tarot-images/major/major-05-hierophant.jpg",
  },
  {
    id: "major-06",
    name: "恋人",
    nameEn: "The Lovers",
    arcana: "major",
    number: 6,
    keywordsUpright: ["爱情", "和谐", "选择", "价值观", "伙伴关系"],
    keywordsReversed: ["不和谐", "错误选择", "价值观冲突", "失衡"],
    meaningUpright:
      "恋人代表爱情、和谐以及重要的选择。这张牌不仅关乎浪漫关系,更象征着价值观的统一和做出符合内心真实自我的决定。它鼓励你听从内心,建立真诚的连接。",
    meaningReversed:
      "逆位的恋人可能表示关系中的不和谐、价值观冲突或犹豫不决。也可能暗示需要重新评估某个重要的选择或关系。",
    image: "/tarot-images/major/major-06-lovers.jpg",
  },
  {
    id: "major-07",
    name: "战车",
    nameEn: "The Chariot",
    arcana: "major",
    number: 7,
    keywordsUpright: ["胜利", "意志力", "决心", "控制", "前进"],
    keywordsReversed: ["失控", "缺乏方向", "侵略性", "失败"],
    meaningUpright:
      "战车象征胜利、决心和自我控制。它代表通过意志力和专注克服障碍,朝着目标勇往直前。这张牌鼓励你保持专注,平衡相反的力量,坚定地追求成功。",
    meaningReversed:
      "逆位的战车可能表示失去控制、缺乏方向或过度侵略性。也可能暗示内在冲突阻碍了进步,需要重新审视目标和方法。",
    image: "/tarot-images/major/major-07-chariot.jpg",
  },
  {
    id: "major-08",
    name: "力量",
    nameEn: "Strength",
    arcana: "major",
    number: 8,
    keywordsUpright: ["勇气", "耐心", "温柔的力量", "同情", "自信"],
    keywordsReversed: ["自我怀疑", "软弱", "不安全感", "缺乏信心"],
    meaningUpright:
      "力量代表内在的勇气、耐心和温柔的坚韧。这张牌展示的不是蛮力,而是通过爱、同情和自我控制来克服挑战。它鼓励你用温柔而坚定的方式面对困难。",
    meaningReversed:
      "逆位的力量可能表示自我怀疑、缺乏信心或无法控制冲动。也可能暗示需要重新找回内在的勇气和自信。",
    image: "/tarot-images/major/major-08-strength.jpg",
  },
  {
    id: "major-09",
    name: "隐士",
    nameEn: "The Hermit",
    arcana: "major",
    number: 9,
    keywordsUpright: ["内省", "独处", "寻找真理", "智慧", "指引"],
    keywordsReversed: ["孤立", "孤独", "逃避", "迷失"],
    meaningUpright:
      "隐士象征内省、独处和寻找内在真理。他代表暂时退出外部世界,专注于精神成长和自我发现。这张牌鼓励你花时间独处,倾听内心的声音,寻找生命的更深层意义。",
    meaningReversed:
      "逆位的隐士可能表示过度孤立、逃避现实或感到迷失。也可能暗示需要走出舒适区,与他人建立连接。",
    image: "/tarot-images/major/major-09-hermit.jpg",
  },
  {
    id: "major-10",
    name: "命运之轮",
    nameEn: "Wheel of Fortune",
    arcana: "major",
    number: 10,
    keywordsUpright: ["变化", "周期", "命运", "转折点", "好运"],
    keywordsReversed: ["厄运", "抗拒变化", "失控", "不好的运气"],
    meaningUpright:
      "命运之轮代表生命的周期性变化和命运的转折。它提醒我们一切都在不断变化,好运和挑战都是暂时的。这张牌鼓励你接受变化,顺应生命的自然节奏。",
    meaningReversed:
      "逆位的命运之轮可能表示不好的运气、抗拒必要的变化或感到失控。也可能暗示需要更主动地创造改变,而不是被动等待。",
    image: "/tarot-images/major/major-10-wheel.jpg",
  },
  {
    id: "major-11",
    name: "正义",
    nameEn: "Justice",
    arcana: "major",
    number: 11,
    keywordsUpright: ["公正", "真理", "法律", "平衡", "因果"],
    keywordsReversed: ["不公", "逃避责任", "偏见", "失衡"],
    meaningUpright:
      "正义象征公平、真理和因果法则。它代表为自己的行为负责,做出基于真理和公正的决定。这张牌鼓励你寻求真相,保持客观,相信宇宙的平衡法则。",
    meaningReversed:
      "逆位的正义可能表示不公正、逃避责任或偏见。也可能暗示需要更诚实地面对自己的行为及其后果。",
    image: "/tarot-images/major/major-11-justice.jpg",
  },
  {
    id: "major-12",
    name: "倒吊人",
    nameEn: "The Hanged Man",
    arcana: "major",
    number: 12,
    keywordsUpright: ["放手", "新视角", "暂停", "牺牲", "臣服"],
    keywordsReversed: ["拖延", "抗拒", "僵局", "浪费时间"],
    meaningUpright:
      "倒吊人代表通过放手和改变视角获得启示。它象征暂停、反思和有意义的牺牲。这张牌鼓励你臣服于当下,从不同角度看待问题,从等待中学习。",
    meaningReversed:
      "逆位的倒吊人可能表示无谓的拖延、抗拒必要的改变或感到困在僵局中。也可能暗示需要停止牺牲自己,采取行动。",
    image: "/tarot-images/major/major-12-hanged.jpg",
  },
  {
    id: "major-13",
    name: "死神",
    nameEn: "Death",
    arcana: "major",
    number: 13,
    keywordsUpright: ["转变", "结束", "重生", "释放", "过渡"],
    keywordsReversed: ["抗拒变化", "停滞", "无法放手", "恐惧"],
    meaningUpright:
      "死神象征重大的转变和结束,为新的开始腾出空间。它很少指实际的死亡,而是代表生命中某个阶段的结束和转化。这张牌鼓励你放手过去,拥抱不可避免的变化。",
    meaningReversed:
      "逆位的死神可能表示抗拒必要的变化、停滞不前或无法放手。也可能暗示恐惧阻止了个人成长和转化。",
    image: "/tarot-images/major/major-13-death.jpg",
  },
  {
    id: "major-14",
    name: "节制",
    nameEn: "Temperance",
    arcana: "major",
    number: 14,
    keywordsUpright: ["平衡", "节制", "耐心", "和谐", "中庸"],
    keywordsReversed: ["失衡", "过度", "缺乏耐心", "极端"],
    meaningUpright:
      "节制代表平衡、和谐和中庸之道。它象征将相反的元素完美融合,保持耐心和节制。这张牌鼓励你寻找平衡,避免极端,用温和而稳定的方式前进。",
    meaningReversed:
      "逆位的节制可能表示失去平衡、过度沉溺或缺乏耐心。也可能暗示需要重新调整生活的各个方面,找回和谐。",
    image: "/tarot-images/major/major-14-temperance.jpg",
  },
  {
    id: "major-15",
    name: "恶魔",
    nameEn: "The Devil",
    arcana: "major",
    number: 15,
    keywordsUpright: ["束缚", "上瘾", "物质主义", "阴影", "限制"],
    keywordsReversed: ["释放", "挣脱束缚", "克服恐惧", "觉醒"],
    meaningUpright:
      "恶魔象征束缚、上瘾和物质诱惑。它代表自我施加的限制、不健康的依赖或被欲望控制。这张牌提醒你审视什么在束缚你,认识到你拥有打破枷锁的力量。",
    meaningReversed:
      "逆位的恶魔可能表示挣脱束缚、克服上瘾或从限制性的情况中解放。也可能暗示意识到问题是走向自由的第一步。",
    image: "/tarot-images/major/major-15-devil.jpg",
  },
  {
    id: "major-16",
    name: "塔",
    nameEn: "The Tower",
    arcana: "major",
    number: 16,
    keywordsUpright: ["突然改变", "颠覆", "启示", "崩溃", "觉醒"],
    keywordsReversed: ["逃避灾难", "恐惧改变", "推迟不可避免的事"],
    meaningUpright:
      "塔代表突然而剧烈的变化,打破虚假的结构和幻觉。虽然可能令人震惊,但这种崩溃是必要的,它清除了不再服务于你的东西,为真理和重建铺平道路。",
    meaningReversed:
      "逆位的塔可能表示勉强逃避灾难、恐惧必要的改变或推迟不可避免的崩溃。也可能暗示内在的转变正在发生。",
    image: "/tarot-images/major/major-16-tower.jpg",
  },
  {
    id: "major-17",
    name: "星星",
    nameEn: "The Star",
    arcana: "major",
    number: 17,
    keywordsUpright: ["希望", "灵感", "宁静", "更新", "信仰"],
    keywordsReversed: ["绝望", "缺乏信心", "失去希望", "断开连接"],
    meaningUpright:
      "星星象征希望、灵感和精神更新。经历风暴后,它带来平静和治愈。这张牌鼓励你保持信心,相信未来,与宇宙的更高力量保持连接。",
    meaningReversed:
      "逆位的星星可能表示失去希望、缺乏信心或感到与灵性断开连接。也可能暗示需要重新找回内在的光芒和对未来的信心。",
    image: "/tarot-images/major/major-17-star.jpg",
  },
  {
    id: "major-18",
    name: "月亮",
    nameEn: "The Moon",
    arcana: "major",
    number: 18,
    keywordsUpright: ["幻觉", "恐惧", "潜意识", "直觉", "不确定"],
    keywordsReversed: ["释放恐惧", "真相揭露", "清晰", "理解"],
    meaningUpright:
      "月亮代表幻觉、恐惧和潜意识的深处。它象征不确定性、混乱和隐藏的事物。这张牌鼓励你面对内心的恐惧,相信直觉,穿越迷雾找到真相。",
    meaningReversed:
      "逆位的月亮可能表示真相即将揭露、释放恐惧或获得清晰。也可能暗示幻觉正在消散,理解即将到来。",
    image: "/tarot-images/major/major-18-moon.jpg",
  },
  {
    id: "major-19",
    name: "太阳",
    nameEn: "The Sun",
    arcana: "major",
    number: 19,
    keywordsUpright: ["成功", "喜悦", "活力", "真实", "庆祝"],
    keywordsReversed: ["暂时低落", "过度乐观", "缺乏热情"],
    meaningUpright:
      "太阳象征成功、喜悦和生命的活力。它代表真实的自我表达、清晰和庆祝。这是一张充满正能量的牌,鼓励你享受成就,分享你的光芒。",
    meaningReversed:
      "逆位的太阳可能表示暂时的低落、过度乐观或缺乏热情。也可能暗示需要寻找内在的喜悦,而不是依赖外部环境。",
    image: "/tarot-images/major/major-19-sun.jpg",
  },
  {
    id: "major-20",
    name: "审判",
    nameEn: "Judgement",
    arcana: "major",
    number: 20,
    keywordsUpright: ["反思", "重生", "原谅", "决定", "觉醒"],
    keywordsReversed: ["自我怀疑", "内疚", "无法原谅", "逃避"],
    meaningUpright:
      "审判代表反思、重生和更高层次的觉醒。它象征对过去的评估、宽恕和做出重要决定。这张牌鼓励你回顾过去,学习教训,准备迎接新的篇章。",
    meaningReversed:
      "逆位的审判可能表示自我批评、内疚或无法原谅自己或他人。也可能暗示逃避重要的决定或拒绝面对真相。",
    image: "/tarot-images/major/major-20-judgement.jpg",
  },
  {
    id: "major-21",
    name: "世界",
    nameEn: "The World",
    arcana: "major",
    number: 21,
    keywordsUpright: ["完成", "成就", "圆满", "整合", "旅程结束"],
    keywordsReversed: ["未完成", "缺乏闭合", "寻求完美", "延迟"],
    meaningUpright:
      "世界代表完成、成就和圆满。它象征一个重要周期的结束和成功的达成。这张牌鼓励你庆祝成就,同时准备迎接下一个旅程的开始。",
    meaningReversed:
      "逆位的世界可能表示未完成的事务、缺乏成就感或过度追求完美。也可能暗示需要在开始新事物之前完成当前的任务。",
    image: "/tarot-images/major/major-21-world.jpg",
  },

  // ==================== 小阿尔卡纳 - 权杖 (14张) ====================
  {
    id: "wands-01",
    name: "权杖王牌",
    nameEn: "Ace of Wands",
    arcana: "minor",
    suit: "wands",
    number: 1,
    keywordsUpright: ["灵感", "新开始", "热情", "创造力", "潜力"],
    keywordsReversed: ["缺乏方向", "拖延", "创意受阻", "迟疑"],
    meaningUpright:
      "权杖王牌代表新的灵感、创造性的火花和充满热情的新开始。这是启动新项目、追求激情或探索新机会的绝佳时机。能量充沛,充满可能性。",
    meaningReversed:
      "逆位可能表示缺乏灵感、拖延或创意受阻。需要重新点燃热情,找到前进的动力。",
    image: "/tarot-images/minor/wands/wands-01.jpg",
  },
  {
    id: "wands-02",
    name: "权杖二",
    nameEn: "Two of Wands",
    arcana: "minor",
    suit: "wands",
    number: 2,
    keywordsUpright: ["计划", "远见", "选择", "发现", "个人力量"],
    keywordsReversed: ["犹豫", "害怕未知", "缺乏规划", "不安"],
    meaningUpright:
      "权杖二代表站在十字路口,规划未来。你已经迈出第一步,现在需要决定下一步的方向。这张牌鼓励你拓展视野,做出明智的选择。",
    meaningReversed:
      "逆位可能表示害怕走出舒适区、过度计划或犹豫不决。需要采取行动,不要让恐惧阻碍前进。",
    image: "/tarot-images/minor/wands/wands-02.jpg",
  },
  {
    id: "wands-03",
    name: "权杖三",
    nameEn: "Three of Wands",
    arcana: "minor",
    suit: "wands",
    number: 3,
    keywordsUpright: ["扩张", "远见", "领导力", "前瞻", "机会"],
    keywordsReversed: ["障碍", "缺乏远见", "拖延", "挫折"],
    meaningUpright:
      "权杖三象征扩张和远见。你的计划正在实现,机会即将到来。这张牌鼓励你保持远见,继续向前,领导团队走向成功。",
    meaningReversed:
      "逆位可能表示遇到障碍、计划受阻或缺乏远见。需要重新评估策略,克服挫折。",
    image: "/tarot-images/minor/wands/wands-03.jpg",
  },
  {
    id: "wands-04",
    name: "权杖四",
    nameEn: "Four of Wands",
    arcana: "minor",
    suit: "wands",
    number: 4,
    keywordsUpright: ["庆祝", "和谐", "稳定", "团聚", "快乐"],
    keywordsReversed: ["缺乏和谐", "延迟庆祝", "不稳定", "过渡"],
    meaningUpright:
      "权杖四代表庆祝、和谐和达成重要里程碑。这是享受成功、与他人分享喜悦的时刻。家庭和社区带来支持和稳定。",
    meaningReversed:
      "逆位可能表示庆祝延迟、缺乏和谐或不稳定。可能需要更努力才能达到期望的稳定状态。",
    image: "/tarot-images/minor/wands/wands-04.jpg",
  },
  {
    id: "wands-05",
    name: "权杖五",
    nameEn: "Five of Wands",
    arcana: "minor",
    suit: "wands",
    number: 5,
    keywordsUpright: ["竞争", "冲突", "挑战", "多样性", "分歧"],
    keywordsReversed: ["避免冲突", "内在冲突", "和解", "协作"],
    meaningUpright:
      "权杖五代表竞争、冲突和挑战。可能面临激烈的竞争或意见分歧,但这也是成长和学习的机会。保持开放心态,寻找建设性的解决方案。",
    meaningReversed:
      "逆位可能表示避免必要的冲突、内在挣扎或寻求和解。冲突正在解决,协作成为可能。",
    image: "/tarot-images/minor/wands/wands-05.jpg",
  },
  {
    id: "wands-06",
    name: "权杖六",
    nameEn: "Six of Wands",
    arcana: "minor",
    suit: "wands",
    number: 6,
    keywordsUpright: ["胜利", "成功", "认可", "自信", "进步"],
    keywordsReversed: ["自负", "缺乏认可", "失败", "自我怀疑"],
    meaningUpright:
      "权杖六象征胜利、成功和公众认可。你的努力得到了回报,这是享受成就和建立自信的时刻。继续前进,保持谦逊。",
    meaningReversed:
      "逆位可能表示缺乏认可、自负或自我怀疑。需要内在的认可,不要过度依赖外部肯定。",
    image: "/tarot-images/minor/wands/wands-06.jpg",
  },
  {
    id: "wands-07",
    name: "权杖七",
    nameEn: "Seven of Wands",
    arcana: "minor",
    suit: "wands",
    number: 7,
    keywordsUpright: ["挑战", "坚持", "防御", "勇气", "决心"],
    keywordsReversed: ["屈服", "疲惫", "放弃", "不堪重负"],
    meaningUpright:
      "权杖七代表面对挑战时的坚持和勇气。你可能需要捍卫自己的立场,但你有能力克服障碍。保持决心,不要轻易放弃。",
    meaningReversed:
      "逆位可能表示感到不堪重负、疲惫或想要放弃。需要重新评估是否值得继续战斗,或者寻求帮助。",
    image: "/tarot-images/minor/wands/wands-07.jpg",
  },
  {
    id: "wands-08",
    name: "权杖八",
    nameEn: "Eight of Wands",
    arcana: "minor",
    suit: "wands",
    number: 8,
    keywordsUpright: ["快速行动", "进展", "信息", "旅行", "匆忙"],
    keywordsReversed: ["延迟", "挫折", "错过时机", "仓促"],
    meaningUpright:
      "权杖八象征快速的进展和动态的能量。事情正在加速发展,可能涉及旅行或重要信息的到来。抓住机会,保持灵活。",
    meaningReversed:
      "逆位可能表示延迟、挫折或过于仓促。需要耐心,不要强行推进还没准备好的事情。",
    image: "/tarot-images/minor/wands/wands-08.jpg",
  },
  {
    id: "wands-09",
    name: "权杖九",
    nameEn: "Nine of Wands",
    arcana: "minor",
    suit: "wands",
    number: 9,
    keywordsUpright: ["韧性", "勇气", "坚持", "边界", "防御"],
    keywordsReversed: ["偏执", "固执", "疲惫", "放弃"],
    meaningUpright:
      "权杖九代表在挑战面前的韧性和坚持。虽然疲惫,但你接近目标。设定健康的边界,保护你的能量,坚持到底。",
    meaningReversed:
      "逆位可能表示过度防御、偏执或准备放弃。需要在保护自己和保持开放之间找到平衡。",
    image: "/tarot-images/minor/wands/wands-09.jpg",
  },
  {
    id: "wands-10",
    name: "权杖十",
    nameEn: "Ten of Wands",
    arcana: "minor",
    suit: "wands",
    number: 10,
    keywordsUpright: ["负担", "责任", "压力", "义务", "过度承担"],
    keywordsReversed: ["释放负担", "委派", "优先级", "倦怠"],
    meaningUpright:
      "权杖十象征沉重的负担和过度的责任。你可能承担了太多,感到压力。这张牌提醒你学会委派,设定优先级,不要独自承担一切。",
    meaningReversed:
      "逆位可能表示释放负担、学会说不或面对倦怠。是时候重新分配责任,照顾自己了。",
    image: "/tarot-images/minor/wands/wands-10.jpg",
  },
  {
    id: "wands-11",
    name: "权杖侍从",
    nameEn: "Page of Wands",
    arcana: "minor",
    suit: "wands",
    number: 11,
    keywordsUpright: ["探索", "兴奋", "自由", "好消息", "好奇"],
    keywordsReversed: ["缺乏方向", "拖延", "坏消息", "不成熟"],
    meaningUpright:
      "权杖侍从代表探索、冒险和充满热情的新想法。这是发现新兴趣、接收好消息或开始新冒险的时刻。保持好奇和开放。",
    meaningReversed:
      "逆位可能表示缺乏方向、拖延或不成熟的态度。需要更认真地对待机会,避免三分钟热度。",
    image: "/tarot-images/minor/wands/wands-11.jpg",
  },
  {
    id: "wands-12",
    name: "权杖骑士",
    nameEn: "Knight of Wands",
    arcana: "minor",
    suit: "wands",
    number: 12,
    keywordsUpright: ["热情", "冒险", "冲动", "行动", "能量"],
    keywordsReversed: ["鲁莽", "不耐烦", "缺乏方向", "易怒"],
    meaningUpright:
      "权杖骑士象征热情、冒险和迅速的行动。充满能量和魅力,准备追求梦想。但要注意不要过于冲动,确保行动有方向。",
    meaningReversed:
      "逆位可能表示鲁莽、不耐烦或缺乏计划。需要在热情和谨慎之间找到平衡,避免盲目行动。",
    image: "/tarot-images/minor/wands/wands-12.jpg",
  },
  {
    id: "wands-13",
    name: "权杖王后",
    nameEn: "Queen of Wands",
    arcana: "minor",
    suit: "wands",
    number: 13,
    keywordsUpright: ["自信", "独立", "魅力", "热情", "决心"],
    keywordsReversed: ["自私", "嫉妒", "不安全感", "控制欲"],
    meaningUpright:
      "权杖王后代表自信、独立和充满活力的领导力。她热情、有魅力,能够激励他人。这张牌鼓励你拥抱你的力量,真实地表达自己。",
    meaningReversed:
      "逆位可能表示不安全感、嫉妒或过度控制。需要重新找回内在的自信,避免让恐惧驱动行为。",
    image: "/tarot-images/minor/wands/wands-13.jpg",
  },
  {
    id: "wands-14",
    name: "权杖国王",
    nameEn: "King of Wands",
    arcana: "minor",
    suit: "wands",
    number: 14,
    keywordsUpright: ["领导力", "远见", "企业家精神", "荣誉", "大胆"],
    keywordsReversed: ["专制", "鲁莽", "不负责任", "冲动"],
    meaningUpright:
      "权杖国王象征强大的领导力、远见和企业家精神。他大胆、有魅力,能够将愿景变为现实。这张牌鼓励你发挥领导才能,勇敢追求目标。",
    meaningReversed:
      "逆位可能表示专制、鲁莽或滥用权力。需要在自信和谦逊之间找到平衡,负责任地领导。",
    image: "/tarot-images/minor/wands/wands-14.jpg",
  },

  // ==================== 小阿尔卡纳 - 圣杯 (14张) ====================
  {
    id: "cups-01",
    name: "圣杯王牌",
    nameEn: "Ace of Cups",
    arcana: "minor",
    suit: "cups",
    number: 1,
    keywordsUpright: ["爱", "新感情", "直觉", "灵性", "同情"],
    keywordsReversed: ["情感受阻", "压抑感情", "空虚", "失望"],
    meaningUpright:
      "圣杯王牌代表爱、新感情和情感的觉醒。这是心灵开放、接受爱和同情的时刻。可能是新关系、创意灵感或精神觉醒的开始。",
    meaningReversed:
      "逆位可能表示情感受阻、压抑感情或感到空虚。需要打开心扉,处理未解决的情感问题。",
    image: "/tarot-images/minor/cups/cups-01.jpg",
  },
  {
    id: "cups-02",
    name: "圣杯二",
    nameEn: "Two of Cups",
    arcana: "minor",
    suit: "cups",
    number: 2,
    keywordsUpright: ["伙伴关系", "爱情", "和谐", "统一", "连接"],
    keywordsReversed: ["失衡", "破裂关系", "缺乏和谐", "误解"],
    meaningUpright:
      "圣杯二象征伙伴关系、相互的吸引和和谐的关系。这是建立深层连接、找到共鸣或平衡关系的时刻。爱与尊重相互流动。",
    meaningReversed:
      "逆位可能表示关系失衡、误解或破裂。需要重新建立平衡和沟通,修复裂痕。",
    image: "/tarot-images/minor/cups/cups-02.jpg",
  },
  {
    id: "cups-03",
    name: "圣杯三",
    nameEn: "Three of Cups",
    arcana: "minor",
    suit: "cups",
    number: 3,
    keywordsUpright: ["庆祝", "友谊", "创造力", "社交", "喜悦"],
    keywordsReversed: ["过度沉溺", "孤立", "误会", "缺乏社交"],
    meaningUpright:
      "圣杯三代表庆祝、友谊和社交的喜悦。这是与朋友聚会、庆祝成就或享受创意合作的时刻。分享快乐,建立联系。",
    meaningReversed:
      "逆位可能表示过度沉溺、感到孤立或友谊出现裂痕。需要平衡社交和个人时间,修复关系。",
    image: "/tarot-images/minor/cups/cups-03.jpg",
  },
  {
    id: "cups-04",
    name: "圣杯四",
    nameEn: "Four of Cups",
    arcana: "minor",
    suit: "cups",
    number: 4,
    keywordsUpright: ["沉思", "冷漠", "重新评估", "错过机会", "内省"],
    keywordsReversed: ["觉醒", "接受新机会", "积极行动", "兴趣恢复"],
    meaningUpright:
      "圣杯四象征沉思、冷漠和对现状的不满。可能感到无聊或忽视眼前的机会。这张牌提醒你重新评估优先级,认识到你拥有的祝福。",
    meaningReversed:
      "逆位可能表示从冷漠中觉醒、准备接受新机会或重新找回热情。是时候采取行动了。",
    image: "/tarot-images/minor/cups/cups-04.jpg",
  },
  {
    id: "cups-05",
    name: "圣杯五",
    nameEn: "Five of Cups",
    arcana: "minor",
    suit: "cups",
    number: 5,
    keywordsUpright: ["失望", "悲伤", "遗憾", "损失", "专注负面"],
    keywordsReversed: ["接受", "向前看", "原谅", "治愈"],
    meaningUpright:
      "圣杯五代表失望、悲伤和对损失的哀悼。虽然有理由感到难过,但这张牌提醒你还有未倾倒的杯子。不要只看失去的,也要看到仍拥有的。",
    meaningReversed:
      "逆位可能表示接受损失、准备向前看或开始治愈过程。宽恕和释放让你自由。",
    image: "/tarot-images/minor/cups/cups-05.jpg",
  },
  {
    id: "cups-06",
    name: "圣杯六",
    nameEn: "Six of Cups",
    arcana: "minor",
    suit: "cups",
    number: 6,
    keywordsUpright: ["怀旧", "童年", "天真", "重聚", "善意"],
    keywordsReversed: ["困在过去", "不现实的期望", "向前看"],
    meaningUpright:
      "圣杯六象征怀旧、童年回忆和天真的快乐。可能遇到旧友、回顾过去或体验单纯的喜悦。这张牌鼓励你珍惜美好回忆,同时活在当下。",
    meaningReversed:
      "逆位可能表示困在过去、不切实际的怀旧或需要放下。是时候创造新的美好回忆,而不是活在过去。",
    image: "/tarot-images/minor/cups/cups-06.jpg",
  },
  {
    id: "cups-07",
    name: "圣杯七",
    nameEn: "Seven of Cups",
    arcana: "minor",
    suit: "cups",
    number: 7,
    keywordsUpright: ["选择", "幻想", "幻觉", "白日梦", "迷惑"],
    keywordsReversed: ["清晰", "决断", "现实检验", "集中注意力"],
    meaningUpright:
      "圣杯七代表众多选择、幻想和可能的幻觉。面对太多选项可能导致迷惑和拖延。这张牌提醒你区分现实和幻想,做出明智的选择。",
    meaningReversed:
      "逆位可能表示获得清晰、做出决定或进行现实检验。是时候专注于真正重要的事情了。",
    image: "/tarot-images/minor/cups/cups-07.jpg",
  },
  {
    id: "cups-08",
    name: "圣杯八",
    nameEn: "Eight of Cups",
    arcana: "minor",
    suit: "cups",
    number: 8,
    keywordsUpright: ["放手", "寻找更多", "撤退", "离开", "精神追求"],
    keywordsReversed: ["恐惧变化", "停滞", "逃避", "勉强留下"],
    meaningUpright:
      "圣杯八象征放手、离开不再满足你的情况,寻找更深的意义。虽然艰难,但这是成长和自我发现的必要步骤。勇敢追寻你的真实道路。",
    meaningReversed:
      "逆位可能表示恐惧离开、停滞或逃避必要的改变。需要勇气面对真相,不要因恐惧而勉强留下。",
    image: "/tarot-images/minor/cups/cups-08.jpg",
  },
  {
    id: "cups-09",
    name: "圣杯九",
    nameEn: "Nine of Cups",
    arcana: "minor",
    suit: "cups",
    number: 9,
    keywordsUpright: ["满足", "愿望成真", "幸福", "满意", "享受"],
    keywordsReversed: ["不满", "贪婪", "自满", "表面快乐"],
    meaningUpright:
      '圣杯九代表满足、愿望成真和情感上的满意。这是"愿望牌",象征达成目标和享受成果的时刻。允许自己感受快乐和满足。',
    meaningReversed:
      "逆位可能表示内在不满、过度沉溺或表面的快乐。需要寻找更深层的满足,而不是物质上的享受。",
    image: "/tarot-images/minor/cups/cups-09.jpg",
  },
  {
    id: "cups-10",
    name: "圣杯十",
    nameEn: "Ten of Cups",
    arcana: "minor",
    suit: "cups",
    number: 10,
    keywordsUpright: ["幸福", "和谐", "家庭", "情感满足", "祝福"],
    keywordsReversed: ["家庭冲突", "破裂关系", "不和谐", "失望"],
    meaningUpright:
      "圣杯十象征终极的情感满足、家庭和谐和持久的幸福。这是爱、连接和归属感完美结合的时刻。珍惜这些祝福,与所爱之人分享。",
    meaningReversed:
      "逆位可能表示家庭冲突、关系破裂或未达到期望的和谐。需要努力修复关系,重新建立连接。",
    image: "/tarot-images/minor/cups/cups-10.jpg",
  },
  {
    id: "cups-11",
    name: "圣杯侍从",
    nameEn: "Page of Cups",
    arcana: "minor",
    suit: "cups",
    number: 11,
    keywordsUpright: ["创意", "直觉", "好消息", "好奇", "温柔"],
    keywordsReversed: ["情绪不稳", "不成熟", "坏消息", "创意受阻"],
    meaningUpright:
      "圣杯侍从代表创意、直觉和情感上的新开始。可能收到好消息、发现新的创意灵感或体验温柔的感情。保持开放和好奇的心。",
    meaningReversed:
      "逆位可能表示情绪不稳、创意受阻或收到令人失望的消息。需要处理情感问题,重新连接直觉。",
    image: "/tarot-images/minor/cups/cups-11.jpg",
  },
  {
    id: "cups-12",
    name: "圣杯骑士",
    nameEn: "Knight of Cups",
    arcana: "minor",
    suit: "cups",
    number: 12,
    keywordsUpright: ["浪漫", "魅力", "想象力", "追求梦想", "理想主义"],
    keywordsReversed: ["不切实际", "情绪化", "空想", "易怒"],
    meaningUpright:
      "圣杯骑士象征浪漫、魅力和追求梦想。充满想象力和理想主义,准备为爱和创意冒险。但要确保梦想脚踏实地,不要迷失在幻想中。",
    meaningReversed:
      "逆位可能表示过于情绪化、不切实际或空想。需要在理想和现实之间找到平衡,避免自欺欺人。",
    image: "/tarot-images/minor/cups/cups-12.jpg",
  },
  {
    id: "cups-13",
    name: "圣杯王后",
    nameEn: "Queen of Cups",
    arcana: "minor",
    suit: "cups",
    number: 13,
    keywordsUpright: ["同情", "直觉", "情感成熟", "治愈", "关怀"],
    keywordsReversed: ["情感依赖", "不安全感", "过度敏感", "界限模糊"],
    meaningUpright:
      "圣杯王后代表同情、情感成熟和深刻的直觉。她温柔、有爱心,能够治愈和滋养他人。这张牌鼓励你信任直觉,用爱和同情对待自己和他人。",
    meaningReversed:
      "逆位可能表示情感依赖、不安全感或界限模糊。需要学会照顾自己,不要在关系中失去自我。",
    image: "/tarot-images/minor/cups/cups-13.jpg",
  },
  {
    id: "cups-14",
    name: "圣杯国王",
    nameEn: "King of Cups",
    arcana: "minor",
    suit: "cups",
    number: 14,
    keywordsUpright: ["情感平衡", "同情", "外交", "智慧", "冷静"],
    keywordsReversed: ["情感压抑", "操纵", "冷漠", "情绪失控"],
    meaningUpright:
      "圣杯国王象征情感成熟、平衡和智慧。他能够在保持同情的同时保持冷静和客观。这张牌鼓励你用智慧和爱心领导,在情感和理性间找到平衡。",
    meaningReversed:
      "逆位可能表示情感压抑、操纵或情绪失控。需要诚实面对感受,避免用理性过度压制情感。",
    image: "/tarot-images/minor/cups/cups-14.jpg",
  },

  // ==================== 小阿尔卡纳 - 宝剑 (14张) ====================
  {
    id: "swords-01",
    name: "宝剑王牌",
    nameEn: "Ace of Swords",
    arcana: "minor",
    suit: "swords",
    number: 1,
    keywordsUpright: ["清晰", "真理", "突破", "新想法", "理性"],
    keywordsReversed: ["混乱", "误解", "残酷真相", "缺乏清晰"],
    meaningUpright:
      "宝剑王牌代表清晰、真理和智力上的突破。这是新想法、清晰思维和洞察力的时刻。用理性和真相切断迷雾,看清事物本质。",
    meaningReversed:
      "逆位可能表示混乱、误解或残酷的真相。需要寻求清晰,避免用真理作为武器伤害他人。",
    image: "/tarot-images/minor/swords/swords-01.jpg",
  },
  {
    id: "swords-02",
    name: "宝剑二",
    nameEn: "Two of Swords",
    arcana: "minor",
    suit: "swords",
    number: 2,
    keywordsUpright: ["僵局", "困难选择", "回避", "平衡", "犹豫"],
    keywordsReversed: ["决断", "揭示真相", "混乱", "信息过载"],
    meaningUpright:
      "宝剑二象征僵局、困难的选择和回避决定。蒙住眼睛可能暂时缓解痛苦,但无法解决问题。这张牌提醒你面对真相,做出必要的决定。",
    meaningReversed:
      "逆位可能表示准备做决定、真相揭露或因信息过载而更加混乱。需要勇气面对现实,不再逃避。",
    image: "/tarot-images/minor/swords/swords-02.jpg",
  },
  {
    id: "swords-03",
    name: "宝剑三",
    nameEn: "Three of Swords",
    arcana: "minor",
    suit: "swords",
    number: 3,
    keywordsUpright: ["心碎", "悲伤", "痛苦", "分离", "失望"],
    keywordsReversed: ["治愈", "原谅", "释放痛苦", "恢复"],
    meaningUpright:
      "宝剑三代表心碎、情感痛苦和深刻的失望。虽然痛苦,但承认和经历这些感受是治愈过程的一部分。允许自己悲伤,但不要停留太久。",
    meaningReversed:
      "逆位可能表示开始治愈、原谅或释放痛苦。伤口正在愈合,是时候向前看了。",
    image: "/tarot-images/minor/swords/swords-03.jpg",
  },
  {
    id: "swords-04",
    name: "宝剑四",
    nameEn: "Four of Swords",
    arcana: "minor",
    suit: "swords",
    number: 4,
    keywordsUpright: ["休息", "恢复", "沉思", "平静", "准备"],
    keywordsReversed: ["疲惫", "停滞", "休息过度", "恢复"],
    meaningUpright:
      "宝剑四象征休息、恢复和暂时退出。经历挑战后,需要时间治愈和充电。这张牌鼓励你休息,沉思,为下一阶段做准备。",
    meaningReversed:
      "逆位可能表示从休息中恢复、准备重新开始或休息过度导致停滞。是时候重新投入行动了。",
    image: "/tarot-images/minor/swords/swords-04.jpg",
  },
  {
    id: "swords-05",
    name: "宝剑五",
    nameEn: "Five of Swords",
    arcana: "minor",
    suit: "swords",
    number: 5,
    keywordsUpright: ["冲突", "失败", "背叛", "赢得不光彩", "紧张"],
    keywordsReversed: ["和解", "妥协", "原谅", "走出冲突"],
    meaningUpright:
      "宝剑五代表冲突、失败和可能的背叛。即使赢了,也可能付出高昂代价。这张牌提醒你选择你的战斗,考虑胜利的真正代价。",
    meaningReversed:
      "逆位可能表示寻求和解、妥协或从冲突中走出。是时候放下过去,向前看了。",
    image: "/tarot-images/minor/swords/swords-05.jpg",
  },
  {
    id: "swords-06",
    name: "宝剑六",
    nameEn: "Six of Swords",
    arcana: "minor",
    suit: "swords",
    number: 6,
    keywordsUpright: ["过渡", "改变", "离开", "向前", "恢复"],
    keywordsReversed: ["抗拒改变", "无法前进", "未解决的问题"],
    meaningUpright:
      "宝剑六象征过渡、从困难中离开,向更平静的水域前进。虽然可能带着伤痛,但你正在向更好的地方前进。相信这个过程。",
    meaningReversed:
      "逆位可能表示抗拒必要的改变、无法前进或携带未解决的问题。需要处理过去,才能真正向前。",
    image: "/tarot-images/minor/swords/swords-06.jpg",
  },
  {
    id: "swords-07",
    name: "宝剑七",
    nameEn: "Seven of Swords",
    arcana: "minor",
    suit: "swords",
    number: 7,
    keywordsUpright: ["欺骗", "策略", "偷偷摸摸", "逃避", "聪明"],
    keywordsReversed: ["真相揭露", "良心", "诚实", "重新思考策略"],
    meaningUpright:
      "宝剑七代表欺骗、策略或采取聪明但可能不诚实的方法。可能需要谨慎行事,但要注意不要跨越道德界限。扪心自问动机是否正当。",
    meaningReversed:
      "逆位可能表示真相即将揭露、良心作用或重新考虑不诚实的策略。诚实和正直最终会胜出。",
    image: "/tarot-images/minor/swords/swords-07.jpg",
  },
  {
    id: "swords-08",
    name: "宝剑八",
    nameEn: "Eight of Swords",
    arcana: "minor",
    suit: "swords",
    number: 8,
    keywordsUpright: ["受困", "限制", "恐惧", "自我限制", "受害者心态"],
    keywordsReversed: ["释放", "自由", "新视角", "打破束缚"],
    meaningUpright:
      "宝剑八象征感到受困、被限制或无助。但束缚往往是自我施加的,基于恐惧和有限的思维。这张牌提醒你,你比想象中更有力量挣脱。",
    meaningReversed:
      "逆位可能表示打破束缚、获得新视角或从限制中释放。你正在找到自由的道路。",
    image: "/tarot-images/minor/swords/swords-08.jpg",
  },
  {
    id: "swords-09",
    name: "宝剑九",
    nameEn: "Nine of Swords",
    arcana: "minor",
    suit: "swords",
    number: 9,
    keywordsUpright: ["焦虑", "担忧", "噩梦", "恐惧", "内疚"],
    keywordsReversed: ["释放恐惧", "希望", "寻求帮助", "恢复"],
    meaningUpright:
      "宝剑九代表焦虑、深夜的担忧和内心的恐惧。思维可能过度活跃,创造出比现实更可怕的场景。这张牌鼓励你寻求支持,面对恐惧,不要独自承受。",
    meaningReversed:
      "逆位可能表示释放恐惧、找到希望或准备寻求帮助。最黑暗的时刻已过,黎明即将到来。",
    image: "/tarot-images/minor/swords/swords-09.jpg",
  },
  {
    id: "swords-10",
    name: "宝剑十",
    nameEn: "Ten of Swords",
    arcana: "minor",
    suit: "swords",
    number: 10,
    keywordsUpright: ["结束", "背叛", "触底", "痛苦结局", "释放"],
    keywordsReversed: ["恢复", "重生", "避免灾难", "学习教训"],
    meaningUpright:
      "宝剑十象征痛苦的结束、背叛或触底。虽然看起来很糟,但这代表旧周期的结束。最坏已经过去,只能向上了。这是释放和重新开始的机会。",
    meaningReversed:
      "逆位可能表示从低谷恢复、避免最坏情况或从困难中学习教训。重生和治愈正在进行。",
    image: "/tarot-images/minor/swords/swords-10.jpg",
  },
  {
    id: "swords-11",
    name: "宝剑侍从",
    nameEn: "Page of Swords",
    arcana: "minor",
    suit: "swords",
    number: 11,
    keywordsUpright: ["好奇", "警觉", "新想法", "沟通", "真相"],
    keywordsReversed: ["八卦", "谎言", "消息不准确", "幼稚"],
    meaningUpright:
      "宝剑侍从代表好奇、敏锐的思维和对真相的追求。可能收到新信息、产生新想法或需要保持警觉。保持开放和探究的心态。",
    meaningReversed:
      "逆位可能表示八卦、谎言或传播不准确的信息。需要在说话前三思,确保信息的真实性。",
    image: "/tarot-images/minor/swords/swords-11.jpg",
  },
  {
    id: "swords-12",
    name: "宝剑骑士",
    nameEn: "Knight of Swords",
    arcana: "minor",
    suit: "swords",
    number: 12,
    keywordsUpright: ["雄心", "行动", "直接", "急躁", "智力"],
    keywordsReversed: ["鲁莽", "冲动", "残酷真相", "缺乏计划"],
    meaningUpright:
      "宝剑骑士象征雄心、快速行动和直接沟通。充满智慧和决心,准备追求目标。但要注意不要过于急躁或无意中伤害他人。",
    meaningReversed:
      "逆位可能表示鲁莽、冲动行动或用残酷的真相伤害他人。需要在勇气和同情之间找到平衡。",
    image: "/tarot-images/minor/swords/swords-12.jpg",
  },
  {
    id: "swords-13",
    name: "宝剑王后",
    nameEn: "Queen of Swords",
    arcana: "minor",
    suit: "swords",
    number: 13,
    keywordsUpright: ["独立", "清晰思维", "直接", "真相", "感知力"],
    keywordsReversed: ["冷酷", "残忍", "刻薄", "缺乏同情"],
    meaningUpright:
      "宝剑王后代表独立、清晰的思维和对真相的坚持。她智慧、有感知力,能够客观看待情况。这张牌鼓励你用理性和诚实面对问题,同时保持同情心。",
    meaningReversed:
      "逆位可能表示过于冷酷、残忍或缺乏同情。需要在真理和善良之间找到平衡,避免用言语伤害他人。",
    image: "/tarot-images/minor/swords/swords-13.jpg",
  },
  {
    id: "swords-14",
    name: "宝剑国王",
    nameEn: "King of Swords",
    arcana: "minor",
    suit: "swords",
    number: 14,
    keywordsUpright: ["权威", "真理", "理性", "公正", "道德"],
    keywordsReversed: ["专制", "操纵", "残酷", "缺乏情感"],
    meaningUpright:
      "宝剑国王象征智慧的权威、理性的判断和对真理的追求。他公正、有道德,能够做出明智的决定。这张牌鼓励你用逻辑和正直领导,坚持高道德标准。",
    meaningReversed:
      "逆位可能表示专制、操纵或过度理性缺乏情感。需要在理性和同情之间找到平衡,避免冷酷无情。",
    image: "/tarot-images/minor/swords/swords-14.jpg",
  },

  // ==================== 小阿尔卡纳 - 星币 (14张) ====================
  {
    id: "pentacles-01",
    name: "星币王牌",
    nameEn: "Ace of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 1,
    keywordsUpright: ["新机会", "繁荣", "物质开始", "显化", "富足"],
    keywordsReversed: ["错失机会", "贪婪", "缺乏计划", "不稳定"],
    meaningUpright:
      "星币王牌代表新的物质机会、繁荣和显化。这是开始新事业、投资或物质项目的绝佳时机。抓住这个机会,为未来的富足奠定基础。",
    meaningReversed:
      "逆位可能表示错失机会、贪婪或缺乏实际计划。需要更务实地处理财务和物质目标。",
    image: "/tarot-images/minor/pentacles/pentacles-01.jpg",
  },
  {
    id: "pentacles-02",
    name: "星币二",
    nameEn: "Two of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 2,
    keywordsUpright: ["平衡", "适应性", "多任务", "灵活", "优先级"],
    keywordsReversed: ["失衡", "不堪重负", "混乱", "缺乏组织"],
    meaningUpright:
      "星币二象征平衡多个责任、灵活应对变化。生活可能忙碌,但你有能力巧妙处理。这张牌鼓励你保持灵活,设定优先级,享受平衡的舞蹈。",
    meaningReversed:
      "逆位可能表示失去平衡、感到不堪重负或缺乏组织。需要重新评估优先级,简化生活。",
    image: "/tarot-images/minor/pentacles/pentacles-02.jpg",
  },
  {
    id: "pentacles-03",
    name: "星币三",
    nameEn: "Three of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 3,
    keywordsUpright: ["团队合作", "技能", "学习", "建设", "合作"],
    keywordsReversed: ["缺乏合作", "学习不足", "质量低", "不和谐"],
    meaningUpright:
      "星币三代表团队合作、技能发展和协作建设。通过合作和学习,可以创造高质量的成果。这张牌鼓励你重视每个人的贡献,共同努力。",
    meaningReversed:
      "逆位可能表示团队不和谐、缺乏合作或技能不足。需要改善沟通,学习新技能,提高质量。",
    image: "/tarot-images/minor/pentacles/pentacles-03.jpg",
  },
  {
    id: "pentacles-04",
    name: "星币四",
    nameEn: "Four of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 4,
    keywordsUpright: ["控制", "安全", "保守", "节约", "占有欲"],
    keywordsReversed: ["贪婪", "物质主义", "自私", "释放控制"],
    meaningUpright:
      "星币四象征对物质和资源的控制、对安全的需求。虽然谨慎是明智的,但过度控制可能阻碍成长。这张牌提醒你在安全和慷慨之间找到平衡。",
    meaningReversed:
      "逆位可能表示过度贪婪、物质主义或开始释放控制。需要重新评估物质与精神的平衡。",
    image: "/tarot-images/minor/pentacles/pentacles-04.jpg",
  },
  {
    id: "pentacles-05",
    name: "星币五",
    nameEn: "Five of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 5,
    keywordsUpright: ["经济困难", "贫穷", "孤立", "担忧", "挣扎"],
    keywordsReversed: ["恢复", "改善", "接受帮助", "希望"],
    meaningUpright:
      "星币五代表经济困难、物质或精神上的贫穷感。虽然艰难,但帮助往往比你想象的更近。这张牌鼓励你寻求支持,不要独自承受困难。",
    meaningReversed:
      "逆位可能表示情况改善、准备接受帮助或从困境中恢复。最艰难的时期正在过去。",
    image: "/tarot-images/minor/pentacles/pentacles-05.jpg",
  },
  {
    id: "pentacles-06",
    name: "星币六",
    nameEn: "Six of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 6,
    keywordsUpright: ["慷慨", "给予", "接受", "平衡", "慈善"],
    keywordsReversed: ["债务", "不平等", "自私", "单方面"],
    meaningUpright:
      "星币六象征慷慨、给予和接受的平衡。无论你是给予者还是接受者,都要保持感激和公平。这张牌鼓励你分享你的富足,也要允许自己接受帮助。",
    meaningReversed:
      "逆位可能表示不平等的关系、债务或自私。需要重新建立平衡,确保交换是公平和相互的。",
    image: "/tarot-images/minor/pentacles/pentacles-06.jpg",
  },
  {
    id: "pentacles-07",
    name: "星币七",
    nameEn: "Seven of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 7,
    keywordsUpright: ["耐心", "长期投资", "等待", "评估", "坚持"],
    keywordsReversed: ["不耐烦", "缺乏远见", "失望", "放弃"],
    meaningUpright:
      "星币七代表耐心等待努力的成果、长期投资和评估进展。虽然还没看到全部回报,但你走在正确的道路上。这张牌鼓励你保持耐心,继续努力。",
    meaningReversed:
      "逆位可能表示不耐烦、对进展失望或考虑放弃。需要重新评估策略,但不要过早放弃。",
    image: "/tarot-images/minor/pentacles/pentacles-07.jpg",
  },
  {
    id: "pentacles-08",
    name: "星币八",
    nameEn: "Eight of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 8,
    keywordsUpright: ["勤奋", "技能", "专注", "学徒", "精通"],
    keywordsReversed: ["完美主义", "缺乏专注", "敷衍", "学习不足"],
    meaningUpright:
      "星币八象征勤奋、专注于技能发展和对工艺的投入。通过持续的努力和学习,你正在走向精通。这张牌鼓励你享受学习过程,投入必要的时间。",
    meaningReversed:
      "逆位可能表示完美主义、缺乏专注或敷衍了事。需要重新找回对工作的热情,避免极端。",
    image: "/tarot-images/minor/pentacles/pentacles-08.jpg",
  },
  {
    id: "pentacles-09",
    name: "星币九",
    nameEn: "Nine of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 9,
    keywordsUpright: ["独立", "成功", "富足", "享受", "自给自足"],
    keywordsReversed: ["过度工作", "缺乏独立", "物质损失", "依赖"],
    meaningUpright:
      "星币九代表独立、自给自足和享受努力的成果。你创造了富足和舒适,可以享受你所建立的。这张牌鼓励你庆祝成就,享受独立带来的自由。",
    meaningReversed:
      "逆位可能表示过度工作、缺乏独立或物质上的挫折。需要在工作和享受之间找到平衡,建立真正的自给自足。",
    image: "/tarot-images/minor/pentacles/pentacles-09.jpg",
  },
  {
    id: "pentacles-10",
    name: "星币十",
    nameEn: "Ten of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 10,
    keywordsUpright: ["财富", "遗产", "家庭", "传统", "长期成功"],
    keywordsReversed: ["财务损失", "家庭冲突", "不稳定", "短视"],
    meaningUpright:
      "星币十象征长期的财富、家族遗产和持久的成功。这不仅是个人的富足,更是可以传承的稳定和安全。这张牌鼓励你建立持久的基础,为未来代代造福。",
    meaningReversed:
      "逆位可能表示财务不稳定、家庭冲突或短期思维。需要关注长期稳定,修复家庭关系。",
    image: "/tarot-images/minor/pentacles/pentacles-10.jpg",
  },
  {
    id: "pentacles-11",
    name: "星币侍从",
    nameEn: "Page of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 11,
    keywordsUpright: ["机会", "学习", "显化", "好消息", "新项目"],
    keywordsReversed: ["拖延", "缺乏进展", "坏消息", "不切实际"],
    meaningUpright:
      "星币侍从代表新的物质机会、学习实用技能或开始新项目。这是专注、努力工作和将梦想变为现实的时刻。保持专注和实际。",
    meaningReversed:
      "逆位可能表示拖延、缺乏实际行动或不切实际的计划。需要更务实地处理机会,避免空想。",
    image: "/tarot-images/minor/pentacles/pentacles-11.jpg",
  },
  {
    id: "pentacles-12",
    name: "星币骑士",
    nameEn: "Knight of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 12,
    keywordsUpright: ["勤奋", "可靠", "务实", "坚持", "责任"],
    keywordsReversed: ["懒惰", "完美主义", "停滞", "保守过度"],
    meaningUpright:
      "星币骑士象征勤奋、可靠和务实的方法。虽然进展可能缓慢,但稳定而确定。这张牌鼓励你保持专注,履行责任,用实际行动达成目标。",
    meaningReversed:
      "逆位可能表示懒惰、过度完美主义或停滞不前。需要在谨慎和行动之间找到平衡,避免拖延。",
    image: "/tarot-images/minor/pentacles/pentacles-12.jpg",
  },
  {
    id: "pentacles-13",
    name: "星币王后",
    nameEn: "Queen of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 13,
    keywordsUpright: ["滋养", "务实", "富足", "舒适", "安全"],
    keywordsReversed: ["自私", "嫉妒", "不安全感", "工作狂"],
    meaningUpright:
      "星币王后代表滋养、务实和创造舒适的能力。她富足、慷慨,能够平衡事业和家庭。这张牌鼓励你创造安全和舒适,同时保持实际和脚踏实地。",
    meaningReversed:
      "逆位可能表示过度物质主义、嫉妒或忽视自我照顾。需要在给予和接受之间找到平衡,不要失去自我。",
    image: "/tarot-images/minor/pentacles/pentacles-13.jpg",
  },
  {
    id: "pentacles-14",
    name: "星币国王",
    nameEn: "King of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 14,
    keywordsUpright: ["成功", "富足", "领导力", "安全", "务实"],
    keywordsReversed: ["贪婪", "物质主义", "顽固", "缺乏远见"],
    meaningUpright:
      "星币国王象征物质上的成功、务实的领导力和长期的富足。他稳定、可靠,能够创造持久的财富和安全。这张牌鼓励你用智慧管理资源,建立稳固的基础。",
    meaningReversed:
      "逆位可能表示贪婪、过度物质主义或顽固。需要在财富和精神之间找到平衡,避免让物质主义支配生活。",
    image: "/tarot-images/minor/pentacles/pentacles-14.jpg",
  },
];
