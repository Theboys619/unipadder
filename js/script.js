const socket = io("localhost:65515");
let soundlist = [];
let sounds = [];
let keyLED = [];
let ledChain = []; // Structure: Page: [ Led: [ Data/Sequence: "o 1 1 a 3..."], [] ], []
let ledData = [];
let velocities = "245,245,245\n118,146,169\n155,193,221\n200,218,245\n219,101,137\n191,10,19\n165,4,15\n105,14,20\n209,204,198\n199,73,1\n222,92,0\n134,44,11\n213,189,102\n216,229,23\n159,196,0\n98,129,2\n131,239,124\n134,255,90\n29,204,6\n15,143,11\n107,239,181\n0,216,42\n0,155,15\n0,85,14\n79,213,158\n22,237,131\n0,192,57\n1,126,16\n93,224,175\n17,213,167\n12,208,152\n0,146,106\n99,218,224\n66,222,227\n15,201,201\n0,171,156\n148,229,255\n133,228,255\n33,175,254\n0,136,221\n152,222,255\n92,195,255\n19,144,255\n0,94,195\n99,156,255\n53,124,255\n26,97,247\n1,56,189\n130,145,255\n86,128,255\n59,91,244\n21,49,183\n208,182,255\n204,142,255\n175,102,250\n109,56,175\n214,145,200\n203,49,164\n154,23,112\n106,15,62\n209,24,26\n157,67,7\n123,121,0\n45,83,12\n1,106,14\n0,142,96\n3,95,229\n48,121,255\n0,135,204\n45,99,247\n144,184,224\n50,79,111\n218,21,33\n160,241,100\n174,238,15\n112,255,49\n7,236,53\n106,236,225\n131,226,255\n72,170,255\n82,141,255\n144,144,255\n183,121,221\n81,54,22\n225,103,11\n127,219,13\n134,255,101\n61,255,135\n119,255,166\n129,241,216\n161,243,255\n147,210,255\n105,189,255\n117,157,255\n178,144,255\n217,80,221\n217,129,9\n170,190,3\n120,250,18\n128,156,3\n105,94,6\n1,196,82\n17,186,151\n43,83,167\n41,111,235\n176,140,120\n198,12,21\n218,135,128\n229,165,90\n222,236,122\n196,255,153\n128,255,60\n48,92,187\n225,243,229\n183,252,251\n176,213,255\n174,213,255\n107,132,166\n171,197,240\n211,237,255\n189,13,27\n101,9,14\n31,253,86\n0,142,28\n172,195,4\n101,106,5\n193,160,0\n148,52,9\n5,5,5".split("\n");
let vel2color = [];
let chains;

for (let i in velocities) {
    velocities[i] = velocities[i].replace(/\./gi, ',');
    vel2color[i] = `rgba(${velocities[i]}, 1)`
}
var conversion8x8 = [81, 82, 83, 84, 85, 86, 87, 88, 71, 72, 73, 74, 75, 76, 77, 78, 61, 62, 63, 64, 65, 66, 67, 68, 51, 52, 53, 54, 55, 56, 57, 58, 41, 42, 43, 44, 45, 46, 47, 48, 31, 32, 33, 34, 35, 36, 37, 38, 21, 22, 23, 24, 25, 26, 27, 28, 11, 12, 13, 14, 15, 16, 17, 18];
var conversion9x9 = [104, 105, 106, 107, 108, 109, 110, 111, 0, 81, 82, 83, 84, 85, 86, 87, 88, 89, 71, 72, 73, 74, 75, 76, 77, 78, 79, 61, 62, 63, 64, 65, 66, 67, 68, 69, 51, 52, 53, 54, 55, 56, 57, 58, 59, 41, 42, 43, 44, 45, 46, 47, 48, 49, 31, 32, 33, 34, 35, 36, 37, 38, 39, 21, 22, 23, 24, 25, 26, 27, 28, 29, 11, 12, 13, 14, 15, 16, 17, 18, 19]

var pages = [89, 79, 69, 59, 49, 39, 29, 19];
var pageconversion = [0, 1, 2, 3, 4, 5, 6, 7];

