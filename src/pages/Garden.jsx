import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { SHOP_ITEMS, ANIMAL_NAMES, ANIMAL_FACTS } from '../data/shopItems'

// ─── World size ───────────────────────────────────────────────────
const W = 4000
const H = 2500
const TREE_X = 1200
const TREE_Y = 930
const POND_CX = 490
const POND_CY = 1155

// ─── Ground cover data ────────────────────────────────────────────

// Grass tufts — covers y=875-1185 across full width, hill zone + main ground
const GRASS_TUFTS = [
  // Hill zone y≈875-1030 (sparser, appears distant)
  [90,882],[260,876],[440,888],[630,878],[810,892],[1000,880],[1190,888],[1380,876],
  [1560,890],[1750,880],[1940,888],[2120,878],[2310,890],[2500,880],[2690,888],
  [2880,878],[3070,892],[3260,880],[3450,888],[3640,878],[3830,892],[3970,880],
  [175,912],[355,920],[540,908],[720,920],[905,912],[1090,920],[1275,908],[1460,920],
  [1645,912],[1830,920],[2015,908],[2200,920],[2385,908],[2570,920],[2755,908],
  [2940,920],[3125,908],[3310,920],[3495,908],[3680,920],[3860,908],
  [60,948],[235,958],[415,946],[595,958],[775,946],[960,958],[1145,946],[1330,958],
  [1515,946],[1700,958],[1885,946],[2070,958],[2255,946],[2440,958],[2625,946],
  [2810,958],[2995,946],[3180,958],[3365,946],[3550,958],[3735,946],[3920,958],
  [120,982],[300,990],[480,978],[660,990],[840,978],[1025,990],[1210,978],[1395,990],
  [1580,978],[1765,990],[1950,978],[2135,990],[2320,978],[2505,990],[2690,978],
  [2875,990],[3060,978],[3245,990],[3430,978],[3615,990],[3800,978],[3985,990],
  [55,1016],[225,1024],[405,1012],[585,1024],[770,1012],[950,1024],[1135,1012],
  [1320,1024],[1505,1014],[1690,1024],[1875,1012],[2060,1024],[2245,1012],
  [2430,1024],[2615,1012],[2800,1024],[2985,1012],[3170,1024],[3355,1012],
  [3540,1024],[3725,1012],[3910,1024],
  // Main ground zone y≈1038-1185 (denser)
  [80,1042],[195,1054],[330,1040],[470,1056],[635,1042],[795,1054],[945,1040],
  [1065,1052],[1200,1040],[1345,1054],[1505,1040],[1665,1054],[1825,1040],
  [1985,1052],[2105,1040],[2255,1054],[2405,1042],[2565,1054],[2725,1040],
  [2875,1052],[3025,1040],[3175,1054],[3325,1040],[3475,1054],[3625,1040],
  [3775,1052],[3925,1040],
  [160,1070],[275,1082],[435,1068],[590,1080],[755,1068],[910,1080],[1065,1068],
  [1225,1080],[1405,1070],[1575,1080],[1745,1068],[1915,1080],[2085,1068],
  [2255,1080],[2425,1068],[2605,1080],[2775,1068],[2925,1080],[3075,1068],
  [3225,1080],[3375,1068],[3525,1080],[3675,1068],[3825,1080],[3975,1068],
  [115,1098],[280,1106],[450,1094],[620,1108],[790,1096],[965,1108],[1135,1094],
  [1315,1106],[1495,1094],[1675,1108],[1855,1096],[2030,1108],[2210,1094],
  [2390,1108],[2570,1094],[2750,1108],[2930,1094],[3105,1106],[3285,1094],
  [3465,1106],[3645,1094],[3825,1106],[3995,1094],
  [215,1128],[385,1136],[555,1122],[725,1136],[895,1124],[1075,1136],[1255,1124],
  [1435,1134],[1615,1124],[1795,1136],[1975,1124],[2155,1136],[2335,1124],
  [2515,1136],[2695,1124],[2875,1136],[3055,1124],[3235,1136],[3415,1124],
  [3595,1134],[3775,1124],[3955,1136],
  [315,1158],[485,1166],[655,1154],[825,1168],[995,1156],[1165,1168],[1345,1156],
  [1525,1166],[1705,1156],[1885,1166],[2065,1156],[2245,1166],[2425,1156],
  [2605,1166],[2785,1156],[2965,1166],[3145,1156],[3325,1166],[3505,1156],
  [3685,1164],[3865,1156],
]

// Tiny single-blade micro-grasses filling gaps across y=870-1220
const MICRO_GRASS = [
  [40,878],[105,872],[172,882],[245,870],[318,882],[398,872],[478,882],[558,870],
  [638,882],[718,874],[800,882],[882,870],[965,882],[1048,872],[1130,882],
  [1210,870],[1292,882],[1374,872],[1456,882],[1538,870],[1620,882],[1702,872],
  [1784,882],[1866,870],[1948,882],[2030,872],[2112,882],[2194,870],[2276,882],
  [2358,872],[2440,882],[2522,870],[2604,882],[2686,872],[2768,882],[2850,870],
  [2932,882],[3014,872],[3096,882],[3178,870],[3260,882],[3342,872],[3424,882],
  [3506,870],[3588,882],[3670,872],[3752,882],[3834,870],[3916,882],[3990,872],
  [62,916],[130,908],[202,918],[278,908],[355,918],[435,908],[515,918],[598,908],
  [680,918],[762,908],[846,918],[930,908],[1014,918],[1098,908],[1182,918],
  [1266,908],[1350,918],[1434,908],[1518,918],[1602,908],[1686,918],[1770,908],
  [1854,918],[1938,908],[2022,918],[2106,908],[2190,918],[2274,908],[2358,918],
  [2442,908],[2526,918],[2610,908],[2694,918],[2778,908],[2862,918],[2946,908],
  [3030,918],[3114,908],[3198,918],[3282,908],[3366,918],[3450,908],[3534,918],
  [3618,908],[3702,918],[3786,908],[3870,918],[3954,908],
  [45,1036],[110,1048],[178,1036],[248,1048],[320,1036],[395,1048],[470,1036],
  [548,1048],[626,1036],[704,1048],[782,1036],[862,1048],[942,1036],[1022,1048],
  [1102,1036],[1182,1048],[1262,1036],[1342,1048],[1422,1036],[1502,1048],
  [1582,1036],[1662,1048],[1742,1036],[1822,1048],[1902,1036],[1982,1048],
  [2062,1036],[2142,1048],[2222,1036],[2302,1048],[2382,1036],[2462,1048],
  [2542,1036],[2622,1048],[2702,1036],[2782,1048],[2862,1036],[2942,1048],
  [3022,1036],[3102,1048],[3182,1036],[3262,1048],[3342,1036],[3422,1048],
  [3502,1036],[3582,1048],[3662,1036],[3742,1048],[3822,1036],[3902,1048],[3978,1036],
  [52,1088],[120,1098],[192,1086],[265,1098],[340,1086],[418,1098],[498,1086],
  [578,1096],[660,1086],[742,1096],[825,1086],[908,1096],[992,1086],[1076,1096],
  [1160,1086],[1244,1096],[1328,1086],[1412,1096],[1496,1086],[1580,1096],
  [1664,1086],[1748,1096],[1832,1086],[1916,1096],[2000,1086],[2084,1096],
  [2168,1086],[2252,1096],[2336,1086],[2420,1096],[2504,1086],[2588,1096],
  [2672,1086],[2756,1096],[2840,1086],[2924,1096],[3008,1086],[3092,1096],
  [3176,1086],[3260,1096],[3344,1086],[3428,1096],[3512,1086],[3596,1096],
  [3680,1086],[3764,1096],[3848,1086],[3932,1096],
  [78,1140],[150,1150],[225,1140],[300,1150],[378,1140],[458,1150],[540,1140],
  [620,1150],[702,1140],[785,1150],[870,1140],[955,1150],[1040,1140],[1125,1150],
  [1210,1140],[1295,1150],[1380,1140],[1465,1150],[1550,1140],[1635,1150],
  [1720,1140],[1805,1150],[1890,1140],[1975,1150],[2060,1140],[2145,1150],
  [2230,1140],[2315,1150],[2400,1140],[2485,1150],[2570,1140],[2655,1150],
  [2740,1140],[2825,1150],[2910,1140],[2995,1150],[3080,1140],[3165,1150],
  [3250,1140],[3335,1150],[3420,1140],[3505,1150],[3590,1140],[3675,1150],
  [3760,1140],[3845,1150],[3930,1140],
  [90,1200],[168,1212],[248,1200],[328,1212],[410,1200],[494,1212],[580,1200],
  [665,1212],[750,1200],[838,1212],[925,1200],[1012,1210],[1100,1200],[1188,1210],
  [1276,1200],[1364,1210],[1452,1200],[1540,1210],[1628,1200],[1716,1210],
  [1804,1200],[1892,1210],[1980,1200],[2068,1210],[2156,1200],[2244,1210],
  [2332,1200],[2420,1210],[2508,1200],[2596,1210],[2684,1200],[2772,1210],
  [2860,1200],[2948,1210],[3036,1200],[3124,1210],[3212,1200],[3300,1210],
  [3388,1200],[3476,1210],[3564,1200],[3652,1210],[3740,1200],[3828,1210],[3916,1200],
]

const GRASS_PATCHES_DARK = [
  // Hill zone (y≈875-1020)
  [320,882,110,24],[820,878,100,22],[1320,882,115,23],[1820,878,108,22],
  [2320,882,112,23],[2820,878,104,22],[3320,882,110,23],[3820,878,105,22],
  [570,916,98,20],[1080,912,106,21],[1580,918,100,20],[2080,912,108,21],
  [2580,918,102,20],[3080,912,108,21],[3580,918,100,20],
  [200,948,90,19],[700,942,98,20],[1200,948,86,19],[1700,942,94,20],
  [2200,948,90,19],[2700,942,96,20],[3200,948,88,19],[3700,942,92,20],
  // Main zone
  [200,1072,88,19],[510,1058,74,17],[870,1078,88,21],[1120,1062,72,16],
  [1470,1075,92,20],[1780,1058,80,18],[2080,1078,76,20],[2380,1062,88,18],
  [2680,1075,72,22],[2980,1058,92,18],[3280,1078,76,20],[3580,1062,88,18],[3880,1075,72,22],
  [440,1106,84,18],[960,1098,90,20],[1460,1108,78,18],[1960,1098,86,20],
  [2460,1108,82,18],[2960,1098,90,20],[3460,1108,84,18],[3940,1098,78,18],
  [280,1140,92,20],[780,1132,86,18],[1280,1142,80,18],[1780,1132,90,20],
  [2280,1142,84,18],[2780,1132,90,20],[3280,1142,86,18],[3780,1132,80,18],
]
const GRASS_PATCHES_LIGHT = [
  // Hill zone
  [170,890,92,18],[680,884,86,17],[1180,890,94,18],[1680,884,90,17],
  [2180,890,88,18],[2680,884,92,17],[3180,890,86,18],[3680,884,90,17],
  [430,924,82,16],[930,918,88,17],[1430,924,84,16],[1930,918,90,17],
  [2430,924,86,16],[2930,918,84,17],[3430,924,88,16],[3930,918,82,17],
  [280,956,86,15],[780,950,80,16],[1280,956,88,15],[1780,950,84,16],
  [2280,956,82,15],[2780,950,88,16],[3280,956,84,15],[3780,950,80,16],
  // Main zone
  [360,1052,78,14],[700,1066,72,15],[1020,1050,88,17],[1330,1062,76,14],
  [1620,1052,82,17],[1930,1066,72,15],[2230,1050,88,17],[2530,1062,76,14],
  [2830,1052,80,15],[3130,1066,72,17],[3430,1050,88,14],[3730,1062,76,15],
  [520,1092,80,15],[1020,1098,76,14],[1520,1090,82,15],[2020,1098,78,14],
  [2520,1090,84,15],[3020,1098,78,14],[3520,1092,82,15],[3980,1096,72,14],
  [380,1130,86,16],[880,1122,80,15],[1380,1130,84,16],[1880,1122,88,15],
  [2380,1130,82,16],[2880,1122,86,15],[3380,1130,80,16],[3880,1122,84,15],
]

