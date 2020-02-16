const fs = require('fs');
const path = require("path");
const app = require("express")();
const express = require("express");
const server = require("http").Server(app);
const io = require("socket.io")(server);
const client = require('discord-rich-presence')('678434014130077705');

const port = 65515;

app.get("/", function (req, res) {
	res.sendFile("/pages/index.html", {root: '.'});
});

app.use('/js', express.static(__dirname + '/js'));
app.use('/pages', express.static(__dirname + '/pages'));
app.use('/songs', express.static(__dirname + '/songs'));

const nl = require("novation-launchpadmk2");

const launchpad = new nl.Launchpad("Launchpad MK2", true);
let lp;

let keyLED = [];
let ledData = []
let soundFiles = [];
let soundData = [];
let keySounds = [];
let autoPlayData = [];
let pressedKey = [];
let data = [];
let keyColors = [];
let sequences = [];
let sequenceData = []
let ledChain = [];
let fps = 1500;
let pageNum = 0;

let projectinfo = JSON.parse('{"title": "None", "producername": "None", "buttonx": 8, "buttony": 8, "chain": 6, "squarebutton": "true", "landscape": "true" }')

let songname = "_Spectre";

function getUnipacks(cb) {
  let unipacks = []; // Example: { songname: { title: "Alan - Walker", producername: "Clement Show" } }
  fs.readdir(`./songs/`, function(err, folders) {
    for (let i in folders) {
			unipacks.push({ foldername: folders[i], title: "", producername: "", buttonx: 8, buttony: 8, chain: 6, squarebutton: true, landscape: true });
      fs.readdir(`./songs/${folders[i]}/`, function(err, files) {
        for (let j in files) {
          if (files[j].toLowerCase() === "info") {
						let data = fs.readFileSync(path.join(__dirname, `./songs/${folders[i]}/${files[j]}`), "utf-8");
						let lines = data.split("\n")
						for (let k in lines) {
							let info = lines[k].split("=");
							let header = info[0].toLowerCase();

							unipacks[i][header] = info[1];
						}
          }
        }
      });
    }
		setTimeout(cb, 1000, unipacks);
  });
}


function startProject(cb) {
  fs.readdir(`./songs/${songname}/keyLED`, function (err, files) {
    keyLED = files;
    for (let i = 0; i < files.length; i++) {
      fs.readFile(`./songs/${songname}/keyLED/${keyLED[i]}`, "utf-8", function (err, data) {
        ledData[i] = data;
      });
    }
  });


  fs.readdir(`./songs/${songname}/Sounds`, function (err, files) {
    soundFiles = files;
  });

  fs.readdir(`./songs/${songname}/`, function (err, files) {
    for (let i in files) {
      let file = files[i].toLowerCase();
      setPackInfo(file, files[i]);
    }
  });

	if (typeof cb === 'function') {
		setTimeout(cb, 7000);
	}
}

startProject();

function setPackInfo(filetype, file) {
  if (filetype === "keysound") {
    fs.readFile(`./songs/${songname}/${file}`, "utf-8", function(err, data) {
      let lines = data.split("\n");
      keySounds = lines;
    });
  } else if (filetype === "info") {
    fs.readFile(`./songs/${songname}/${file}`, "utf-8", function(err, data) {
      let lines = data.split("\n");
      for (let i in lines) {
        let info = lines[i].split("=");
        let header = info[0].toLowerCase();

        projectinfo[header] = info[1];
      }
      client.updatePresence({
        state: 'Playing a Song on Launchpad!',
        details: `Unipack ${projectinfo.title} by ${projectinfo.producername}`,
        largeImageKey: 'unipad',
        largeImageText: 'Playing Unipad',
        smallImageKey: 'novation',
        smallImageText: `Playing ${projectinfo.title}`,
        instance: true,
      });
    });
  } else if (filetype === "autoplay") {
    fs.readFile(`./songs/${songname}/${file}`, "utf-8", function(err, data) {
      let lines = data.split("\n");
      autoPlayData = lines;
    });
  }
}