let keySounds = [];
let sequenceData = []; // Structure: Page: [ Led: [ Sequence#: 0], [] ], []
let sequences = []; // Structure: Page: [ Led: [ #OfSequences: 2 ] ], []
let soundData = []; // Structure: Page: [ KeyLed: Sequence: ["001.wav", "002.wav"], ["003.wave"] ], [], []
let autoPlayData = [];
let pressedKey = [];
let projectdata = []; // Structure: Page: [ KeyY: [ KeyX: 0, 1, 2], [0,1,2], [] ], [ [], [] ]
let keyColors = [];
let pageNum = 0;
let start = false;
let sockets = [];
let socketnum = 0;
let soundsp = [];
let soundplay;
let unipacksdata = [];

let keyX = 8;
let keyY = 8;
let keyLength = keyX * keyY;
let fps = 1000;

socket.emit("GetSongs");

socket.on("SetSongs", function(unipacks) {
  unipacksdata = unipacks;
  unipacks.forEach(function(item, i) {
    document.getElementById('songlist').innerHTML += `<div><a href='#' onclick="setUnipack('${item.foldername}')">${item.title} by ${item.producername}</a></div>`;
  });
});

function setUnipack(song) {
  document.getElementById('LoadState').innerText = "LoadState: Loading!";
  socket.emit("PlayUnipack", song);
}

socket.on("PlaySound", function(filename) {
  sounds[soundlist.indexOf(filename)].play();
});
socket.on("LoadSounds", function(songs, songname) {
  soundlist = songs;
  for (let i in songs) {
    sounds[i] = new Howl({
      src: `/songs/${songname}/Sounds/${songs[i]}`
    }); //p5.prototype.loadSound(`${window.location.href}songs/${songname}/Sounds/${songs[i]}`);
  }
});

socket.on("Loaded", function(data) {
    document.getElementById('LoadState').innerText = "LoadState: Loading!";
    keyLED = data.keyLED;
    ledData = data.ledData;
    autoPlayData = data.autoPlayData;
    keyColors = data.keyColors;
    projectdata = data.data;
    keySounds = data.keySounds;
    pressedKey = data.pressedKey;
    keyX = data.keyX;
    keyY = data.keyY;
    keyLength = keyX * keyY;
    chains = data.chain;
    sockets = data.sockets;
    socketnum = sockets;
    setData();
});

socket.on("LPPlayLed", function(page, led, sequence, start) {
  pageNum = page;
  sequenceData[pageNum][led] = sequence;
  let data = ledChain[page][led][sequence];
  if (typeof data != "undefined") {
    Led(page, led, sequence, 0);
  } else {
    Led(page, led, 0, 0);
  }
});

socket.on("LPPageChange", function(page) {
  pageNum = page;
});

// Audio Init and LedInit
function setData() {
    for (let i = 0; i < chains; i++) {
        soundData[i] = [];
        sequenceData[i] = [];
        sequences[i] = [];
        ledChain[i] = [];
        for (let j = 0; j < keyLength; j++) {
            soundData[i][j] = [];
            sequenceData[i][j] = [];
            sequences[i][j] = [];
            ledChain[i][j] = []
            pressedKey[j] = 0;
            keyColors[j] = 0;
        }
    }
    let lines = keySounds;
    for (let i = 0; i < lines.length; i++) {
        let sequence = 0;
        let data = lines[i].replace(/\r/, "").split(" ");
        if (data.length == 4) {
            let chain = parseInt(data[0] - 1);
            let keynumx = parseInt(data[1] - 1);
            let keynumy = parseInt(data[2] - 1);
            let sound = data[3];
            let led = keynumx * keyY + keynumy

            if (soundData[chain][led].length >= 1) {
                sequences[chain][led] = soundData[chain][led].length;
            } else {
                sequences[chain][led] = 0;
            }
            sequenceData[chain][led] = 0;
            soundData[chain][led][sequences[chain][led]] = sound;
        }
    }
    for (let j = 0; j < keyLED.length; j++) {
        let data = keyLED[j].split(" ");
        let chain = parseInt(data[0]) - 1;
        let keynumx = parseInt(data[1]) - 1;
        let keynumy = parseInt(data[2]) - 1;
        let led = keynumx * keyY + keynumy;
        let repeat = parseInt(data[3]);
        let keyLData = ledData[j].split("\n");

        ledChain[chain][led].push(keyLData);
        if (repeat != 0) {
            for (let k = 0; k < repeat - 1; k++) {
                ledChain[chain][led][ledChain[chain][led].length-1].concat(keyLData);
            }
        }
    }
    start = true;
    document.getElementById('LoadState').innerText = "LoadState: Loaded!";
}
//
//Play Audio
function playAudio(led) {
    sounds[soundlist.indexOf(soundData[pageNum][led][sequenceData[pageNum][led]])].play();

    sequenceData[pageNum][led] = (sequenceData[pageNum][led]+1) % (sequences[pageNum][led]+1);
}