// ─── Flowers ─────────────────────────────────────────────────────
const DAISIES = [
  // Hill zone y≈920-1020
  [340,928],[640,936],[940,924],[1240,936],[1540,926],[1840,936],[2140,926],
  [2440,936],[2740,926],[3040,934],[3340,926],[3640,934],[3940,926],
  [180,962],[480,970],[780,958],[1080,970],[1380,958],[1680,968],[1980,958],
  [2280,968],[2580,958],[2880,970],[3180,958],[3480,968],[3780,958],
  [520,998],[820,1006],[1120,996],[1420,1006],[1720,996],[2020,1006],[2320,996],
  [2620,1006],[2920,996],[3220,1004],[3520,996],[3820,1004],
  // Main zone
  [1060,1078],[1110,1094],[1170,1074],[1230,1096],[1270,1080],[1310,1064],[1360,1094],
  [230,1080],[360,1094],[490,1066],[600,1088],[710,1074],[780,1096],[880,1080],
  [940,1074],[1000,1096],
  [1460,1088],[1570,1074],[1700,1096],[1820,1080],[1940,1064],[2070,1088],[2200,1074],
  [2320,1096],[2460,1080],[2600,1064],[2740,1088],[2880,1074],[3010,1096],[3160,1080],
  [3290,1064],[3430,1088],[3570,1074],[3710,1096],[3850,1080],[3960,1064],
  [510,1142],[820,1152],[1120,1145],[1420,1152],[1720,1142],[2020,1152],
  [2320,1142],[2620,1152],[2920,1142],[3220,1152],[3520,1142],[3820,1152],
]
const DANDELIONS = [
  // Hill zone
  [260,934],[560,942],[860,932],[1160,942],[1460,932],[1760,942],[2060,932],
  [2360,942],[2660,932],[2960,940],[3260,932],[3560,940],[3860,932],
  [400,968],[700,978],[1000,966],[1300,978],[1600,966],[1900,976],[2200,966],
  [2500,976],[2800,966],[3100,978],[3400,966],[3700,976],
  [540,1004],[840,1012],[1140,1002],[1440,1012],[1740,1002],[2040,1010],[2340,1002],
  [2640,1010],[2940,1002],[3240,1010],[3540,1002],[3840,1010],
  // Main zone
  [920,1080],[980,1068],[1050,1088],[1130,1076],[1310,1084],
  [290,1096],[400,1074],[530,1092],[670,1076],[800,1096],
  [1490,1080],[1630,1066],[1770,1090],[1900,1074],[2030,1090],
  [2220,1076],[2400,1090],[2580,1074],[2760,1096],[2940,1080],
  [3120,1074],[3300,1090],[3480,1076],[3660,1096],[3840,1080],
  [450,1148],[740,1160],[1040,1144],[1340,1160],[1640,1148],[1940,1160],
  [2240,1144],[2540,1160],[2840,1148],[3140,1160],[3440,1144],
]
const POPPIES = [
  // Hill zone
  [480,956],[980,964],[1480,954],[1980,964],[2480,954],[2980,964],[3480,954],[3880,964],
  [620,1004],[1120,1012],[1620,1002],[2120,1010],[2620,1002],[3120,1010],[3620,1002],
  // Main zone
  [870,1070],[930,1088],[990,1074],
  [1090,1083],[1210,1068],[1350,1088],
  [1620,1074],[1830,1088],[2030,1074],[2270,1088],
  [2520,1074],[2780,1088],[3020,1074],[3270,1088],
  [3520,1074],[3770,1088],
  [410,1088],[660,1074],[1730,1148],[2130,1152],[2630,1148],[3130,1152],[3630,1148],
]
const LAVENDER = [
  // Hill zone
  [420,938],[920,944],[1420,936],[1920,944],[2420,936],[2920,944],[3420,936],[3920,944],
  [680,1000],[1180,1006],[1680,998],[2180,1006],[2680,998],[3180,1004],[3680,998],
  // Main zone
  [300,1080],[570,1090],[860,1074],[1390,1090],[1670,1074],
  [2020,1088],[2370,1074],[2780,1090],[3220,1074],[3670,1088],
  [140,1148],[440,1156],[740,1148],[1040,1156],[1340,1148],[1640,1156],
  [1940,1148],[2240,1156],[2540,1148],[2840,1156],[3140,1148],[3440,1154],[3740,1148],
]
const CLOVER = [
  [150,1060],[320,1072],[500,1056],[680,1072],[860,1060],[1040,1074],[1220,1062],
  [1400,1074],[1580,1062],[1760,1074],[1940,1062],[2120,1074],[2300,1064],
  [2480,1074],[2660,1064],[2840,1074],[3020,1064],[3200,1074],[3380,1064],
  [3560,1072],[3740,1064],[3920,1072],
  [240,1108],[440,1120],[640,1106],[840,1120],[1040,1108],[1240,1120],[1440,1108],
  [1640,1120],[1840,1108],[2040,1120],[2240,1108],[2440,1120],[2640,1108],
  [2840,1120],[3040,1108],[3240,1118],[3440,1108],[3640,1118],[3840,1108],
  [360,1152],[760,1160],[1160,1150],[1560,1160],[1960,1150],[2360,1158],
  [2760,1150],[3160,1158],[3560,1150],[3880,1158],
]
const BUTTERCUP = [
  [270,1066],[610,1080],[970,1068],[1330,1080],[1690,1068],[2050,1080],
  [2410,1068],[2770,1080],[3130,1068],[3490,1080],[3850,1068],
  [430,1110],[790,1122],[1150,1110],[1510,1122],[1870,1110],[2230,1122],
  [2590,1110],[2950,1122],[3310,1110],[3670,1120],
  [560,1150],[960,1162],[1360,1150],[1760,1160],[2160,1150],[2560,1160],
  [2960,1150],[3360,1160],[3760,1150],
  [340,946],[840,952],[1340,944],[1840,952],[2340,944],[2840,952],[3340,944],[3840,952],
]
const FORGET_ME_NOT = [
  [380,1074],[720,1086],[1060,1074],[1400,1086],[1740,1076],[2080,1086],
  [2420,1076],[2760,1086],[3100,1076],[3440,1084],[3780,1076],
  [520,1118],[860,1130],[1200,1120],[1540,1130],[1880,1120],[2220,1128],
  [2560,1120],[2900,1128],[3240,1120],[3580,1128],[3900,1120],
  [660,1158],[1060,1168],[1460,1158],[1860,1168],[2260,1158],[2660,1166],
  [3060,1158],[3460,1166],[3860,1158],
  [280,940],[780,948],[1280,938],[1780,948],[2280,938],[2780,948],[3280,938],[3780,948],
  [520,974],[1020,982],[1520,972],[2020,982],[2520,972],[3020,980],[3520,972],[3920,980],
]
const ROCKS = [
  [660,1092,18,11],[1060,1068,14,9],[1920,1082,16,10],
  [2220,1074,15,9],[2720,1088,13,8],[3280,1078,16,9],[3760,1068,14,8],
  [480,1120,12,7],[1380,1108,15,8],[2080,1118,13,7],[2780,1108,14,8],[3480,1118,12,7],
]

// ─── Berry positions on tree ──────────────────────────────────────
const BERRY_POSITIONS = [
  [-68,-148],[-55,-160],[-76,-158],[-44,-170],[-58,-172],
  [2,-182],[14,-174],[-12,-185],
  [46,-165],[58,-158],[50,-173],
  [72,-148],[82,-158],
  [28,-152],[38,-160],
]

// ─── SVG Defs: gradients + all keyframe animations ────────────────
function SvgDefs() {
  return (
    <defs>
      <style>{`
        @keyframes treeSway {
          from { transform: rotate(-1.1deg); }
          to   { transform: rotate(1.1deg); }
        }
        @keyframes waterPulse {
          0%,100% { opacity: 0.55; }
          50%     { opacity: 0.85; }
        }
        @keyframes flowerSway {
          from { transform: rotate(-4deg); transform-origin: center bottom; }
          to   { transform: rotate(4deg);  transform-origin: center bottom; }
        }
        @keyframes smokeRise {
          0%   { transform: translateY(0)    scaleX(1);   opacity: 0.6; }
          100% { transform: translateY(-60px) scaleX(1.8); opacity: 0; }
        }
        @keyframes reedSway {
          from { transform: rotate(-3deg); transform-origin: center bottom; }
          to   { transform: rotate(3deg);  transform-origin: center bottom; }
        }
        @keyframes dragonFlyHover {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-12px); }
        }
        .tree-group {
          transform-origin: ${TREE_X}px ${TREE_Y}px;
          animation: treeSway 4.5s ease-in-out infinite alternate;
        }
        .water-shimmer   { animation: waterPulse 3s ease-in-out infinite; }
        .flower-sway     { animation: flowerSway 3.5s ease-in-out infinite alternate; }
        .flower-sway-2   { animation: flowerSway 4.2s ease-in-out infinite alternate; animation-delay:-1s; }
        .smoke-1         { animation: smokeRise 4s ease-out infinite; }
        .smoke-2         { animation: smokeRise 4s ease-out infinite; animation-delay:-1.3s; }
        .smoke-3         { animation: smokeRise 4s ease-out infinite; animation-delay:-2.6s; }
        .reed-sway       { animation: reedSway 2.8s ease-in-out infinite alternate; }
        .reed-sway-2     { animation: reedSway 3.5s ease-in-out infinite alternate; animation-delay:-1.2s; }
        .dragonfly       { animation: dragonFlyHover 2.5s ease-in-out infinite; }
      `}</style>

      {/* Sky — userSpaceOnUse keeps gradient tied to world coords on the huge bg rect */}
      <linearGradient id="g-sky" x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#5BBCF0"/>
        <stop offset="60%"  stopColor="#87CEEB"/>
        <stop offset="100%" stopColor="#B8E4FF"/>
      </linearGradient>

      {/* Mountains */}
      <linearGradient id="g-mtFar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#D6DEE2"/>
        <stop offset="100%" stopColor="#B0BEC5"/>
      </linearGradient>
      <linearGradient id="g-mtMid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#B0BEC5"/>
        <stop offset="100%" stopColor="#90A4AE"/>
      </linearGradient>
      <linearGradient id="g-mtNear" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#8FA8AF"/>
        <stop offset="100%" stopColor="#78909C"/>
      </linearGradient>

      {/* Hills */}
      <linearGradient id="g-hillBack" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#81C784"/>
        <stop offset="100%" stopColor="#66BB6A"/>
      </linearGradient>
      <linearGradient id="g-hillMid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#66BB6A"/>
        <stop offset="100%" stopColor="#4CAF50"/>
      </linearGradient>
      <linearGradient id="g-hillFront" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#4CAF50"/>
        <stop offset="100%" stopColor="#2E7D32"/>
      </linearGradient>

      {/* Pond */}
      <radialGradient id="g-pond" cx="45%" cy="45%" r="55%">
        <stop offset="0%"   stopColor="#1565C0"/>
        <stop offset="60%"  stopColor="#1E88E5"/>
        <stop offset="100%" stopColor="#42A5F5"/>
      </radialGradient>

      {/* Tree trunk */}
      <linearGradient id="g-trunk" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stopColor="#3E2723"/>
        <stop offset="40%"  stopColor="#6D4C41"/>
        <stop offset="100%" stopColor="#4E342E"/>
      </linearGradient>

      {/* Animal */}
      <linearGradient id="g-cow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#FAFAFA"/>
        <stop offset="100%" stopColor="#ECEFF1"/>
      </linearGradient>
      <linearGradient id="g-horse" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stopColor="#A0522D"/>
        <stop offset="100%" stopColor="#6D3B1A"/>
      </linearGradient>
      <linearGradient id="g-sheep" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#FFFFFF"/>
        <stop offset="100%" stopColor="#ECEFF1"/>
      </linearGradient>
      <linearGradient id="g-goat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#BDBDBD"/>
        <stop offset="100%" stopColor="#9E9E9E"/>
      </linearGradient>
      <linearGradient id="g-leg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#9E9E9E"/>
        <stop offset="100%" stopColor="#616161"/>
      </linearGradient>

      {/* Farm buildings */}
      <linearGradient id="g-barn" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#D32F2F"/>
        <stop offset="100%" stopColor="#B71C1C"/>
      </linearGradient>
      <linearGradient id="g-roof" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#4A148C"/>
        <stop offset="100%" stopColor="#311B92"/>
      </linearGradient>

      {/* Filters */}
      <filter id="g-shadow" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow dx="3" dy="6" stdDeviation="5" floodColor="#1a3300" floodOpacity="0.25"/>
      </filter>
      <filter id="g-lightShadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="1" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.15"/>
      </filter>
      <filter id="g-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="4" in="SourceGraphic" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="g-blur" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="9"/>
      </filter>
      <filter id="g-softBlur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4"/>
      </filter>
    </defs>
  )
}

// ─── Sky: full-height backdrop + fluffy clouds + sun + birds ─────
function Sky() {
  const clouds = [
    { x: 180,  y: 155, circles: [[0,0,55],[60,-18,48],[120,-5,52],[178,5,42],[230,10,36]], delay: '0s',    dur: '95s'  },
    { x: 900,  y: 105, circles: [[0,0,42],[50,-14,38],[100,-2,42],[148,8,32]],              delay: '-38s',  dur: '130s' },
    { x: 2100, y: 130, circles: [[0,0,60],[65,-20,52],[130,-6,56],[195,8,44],[248,14,36]],  delay: '-65s',  dur: '88s'  },
    { x: 3200, y: 118, circles: [[0,0,48],[55,-16,42],[110,-2,46],[162,10,36]],             delay: '-22s',  dur: '110s' },
  ]
  const birds = [
    { y: 148, dur: '68s',  begin: '0s'   },
    { y: 108, dur: '95s',  begin: '-30s' },
    { y: 168, dur: '52s',  begin: '-20s' },
    { y: 130, dur: '80s',  begin: '-55s' },
  ]
  return (
    <>
      {/* Huge rect — covers any area visible at low zoom, matches outer div gradient */}
      <rect x="-6000" y="-6000" width="16000" height="16000" fill="url(#g-sky)"/>

      {/* Sun */}
      <circle cx="3100" cy="115" r="75" fill="#FFF9C4" opacity="0.88" filter="url(#g-glow)"/>
      <circle cx="3100" cy="115" r="58" fill="#FFF59D"/>

      {/* Fluffy clouds */}
      {clouds.map((cloud, ci) => (
        <g key={ci}>
          <animateTransform attributeName="transform" type="translate"
            from={`-500 0`} to={`4500 0`}
            dur={cloud.dur} begin={cloud.delay} repeatCount="indefinite"/>
          <g transform={`translate(${cloud.x}, ${cloud.y})`} opacity="0.88">
            {cloud.circles.map(([cx, cy, r], i) => (
              <circle key={i} cx={cx} cy={cy} r={r} fill="white"/>
            ))}
          </g>
        </g>
      ))}

      {/* Birds (distant V-shapes drifting across sky) */}
      {birds.map((b, i) => (
        <g key={i}>
          <animateTransform attributeName="transform" type="translate"
            from={`-200 ${b.y}`} to={`4200 ${b.y}`}
            dur={b.dur} begin={b.begin} repeatCount="indefinite"/>
          <path d="M-20,-7 Q-10,0 0,0 Q10,0 20,-7"
            stroke="#546E7A" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7"/>
          <path d="M-14,-3 Q-7,2 0,2 Q7,2 14,-3"
            stroke="#546E7A" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.45"/>
        </g>
      ))}
    </>
  )
}

