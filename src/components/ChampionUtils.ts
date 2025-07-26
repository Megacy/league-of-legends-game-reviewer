// Champion name to ID mapping for Community Dragon API
export const CHAMPION_ID_MAP: Record<string, number> = {
  'Jinx': 222, 'Tristana': 18, 'Ashe': 22, 'Thresh': 412, 'Zed': 238, 'Yasuo': 157,
  'Garen': 86, 'Lux': 99, 'Riven': 92, 'Lee Sin': 64, 'Ahri': 103, 'Katarina': 55,
  'Darius': 122, 'Draven': 119, 'Vayne': 67, 'Lucian': 236, 'Ezreal': 81, 'Caitlyn': 51,
  'Miss Fortune': 21, 'Jhin': 202, 'Kai Sa': 145, 'Xayah': 498, 'Aphelios': 523,
  'Samira': 360, 'Viego': 234, 'Gwen': 887, 'Akshan': 166, 'Vex': 711, 'Zeri': 221,
  'Renata Glasc': 888, 'Bel Veth': 200, 'Nilah': 895, 'K Sante': 897, 'Naafiri': 950,
  'Briar': 233, 'Hwei': 910, 'Smolder': 901, 'Aurora': 893, 'Ambessa': 799,
  // Add more champions as needed - these are the most common ones
  'Aatrox': 266, 'Akali': 84, 'Alistar': 12, 'Ammu': 32, 'Anivia': 34, 'Annie': 1,
  'Azir': 268, 'Bard': 432, 'Blitzcrank': 53, 'Brand': 63, 'Braum': 201, 'Camille': 164,
  'Cassiopeia': 69, 'Cho Gath': 31, 'Corki': 42, 'Diana': 131, 'Dr Mundo': 36,
  'Ekko': 245, 'Elise': 60, 'Evelynn': 28, 'Fiddlesticks': 9, 'Fiora': 114, 'Fizz': 105,
  'Galio': 3, 'Gangplank': 41, 'Gragas': 79, 'Graves': 104, 'Hecarim': 120, 'Heimerdinger': 74,
  'Illaoi': 420, 'Irelia': 39, 'Ivern': 427, 'Janna': 40, 'Jarvan IV': 59, 'Jax': 24,
  'Jayce': 126, 'Karthus': 30, 'Kassadin': 38, 'Kennen': 85, 'Kha Zix': 121, 'Kindred': 203,
  'Kled': 240, 'Kog Maw': 96, 'LeBlanc': 7, 'Leona': 89, 'Lissandra': 127, 'Malphite': 54,
  'Malzahar': 90, 'Maokai': 57, 'Master Yi': 11, 'Mordekaiser': 82, 'Morgana': 25,
  'Nami': 267, 'Nasus': 75, 'Nautilus': 111, 'Nidalee': 76, 'Nocturne': 56, 'Nunu': 20,
  'Olaf': 2, 'Orianna': 61, 'Ornn': 516, 'Pantheon': 80, 'Poppy': 78, 'Pyke': 555,
  'Qiyana': 246, 'Quinn': 133, 'Rakan': 497, 'Rammus': 33, 'Rek Sai': 421, 'Renekton': 58,
  'Rengar': 107, 'Rumble': 68, 'Ryze': 13, 'Sejuani': 113, 'Senna': 235, 'Seraphine': 147,
  'Sett': 875, 'Shaco': 35, 'Shen': 98, 'Shyvana': 102, 'Singed': 27, 'Sion': 14,
  'Sivir': 15, 'Skarner': 72, 'Sona': 37, 'Soraka': 16, 'Swain': 50, 'Sylas': 517,
  'Syndra': 134, 'Tahm Kench': 223, 'Taliyah': 163, 'Talon': 91, 'Taric': 44, 'Teemo': 17,
  'Twisted Fate': 4, 'Twitch': 29, 'Udyr': 77, 'Urgot': 6, 'Varus': 110, 'Vel Koz': 161,
  'Vi': 254, 'Viktor': 112, 'Vladimir': 8, 'Volibear': 106, 'Warwick': 19, 'Wukong': 62,
  'Xin Zhao': 5, 'Yorick': 83, 'Yuumi': 350, 'Zac': 154, 'Ziggs': 115, 'Zilean': 26,
  'Zoe': 142, 'Zyra': 143,
  // Additional missing champions based on user feedback
  'Aurelion Sol': 136, 'AurelionSol': 136, 'Yunara': 804 // Yunara is a new champion (2025)
};

// Function to get champion icon URL
export function getChampionIconUrl(championName: string): string {
  // Handle common name variations and clean up the name
  const cleanName = championName.replace(/'/g, '').replace(/\s+/g, ' ').trim();
  
  // Handle specific name mappings for champions with special characters or variations
  const nameMap: Record<string, string> = {
    'KaiSa': 'Kai Sa',
    'Kai Sa': 'Kai Sa',
    'LeBlanc': 'LeBlanc',
    'Cho Gath': 'Cho Gath',
    'Cho\'Gath': 'Cho Gath',
    'Dr. Mundo': 'Dr Mundo',
    'Jarvan IV': 'Jarvan IV',
    'Kha Zix': 'Kha Zix',
    'Kog Maw': 'Kog Maw',
    'Lee Sin': 'Lee Sin',
    'Master Yi': 'Master Yi',
    'Miss Fortune': 'Miss Fortune',
    'Rek Sai': 'Rek Sai',
    'Tahm Kench': 'Tahm Kench',
    'Twisted Fate': 'Twisted Fate',
    'Vel Koz': 'Vel Koz',
    'Xin Zhao': 'Xin Zhao',
    'Renata Glasc': 'Renata Glasc',
    'Bel Veth': 'Bel Veth',
    'K Sante': 'K Sante',
    // Handle specific champion name variations
    'Aurelian Sol': 'Aurelion Sol',
    'AurelianSol': 'Aurelion Sol',
    'Yunara': 'Yunara' // New champion (2025) - separate from Yuumi
  };
  
  const mappedName = nameMap[cleanName] || cleanName;
  const championId = CHAMPION_ID_MAP[mappedName];
  
  if (championId) {
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`;
  }
  
  // If champion not found, try a fallback - use question mark icon or similar
  console.warn(`Champion not found in mapping: "${championName}" (cleaned: "${cleanName}", mapped: "${mappedName}")`);
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/0.png`;
}