function getData() {
	for (let i = 0; i < projectinfo.chain; i++) {
    data[i] = [];
		soundData[i] = [];
		sequenceData[i] = [];
		sequences[i] = [];
		ledChain[i] = [];
		for (let j = 0; j < projectinfo.buttonx * projectinfo.buttony; j++) {
			data[i][j] = [];
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
					let led = keynumx * projectinfo.buttony + keynumy

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
			let led = keynumx * projectinfo.buttony + keynumy;
			let repeat = parseInt(data[3]);
			let keyLData = ledData[j].replace(/\r/g, "").split("\n");

			ledChain[chain][led].push(keyLData);
			if (repeat != 0) {
					for (let k = 0; k < repeat - 1; k++) {
							ledChain[chain][led][ledChain[chain][led].length-1].concat(keyLData);
					}
			}
	}
	if (!lp) {
		launchpad.getDevice();
		lp = true;
	}
}

launchpad.on("DeviceReady", function() {
  console.log("Launchpad is Ready!");
});

let sockets = [];
let lpsocket = 0;
let funcdraw;

io.on("connection", function(socket) {
	sockets.push(socket);

  if (soundFiles) {
    socket.emit("LoadSounds", soundFiles, songname);
    getData();
    socket.emit("Loaded", { keyX: projectinfo.buttonx, keyY: projectinfo.buttony, keyLED: keyLED, ledData: ledData, keySounds: keySounds, autoPlayData: autoPlayData, data: data, pressedKey: pressedKey, keyColors: keyColors, chain: projectinfo.chain, sockets: sockets.length-1})
	}
	socket.on("Launchpad", function(s) {
		lpsocket = s;
		console.log("Socket Launchpad is " + lpsocket);
		draw(0);
	});

  socket.on("GetSongs", function() {
    getUnipacks(function(unipacks) {
			socket.emit("SetSongs", unipacks);
		});
  });

  socket.on("PlayUnipack", function(song) {
		launchpad.resetLeds();
		keyLED = [];
		ledData = []
		soundFiles = [];
		soundData = [];
		keySounds = [];
		autoPlayData = [];
		pressedKey = [];
		data = [];
		keyColors = [];
		sequences = [];
		sequenceData = []
		ledChain = [];
		pageNum = 0;
		launchpad.LedOn(89, 2);

		projectinfo = JSON.parse('{"title": "None", "producername": "None", "buttonx": 8, "buttony": 8, "chain": 6, "squarebutton": "true", "landscape": "true" }')

    songname = song;
    startProject(function() {
			socket.emit("LoadSounds", soundFiles, songname);
	    getData();
	    socket.emit("Loaded", { keyX: projectinfo.buttonx, keyY: projectinfo.buttony, keyLED: keyLED, ledData: ledData, keySounds: keySounds, autoPlayData: autoPlayData, data: data, pressedKey: pressedKey, keyColors: keyColors, chain: projectinfo.chain, sockets: sockets.length-1})
		});
  });
});

var conversion8x8 = [81, 82, 83, 84, 85, 86, 87, 88, 71, 72, 73, 74, 75, 76, 77, 78, 61, 62, 63, 64, 65, 66, 67, 68, 51, 52, 53, 54, 55, 56, 57, 58, 41, 42, 43, 44, 45, 46, 47, 48, 31, 32, 33, 34, 35, 36, 37, 38, 21, 22, 23, 24, 25, 26, 27, 28, 11, 12, 13, 14, 15, 16, 17, 18];
var conversion9x9 = [104, 105, 106, 107, 108, 109, 110, 111, 0, 81, 82, 83, 84, 85, 86, 87, 88, 89, 71, 72, 73, 74, 75, 76, 77, 78, 79, 61, 62, 63, 64, 65, 66, 67, 68, 69, 51, 52, 53, 54, 55, 56, 57, 58, 59, 41, 42, 43, 44, 45, 46, 47, 48, 49, 31, 32, 33, 34, 35, 36, 37, 38, 39, 21, 22, 23, 24, 25, 26, 27, 28, 29, 11, 12, 13, 14, 15, 16, 17, 18, 19]

var pages = [89, 79, 69, 59, 49, 39, 29, 19];
var pageconversion = [0, 1, 2, 3, 4, 5, 6, 7];

let s;
launchpad.on("KeyDown", function(note, vel) {
	let led;
	if (projectinfo.buttonx == 8 && projectinfo.buttony == 8) {
		if (pages.includes(note)) {
			launchpad.LedOff(pages[pageNum]);
			pageNum = pages.indexOf(note);
			launchpad.LedOn(pages[pageNum], 2);
			sockets[lpsocket].emit("LPPageChange", pages[pageNum]);
		} else {
			if (conversion8x8.includes(note)) {
				led = conversion8x8.indexOf(note);
			}
		}
	} else if (projectinfo.buttonx == 9 && projectinfo.buttony == 9) {
		if (pages.includes(note)) {
			launchpad.LedOff(pages[pageNum]);
			pageNum = pages.indexOf(note);
			launchpad.LedOn(pages[pageNum], 2);
			sockets[lpsocket].emit("LPPageChange", pages[pageNum]);
		} else {
			if (conversion9x9.includes(note)) {
				led = conversion9x9.indexOf(note);
			}
		}
	}
  if (!pages.includes(note)) {
		if (typeof ledChain[pageNum][led] != 'undefined') {
			if (ledChain[pageNum][led].length > 0) {
				sockets[lpsocket].emit("LPPlayLed", pageNum, led, s, 0);
	      Led(pageNum, led, s, 0);
	    }
	    playAudio(led);
		}
  }
});

//Play Audio
function playAudio(led) {
	sockets[lpsocket].emit("PlaySound", soundData[pageNum][led][sequenceData[pageNum][led]]);
	sequenceData[pageNum][led] = (sequenceData[pageNum][led]+1) % (sequences[pageNum][led]+1);
	s = (sequenceData[pageNum][led]) % (ledChain[pageNum][led].length);
		// if (typeof soundData[pageNum][led][sequenceData[pageNum][led]] !== 'undefined') {
		//
		// }
}

//Leds
function Led(page, key, sequencenum, i) {
    let delay = 0;
    let data = ledChain[page][key][sequencenum];

    if (typeof data == 'undefined') {
				sequencenum = 0;
        data = ledChain[page][key][sequencenum];
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

function LedOn(x, y, colorCode, vel) {
    let led = x * projectinfo.buttony + y;
		pressedKey[led] = 1;
	  if (colorCode) {
	  	keyColors[led] = 0;
	  } else if (vel) {
	  	keyColors[led] = parseInt(vel);
	  }
}

function LedOff(x, y) {
    let led = x * projectinfo.buttony + y;
		if (led) {
			pressedKey[led] = 0;
		  keyColors[led] = 0;
			if (projectinfo.buttonx == 8 && projectinfo.buttony == 8) {
				launchpad.LedOff(conversion8x8[led]);
			} else if (projectinfo.buttonx == 9 && projectinfo.buttony == 9) {
				launchpad.LedOff(conversion9x9[led]);
			}
		} else {
			pressedKey[0] = 0;
		  keyColors[0] = 0;
			if (projectinfo.buttonx == 8 && projectinfo.buttony == 8) {
				launchpad.LedOff(conversion8x8[0]);
			} else if (projectinfo.buttonx == 9 && projectinfo.buttony == 9) {
				launchpad.LedOff(conversion9x9[0]);
			}
		}
}

function draw(led) {
	if (led < (projectinfo.buttonx*projectinfo.buttony)) {
		if (pressedKey[led] > 0) {
			if (projectinfo.buttonx == 8 && projectinfo.buttony == 8) {
				launchpad.LedOn(conversion8x8[led], keyColors[led]);
			} else if (projectinfo.buttonx == 9 && projectinfo.buttony == 9) {
				launchpad.LedOn(conversion9x9[led], keyColors[led]);
			}
		}
	}
	if (led > (projectinfo.buttonx*projectinfo.buttony)) {
		setImmediate(draw, 0)
	} else {
		setImmediate(draw, led+1);
	}
}

server.listen(port, function() {
  console.log(`Listening on localhost:${port}`);
});