// ─── Mountains — 4 layers, smooth bezier curves, dramatic varied heights
function Mountains() {
  return (
    <>
      {/* Layer 0: extreme-far, hazy pale — tallest dramatic peaks reach y=140 */}
      <path d="
        M -2000,690
        C -1700,680 -1550,530 -1300,440
        C -1050,350 -900,500 -700,430
        C -500,360 -300,210 -100,175
        C 100,140 280,230 480,320
        C 680,410 820,450 1000,380
        C 1180,310 1350,185 1560,155
        C 1770,125 1970,210 2180,310
        C 2390,410 2560,460 2760,400
        C 2960,340 3120,200 3340,168
        C 3560,136 3780,250 3980,360
        C 4180,470 4380,510 4620,450
        C 4860,390 5100,280 5400,310
        C 5700,340 5900,440 6000,480
        L 6000,720 L -2000,720 Z"
        fill="#D0DCE8" opacity="0.46"/>

      {/* Layer 1: far — peaks y=240-440, smooth gentle profile */}
      <path d="
        M -2000,680
        C -1700,670 -1500,560 -1250,490
        C -1000,420 -820,540 -600,470
        C -380,400 -200,310 0,275
        C 200,240 370,320 600,385
        C 830,450 1000,410 1220,340
        C 1440,270 1620,200 1860,238
        C 2100,276 2280,410 2520,445
        C 2760,480 2960,420 3180,345
        C 3400,270 3600,215 3860,268
        C 4120,321 4360,450 4620,415
        C 4880,380 5150,310 6000,460
        L 6000,720 L -2000,720 Z"
        fill="url(#g-mtFar)" opacity="0.60"/>

      {/* Layer 2: mid — peaks y=380-550, stronger silhouette */}
      <path d="
        M -2000,690
        C -1700,682 -1480,610 -1200,558
        C -920,506 -720,590 -480,548
        C -240,506 -60,440 160,412
        C 380,384 540,450 760,488
        C 980,526 1120,476 1340,422
        C 1560,368 1760,320 1980,366
        C 2200,412 2380,504 2620,536
        C 2860,568 3060,512 3280,450
        C 3500,388 3720,356 3960,408
        C 4200,460 4460,548 4740,510
        C 5020,472 5300,408 6000,540
        L 6000,740 L -2000,740 Z"
        fill="url(#g-mtMid)" opacity="0.76"/>

      {/* Layer 3: near — peaks y=510-660, most defined */}
      <path d="
        M -2000,700
        C -1700,692 -1480,650 -1200,618
        C -920,586 -720,648 -480,634
        C -240,620 -60,572 160,548
        C 380,524 540,572 760,604
        C 980,636 1120,600 1340,558
        C 1560,516 1760,492 1980,528
        C 2200,564 2380,628 2620,648
        C 2860,668 3060,628 3280,584
        C 3500,540 3720,516 3960,562
        C 4200,608 4460,660 4740,626
        C 5020,592 5300,548 6000,630
        L 6000,760 L -2000,760 Z"
        fill="url(#g-mtNear)" opacity="0.90"/>

      {/* Snow caps on tallest peaks (layers 0 and 1) */}
      {[
        [-100,175,62],  [1560,155,68],  [3340,168,64],
        [1860,238,46],  [3180,345,34],
      ].map(([px,py,r],i)=>(
        <g key={i}>
          <ellipse cx={px} cy={py+r*0.55} rx={r*0.82} ry={r*0.42} fill="white" opacity="0.90"/>
          <ellipse cx={px} cy={py+r*0.3}  rx={r*0.45} ry={r*0.22} fill="white" opacity="0.70"/>
        </g>
      ))}
    </>
  )
}

// ─── Rolling hills (extended to 4000×2500) ───────────────────────
function Hills() {
  return (
    <>
      <path d="M-2000,760 Q-1000,730 0,740 Q350,750 750,740 Q1150,800 1550,720 Q1950,640 2350,710 Q2750,780 3150,740 Q3550,700 4000,740 Q4500,745 6000,760 L6000,3000 L-2000,3000 Z"
        fill="url(#g-hillBack)"/>
      <path d="M-2000,840 Q-1000,820 0,830 Q380,840 780,830 Q1180,880 1580,800 Q1980,720 2380,790 Q2780,860 3180,820 Q3580,780 4000,830 Q4500,836 6000,840 L6000,3000 L-2000,3000 Z"
        fill="url(#g-hillMid)"/>
      <path d="M-2000,920 Q-1000,910 0,915 Q550,875 1100,910 Q1650,945 2200,885 Q2750,825 3300,875 Q3650,900 4000,870 Q4500,880 6000,900 L6000,3000 L-2000,3000 Z"
        fill="url(#g-hillFront)"/>
    </>
  )
}

// ─── Grass tufts (varied shapes by index) ────────────────────────
const GrassTufts = memo(function GrassTufts() {
  return (
    <g>
      {GRASS_TUFTS.map(([gx,gy],i)=>{
        const sc = gy < 1000 ? 0.65 : gy < 1040 ? 0.82 : 1.0
        const t = i % 7
        return (
          <g key={i} transform={`translate(${gx},${gy}) scale(${sc})`}>
            {t < 3 ? (
              <>
                <line x1="0" y1="0" x2={-3-t} y2={-12-t*1.8} stroke="#2E7D32" strokeWidth="2" strokeLinecap="round"/>
                <line x1="0" y1="0" x2="0" y2={-16-t} stroke="#388E3C" strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="0" y1="0" x2={3+t} y2={-11-t*1.8} stroke="#43A047" strokeWidth="2" strokeLinecap="round"/>
                {t===0 && <line x1="0" y1="0" x2="-2" y2="-10" stroke="#1B5E20" strokeWidth="1.4" strokeLinecap="round"/>}
              </>
            ) : t === 3 ? (
              <>
                <line x1="-3" y1="0" x2="-5" y2="-10" stroke="#33691E" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="-1" y1="0" x2="-2" y2="-13" stroke="#388E3C" strokeWidth="2" strokeLinecap="round"/>
                <line x1="1"  y1="0" x2="2"  y2="-14" stroke="#43A047" strokeWidth="2.1" strokeLinecap="round"/>
                <line x1="3"  y1="0" x2="5"  y2="-10" stroke="#558B2F" strokeWidth="1.8" strokeLinecap="round"/>
              </>
            ) : t === 4 ? (
              <>
                <line x1="0" y1="0" x2="-5" y2="-19" stroke="#2E7D32" strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="0" y1="0" x2="1" y2="-23" stroke="#388E3C" strokeWidth="2.4" strokeLinecap="round"/>
                <line x1="0" y1="0" x2="5" y2="-18" stroke="#43A047" strokeWidth="2" strokeLinecap="round"/>
                <line x1="0" y1="0" x2="-2" y2="-14" stroke="#33691E" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="0" y1="0" x2="3" y2="-13" stroke="#558B2F" strokeWidth="1.5" strokeLinecap="round"/>
              </>
            ) : t === 5 ? (
              <>
                <line x1="0" y1="0" x2="-6" y2="-14" stroke="#43A047" strokeWidth="1.9" strokeLinecap="round"/>
                <line x1="0" y1="0" x2="-3" y2="-17" stroke="#388E3C" strokeWidth="2.1" strokeLinecap="round"/>
                <line x1="0" y1="0" x2="0"  y2="-15" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round"/>
              </>
            ) : (
              <>
                <line x1="0" y1="0" x2="-4" y2="-11" stroke="#2E7D32" strokeWidth="1.7" strokeLinecap="round"/>
                <line x1="0" y1="0" x2="0"  y2="-13" stroke="#388E3C" strokeWidth="2" strokeLinecap="round"/>
                <line x1="0" y1="0" x2="4"  y2="-11" stroke="#558B2F" strokeWidth="1.7" strokeLinecap="round"/>
                <line x1="0" y1="0" x2="-2" y2="-8"  stroke="#33691E" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="0" y1="0" x2="2"  y2="-8"  stroke="#43A047" strokeWidth="1.4" strokeLinecap="round"/>
              </>
            )}
          </g>
        )
      })}
    </g>
  )
})

// ─── Ground texture patches ───────────────────────────────────────
const GrassPatches = memo(function GrassPatches() {
  return (
    <g>
      {GRASS_PATCHES_DARK.map(([x,y,rx,ry],i)=>(
        <ellipse key={`d${i}`} cx={x} cy={y} rx={rx} ry={ry} fill="#2E7D32" opacity="0.25"/>
      ))}
      {GRASS_PATCHES_LIGHT.map(([x,y,rx,ry],i)=>(
        <ellipse key={`l${i}`} cx={x} cy={y} rx={rx} ry={ry} fill="#81C784" opacity="0.19"/>
      ))}
    </g>
  )
})

// ─── Micro single-blade grasses ──────────────────────────────────
const MicroGrass = memo(function MicroGrass() {
  return (
    <g opacity="0.72">
      {MICRO_GRASS.map(([gx,gy],i)=>{
        const h = 5 + (i % 4) * 1.5
        const lean = ((i % 5) - 2) * 1.6
        const col = i%3===0 ? '#388E3C' : i%3===1 ? '#43A047' : '#558B2F'
        return (
          <line key={i} x1={gx} y1={gy} x2={gx+lean} y2={gy-h}
            stroke={col} strokeWidth="1.1" strokeLinecap="round"/>
        )
      })}
    </g>
  )
})

// ─── Small wildflowers: clover, buttercup, forget-me-not ─────────
const SmallWildflowers = memo(function SmallWildflowers() {
  return (
    <g>
      {/* Clover — 3-leaf trefoil */}
      {CLOVER.map(([cx,cy],i)=>(
        <g key={`cl${i}`} transform={`translate(${cx},${cy})`}
           className={i%2===0?'flower-sway':'flower-sway-2'}>
          <line x1="0" y1="0" x2="0" y2="-10" stroke="#558B2F" strokeWidth="1.4" strokeLinecap="round"/>
          <ellipse cx="-4" cy="-11" rx="4" ry="2.8" fill="#66BB6A" opacity="0.88" transform="rotate(-30 -4 -11)"/>
          <ellipse cx="4"  cy="-11" rx="4" ry="2.8" fill="#81C784" opacity="0.88" transform="rotate(30 4 -11)"/>
          <ellipse cx="0"  cy="-15" rx="4" ry="2.8" fill="#66BB6A" opacity="0.88"/>
          {i%4===0 && <circle cx="0" cy="-18" r="2.5" fill="#E1BEE7" opacity="0.92"/>}
          {i%4===2 && <circle cx="0" cy="-18" r="2.5" fill="#F8BBD9" opacity="0.92"/>}
        </g>
      ))}

      {/* Buttercup — 5-petal yellow */}
      {BUTTERCUP.map(([bx,by],i)=>(
        <g key={`bt${i}`} transform={`translate(${bx},${by})`}
           className={i%2===0?'flower-sway':'flower-sway-2'}>
          <line x1="0" y1="0" x2="0" y2="-14" stroke="#558B2F" strokeWidth="1.5" strokeLinecap="round"/>
          <ellipse cx="-5" cy="-12" rx="4" ry="2.4" fill="#81C784" opacity="0.72" transform="rotate(-35 -5 -12)"/>
          <ellipse cx="5"  cy="-13" rx="4" ry="2.4" fill="#81C784" opacity="0.72" transform="rotate(35 5 -13)"/>
          {[0,72,144,216,288].map(a=>{
            const rad = a*Math.PI/180
            const ex = +(Math.cos(rad)*4.5).toFixed(1)
            const ey = +(-14+Math.sin(rad)*4.5).toFixed(1)
            return <ellipse key={a} cx={ex} cy={ey} rx="3.5" ry="2.8" fill="#FFEE58" opacity="0.93"
              transform={`rotate(${a} ${ex} ${ey})`}/>
          })}
          <circle cx="0" cy="-14" r="2.5" fill="#FFA000"/>
        </g>
      ))}

      {/* Forget-me-not — tiny blue 5-petal clusters */}
      {FORGET_ME_NOT.map(([fx,fy],i)=>(
        <g key={`fm${i}`} transform={`translate(${fx},${fy})`}>
          {[[-4,0],[2,-6],[-2,-11],[5,-4],[0,-15]].map(([ox,oy],j)=>(
            <g key={j} transform={`translate(${ox},${oy})`}>
              <line x1="0" y1="2" x2="0" y2="-8" stroke="#558B2F" strokeWidth="1.2" strokeLinecap="round"/>
              {[0,72,144,216,288].map(a=>{
                const rad = a*Math.PI/180
                const ex = +(Math.cos(rad)*2.8).toFixed(1)
                const ey = +(-8+Math.sin(rad)*2.8).toFixed(1)
                return <ellipse key={a} cx={ex} cy={ey} rx="2.5" ry="2"
                  fill={j%2===0?'#64B5F6':'#42A5F5'} opacity="0.9"
                  transform={`rotate(${a} ${ex} ${ey})`}/>
              })}
              <circle cx="0" cy="-8" r="1.4" fill="#FFF9C4"/>
            </g>
          ))}
        </g>
      ))}
    </g>
  )
})

