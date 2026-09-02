/* Arena standings — which model is best at which job.
 *
 * Ported from checkmysite.pro, which keeps the same snapshot. The figures,
 * sources and per-board dates below are copied verbatim rather than retyped:
 * they are the whole value, and a transcription slip would be invisible.
 *
 * Every number is an Elo from PAIRWISE HUMAN COMPARISON — two outputs from
 * the same prompt, shown without labels, a person picks one. Not a benchmark.
 *
 * A snapshot, not a feed. The date it was captured is shown on the page, and
 * the boards do not update together, so several carry their own older date.
 * When it goes stale, re-copy it from the source boards linked in each entry.
 */

export const ARENAS = {
  captured: '2026-07-30',
  categories: [

    { key:'image', name:'making images', sub:'text to image',
      why:'You describe a picture and the model draws it. This is the board to read if you want one general-purpose image model.',
      source:'Artificial Analysis Image Arena',
      url:'https://artificialanalysis.ai/image/leaderboard/text-to-image',
      note:'arena.ai runs a separate image board with 5.69M votes that breaks out by subject \u2014 Art, Portraits, Photorealistic, Cartoon, Product, 3D, Text rendering. Worth reading if your work sits in one of those rather than being general.',
      models:[
        {n:'GPT Image 2 (high)',        org:'OpenAI',        elo:1340},
        {n:'Reve 2.1',                  org:'Reve',          elo:1299},
        {n:'MAI-Image-2.5',             org:'Microsoft',     elo:1270},
        {n:'Nano Banana 2',             org:'Google',        elo:1263},
        {n:'GPT Image 1.5 (high)',      org:'OpenAI',        elo:1263}
      ],
      open:[
        {n:'Cosmos3-Super-Text2Image',  org:'open weights',  elo:1219},
        {n:'HiDream-O1-Image-Dev',      org:'open weights',  elo:1190},
        {n:'Cosmos3-Super-4Step',       org:'open weights',  elo:1184}
      ]},

    { key:'music', name:'making music', sub:'instrumental',
      why:'A written prompt becomes a piece of music. Instrumental and vocal tracks are ranked separately because models are not equally good at both.',
      source:'Artificial Analysis Music Arena',
      url:'https://artificialanalysis.ai/music/leaderboard/instrumental',
      models:[
        {n:'Suno V5.5',   org:'Suno',    elo:1190},
        {n:'Mureka V8',   org:'Mureka',  elo:1166},
        {n:'Suno V5',     org:'Suno',    elo:1160},
        {n:'Lyria 3 Pro', org:'Google',  elo:1120},
        {n:'Suno V4.5',   org:'Suno',    elo:1085}
      ]},

    { key:'song', name:'making songs', sub:'music with vocals',
      why:'The same arena, judged on tracks that include singing. The order shifts, which is the point of ranking them apart.',
      source:'Artificial Analysis Music Arena',
      url:'https://artificialanalysis.ai/music/leaderboard/vocals',
      models:[
        {n:'Suno V5.5',   org:'Suno',    elo:1156},
        {n:'Mureka V8',   org:'Mureka',  elo:1144},
        {n:'Lyria 3 Pro', org:'Google',  elo:1089},
        {n:'Suno V5',     org:'Suno',    elo:1086},
        {n:'Suno V4.5',   org:'Suno',    elo:1077}
      ]},

    { key:'video', name:'making video', sub:'text to video',
      why:'A prompt becomes moving footage. Scores below are for video without generated audio, where the field is strongest.',
      source:'Artificial Analysis Video Arena',
      url:'https://artificialanalysis.ai/video/leaderboard/text-to-video',
      note:'With generated audio the order changes: Gemini Omni Flash 1245, Dreamina Seedance 2.0 720p 1225, Wan2.7 1163.',
      models:[
        {n:'Gemini Omni Flash',         org:'Google',     elo:1324},
        {n:'HappyHorse-1.0',            org:'HappyHorse', elo:1284},
        {n:'Dreamina Seedance 2.0 720p',org:'ByteDance',  elo:1266},
        {n:'HappyHorse-1.1',            org:'HappyHorse', elo:1264},
        {n:'Wan2.7-260612',             org:'Alibaba',    elo:1240}
      ]},

    { key:'animate', name:'animating a still', sub:'image to video',
      why:'You give it a picture instead of a prompt and it moves. A different job from text-to-video, and a different order.',
      source:'Artificial Analysis Video Arena',
      url:'https://artificialanalysis.ai/video/leaderboard/image-to-video',
      models:[
        {n:'Gemini Omni Flash',          org:'Google',    elo:1369},
        {n:'Dreamina Seedance 2.0 720p', org:'ByteDance', elo:1340},
        {n:'grok-imagine-video-1.5',     org:'xAI',       elo:1328},
        {n:'PixVerse V6',                org:'PixVerse',  elo:1328},
        {n:'grok-imagine-video',         org:'xAI',       elo:1326}
      ]},

    { key:'voice', name:'making voices', sub:'text to speech',
      why:'Written text read aloud. Judged on how natural the result sounds, not on transcription accuracy.',
      source:'Artificial Analysis Speech Arena',
      url:'https://artificialanalysis.ai/text-to-speech/leaderboard/provider-voice',
      models:[
        {n:'Simba 3.2',               org:'Simba',   elo:1229},
        {n:'Qwen-Audio-3.0-TTS-Plus', org:'Alibaba', elo:1227},
        {n:'Gemini 3.1 Flash TTS',    org:'Google',  elo:1213},
        {n:'Luna TTS',                org:'Luna',    elo:1203},
        {n:'Sonic 3.5',               org:'Cartesia',elo:1202}
      ],
      open:[
        {n:'Fish Audio S2 Pro',  org:'open weights', elo:1123},
        {n:'Step Audio EditX',   org:'open weights', elo:1109},
        {n:'Voxtral TTS',        org:'open weights', elo:1072}
      ]},

    { key:'code', name:'writing code', sub:'code arena',
      why:'A dedicated arena for programming, separate from the general text board \u2014 more relevant than a general model\u2019s coding slice.',
      source:'Arena \u00b7 Code Arena',
      url:'https://arena.ai/leaderboard',
      dated:'2026-04-09',
      models:[
        {n:'Claude Opus 4.6 Thinking', org:'Anthropic', elo:1548},
        {n:'Claude Opus 4.6',          org:'Anthropic', elo:1542},
        {n:'GLM-5.1',                  org:'Zhipu',     elo:1530}
      ]},

    { key:'vision', name:'understanding images', sub:'vision arena',
      why:'Reading a picture rather than drawing one \u2014 describing it, answering questions about it, pulling text out of it.',
      source:'Arena \u00b7 Vision Arena',
      url:'https://arena.ai/leaderboard',
      dated:'2026-04-10',
      models:[
        {n:'Claude Opus 4.6 Thinking', org:'Anthropic', elo:1302},
        {n:'Muse-Spark',               org:'Meta',      elo:1293},
        {n:'Claude Opus 4.6',          org:'Anthropic', elo:1289},
        {n:'Gemini 3 Pro',             org:'Google',    elo:1288}
      ]}
  ],

  /* Named so it cannot be quietly omitted. */
  gaps:[
    {name:'finance', why:'No credible leaderboard measures it. Arena\u2019s Occupational category is the nearest thing and is far broader. Anyone publishing a "best AI for finance" ranking has invented it.'},
    {name:'law, medicine, any profession', why:'Same problem. Domain expertise is not something the public arenas measure separately, and the stakes are too high for a proxy.'}
  ]
};
