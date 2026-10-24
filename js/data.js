// The game's data, taken from the paper prototype's builders (Tools/bdi712/build_layers.py, build_fortune.py), so the
// web version plays by the same rules as the printed boards. Positions are in millimetres on the printed boards.

export const MAP = {
 "size_mm": [
  420.0,
  297.0
 ],
 "board_w_mm": 296,
 "scenes": {
  "I": [
   12,
   203,
   120,
   80
  ],
  "II": [
   168,
   203,
   120,
   80
  ],
  "III": [
   168,
   110,
   120,
   80
  ],
  "IV": [
   12,
   110,
   120,
   80
  ],
  "V": [
   90,
   17,
   120,
   80
  ]
 },
 "chapter_name": {
  "I": "I \u00b7 Endless Nightmare",
  "II": "II \u00b7 Shadowborn",
  "III": "III \u00b7 Souls Alike",
  "IV": "IV \u00b7 What It Is Now",
  "V": "V"
 },
 "stones": [
  [
   26.0,
   272.0
  ],
  [
   48.01,
   262.57
  ],
  [
   70.85,
   268.1
  ],
  [
   94.07,
   266.42
  ],
  [
   115.44,
   255.6
  ],
  [
   136.97,
   245.73
  ],
  [
   160.08,
   250.02
  ],
  [
   181.74,
   260.3
  ],
  [
   204.5,
   267.7
  ],
  [
   227.99,
   264.04
  ],
  [
   250.94,
   257.08
  ],
  [
   271.76,
   246.15
  ],
  [
   279.43,
   223.77
  ],
  [
   276.04,
   200.14
  ],
  [
   265.73,
   178.68
  ],
  [
   243.46,
   180.06
  ],
  [
   220.31,
   178.18
  ],
  [
   197.15,
   175.5
  ],
  [
   174.21,
   178.11
  ],
  [
   152.6,
   168.56
  ],
  [
   128.7,
   168.21
  ],
  [
   106.35,
   176.85
  ],
  [
   83.21,
   173.45
  ],
  [
   60.1,
   172.46
  ],
  [
   37.51,
   176.35
  ],
  [
   23.6,
   157.86
  ],
  [
   26.7,
   134.3
  ],
  [
   42.91,
   117.35
  ],
  [
   63.87,
   105.67
  ],
  [
   84.62,
   93.62
  ],
  [
   106.44,
   83.73
  ],
  [
   130.07,
   79.67
  ],
  [
   153.85,
   76.68
  ],
  [
   174.78,
   65.27
  ]
 ],
 "chapter_of": [
  "I",
  "I",
  "I",
  "I",
  "I",
  "I",
  "I",
  "II",
  "II",
  "II",
  "II",
  "II",
  "II",
  "II",
  "III",
  "III",
  "III",
  "III",
  "III",
  "III",
  "IV",
  "IV",
  "IV",
  "IV",
  "IV",
  "IV",
  "IV",
  "IV",
  "IV",
  "IV",
  "V",
  "V",
  "V",
  "V"
 ],
 "first": {
  "I": 0,
  "II": 7,
  "III": 14,
  "IV": 20,
  "V": 30
 },
 "specials": {
  "1": [
   "night",
   "the town at night"
  ],
  "3": [
   "night",
   "the town in the storm"
  ],
  "4": [
   "up",
   "the tower stairs",
   7
  ],
  "9": [
   "up",
   "the launch on the wind",
   12
  ],
  "16": [
   "back",
   "a wrong portal",
   14
  ],
  "17": [
   "up",
   "surfacing through a floor",
   19
  ],
  "21": [
   "night",
   "Dhaka in winter fog"
  ],
  "24": [
   "night",
   "Dhaka, a hundred years later"
  ],
  "25": [
   "up",
   "the overpass",
   29
  ],
  "28": [
   "back",
   "the interchange",
   20
  ],
  "31": [
   "up",
   "the rise into the hills",
   32
  ]
 },
 "waypoints": [
  [
   26,
   272
  ],
  [
   52,
   262
  ],
  [
   80,
   270
  ],
  [
   108,
   260
  ],
  [
   128,
   248
  ],
  [
   150,
   246
  ],
  [
   176,
   258
  ],
  [
   208,
   268
  ],
  [
   240,
   260
  ],
  [
   268,
   250
  ],
  [
   279,
   228
  ],
  [
   276,
   200
  ],
  [
   262,
   176
  ],
  [
   234,
   182
  ],
  [
   206,
   174
  ],
  [
   180,
   180
  ],
  [
   160,
   170
  ],
  [
   130,
   168
  ],
  [
   100,
   178
  ],
  [
   70,
   170
  ],
  [
   42,
   178
  ],
  [
   24,
   160
  ],
  [
   30,
   128
  ],
  [
   60,
   108
  ],
  [
   100,
   86
  ],
  [
   128,
   80
  ],
  [
   156,
   76
  ],
  [
   178,
   62
  ],
  [
   182,
   44
  ]
 ]
};