// ─── Lily pad helper ──────────────────────────────────────────────
function LilyPad({ cx, cy, r, rot, hasFlower }) {
  const notch = 28 * Math.PI / 180
  const x1 = +(cx + r * Math.sin(-notch)).toFixed(1)
  const y1 = +(cy - r * Math.cos(-notch)).toFixed(1)
  const x2 = +(cx + r * Math.sin(notch)).toFixed(1)
  const y2 = +(cy - r * Math.cos(notch)).toFixed(1)
  return (
    <g transform={`rotate(${rot}, ${cx}, ${cy})`}>
      <path d={`M ${x1},${y1} A ${r},${r} 0 1,1 ${x2},${y2} L ${cx},${cy} Z`}
        fill="#2E7D32" opacity="0.9"/>
      <path d={`M ${x1},${y1} A ${r},${r} 0 1,1 ${x2},${y2} L ${cx},${cy} Z`}
        fill="none" stroke="#1B5E20" strokeWidth="1.2" opacity="0.5"/>
      {/* Vein */}
      <line x1={cx} y1={cy} x2={cx} y2={cy-r} stroke="#1B5E20" strokeWidth="1" opacity="0.4"/>
      {hasFlower && (
        <g transform={`translate(${cx},${cy-r*0.7})`}>
          {[0,60,120,180,240,300].map(a=>(
            <ellipse key={a}
              cx={Math.cos(a*Math.PI/180)*5} cy={Math.sin(a*Math.PI/180)*5}
              rx="4" ry="3" fill="white" opacity="0.92"
              transform={`rotate(${a} ${Math.cos(a*Math.PI/180)*5} ${Math.sin(a*Math.PI/180)*5})`}/>
          ))}
          <circle r="3.5" fill="#FDD835"/>
        </g>
      )}
    </g>
  )
}

// ─── Improved Pond ────────────────────────────────────────────────
function Pond() {
  const cx = POND_CX, cy = POND_CY
  return (
    <g>
      {/* Shore shadow */}
      <path d={`M ${cx-152},${cy} C ${cx-148},${cy-56} ${cx-80},${cy-108} ${cx-32},${cy-116}
        C ${cx+18},${cy-124} ${cx+68},${cy-120} ${cx+112},${cy-102}
        C ${cx+156},${cy-84} ${cx+192},${cy-46} ${cx+192},${cy}
        C ${cx+192},${cy+46} ${cx+148},${cy+88} ${cx+98},${cy+102}
        C ${cx+38},${cy+118} ${cx-28},${cy+124} ${cx-82},${cy+110}
        C ${cx-128},${cy+98} ${cx-152},${cy+54} ${cx-152},${cy} Z`}
        fill="#0D47A1" opacity="0.18" transform="translate(4,8)" filter="url(#g-softBlur)"/>

      {/* Pond water — irregular oval */}
      <path d={`M ${cx-150},${cy}
        C ${cx-146},${cy-54} ${cx-78},${cy-106} ${cx-30},${cy-114}
        C ${cx+20},${cy-122} ${cx+68},${cy-118} ${cx+110},${cy-100}
        C ${cx+152},${cy-82} ${cx+190},${cy-44} ${cx+190},${cy}
        C ${cx+190},${cy+44} ${cx+146},${cy+86} ${cx+96},${cy+100}
        C ${cx+36},${cy+116} ${cx-26},${cy+122} ${cx-80},${cy+108}
        C ${cx-126},${cy+96} ${cx-150},${cy+52} ${cx-150},${cy} Z`}
        fill="url(#g-pond)"/>

      {/* Shore ring */}
      <path d={`M ${cx-150},${cy}
        C ${cx-146},${cy-54} ${cx-78},${cy-106} ${cx-30},${cy-114}
        C ${cx+20},${cy-122} ${cx+68},${cy-118} ${cx+110},${cy-100}
        C ${cx+152},${cy-82} ${cx+190},${cy-44} ${cx+190},${cy}
        C ${cx+190},${cy+44} ${cx+146},${cy+86} ${cx+96},${cy+100}
        C ${cx+36},${cy+116} ${cx-26},${cy+122} ${cx-80},${cy+108}
        C ${cx-126},${cy+96} ${cx-150},${cy+52} ${cx-150},${cy} Z`}
        fill="none" stroke="#0D47A1" strokeWidth="3" opacity="0.4"/>

      {/* Surface shimmer */}
      <ellipse cx={cx-25} cy={cy-25} rx="68" ry="20" fill="white" className="water-shimmer" opacity="0.22"/>
      <ellipse cx={cx+40} cy={cy+18} rx="42" ry="12" fill="white" className="water-shimmer" opacity="0.15" style={{animationDelay:'-1.5s'}}/>
      <ellipse cx={cx-60} cy={cy+30} rx="28" ry="8" fill="white" className="water-shimmer" opacity="0.12" style={{animationDelay:'-0.8s'}}/>

      {/* Lily pads */}
      <LilyPad cx={cx+55}  cy={cy-20} r={24} rot={-15} hasFlower={true}/>
      <LilyPad cx={cx+20}  cy={cy+50} r={20} rot={40}  hasFlower={false}/>
      <LilyPad cx={cx-60}  cy={cy-15} r={18} rot={-30} hasFlower={true}/>
      <LilyPad cx={cx-30}  cy={cy+60} r={16} rot={20}  hasFlower={false}/>

      {/* Reeds on bank */}
      {[
        [cx-125,cy-38,'reed-sway'],
        [cx-138,cy-18,'reed-sway-2'],
        [cx-130,cy+10,'reed-sway'],
        [cx+155,cy-55,'reed-sway-2'],
        [cx+168,cy-35,'reed-sway'],
        [cx+162,cy-8,'reed-sway-2'],
      ].map(([rx,ry,cls],i)=>(
        <g key={i} className={cls}>
          <line x1={rx} y1={ry+42} x2={rx} y2={ry-32} stroke="#558B2F" strokeWidth="3.5" strokeLinecap="round"/>
          <ellipse cx={rx} cy={ry-32} rx="5" ry="13" fill="#795548"/>
          <ellipse cx={rx-1} cy={ry-40} rx="3" ry="5" fill="#8D6E63" opacity="0.7"/>
        </g>
      ))}

      {/* Frogs */}
      <g transform={`translate(${cx-108},${cy+72})`}>
        <ellipse cx="0" cy="0" rx="16" ry="10" fill="#388E3C"/>
        <ellipse cx="-4" cy="-5" rx="6" ry="8" fill="#43A047"/>
        <circle cx="-9" cy="-9" r="4.5" fill="#81C784"/>
        <circle cx="-8" cy="-9" r="2.8" fill="#1a1a1a"/>
        <circle cx="-7" cy="-10" r="1" fill="white"/>
        <circle cx="1"  cy="-9" r="4.5" fill="#81C784"/>
        <circle cx="2"  cy="-9" r="2.8" fill="#1a1a1a"/>
        <circle cx="3"  cy="-10" r="1" fill="white"/>
        <path d="M-5,-3 Q-2,-1 1,-3" stroke="#2E7D32" strokeWidth="1" fill="none"/>
        <path d="M-14,5 Q-24,9 -22,14" stroke="#2E7D32" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
        <path d="M12,5 Q22,9 20,14"   stroke="#2E7D32" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      </g>
      <g transform={`translate(${cx+130},${cy+55})`}>
        <ellipse cx="0" cy="0" rx="13" ry="8.5" fill="#2E7D32"/>
        <circle cx="-5" cy="-7" r="4" fill="#66BB6A"/>
        <circle cx="-4" cy="-7" r="2.5" fill="#1a1a1a"/>
        <circle cx="3"  cy="-8" r="4" fill="#66BB6A"/>
        <circle cx="4"  cy="-8" r="2.5" fill="#1a1a1a"/>
      </g>

      {/* Dragonfly */}
      <g className="dragonfly" transform={`translate(${cx+90},${cy-80})`}>
        <ellipse cx="0" cy="0" rx="24" ry="4.5" fill="#0D47A1" opacity="0.9"/>
        <ellipse cx="-5" cy="0" rx="5" ry="3" fill="#1565C0" opacity="0.8"/>
        <ellipse cx="-12" cy="-10" rx="20" ry="7.5" fill="rgba(178,235,242,0.72)" transform="rotate(-20 -12 -10)"/>
        <ellipse cx="12"  cy="-10" rx="20" ry="7.5" fill="rgba(178,235,242,0.72)" transform="rotate(20 12 -10)"/>
        <ellipse cx="-12" cy="8"   rx="17" ry="5.5" fill="rgba(178,235,242,0.62)" transform="rotate(15 -12 8)"/>
        <ellipse cx="12"  cy="8"   rx="17" ry="5.5" fill="rgba(178,235,242,0.62)" transform="rotate(-15 12 8)"/>
        <circle cx="-24" cy="0" r="5.5" fill="#1565C0"/>
        <circle cx="-27" cy="-2" r="2" fill="#81D4FA" opacity="0.8"/>
        <circle cx="-22" cy="-2" r="2" fill="#81D4FA" opacity="0.8"/>
      </g>
    </g>
  )
}

// ─── Wildflowers + Butterflies ────────────────────────────────────
const Flowers = memo(function Flowers() {
  return (
    <g>
      {/* Daisies */}
      {DAISIES.map(([fx,fy],i)=>(
        <g key={`d${i}`} transform={`translate(${fx},${fy})`}
           className={i%2===0?'flower-sway':'flower-sway-2'}>
          <line x1="0" y1="0" x2="0" y2="-20" stroke="#558B2F" strokeWidth="2"/>
          {[0,45,90,135,180,225,270,315].map(a=>(
            <ellipse key={a}
              cx={Math.cos(a*Math.PI/180)*9} cy={-20+Math.sin(a*Math.PI/180)*9}
              rx="4" ry="3" fill="white" opacity="0.92"
              transform={`rotate(${a} ${Math.cos(a*Math.PI/180)*9} ${-20+Math.sin(a*Math.PI/180)*9})`}/>
          ))}
          <circle cx="0" cy="-20" r="5" fill="#FDD835"/>
        </g>
      ))}

      {/* Dandelions */}
      {DANDELIONS.map(([fx,fy],i)=>(
        <g key={`dn${i}`} transform={`translate(${fx},${fy})`}
           className={i%2===0?'flower-sway-2':'flower-sway'}>
          <line x1="0" y1="0" x2="0" y2="-22" stroke="#558B2F" strokeWidth="2"/>
          <ellipse cx="-6" cy="-12" rx="6" ry="4" fill="#81C784" opacity="0.8" transform="rotate(-25 -6 -12)"/>
          <ellipse cx="6"  cy="-15" rx="6" ry="4" fill="#81C784" opacity="0.8" transform="rotate(25 6 -15)"/>
          <circle cx="0" cy="-22" r="8" fill="#FFF9C4" opacity="0.9" filter="url(#g-glow)"/>
          {[0,40,80,120,160,200,240,280,320].map(a=>(
            <circle key={a}
              cx={Math.cos(a*Math.PI/180)*9} cy={-22+Math.sin(a*Math.PI/180)*9}
              r="1.5" fill="#BDBDBD" opacity="0.8"/>
          ))}
        </g>
      ))}

      {/* Poppies */}
      {POPPIES.map(([fx,fy],i)=>(
        <g key={`p${i}`} transform={`translate(${fx},${fy})`}
           className={i%2===0?'flower-sway':'flower-sway-2'}>
          <line x1="0" y1="0" x2="0" y2="-20" stroke="#558B2F" strokeWidth="2"/>
          {[0,90,180,270].map(a=>(
            <ellipse key={a}
              cx={Math.cos(a*Math.PI/180)*8} cy={-20+Math.sin(a*Math.PI/180)*8}
              rx="8" ry="6" fill="#E53935" opacity="0.9"
              transform={`rotate(${a} ${Math.cos(a*Math.PI/180)*8} ${-20+Math.sin(a*Math.PI/180)*8})`}/>
          ))}
          <circle cx="0" cy="-20" r="4" fill="#1a1a1a"/>
          <circle cx="0" cy="-20" r="2" fill="#4A148C"/>
        </g>
      ))}

      {/* Lavender clusters */}
      {LAVENDER.map(([lx,ly],i)=>(
        <g key={`lv${i}`} transform={`translate(${lx},${ly})`}
           className={i%2===0?'flower-sway':'flower-sway-2'}>
          {[[-6,0],[-2,-4],[2,0],[6,-4],[0,-8]].map(([ox,oy],j)=>(
            <g key={j} transform={`translate(${ox},${oy})`}>
              <line x1="0" y1="0" x2="0" y2="-18" stroke="#558B2F" strokeWidth="1.8"/>
              {[-3,-1,1,3].map((oo,k)=>(
                <ellipse key={k} cx={oo} cy={-12-k*3} rx="3" ry="2.5"
                  fill={k%2===0?'#7B1FA2':'#9C27B0'} opacity="0.85"/>
              ))}
            </g>
          ))}
        </g>
      ))}

      {/* Rocks */}
      {ROCKS.map(([rx,ry,rw,rh],i)=>(
        <g key={`r${i}`}>
          <ellipse cx={rx+2} cy={ry+4} rx={rw} ry={rh} fill="#1a1a1a" opacity="0.12"/>
          <ellipse cx={rx} cy={ry} rx={rw} ry={rh} fill="#9E9E9E"/>
          <ellipse cx={rx-3} cy={ry-2} rx={rw*0.5} ry={rh*0.45} fill="#BDBDBD" opacity="0.6"/>
        </g>
      ))}
    </g>
  )
})