//Leds
function Led(page, key, sequencenum, i) {
    let delay = 0;
    let data = ledChain[page][key][sequencenum];

    if (typeof data == 'undefined') {
        data = ledChain[page][key][0];
    }

    if (i < data.length) {
        let specific = data[i].split(' ');
        let toLower = specific[0].toLowerCase();

        if (specific.length > 0) {
            if (toLower === "d" || toLower === "delay") {
                delay = parseInt(specific[1] - 1);
            } else if (toLower === "o" || toLower === "on") {
                let x = parseInt(specific[1]) - 1;
                let y = parseInt(specific[2]) - 1;
                let colorCode = specific[3];
                let vel = parseInt(specific[4]);

                if (colorCode.toLowerCase() === "a" || colorCode.toLowerCase() === "auto") {
                    LedOn(x, y, false, vel);
                } else {
                    LedOn(x, y, colorCode, vel);
                }
            } else if (toLower === "f" || toLower === "off") {
                let x = parseInt(specific[1]) - 1;
                let y = parseInt(specific[2]) - 1;
                LedOff(x, y);
            }
        }

        if (delay < 0) {
          delay = 0;
        }

        if (delay >= 1) {
            setTimeout(Led, delay+(1000/fps), page, key, sequencenum, i+1);
        } else {
            Led(page, key, sequencenum, i+1);
        }
    }
}

document.onkeydown = function(e) {
	if (e.keyCode == 32) {
        socket.emit("Launchpad", socketnum);
	} else if (e.keyCode > 48 && e.keyCode < 57) {
        pageNum = (e.keyCode-1) % chains
  }
}

let canv;
let buttonsize = 50;
let spacingx = 5;
let spacingy = 5;

function setup() {
    canv = createCanvas(555, 555);
    canv.parent("launchpad");
}

function draw() {
    background(40);
    if (start) {
        for (let i = 0; i < keyLength; i++) {
            let x = i % keyX;
            let y = Math.floor(i / keyY);
            if (pressedKey[i] > 0) {
                fill(vel2color[keyColors[i]]);
            } else {
                fill(125);
            }
            rect(x*(buttonsize + spacingx) + buttonsize, y*(buttonsize + spacingy) + buttonsize, buttonsize, buttonsize);
        }
        translate(3*(buttonsize + spacingx) + buttonsize, 4*(buttonsize + spacingy) + buttonsize-3);
        rotate(-0.78);
        fill(40)
        noStroke();
        rect(17, 17, buttonsize-10, buttonsize-10);
    }
}

function LedOn(x, y, colorCode, vel) {
    let led = x * keyY + y;
    pressedKey[led] = 1;
    if (colorCode) {
        keyColors[led] = 0;
    } else if (vel) {
        keyColors[led] = parseInt(vel);
    }
}

function LedOff(x, y) {
    let led = x * keyY + y;
    pressedKey[led] = 0;
    keyColors[led] = 0;
}

function mousePressed() {
    let x = Math.floor(mouseX / (buttonsize + spacingx)) - 1;
    let y = Math.floor(mouseY / (buttonsize + spacingy)) - 1;
    let led = y * keyY + x;
    if (x >= 0 && y >= 0 && y < keyY && x < keyX) {
        if (ledChain[pageNum][led].length > 0) {
          Led(pageNum, led, sequenceData[pageNum][led], 0);
        }
        playAudio(led);
    }
}
