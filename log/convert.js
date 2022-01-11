const fs = require('fs');
const path = require('path');

let strings = fs.readFileSync('log-config.csv', 'utf-8').toString().split("\n");

let json = {};
for (let i in strings) {
    let string = strings[i];
    let splited = string.split(';');
    json[splited[0]] = (splited[1]).replace('\r', '');
}

console.log(json);
console.log(path.join(__dirname, 'log-config.json'));

fs.writeFileSync(path.join(__dirname, 'log-config.json'), JSON.stringify(json));