// ─── Butterflies ─────────────────────────────────────────────────
const Butterflies = memo(function Butterflies() {
  const data = [
    { x: 1040, y: 1042, c1: '#FF6D00', c2: '#BF360C', dur: '11s', begin: '0s' },
    { x: 1295, y: 1058, c1: '#F9A825', c2: '#424242', dur: '13s', begin: '-4s' },
    { x: 725,  y: 1050, c1: '#AD1457', c2: '#880E4F', dur: '9s',  begin: '-7s' },
  ]
  return (
    <g>
      {data.map((b,i)=>(
        <g key={i}>
          <animateTransform attributeName="transform" type="translate"
            values={`${b.x},${b.y}; ${b.x+30},${b.y-22}; ${b.x+58},${b.y-4}; ${b.x+30},${b.y+16}; ${b.x},${b.y}`}
            dur={b.dur} begin={b.begin} repeatCount="indefinite"
            calcMode="spline" keyTimes="0;0.25;0.5;0.75;1"
            keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"/>
          {/* Left wings */}
          <g>
            <animateTransform attributeName="transform" type="rotate"
              values="0 0 0;-14 0 0;0 0 0" dur="0.38s" repeatCount="indefinite"/>
            <ellipse cx="-13" cy="-8" rx="13" ry="9"  fill={b.c1} opacity="0.88" transform="rotate(-28 -13 -8)"/>
            <ellipse cx="-10" cy="6"  rx="10" ry="6.5" fill={b.c2} opacity="0.75" transform="rotate(18 -10 6)"/>
          </g>
          {/* Right wings */}
          <g>
            <animateTransform attributeName="transform" type="rotate"
              values="0 0 0;14 0 0;0 0 0" dur="0.38s" repeatCount="indefinite"/>
            <ellipse cx="13" cy="-8" rx="13" ry="9"  fill={b.c1} opacity="0.88" transform="rotate(28 13 -8)"/>
            <ellipse cx="10" cy="6"  rx="10" ry="6.5" fill={b.c2} opacity="0.75" transform="rotate(-18 10 6)"/>
          </g>
          {/* Body */}
          <ellipse cx="0" cy="-1" rx="2.5" ry="11" fill="#1a1a1a" opacity="0.85"/>
          <line x1="-1.5" y1="-11" x2="-8"  y2="-21" stroke="#1a1a1a" strokeWidth="1" strokeLinecap="round"/>
          <line x1="1.5"  y1="-11" x2="8"   y2="-21" stroke="#1a1a1a" strokeWidth="1" strokeLinecap="round"/>
          <circle cx="-8" cy="-21" r="1.8" fill="#1a1a1a"/>
          <circle cx="8"  cy="-21" r="1.8" fill="#1a1a1a"/>
        </g>
      ))}
    </g>
  )
})

// ─── Blueberry Tree ───────────────────────────────────────────────
function getTreeStage(xp) {
  if (xp < 100)   return 'seed'
  if (xp < 300)   return 'sprout'
  if (xp < 600)   return 'seedling'
  if (xp < 1000)  return 'sapling'
  if (xp < 2000)  return 'young'
  if (xp < 3500)  return 'flowering'
  if (xp < 6000)  return 'fruiting'
  if (xp < 10000) return 'mature'
  if (xp < 20000) return 'full'
  return 'ancient'
}

// Tiny sprout — shown at seed/sprout stages
const SproutTree = memo(function SproutTree({ stage }) {
  const x = TREE_X, y = TREE_Y
  const stemH = stage === 'seed' ? 28 : 50
  const leafSize = stage === 'seed' ? 8 : 14
  return (
    <g>
      {/* Soil mound */}
      <ellipse cx={x} cy={y + 10} rx={40} ry={10} fill="#8B6347" opacity="0.7"/>
      {/* Stem */}
      <line x1={x} y1={y + 8} x2={x} y2={y + 8 - stemH} stroke="#4CAF50" strokeWidth={stage === 'seed' ? 3 : 4} strokeLinecap="round"/>
      {/* Leaves */}
      {stage !== 'seed' && <>
        <ellipse cx={x - leafSize} cy={y + 8 - stemH + 6} rx={leafSize} ry={leafSize * 0.6}
          fill="#66BB6A" transform={`rotate(-30 ${x - leafSize} ${y + 8 - stemH + 6})`}/>
        <ellipse cx={x + leafSize} cy={y + 8 - stemH + 6} rx={leafSize} ry={leafSize * 0.6}
          fill="#81C784" transform={`rotate(30 ${x + leafSize} ${y + 8 - stemH + 6})`}/>
      </>}
      {/* Single tiny leaf at seed stage */}
      {stage === 'seed' && <>
        <ellipse cx={x - 6} cy={y + 8 - stemH + 3} rx={7} ry={5}
          fill="#A5D6A7" transform={`rotate(-25 ${x - 6} ${y + 8 - stemH + 3})`}/>
        <ellipse cx={x + 6} cy={y + 8 - stemH + 3} rx={7} ry={5}
          fill="#A5D6A7" transform={`rotate(25 ${x + 6} ${y + 8 - stemH + 3})`}/>
      </>}
      <text x={x} y={y + 35} textAnchor="middle" fontSize="11"
        fill="#4CAF50" fontWeight="bold" fontFamily="system-ui,sans-serif">
        {stage === 'seed' ? 'Urug\'im 🌱' : "Ko'chatim o'smoqda 🌿"}
      </text>
    </g>
  )
})

// Small sapling
const SaplingTree = memo(function SaplingTree({ stage }) {
  const x = TREE_X, y = TREE_Y
  const scale = stage === 'seedling' ? 0.35 : stage === 'sapling' ? 0.55 : 0.75
  return (
    <g transform={`translate(${x},${y}) scale(${scale}) translate(${-x},${-y})`}>
      <ellipse cx={x+18} cy={y+14} rx="95" ry="24" fill="#1a3d00" opacity={0.1}/>
      <path d={`M${x-15},${y} Q${x-20},${y-75} ${x-9},${y-120} Q${x-2},${y-130} ${x+5},${y-120} Q${x+20},${y-75} ${x+15},${y} Z`}
        fill="url(#g-trunk)"/>
      {[
        {cx:x-45,cy:y-110,rx:28,ry:22,c:'#2E7D32'},
        {cx:x+45,cy:y-108,rx:26,ry:20,c:'#388E3C'},
        {cx:x,cy:y-138,rx:30,ry:24,c:'#2E7D32'},
      ].map((l,i)=>(
        <ellipse key={i} cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry} fill={l.c}/>
      ))}
      <text x={x} y={y+40} textAnchor="middle" fontSize="12"
        fill="#1B5E20" fontWeight="bold" fontFamily="system-ui,sans-serif">
        Mening Blueberry daraxtim 🫐
      </text>
    </g>
  )
})

const BlueberryTree = memo(function BlueberryTree({ totalXp = 0 }) {
  const stage = getTreeStage(totalXp)
  if (stage === 'seed' || stage === 'sprout') return <SproutTree stage={stage} />
  if (stage === 'seedling' || stage === 'sapling' || stage === 'young') return <SaplingTree stage={stage} />
  // mature/full/ancient/flowering/fruiting → full tree below
  const x = TREE_X, y = TREE_Y
  return (
    <g>
      <ellipse cx={x+18} cy={y+14} rx="95" ry="24" fill="#1a3d00" opacity="0.18"/>
      <g className="tree-group">
        <path d={`M${x-17},${y} Q${x-30},${y-18} ${x-24},${y-45} L${x-12},${y-42} Z`} fill="url(#g-trunk)"/>
        <path d={`M${x+17},${y} Q${x+30},${y-18} ${x+24},${y-45} L${x+12},${y-42} Z`} fill="url(#g-trunk)"/>
        <path d={`M${x-10},${y} Q${x-40},${y+8} ${x-38},${y+4} L${x-12},${y} Z`} fill="url(#g-trunk)" opacity="0.8"/>
        <path d={`M${x-15},${y} Q${x-20},${y-75} ${x-9},${y-155} Q${x-2},${y-165} ${x+5},${y-155} Q${x+20},${y-75} ${x+15},${y} Z`}
          fill="url(#g-trunk)" filter="url(#g-lightShadow)"/>
        <path d={`M${x-9},${y-20} Q${x-13},${y-70} ${x-7},${y-120}`} stroke="#3E2723" strokeWidth="2" fill="none" opacity="0.3" strokeLinecap="round"/>
        <path d={`M${x+3},${y-35} Q${x+7},${y-80} ${x+5},${y-130}`} stroke="#6D4C41" strokeWidth="1.5" fill="none" opacity="0.25" strokeLinecap="round"/>
        <path d={`M${x-6},${y-152} Q${x-52},${y-172} ${x-88},${y-157}`} stroke="#5D4037" strokeWidth="11" fill="none" strokeLinecap="round"/>
        <path d={`M${x-52},${y-168} Q${x-74},${y-190} ${x-82},${y-180}`} stroke="#5D4037" strokeWidth="7" fill="none" strokeLinecap="round"/>
        <path d={`M${x+6},${y-152} Q${x+52},${y-167} ${x+90},${y-150}`} stroke="#5D4037" strokeWidth="11" fill="none" strokeLinecap="round"/>
        <path d={`M${x+52},${y-162} Q${x+72},${y-182} ${x+82},${y-170}`} stroke="#5D4037" strokeWidth="7" fill="none" strokeLinecap="round"/>
        <path d={`M${x},${y-158} Q${x+8},${y-190} ${x+18},${y-198}`} stroke="#5D4037" strokeWidth="8" fill="none" strokeLinecap="round"/>
        <path d={`M${x-2},${y-155} Q${x-22},${y-185} ${x-28},${y-195}`} stroke="#5D4037" strokeWidth="7" fill="none" strokeLinecap="round"/>
        {[
          {cx:x-70,cy:y-152,rx:36,ry:30,c:'#1B5E20',o:0.7},
          {cx:x+72,cy:y-148,rx:34,ry:28,c:'#1B5E20',o:0.7},
          {cx:x+15,cy:y-192,rx:32,ry:26,c:'#1B5E20',o:0.65},
          {cx:x-20,cy:y-195,rx:30,ry:24,c:'#1B5E20',o:0.65},
        ].map((l,i)=>(
          <ellipse key={`bl${i}`} cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry} fill={l.c} opacity={l.o}/>
        ))}
        {[
          {cx:x-58,cy:y-165,rx:40,ry:33,c:'#2E7D32',r:-18},
          {cx:x-80,cy:y-150,rx:34,ry:28,c:'#388E3C',r:12},
          {cx:x-42,cy:y-180,rx:30,ry:25,c:'#43A047',r:-22},
          {cx:x-22,cy:y-190,rx:28,ry:23,c:'#2E7D32',r:-8},
          {cx:x+8, cy:y-192,rx:36,ry:30,c:'#388E3C',r:5},
          {cx:x+30,cy:y-180,rx:32,ry:27,c:'#2E7D32',r:-12},
          {cx:x+58,cy:y-165,rx:40,ry:33,c:'#388E3C',r:16},
          {cx:x+82,cy:y-150,rx:32,ry:27,c:'#43A047',r:-6},
          {cx:x,   cy:y-205,rx:36,ry:30,c:'#2E7D32',r:0},
        ].map((l,i)=>(
          <ellipse key={`ml${i}`} cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry}
            fill={l.c} transform={`rotate(${l.r} ${l.cx} ${l.cy})`}/>
        ))}
        {[
          {cx:x-52,cy:y-170,rx:22,ry:17,c:'#81C784'},
          {cx:x+10,cy:y-196,rx:20,ry:15,c:'#66BB6A'},
          {cx:x+60,cy:y-168,rx:22,ry:17,c:'#81C784'},
          {cx:x-18,cy:y-192,rx:16,ry:12,c:'#A5D6A7'},
        ].map((l,i)=>(
          <ellipse key={`ll${i}`} cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry} fill={l.c} opacity="0.5"/>
        ))}
        {BERRY_POSITIONS.map(([bx,by],i)=>(
          <g key={`br${i}`} transform={`translate(${x+bx},${y+by})`}>
            <circle r="9.5" fill="#100522"/>
            <circle cx="1" cy="1" r="8.5" fill="#3D1F6E"/>
            <circle cx="1.5" cy="1.5" r="7" fill="#7B3FA0"/>
            <circle cx="-2.5" cy="-2.5" r="3.5" fill="#9B6FD4" opacity="0.7"/>
            <circle cx="-3.5" cy="-3.5" r="2" fill="white" opacity="0.9"/>
            <circle r="9.5" fill="transparent">
              <animate attributeName="r" values="9.5;10.5;9.5" dur="2.2s" begin={`${i*0.18}s`} repeatCount="indefinite"/>
            </circle>
          </g>
        ))}
        <text x={x} y={y+40} textAnchor="middle" fontSize="13"
          fill="#1B5E20" fontWeight="bold" fontFamily="system-ui,sans-serif">
          Mening Blueberry daraxtim 🫐
        </text>
      </g>
    </g>
  )
})

