const fs = require("fs");
const _ = require("lodash");
const path = require("path");
const crypto = require("crypto");
const moment = require("moment"); //npm install slp-parser-js
const prompt = require("prompt-sync")();
const { default: SlippiGame } = require("@slippi/slippi-js");
const { SlpFolderStream, SlpRealTime } = require("@vinceau/slp-realtime");

// const slpLiveFolderPath = "/Users/chris/Coding/slpImprove";
// console.log(`Monitoring ${slpLiveFolderPath} for new SLP files`);

// const stream = new SlpFolderStream();
// const realTime = new SlpRealTime();
// realTime.setStream(stream);
// realTime.game.start$.subscribe(() => {
//   console.log(`Detected a new game in ${stream.getCurrentFilename()}`);
// });

const game = new SlippiGame("test1.slp");
const basePath = __dirname;
const outputFileName = "./losses.json";

const dolphin = {
  mode: "queue",
  replay: "",
  isRealTimeMode: false,
  outputOverlayFiles: true,
  commandId: `${crypto.randomBytes(3 * 4).toString("hex")}`,
  queue: [],
};
// allow putting files in folders
function walk(dir) {
  let results = [];
  let list = fs.readdirSync(dir);
  _.each(list, (file) => {
    file = path.join(dir, file);
    let stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      // Recurse into a subdirectory
      results = results.concat(walk(file));
    } else if (path.extname(file) === ".slp") {
      results.push(file);
    }
  });
  return results;
}

async function findPlayerSync(metadata) {
  let name = prompt("Enter netplay name: ");
  name = name.trim();
  name = name.toLowerCase();
  if (metadata.players[0].names.netplay.toLowerCase() == name) {
    console.log("Found player");
    return 0;
  } else if (metadata.players[1].names.netplay.toLowerCase() == name) {
    console.log("Found player (1)");
    return 1;
  } else {
    console.log("Name not found. Exiting...");
    return -1;
  }
}

let badFiles = 0;

function getHits() {
  let files = walk(basePath);
  _.each(files, async (file, i) => {
    try {
      let game = new SlippiGame(file);
      const settings = game.getSettings();
      const metadata = game.getMetadata();
      const stats = game.getStats();
      fs.appendFileSync("./stats.txt", `${JSON.stringify(stats)}`);
      console.log(metadata.lastFrame);

      // skip to next file if CPU exists
      const cpu = _.some(settings.players, (player) => player.type != 0);
      const notsingles = settings.players.length != 2;

      if (cpu) {
        return;
      } else if (notsingles) {
        return;
      }

      const player = await findPlayerSync(metadata);
      if (player == -1) {
        return;
      }
      stats.conversions.forEach((conversion) => {
        if (conversion.opponentIndex == player) {
          let x = {
            path: file,
            startFrame:
              conversion.startFrame - 300 > -123
                ? conversion.startFrame - 300
                : -123,
            endFrame:
              conversion.startFrame + 300 < metadata.lastFrame &&
              conversion.endFrame != null
                ? conversion.startFrame + 300
                : metadata.lastFrame,
            gameStartAt: moment(_.get(metadata, "startAt", "")),
            gameStation: _.get(metadata, "consoleNick", ""),
          };
          dolphin.queue.push(x);
        }
      });
      fs.writeFileSync(outputFileName, JSON.stringify(dolphin));
    } catch (err) {
      fs.appendFileSync("./log.txt", `${err.stack}\n\n`);
      badFiles++;
      console.log(`File ${i + 1} | ${file} is bad`);
    }
  });
}

getHits();

/* internal character id's: 

  0 - mario
  1 - fox
  2 - falcon
  3 - dk
  4 - kirby
  5 - bowser
  6 - link
  7 - sheik
  8 - ness 
  9 - peach
  10 - popo 
  11 - nana
  12 - pikachu
  13 - samus
  14 - yoshi
  15 - jiggs
  16 - mewtwo
  17 - luigi
  18 - marth
  19 - zelda
  20 - yl
  21 - doc
  22 - falco
  23 - pichu
  24 - mr gnw
  25 - ganon
  26 - roy

*/