export const STREETS = {
 "size_mm": [
  297.0,
  210.0
 ],
 "board_w_mm": 212,
 "junctions": {
  "S": [
   105,
   186
  ],
  "J1": [
   55,
   160
  ],
  "J2": [
   105,
   152
  ],
  "J3": [
   155,
   160
  ],
  "J4": [
   36,
   122
  ],
  "J5": [
   82,
   118
  ],
  "J6": [
   128,
   118
  ],
  "J7": [
   174,
   122
  ],
  "GA": [
   34,
   84
  ],
  "GB": [
   105,
   82
  ],
  "GC": [
   176,
   84
  ]
 },
 "streets": [
  [
   "S",
   "J1"
  ],
  [
   "S",
   "J2"
  ],
  [
   "S",
   "J3"
  ],
  [
   "J1",
   "J2"
  ],
  [
   "J2",
   "J3"
  ],
  [
   "J1",
   "J4"
  ],
  [
   "J1",
   "J5"
  ],
  [
   "J2",
   "J5"
  ],
  [
   "J2",
   "J6"
  ],
  [
   "J3",
   "J6"
  ],
  [
   "J3",
   "J7"
  ],
  [
   "J4",
   "J5"
  ],
  [
   "J5",
   "J6"
  ],
  [
   "J6",
   "J7"
  ],
  [
   "J4",
   "GA"
  ],
  [
   "J5",
   "GA"
  ],
  [
   "J5",
   "GB"
  ],
  [
   "J6",
   "GB"
  ],
  [
   "J6",
   "GC"
  ],
  [
   "J7",
   "GC"
  ]
 ],
 "refuges": {
  "A": {
   "name": "the cover",
   "gate": "GA",
   "rect_mm": [
    14,
    18,
    42,
    42
   ]
  },
  "B": {
   "name": "the stairwell light",
   "gate": "GB",
   "rect_mm": [
    84,
    14,
    42,
    42
   ]
  },
  "C": {
   "name": "the footbridge",
   "gate": "GC",
   "rect_mm": [
    155,
    18,
    42,
    42
   ]
  }
 }
};

// The fortune teller: numbers 1-8 clockwise from the top. Spelling a word opens and closes the teller once per letter;
// an odd count opens it onto 2, 3, 6, 7 and an even count onto 1, 4, 5, 8. Each set moves 1, 2, 3 and 4 once.
export const TELLER = {
  words: [
    { word: 'NIGHT', bg: '#1E2F5C', fg: '#F7F3EA' },
    { word: 'STORM', bg: '#4A5560', fg: '#F7F3EA' },
    { word: 'HALL', bg: '#C9A24A', fg: '#2A2620' },
    { word: 'POOL', bg: '#3E9E9B', fg: '#F7F3EA' },
  ],
  odd: [2, 3, 6, 7],
  even: [1, 4, 5, 8],
  moves: { 1: 1, 2: 3, 3: 2, 4: 4, 5: 2, 6: 1, 7: 4, 8: 3 },
  // her subconscious: the author's revised writing (2026-10-23)
  lines: {
    1: 'Where did you hide last night? Would you return?',
    2: 'Which gate is the Returner watching tonight?',
    3: 'Which refuge does the notebook remember most?',
    4: 'Is a gold ring within reach? Where would it lead?',
    5: 'Which word did you spell? Which numbers appeared?',
    6: 'Are you following the same path as last night?',
    7: 'Is this number a choice, or has it become a habit?',
    8: 'How far away is the next night stone?',
  },
};

// The pictures: WWLO's own renders (Desktop/WWLO Best screenshots; chapter III is the Maze, Lake and Lane render,
// graded to night). Swap any file in img/ to change a place.
export const IMAGES = {
  title: 'img/title.jpg',
  chapters: { I: 'img/ch1.jpg', II: 'img/ch2.jpg', III: 'img/ch3.jpg', IV: 'img/ch4.jpg', V: 'img/ch5.jpg' },
  nights: {
    'the town at night': 'img/night_town_night.jpg',
    'the town in the storm': 'img/night_town_storm.jpg',
    'Dhaka in winter fog': 'img/night_dhaka_fog.jpg',
    'Dhaka, a hundred years later': 'img/night_dhaka_100.jpg',
  },
  refuges: { A: 'img/refuge_A.jpg', B: 'img/refuge_B.jpg', C: 'img/refuge_C.jpg' },
};

// After play, as on the printed turn logs (L1-L6, Q1-Q7, kept so v1 and v2 compare), with one statement and one
// question added in v2 for its lit and dark streets
export const STATEMENTS = [
 "The Returner seemed to learn where I hid.",
 "I could see the danger before the night started.",
 "Choosing a different refuge made a difference.",
 "I wanted to go back to the refuge that had worked before.",
 "Meeting the Returner felt like another try, not a “game over”.",
 "I understood how the fortune teller, the map and the streets fed each other.",
 "The lit streets pulled me back the same way."
];
export const QUESTIONS = [
 "What was the Returner doing? How did it choose its gate?",
 "When you met the Returner: your doing, or bad luck?",
 "When a refuge was watched, what did you do? Why?",
 "Did the questions under the flaps change what you picked?",
 "What was confusing?",
 "What would make it fairer, or more frightening?",
 "(after explaining) Does a Returner that learns where you hide feel fair?",
 "What did the lit and dark streets make you do?"
];