// ─── COW ─────────────────────────────────────────────────────────
const Cow = memo(function Cow({ name }) {
  return (
    <g filter="url(#g-lightShadow)">
      <ellipse cx="5" cy="8" rx="68" ry="14" fill="#000" opacity="0.12"/>
      <rect x="-40" y="-42" width="12" height="42" rx="4" fill="url(#g-leg)"/>
      <rect x="-24" y="-40" width="12" height="40" rx="4" fill="url(#g-leg)"/>
      <rect x="-43" y="-8" width="16" height="9" rx="3" fill="#212121"/>
      <rect x="-27" y="-7" width="16" height="9" rx="3" fill="#212121"/>
      <ellipse cx="0" cy="-55" rx="56" ry="33" fill="url(#g-cow)"/>
      <ellipse cx="-18" cy="-65" rx="22" ry="16" fill="#1a1a1a" opacity="0.88"/>
      <ellipse cx="22" cy="-45" rx="18" ry="13" fill="#1a1a1a" opacity="0.88"/>
      <ellipse cx="-35" cy="-50" rx="10" ry="8" fill="#1a1a1a" opacity="0.75"/>
      <path d="M-22,-28 Q0,-18 22,-28" fill="#FFCDD2" opacity="0.85"/>
      <circle cx="-8" cy="-20" r="4" fill="#F8BBD9"/>
      <circle cx="8"  cy="-20" r="4" fill="#F8BBD9"/>
      <rect x="10" y="-40" width="12" height="40" rx="4" fill="url(#g-leg)"/>
      <rect x="26" y="-42" width="12" height="42" rx="4" fill="url(#g-leg)"/>
      <rect x="7"  y="-7" width="16" height="9" rx="3" fill="#212121"/>
      <rect x="23" y="-8" width="16" height="9" rx="3" fill="#212121"/>
      <circle cx="64" cy="-58" r="25" fill="url(#g-cow)"/>
      <ellipse cx="83" cy="-50" rx="17" ry="12" fill="#FFCDD2"/>
      <ellipse cx="78" cy="-49" rx="3.5" ry="2.5" fill="#C62828" opacity="0.7"/>
      <ellipse cx="87" cy="-49" rx="3.5" ry="2.5" fill="#C62828" opacity="0.7"/>
      <circle cx="68" cy="-65" r="7" fill="white"/>
      <circle cx="70" cy="-65" r="4.5" fill="#1a1a1a"/>
      <circle cx="71" cy="-67" r="1.5" fill="white"/>
      <path d="M63,-68 Q65,-72 68,-70" stroke="#1a1a1a" strokeWidth="1.5" fill="none"/>
      <ellipse cx="55" cy="-78" rx="8" ry="6" fill="#ECEFF1" transform="rotate(-20 55 -78)"/>
      <ellipse cx="55" cy="-78" rx="5" ry="3.5" fill="#FFCDD2" transform="rotate(-20 55 -78)"/>
      <path d="M60,-80 Q54,-96 62,-93" stroke="#FFF9C4" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <g>
        <animateTransform attributeName="transform" type="rotate"
          values="-8 -54 -55;8 -54 -55;-8 -54 -55" dur="2.2s" repeatCount="indefinite"/>
        <path d="M-54,-55 Q-78,-42 -73,-24 Q-68,-10 -62,-14" stroke="#9E9E9E" strokeWidth="5" fill="none" strokeLinecap="round"/>
        <circle cx="-62" cy="-14" r="8" fill="#757575"/>
      </g>
      <text y="-98" textAnchor="middle" fontSize="13" fill="#3E2723" fontWeight="bold" fontFamily="system-ui,sans-serif">{name}</text>
    </g>
  )
})

// ─── HORSE ───────────────────────────────────────────────────────
const Horse = memo(function Horse({ name }) {
  return (
    <g filter="url(#g-lightShadow)">
      <ellipse cx="5" cy="8" rx="75" ry="16" fill="#000" opacity="0.12"/>
      <rect x="-46" y="-55" width="13" height="55" rx="5" fill="#6D3B1A"/>
      <rect x="-28" y="-52" width="13" height="52" rx="5" fill="#6D3B1A"/>
      <ellipse cx="-40" cy="-4" rx="9" ry="5" fill="#5D2E0C" opacity="0.8"/>
      <ellipse cx="-22" cy="-3" rx="9" ry="5" fill="#5D2E0C" opacity="0.8"/>
      <rect x="-49" y="-7" width="17" height="9" rx="3" fill="#1a1a1a"/>
      <rect x="-31" y="-7" width="17" height="9" rx="3" fill="#1a1a1a"/>
      <ellipse cx="0" cy="-65" rx="60" ry="35" fill="url(#g-horse)"/>
      <ellipse cx="-15" cy="-75" rx="35" ry="18" fill="#BC6C2C" opacity="0.4"/>
      <ellipse cx="0" cy="-48" rx="40" ry="15" fill="#8B4513" opacity="0.3"/>
      <rect x="14" y="-52" width="13" height="52" rx="5" fill="#6D3B1A"/>
      <rect x="32" y="-55" width="13" height="55" rx="5" fill="#6D3B1A"/>
      <ellipse cx="20" cy="-3" rx="9" ry="5" fill="#5D2E0C" opacity="0.8"/>
      <ellipse cx="38" cy="-4" rx="9" ry="5" fill="#5D2E0C" opacity="0.8"/>
      <rect x="11" y="-7" width="17" height="9" rx="3" fill="#1a1a1a"/>
      <rect x="29" y="-7" width="17" height="9" rx="3" fill="#1a1a1a"/>
      <path d="M30,-80 Q55,-90 62,-108 Q65,-115 62,-118 Q58,-122 52,-110 Q46,-95 28,-88 Z" fill="url(#g-horse)"/>
      <ellipse cx="58" cy="-125" rx="18" ry="25" fill="url(#g-horse)" transform="rotate(15 58 -125)"/>
      <ellipse cx="68" cy="-112" rx="12" ry="8" fill="#8B5E3C"/>
      <ellipse cx="65" cy="-110" rx="3" ry="2" fill="#3E2723"/>
      <ellipse cx="72" cy="-110" rx="3" ry="2" fill="#3E2723"/>
      <circle cx="52" cy="-130" r="8" fill="white"/>
      <circle cx="54" cy="-130" r="5.5" fill="#6D4C41"/>
      <circle cx="55" cy="-132" r="2" fill="white"/>
      <circle cx="54" cy="-130" r="3.5" fill="#1a1a1a"/>
      <ellipse cx="46" cy="-147" rx="7" ry="11" fill="#A0522D" transform="rotate(-10 46 -147)"/>
      <ellipse cx="46" cy="-147" rx="4" ry="7" fill="#BC7A5A" transform="rotate(-10 46 -147)"/>
      <path d="M48,-140 Q42,-130 44,-122" stroke="#4A2E00" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M50,-140 Q47,-128 50,-118" stroke="#3E2723" strokeWidth="3" fill="none" strokeLinecap="round"/>
      {[0,1,2,3,4].map(j=>(
        <path key={j} d={`M${30-j*2},${-88+j*4} Q${22-j},${-75+j*3} ${18-j*2},${-58+j*4}`}
          stroke={j%2===0?'#3E2723':'#5D4037'} strokeWidth={4-j*0.5} fill="none" strokeLinecap="round"/>
      ))}
      <path d="M-60,-72 Q-90,-55 -85,-30 Q-80,-10 -70,-15" stroke="#3E2723" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.9"/>
      <path d="M-60,-72 Q-95,-50 -88,-20 Q-82,-5 -65,-8" stroke="#5D4037" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M-60,-72 Q-88,-60 -82,-35 Q-76,-15 -62,-18" stroke="#4A2E00" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <animateTransform attributeName="transform" type="translate"
        values="0,0;0,-6;0,0" dur="0.9s" repeatCount="indefinite" calcMode="spline"
        keySplines="0.45 0.05 0.55 0.95;0.45 0.05 0.55 0.95"/>
      <text y="-160" textAnchor="middle" fontSize="13" fill="#3E2723" fontWeight="bold" fontFamily="system-ui,sans-serif">{name}</text>
    </g>
  )
})

// ─── SHEEP ───────────────────────────────────────────────────────
const Sheep = memo(function Sheep({ name }) {
  const woolBumps=[[-34,-62,18],[-18,-72,17],[2,-76,18],[20,-72,17],[34,-62,17],[-40,-52,15],[-28,-48,14],[38,-52,14],[26,-48,14],[-32,-78,14],[-14,-82,15],[8,-82,14],[26,-78,13],[0,-58,16]]
  return (
    <g filter="url(#g-lightShadow)">
      <ellipse cx="2" cy="6" rx="52" ry="11" fill="#000" opacity="0.12"/>
      <rect x="-30" y="-30" width="10" height="30" rx="4" fill="#424242"/>
      <rect x="-16" y="-28" width="10" height="28" rx="4" fill="#424242"/>
      <rect x="6"   y="-28" width="10" height="28" rx="4" fill="#424242"/>
      <rect x="20"  y="-30" width="10" height="30" rx="4" fill="#424242"/>
      <rect x="-33" y="-5" width="14" height="7" rx="3" fill="#1a1a1a"/>
      <rect x="-19" y="-4" width="14" height="7" rx="3" fill="#1a1a1a"/>
      <rect x="3"   y="-4" width="14" height="7" rx="3" fill="#1a1a1a"/>
      <rect x="17"  y="-5" width="14" height="7" rx="3" fill="#1a1a1a"/>
      <ellipse cx="0" cy="-58" rx="46" ry="30" fill="url(#g-sheep)"/>
      {woolBumps.map(([wx,wy,wr],i)=>(
        <circle key={i} cx={wx} cy={wy} r={wr} fill={i%3===0?'#FFFFFF':'#F5F5F5'} opacity="0.95"/>
      ))}
      <circle cx="0" cy="-74" r="10" fill="white" opacity="0.5"/>
      <ellipse cx="46" cy="-60" rx="18" ry="20" fill="#424242"/>
      <circle cx="51" cy="-65" r="5.5" fill="white"/>
      <circle cx="52" cy="-65" r="3.5" fill="#1a1a1a"/>
      <circle cx="53" cy="-67" r="1.2" fill="white"/>
      <path d="M44,-54 Q47,-51 50,-54" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <ellipse cx="38" cy="-75" rx="7" ry="10" fill="#616161" transform="rotate(-20 38 -75)"/>
      <ellipse cx="56" cy="-75" rx="6" ry="9"  fill="#616161" transform="rotate(15 56 -75)"/>
      <animateTransform attributeName="transform" type="translate"
        values="0,0;0,-4;0,0" dur="0.65s" repeatCount="indefinite" calcMode="spline"
        keySplines="0.45 0.05 0.55 0.95;0.45 0.05 0.55 0.95"/>
      <text y="-102" textAnchor="middle" fontSize="13" fill="#3E2723" fontWeight="bold" fontFamily="system-ui,sans-serif">{name}</text>
    </g>
  )
})

// ─── GOAT ────────────────────────────────────────────────────────
const Goat = memo(function Goat({ name }) {
  return (
    <g filter="url(#g-lightShadow)">
      <ellipse cx="4" cy="7" rx="55" ry="13" fill="#000" opacity="0.12"/>
      <rect x="-36" y="-44" width="11" height="44" rx="4" fill="url(#g-leg)"/>
      <rect x="-20" y="-42" width="11" height="42" rx="4" fill="url(#g-leg)"/>
      <rect x="10"  y="-42" width="11" height="42" rx="4" fill="url(#g-leg)"/>
      <rect x="24"  y="-44" width="11" height="44" rx="4" fill="url(#g-leg)"/>
      <rect x="-39" y="-7" width="15" height="8" rx="3" fill="#1a1a1a"/>
      <rect x="-23" y="-6" width="15" height="8" rx="3" fill="#1a1a1a"/>
      <rect x="7"   y="-6" width="15" height="8" rx="3" fill="#1a1a1a"/>
      <rect x="21"  y="-7" width="15" height="8" rx="3" fill="#1a1a1a"/>
      <ellipse cx="0" cy="-56" rx="50" ry="30" fill="url(#g-goat)"/>
      <ellipse cx="-12" cy="-65" rx="28" ry="15" fill="#BDBDBD" opacity="0.45"/>
      <ellipse cx="52" cy="-42" rx="8" ry="14" fill="#9E9E9E" opacity="0.85"/>
      <circle cx="56" cy="-65" r="22" fill="url(#g-goat)"/>
      <circle cx="62" cy="-68" r="6.5" fill="#F5F5DC"/>
      <rect x="58.5" y="-70.5" width="7" height="5" rx="2" fill="#1a1a1a"/>
      <circle cx="62" cy="-68" r="1.5" fill="white"/>
      <ellipse cx="72" cy="-59" rx="12" ry="8.5" fill="#BDBDBD"/>
      <ellipse cx="68" cy="-58" rx="2.5" ry="2" fill="#757575" opacity="0.7"/>
      <ellipse cx="75" cy="-58" rx="2.5" ry="2" fill="#757575" opacity="0.7"/>
      <path d="M50,-82 Q44,-100 52,-98" stroke="#795548" strokeWidth="5" fill="none" strokeLinecap="round"/>
      <path d="M62,-80 Q70,-98 62,-96" stroke="#795548" strokeWidth="5" fill="none" strokeLinecap="round"/>
      <ellipse cx="42" cy="-64" rx="6" ry="11" fill="#9E9E9E" transform="rotate(25 42 -64)"/>
      <ellipse cx="42" cy="-64" rx="3.5" ry="7" fill="#BDBDBD" transform="rotate(25 42 -64)"/>
      <path d="M-50,-52 Q-60,-48 -58,-44" stroke="#9E9E9E" strokeWidth="5" fill="none" strokeLinecap="round"/>
      <circle cx="-58" cy="-44" r="5" fill="#BDBDBD"/>
      <animateTransform attributeName="transform" type="translate"
        values="0,0;0,-3;0,0" dur="4s" repeatCount="indefinite" calcMode="spline"
        keySplines="0.45 0.05 0.55 0.95;0.45 0.05 0.55 0.95"/>
      <text y="-108" textAnchor="middle" fontSize="13" fill="#3E2723" fontWeight="bold" fontFamily="system-ui,sans-serif">{name}</text>
    </g>
  )
})

// ─── FARM ANIMAL (small) ─────────────────────────────────────────
const FarmAnimal = memo(function FarmAnimal({ type, name }) {
  const color={chicken:'#FFA726',duck:'#64B5F6',cat:'#FFCC80',dog:'#A1887F',pig:'#F48FB1'}[type]||'#9E9E9E'
  return (
    <g filter="url(#g-lightShadow)">
      <ellipse cx="2" cy="5" rx="28" ry="8" fill="#000" opacity="0.1"/>
      <ellipse cx="0" cy="-22" rx="24" ry="18" fill={color}/>
      <circle cx="16" cy="-36" r="14" fill={color}/>
      <circle cx="20" cy="-40" r="5" fill="white"/>
      <circle cx="21" cy="-40" r="3" fill="#1a1a1a"/>
      <circle cx="22" cy="-42" r="1" fill="white"/>
      {type==='pig'&&<ellipse cx="23" cy="-34" rx="5" ry="4" fill="#F8BBD9"/>}
      {type==='cat'&&<><path d="M10,-46 L8,-55 L16,-50 Z" fill={color}/><path d="M22,-46 L24,-55 L18,-50 Z" fill={color}/></>}
      {type==='dog'&&<ellipse cx="16" cy="-24" rx="12" ry="7" fill={color} transform="rotate(15 16 -24)"/>}
      {['chicken','duck'].includes(type)&&<ellipse cx="22" cy="-36" rx="4" ry="3" fill="#FF8F00"/>}
      <rect x="-16" y="-10" width="8" height="12" rx="3" fill={color}/>
      <rect x="-4"  y="-8"  width="8" height="10" rx="3" fill={color}/>
      <rect x="8"   y="-8"  width="8" height="10" rx="3" fill={color}/>
      <rect x="18"  y="-10" width="8" height="12" rx="3" fill={color}/>
      <text y="-58" textAnchor="middle" fontSize="12" fill="#3E2723" fontWeight="bold" fontFamily="system-ui,sans-serif">{name}</text>
    </g>
  )
})

const ANIMAL_COMPS = { goat: Goat, sheep: Sheep, cow: Cow, horse: Horse }
const FARM_ANIMAL_TYPES = ['chicken','duck','cat','dog','pig']

// ─── BARN ────────────────────────────────────────────────────────
const Barn = memo(function Barn() {
  const bx=2260,by=980
  return (
    <g filter="url(#g-shadow)">
      <rect x={bx-100} y={by-5} width="200" height="15" rx="3" fill="#4E342E"/>
      <rect x={bx-95} y={by-160} width="190" height="160" rx="4" fill="url(#g-barn)"/>
      {[-120,-80,-40,0,40,80,120].map((oy,i)=>(
        <line key={i} x1={bx-95} y1={by+oy} x2={bx+95} y2={by+oy} stroke="#B71C1C" strokeWidth="1" opacity="0.25"/>
      ))}
      <polygon points={`${bx-115},${by-160} ${bx},${by-260} ${bx+115},${by-160}`} fill="url(#g-roof)"/>
      {[-5,-15,-25,-35,-45].map((oy,i)=>(
        <line key={i} x1={bx-115+(-oy*1.2)} y1={by-160+oy} x2={bx+115+(-oy*1.2)} y2={by-160+oy} stroke="#4A148C" strokeWidth="2" opacity="0.3"/>
      ))}
      <rect x={bx-25} y={by-220} width="50" height="40" rx="3" fill="#1a1a1a"/>
      <rect x={bx-22} y={by-210} width="44" height="15" rx="2" fill="#FFA000" opacity="0.7"/>
      <rect x={bx-45} y={by-130} width="40" height="130" rx="3" fill="#4E342E"/>
      <rect x={bx+5}  y={by-130} width="40" height="130" rx="3" fill="#5D4037"/>
      <line x1={bx} y1={by-130} x2={bx} y2={by} stroke="#3E2723" strokeWidth="3"/>
      <line x1={bx-45} y1={by-130} x2={bx-5} y2={by}  stroke="#6D4C41" strokeWidth="2" opacity="0.6"/>
      <line x1={bx-5}  y1={by-130} x2={bx-45} y2={by}  stroke="#6D4C41" strokeWidth="2" opacity="0.6"/>
      <line x1={bx+5}  y1={by-130} x2={bx+45} y2={by}  stroke="#6D4C41" strokeWidth="2" opacity="0.6"/>
      <line x1={bx+45} y1={by-130} x2={bx+5}  y2={by}  stroke="#6D4C41" strokeWidth="2" opacity="0.6"/>
      <rect x={bx-90} y={by-110} width="36" height="34" rx="3" fill="#B3E5FC"/>
      <line x1={bx-72} y1={by-110} x2={bx-72} y2={by-76} stroke="#5D4037" strokeWidth="2"/>
      <line x1={bx-90} y1={by-93}  x2={bx-54} y2={by-93}  stroke="#5D4037" strokeWidth="2"/>
      <rect x={bx+54} y={by-110} width="36" height="34" rx="3" fill="#B3E5FC"/>
      <line x1={bx+72} y1={by-110} x2={bx+72} y2={by-76} stroke="#5D4037" strokeWidth="2"/>
      <line x1={bx+54} y1={by-93}  x2={bx+90} y2={by-93}  stroke="#5D4037" strokeWidth="2"/>
      <line x1={bx} y1={by-260} x2={bx} y2={by-285} stroke="#9E9E9E" strokeWidth="3"/>
      <ellipse cx={bx} cy={by-288} rx="8" ry="5" fill="#757575"/>
      <path d={`M${bx},${by-285} L${bx+20},${by-292} L${bx},${by-285}`} fill="#E0E0E0" opacity="0.9"/>
      <text x={bx} y={by+30} textAnchor="middle" fontSize="14" fill="#4E342E" fontWeight="bold" fontFamily="system-ui,sans-serif">Ferma 🏡</text>
    </g>
  )
})

// ─── FARMHOUSE ───────────────────────────────────────────────────
const Farmhouse = memo(function Farmhouse() {
  const fx=1980,fy=990
  return (
    <g filter="url(#g-shadow)">
      <rect x={fx-70} y={fy-5} width="140" height="12" rx="3" fill="#795548"/>
      <rect x={fx-65} y={fy-130} width="130" height="130" rx="4" fill="#FFF9C4"/>
      <rect x={fx-75} y={fy-50} width="20" height="50" rx="3" fill="#F5E6A3"/>
      <rect x={fx+55} y={fy-50} width="20" height="50" rx="3" fill="#F5E6A3"/>
      <polygon points={`${fx-80},${fy-130} ${fx},${fy-200} ${fx+80},${fy-130}`} fill="#4CAF50"/>
      <rect x={fx+30} y={fy-215} width="22" height="55" rx="3" fill="#D32F2F"/>
      <circle cx={fx+41} cy={fy-222} r="8" fill="#9E9E9E" className="smoke-1" opacity="0"/>
      <circle cx={fx+41} cy={fy-222} r="8" fill="#9E9E9E" className="smoke-2" opacity="0"/>
      <circle cx={fx+41} cy={fy-222} r="8" fill="#9E9E9E" className="smoke-3" opacity="0"/>
      <rect x={fx-16} y={fy-80} width="32" height="80" rx="5" fill="#795548"/>
      <circle cx={fx+10} cy={fy-40} r="3.5" fill="#FFD54F"/>
      <rect x={fx-60} y={fy-110} width="34" height="28" rx="3" fill="#B3E5FC"/>
      <line x1={fx-43} y1={fy-110} x2={fx-43} y2={fy-82} stroke="#5D4037" strokeWidth="1.5"/>
      <line x1={fx-60} y1={fy-96}  x2={fx-26} y2={fy-96}  stroke="#5D4037" strokeWidth="1.5"/>
      <rect x={fx+26} y={fy-110} width="34" height="28" rx="3" fill="#B3E5FC"/>
      <line x1={fx+43} y1={fy-110} x2={fx+43} y2={fy-82} stroke="#5D4037" strokeWidth="1.5"/>
      <line x1={fx+26} y1={fy-96}  x2={fx+60} y2={fy-96}  stroke="#5D4037" strokeWidth="1.5"/>
      <text x={fx} y={fy+28} textAnchor="middle" fontSize="13" fill="#4E342E" fontWeight="bold" fontFamily="system-ui,sans-serif">Ferma uyi</text>
    </g>
  )
})

// ─── Shop Panel ──────────────────────────────────────────────────
function ShopPanel({ open, onClose, userXP, ownedItems, farmUnlocked, onBuy }) {
  const [tab, setTab] = useState('garden')
  const [purchasing, setPurchasing] = useState(null)
  const ownedIds = new Set(ownedItems.map(i => i.type))
  const filtered = SHOP_ITEMS.filter(i => i.category === tab)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end md:items-center md:justify-end" onClick={onClose}>
      <div className="w-full md:w-96 bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[75vh] flex flex-col"
           onClick={e=>e.stopPropagation()} style={{animation:'fadeInUp 0.35s ease-out'}}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-black text-berry-deep">🛒 Do'kon</h2>
          <div className="flex items-center gap-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1">
              <span className="font-black text-yellow-600 text-sm">🫐 {userXP.toLocaleString()}</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
          </div>
        </div>
        <div className="flex border-b border-gray-100">
          {[['garden',"🌱 Bog'"],['animals','🐾 Hayvonlar'],['farm','🏡 Ferma']].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)}
              className={`flex-1 py-3 text-sm font-bold transition-all ${tab===id?'text-berry-deep border-b-2 border-berry-deep':'text-gray-400'}`}>
              {label}
            </button>
          ))}
        </div>
        {tab==='farm'&&!farmUnlocked&&userXP<15000&&(
          <div className="mx-4 mt-3 bg-berry-glow rounded-2xl p-3">
            <p className="text-xs font-bold text-berry-deep mb-1">🏡 Ferma {(15000-userXP).toLocaleString()} 🫐 kerak</p>
            <div className="w-full bg-white rounded-full h-2">
              <div className="bg-berry-deep h-2 rounded-full transition-all" style={{width:`${Math.min(100,(userXP/15000)*100)}%`}}/>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(item=>{
              const canAfford=userXP>=item.cost
              const needsFarm=item.requiresFarm&&!farmUnlocked
              const isOwned=ownedIds.has(item.id)&&!item.isAnimal
              const isConfirming=purchasing?.id===item.id
              return (
                <div key={item.id} className={`bg-white rounded-2xl shadow-sm border-2 p-4 flex flex-col gap-2 transition-all ${isOwned?'border-green-300 bg-green-50':'border-gray-100'} ${needsFarm?'opacity-50':''}`}>
                  <div className="text-4xl text-center">{item.emoji}</div>
                  <p className="text-center font-bold text-berry-deep text-sm">{item.name}</p>
                  <p className="text-center text-xs font-black text-yellow-600">⭐ {item.cost.toLocaleString()}</p>
                  {isOwned?(
                    <div className="text-center text-xs font-bold text-green-600">✅ Sotib olingan</div>
                  ):needsFarm?(
                    <div className="text-center text-xs font-bold text-gray-400">🔒 Ferma kerak</div>
                  ):isConfirming?(
                    <div className="flex gap-1">
                      <button onClick={()=>{onBuy(item);setPurchasing(null)}} className="flex-1 bg-berry-deep text-white font-bold text-xs py-2 rounded-xl">Ha!</button>
                      <button onClick={()=>setPurchasing(null)} className="flex-1 bg-gray-100 text-gray-500 font-bold text-xs py-2 rounded-xl">Yo'q</button>
                    </div>
                  ):canAfford?(
                    <button onClick={()=>setPurchasing(item)} className="w-full bg-berry-deep text-white font-bold text-xs py-2 rounded-xl hover:bg-berry-dark transition-all">Sotib olish</button>
                  ):(
                    <button disabled className="w-full bg-gray-100 text-gray-400 font-bold text-xs py-2 rounded-xl cursor-not-allowed">Yetarli 🫐 yo'q</button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Animal Info Popup ───────────────────────────────────────────
function AnimalPopup({ animal, pan, zoom, onClose }) {
  const [liked, setLiked] = useState(false)
  useEffect(()=>{ const t=setTimeout(onClose,5000); return ()=>clearTimeout(t) },[onClose])
  if (!animal) return null
  const screenX = animal.x * zoom + pan.x
  const screenY = animal.y * zoom + pan.y - 120 * zoom
  return (
    <div style={{position:'fixed',left:Math.min(Math.max(screenX-90,8),window.innerWidth-200),top:Math.min(Math.max(screenY,8),window.innerHeight-160),zIndex:35,animation:'fadeInUp 0.3s ease-out'}}
         onClick={e=>e.stopPropagation()}>
      <div className="bg-white rounded-2xl shadow-xl p-4 w-48 border border-berry-light">
        <div className="flex items-center justify-between mb-1">
          <span className="font-black text-berry-deep text-sm">{animal.name}</span>
          <button onClick={()=>setLiked(l=>!l)} className={`text-lg transition-all ${liked?'scale-125':''}`}>
            {liked?'❤️':'🤍'}
          </button>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed mb-2">{ANIMAL_FACTS[animal.type]||''}</p>
        <p className="text-xs text-gray-400 font-semibold">📅 {animal.bought_at||'Bugun'}</p>
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-300 hover:text-gray-500 text-xs">✕</button>
      </div>
    </div>
  )
}

// ─── Mini Map ────────────────────────────────────────────────────
function MiniMap({ pan, zoom, ownedItems }) {
  const mW=160, mH=100, sc=mW/W
  const vpW=Math.min(mW,(window.innerWidth/zoom)*sc)
  const vpH=Math.min(mH,(window.innerHeight/zoom)*sc)
  const vpX=Math.max(0,Math.min(mW-vpW,(-pan.x/zoom)*sc))
  const vpY=Math.max(0,Math.min(mH-vpH,(-pan.y/zoom)*sc))
  return (
    <div className="fixed bottom-20 left-3 z-30 md:bottom-4" style={{opacity:0.82,pointerEvents:'none'}}>
      <div className="rounded-xl overflow-hidden shadow-lg border-2 border-white/60">
        <svg width={mW} height={mH}>
          <rect width={mW} height={32} fill="#87CEEB"/>
          <rect y={20} width={mW} height={12} fill="#90A4AE"/>
          <rect y={32} width={mW} height={mH-32} fill="#4CAF50"/>
          <circle cx={TREE_X*sc} cy={TREE_Y*sc} r={5} fill="#3D1F6E"/>
          <ellipse cx={POND_CX*sc} cy={POND_CY*sc} rx={18*sc} ry={8*sc} fill="#1565C0"/>
          <rect x={2200*sc} y={800*sc} width={600*sc} height={400*sc} fill="#66BB6A" opacity="0.5"/>
          {ownedItems.filter(i=>i.type in ANIMAL_COMPS).map((item,i)=>(
            <circle key={i} cx={(item.position?.x||TREE_X)*sc} cy={(item.position?.y||1050)*sc} r={4} fill="#E53935"/>
          ))}
          <rect x={vpX} y={vpY} width={vpW} height={vpH} fill="none" stroke="white" strokeWidth="2" rx="2"/>
        </svg>
      </div>
    </div>
  )
}

// ─── Toast ───────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(()=>{ const t=setTimeout(onDone,3000); return ()=>clearTimeout(t) },[onDone])
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-berry-deep text-white font-bold px-6 py-3 rounded-full shadow-xl text-sm"
         style={{animation:'fadeInUp 0.3s ease-out'}}>
      {msg}
    </div>
  )
}

// ─── Main Garden Component ────────────────────────────────────────
export default function Garden() {
  const navigate = useNavigate()
  const [profile,    setProfile]   = useState(null)
  const [garden,     setGarden]    = useState(null)
  const [userId,     setUserId]    = useState(null)
  const [loading,    setLoading]   = useState(true)
  const [pan,        setPan]       = useState({ x: -180, y: -220 })
  const [zoom,       setZoom]      = useState(0.75)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)
  const panRef       = useRef({ x: -180, y: -220 })
  const zoomRef      = useRef(0.75)
  const dragStartRef = useRef({ x:0, y:0, px:-180, py:-220 })
  const [showShop,        setShowShop]        = useState(false)
  const [selectedAnimal,  setSelectedAnimal]  = useState(null)
  const [toast,           setToast]           = useState(null)
  const [animalPos,       setAnimalPos]       = useState({})

  // Fix frame: match body background to sky colour
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#87CEEB'
    document.documentElement.style.background = '#87CEEB'
    return () => {
      document.body.style.background = prev
      document.documentElement.style.background = ''
    }
  }, [])

  // Load Supabase data
  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }
      setUserId(session.user.id)
      const [{ data: prof }, { data: gard }] = await Promise.all([
        supabase.from('profiles').select('full_name,xp,streak,total_berries_earned').eq('id',session.user.id).single(),
        supabase.from('garden').select('*').eq('user_id',session.user.id).maybeSingle(),
      ])
      setProfile(prof)
      let g = gard
      if (!g) {
        const { data: newG } = await supabase.from('garden').insert({ user_id: session.user.id }).select().single()
        g = newG || { owned_items:[], farm_unlocked:false, trees_count:1 }
      }
      setGarden(g)
      const pos = {}
      ;(g.owned_items||[]).forEach(item => {
        if (item.type in ANIMAL_COMPS || FARM_ANIMAL_TYPES.includes(item.type))
          pos[item.id] = { x: item.position?.x || TREE_X, y: item.position?.y || TREE_Y+120 }
      })
      setAnimalPos(pos)
      setLoading(false)
    }
    load()
  }, [navigate])

  // Animal wandering
  useEffect(() => {
    const t = setInterval(() => {
      setAnimalPos(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(id => {
          const c = next[id]
          next[id] = {
            x: Math.max(800, Math.min(1700, c.x + (Math.random()-0.5)*220)),
            y: Math.max(990, Math.min(1180, c.y + (Math.random()-0.5)*100)),
          }
        })
        return next
      })
    }, 11000)
    return () => clearInterval(t)
  }, [])

  // Wheel zoom (non-passive)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = e => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 0.91
      const nz = Math.max(0.35, Math.min(2.5, zoomRef.current * factor))
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top
      const wX = (cx - panRef.current.x) / zoomRef.current
      const wY = (cy - panRef.current.y) / zoomRef.current
      const np = { x: cx - wX*nz, y: cy - wY*nz }
      panRef.current = np; zoomRef.current = nz
      setPan(np); setZoom(nz)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Touch pan + pinch zoom (non-passive)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let tCount=0, tx=0, ty=0, tDist=0
    const onTouchStart = e => {
      tCount = e.touches.length
      if (tCount===1) { tx=e.touches[0].clientX; ty=e.touches[0].clientY }
      else if (tCount===2)
        tDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY)
    }
    const onTouchMove = e => {
      e.preventDefault()
      if (e.touches.length===1&&tCount===1) {
        const dx=e.touches[0].clientX-tx, dy=e.touches[0].clientY-ty
        const np={x:panRef.current.x+dx,y:panRef.current.y+dy}
        panRef.current=np; setPan({...np})
        tx=e.touches[0].clientX; ty=e.touches[0].clientY
      } else if (e.touches.length===2) {
        const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)
        const nz=Math.max(0.35,Math.min(2.5,zoomRef.current+(d-tDist)*0.01))
        zoomRef.current=nz; setZoom(nz); tDist=d
      }
    }
    el.addEventListener('touchstart',onTouchStart,{passive:false})
    el.addEventListener('touchmove', onTouchMove, {passive:false})
    return ()=>{ el.removeEventListener('touchstart',onTouchStart); el.removeEventListener('touchmove',onTouchMove) }
  }, [])

  useEffect(()=>{ panRef.current=pan  },[pan])
  useEffect(()=>{ zoomRef.current=zoom },[zoom])

  const handleMouseDown = useCallback(e => {
    if (e.button!==0) return
    setIsDragging(true)
    dragStartRef.current={x:e.clientX,y:e.clientY,px:panRef.current.x,py:panRef.current.y}
  },[])
  const handleMouseMove = useCallback(e => {
    if (!isDragging) return
    const np={x:dragStartRef.current.px+(e.clientX-dragStartRef.current.x), y:dragStartRef.current.py+(e.clientY-dragStartRef.current.y)}
    panRef.current=np; setPan(np)
  },[isDragging])
  const handleMouseUp = useCallback(()=>setIsDragging(false),[])

  async function handleBuy(item) {
    if (!userId||!profile||profile.xp<item.cost) return
    try {
      const names=ANIMAL_NAMES[item.id]||[]
      const name=names[Math.floor(Math.random()*names.length)]||item.name
      const newItem={id:`${item.id}_${Date.now()}`,type:item.id,name,bought_at:new Date().toISOString().split('T')[0],position:{x:TREE_X,y:TREE_Y+130}}
      const updatedItems=[...(garden.owned_items||[]),newItem]
      const updates={owned_items:updatedItems,...(item.isFarm?{farm_unlocked:true}:{})}
      await Promise.all([
        supabase.from('profiles').update({xp:profile.xp-item.cost}).eq('id',userId),
        supabase.from('garden').update(updates).eq('user_id',userId),
      ])
      setProfile(p=>({...p,xp:p.xp-item.cost}))
      setGarden(g=>({...g,...updates}))
      if (item.isAnimal) {
        setAnimalPos(prev=>({...prev,[newItem.id]:{x:-100,y:TREE_Y+130}}))
        setTimeout(()=>setAnimalPos(prev=>({...prev,[newItem.id]:{x:TREE_X+200,y:TREE_Y+120}})),80)
      }
      setToast(`🎉 ${name} bog'ingizga qo'shildi!`)
      setShowShop(false)
    } catch { setToast('❌ Xatolik yuz berdi') }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{background:'#87CEEB'}}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-berry-deep flex items-center justify-center mx-auto mb-4 shadow-xl">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"/>
          </div>
          <p className="text-berry-deep font-black text-lg">Bog' yuklanmoqda... 🌿</p>
        </div>
      </div>
    )
  }

  const ownedItems   = garden?.owned_items||[]
  const farmUnlocked = garden?.farm_unlocked||false
  const userXP       = profile?.xp||0
  const animalItems  = ownedItems.filter(i=>i.type in ANIMAL_COMPS)
  const farmAnimals  = ownedItems.filter(i=>FARM_ANIMAL_TYPES.includes(i.type))

  return (
    <div style={{position:'fixed',inset:0,overflow:'hidden',background:'linear-gradient(180deg,#5BBCF0 0%,#87CEEB 50%,#B8E4FF 100%)',outline:'none',border:'none'}}>

      {/* SVG world canvas */}
      <div
        ref={containerRef}
        style={{width:'100%',height:'100%',cursor:isDragging?'grabbing':'grab',overflow:'hidden',userSelect:'none',WebkitUserSelect:'none',outline:'none',border:'none'}}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={()=>setSelectedAnimal(null)}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`${-pan.x/zoom} ${-pan.y/zoom} ${window.innerWidth/zoom} ${window.innerHeight/zoom}`}
          preserveAspectRatio="none"
          style={{display:'block',outline:'none',border:'none'}}
        >
          <SvgDefs/>
          <Sky/>
          <Mountains/>
          <Hills/>
          <GrassPatches/>
          <MicroGrass/>
          <GrassTufts/>
          <Pond/>
          <Flowers/>
          <SmallWildflowers/>
          <Butterflies/>
          <BlueberryTree totalXp={profile?.total_berries_earned || profile?.xp || 0}/>

          {/* Farm (locked banner or buildings + animals) */}
          {farmUnlocked ? (
            <>
              <ellipse cx={2260} cy={1060} rx="420" ry="190" fill="#8D6E63" opacity="0.16"/>
              <Farmhouse/>
              <Barn/>
              {[1860,1910,1960,2010,2060,2110,2160].map((fx,i)=>(
                <g key={i}>
                  <rect x={fx} y={980} width="8" height="55" rx="3" fill="#8D6E63"/>
                  {i<6&&<rect x={fx+4} y={992} width="54" height="8" rx="2" fill="#A1887F"/>}
                  {i<6&&<rect x={fx+4} y={1018} width="54" height="8" rx="2" fill="#A1887F"/>}
                </g>
              ))}
              {farmAnimals.map(item=>{
                const pos=animalPos[item.id]||{x:2100,y:1060}
                return (
                  <g key={item.id} style={{transform:`translate(${pos.x}px,${pos.y}px)`,transition:'transform 10s ease-in-out'}}
                     onClick={e=>{e.stopPropagation();setSelectedAnimal({...item,x:pos.x,y:pos.y})}}>
                    <FarmAnimal type={item.type} name={item.name}/>
                  </g>
                )
              })}
            </>
          ) : (
            <g>
              <rect x={2050} y={830} width="440" height="190" rx="20" fill="#1a1a1a" opacity="0.20"/>
              <rect x={2060} y={840} width="420" height="170" rx="16" fill="white" opacity="0.86"/>
              <text x={2270} y={912} textAnchor="middle" fontSize="22" fill="#3D1F6E" fontWeight="900" fontFamily="system-ui,sans-serif">🏡 Ferma</text>
              <text x={2270} y={944} textAnchor="middle" fontSize="14" fill="#666" fontFamily="system-ui,sans-serif">15,000 🫐 da ochiladi</text>
              <rect x={2110} y={960} width="320" height="10" rx="5" fill="#E0E0E0"/>
              <rect x={2110} y={960} width={Math.min(320,(userXP/15000)*320)} height="10" rx="5" fill="#7B5EA7"/>
              <text x={2270} y={990} textAnchor="middle" fontSize="12" fill="#9E9E9E" fontFamily="system-ui,sans-serif">{userXP.toLocaleString()} / 15,000 🫐</text>
            </g>
          )}

          {/* Garden animals */}
          {animalItems.map(item=>{
            const AnimalComp=ANIMAL_COMPS[item.type]
            const pos=animalPos[item.id]||{x:TREE_X+200,y:TREE_Y+120}
            return (
              <g key={item.id} style={{transform:`translate(${pos.x}px,${pos.y}px)`,transition:'transform 10s ease-in-out'}}
                 onClick={e=>{e.stopPropagation();setSelectedAnimal({...item,x:pos.x,y:pos.y})}}>
                <AnimalComp name={item.name}/>
              </g>
            )
          })}

          {/* Direction hint */}
          <g opacity="0.32" style={{pointerEvents:'none'}}>
            <text x={2700} y={1095} fontSize="16" fill="#1B5E20" fontFamily="system-ui,sans-serif">→ Ferma tomonga</text>
            <text x={2700} y={1118} fontSize="12" fill="#388E3C" fontFamily="system-ui,sans-serif">Sichqoncha bilan siljiting</text>
          </g>
        </svg>
      </div>

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3">
        <button onClick={()=>navigate('/dashboard')}
          className="bg-white/90 backdrop-blur-sm text-berry-deep font-bold px-4 py-2 rounded-full shadow-md hover:bg-white transition-all text-sm">
          ← Orqaga
        </button>
        <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-md">
          <span className="font-black text-berry-deep text-sm">🌿 Mening Bog'im</span>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-md">
          <span className="font-black text-yellow-600 text-sm">🫐 {userXP.toLocaleString()}</span>
        </div>
      </div>

      {/* Zoom buttons */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
        {[
          ['+', ()=>{ const nz=Math.min(2.5,zoom*1.2); setZoom(nz); zoomRef.current=nz }],
          ['−', ()=>{ const nz=Math.max(0.35,zoom/1.2); setZoom(nz); zoomRef.current=nz }],
          ['⌂', ()=>{ const np={x:-180,y:-220}; setPan(np); panRef.current=np; setZoom(0.75); zoomRef.current=0.75 }],
        ].map(([label, fn], i)=>(
          <button key={i} onClick={fn}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-md font-black text-berry-deep hover:bg-white flex items-center justify-center text-lg transition-all">
            {label}
          </button>
        ))}
      </div>

      {/* Shop button */}
      <button onClick={()=>setShowShop(true)}
        className="fixed bottom-24 right-4 md:bottom-6 z-30 w-16 h-16 bg-berry-deep text-white rounded-full shadow-2xl flex items-center justify-center text-2xl hover:bg-berry-dark hover:scale-110 transition-all">
        🛒
      </button>

      <MiniMap pan={pan} zoom={zoom} ownedItems={ownedItems}/>

      {selectedAnimal&&(
        <AnimalPopup animal={selectedAnimal} pan={pan} zoom={zoom} onClose={()=>setSelectedAnimal(null)}/>
      )}

      <ShopPanel open={showShop} onClose={()=>setShowShop(false)}
        userXP={userXP} ownedItems={ownedItems} farmUnlocked={farmUnlocked} onBuy={handleBuy}/>

      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
    </div>
  )
}
