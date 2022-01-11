const fs = require('fs');
const fsPromise = require('fs').promises;
const path = require('path');

const filedb = {

    rootDir: path.join(__dirname, 'data'),
    

    getRegisters({user_id, section}) {
        if (!user_id) {
            console.log('user_id need!');
            return false;
        }

        let registersFile = filedb.getFile(user_id, `${section}.json`);
        let fileContent = fs.readFileSync(registersFile);
        if (fileContent == '') fileContent = "{}";

        let registersJSON = JSON.parse(fs.readFileSync(registersFile));

        if (section != undefined) {
            let selectRegisters = {};
            for (let ui_id in registersJSON) {
                let register = registersJSON[ui_id];
                if (register.section == section) {
                    selectRegisters[ui_id] = register;
                }
            }
            registersJSON = selectRegisters;
        }

        return registersJSON;
    },

    getAllClients() {
        return new Promise(async(resolve, reject) => {
            let rootDir = filedb.rootDir;
            let clients = await fsPromise.readdir(rootDir);
    
            let result = [];
    
            for (let i in clients) {
                let client = clients[i];
                let stats = await fsPromise.lstat(rootDir+'/'+client);
                if (stats.isDirectory()) result.push(client);
            }
    
            resolve(result);
        });        
    },

    getAllSections() {
        return new Promise(async(resolve, reject) => {
            let clients = await filedb.getAllClients();
            
            let pathArr = [];
            for (let i in clients) {
                let files = fs.readdirSync(path.join(filedb.rootDir, clients[i]));
                
                pathArr.push({client_id: clients[i], sections: files});
            }            
            resolve(pathArr);
        });
    },

    getFile(user_id, filename) {
        let userRoot = filedb.rootDir + '/' + user_id;
        if (!fs.existsSync(userRoot)) fs.mkdirSync(userRoot);

        let filePath = userRoot + '/' + filename;
        if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "{}");

        return filePath;
    },
    
    writeRegister({title, user_id, ipAddr, ipPort, ui_id, switcherJSON, section, number, type, values, size}) {
        if (!user_id) {
            console.log('user_id need!');
            return false;
        }

        if (section == undefined) section = 'not_section.json';

        let registersFile = filedb.getFile(user_id, `${section}.json`);
        let fileContent = fs.readFileSync(registersFile);
        if (fileContent == '') fileContent = "{}";

        let registersJSON = JSON.parse(fileContent);
        let registerType = 'number';
        if (type != undefined) registerType = type;

        registersJSON[ui_id] = {
            'title': title,
            'number': number, 
            'size': size, 
            'section': section, 
            'type': registerType, 
            'ip':ipAddr, 
            'port': ipPort,
            'switcherJSON': switcherJSON,
            'values': values
        };


        fs.writeFileSync(registersFile, '');
        fs.writeFileSync(registersFile, JSON.stringify(registersJSON));
    },

    removeRegister({user_id, section, ui_id}) {
        if (!section) {
            console.log('section need!');
            return false;
        }

        if (section == undefined) section = 'not_section.json';

        let registersFile = filedb.getFile(user_id, `${section}.json`);
        let fileContent = fs.readFileSync(registersFile);
        if (fileContent == '') fileContent = "{}";

        let registersJSON = JSON.parse(fileContent);

        delete(registersJSON[ui_id]);

        console.log(`${ui_id} removed`);

        fs.writeFileSync(registersFile, JSON.stringify(registersJSON));
    },

    loadLogConfig(client_id) {
        let dirPath = path.join(__dirname, 'log', client_id);
        if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);

        let filePath = path.join(__dirname, 'log', client_id, 'log-config.json');
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '{}');
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    },

    loadAllLogConfigs() {
        return new Promise((resolve, reject) => {
            filedb.getAllClients().then((clients) => {
                let summaryConfig = {};
                for (let i in clients) {
                    let client_id = clients[i];
                    let config = filedb.loadLogConfig(client_id);
                    for (let key in config) {
                        summaryConfig[key] = {client_id: client_id, message: config[key]};
                    }
                }
                resolve(summaryConfig);
            })
        })
        
    },

    writeLog(client_id, logfile, registerNumber, message, isRed = false) {
        let dirPath = path.join(__dirname, 'log');
        if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);

        let clientPath = path.join(__dirname, 'log', String(client_id));
        console.log(clientPath);
        if (!fs.existsSync(clientPath)) fs.mkdirSync(clientPath);

        let logPath = path.join(clientPath, logfile);
        console.log(logPath);
        if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, '');

        let logJSON = [];
        let logText = fs.readFileSync(logPath, 'utf-8');

        if (logText != '') logJSON = JSON.parse(logText);

        let now = new Date();
        logJSON.push({
            register: registerNumber,
            message: message,
            is_red: isRed,
            date: (now.toLocaleDateString('RU')+ ' ' +now.toTimeString()).substr(0, 19),
            timestamp: now.getTime()
        });

        let cuttedJSON = [];
        for (let i=0; i <= 100; i++) {
            if (logJSON[i]) cuttedJSON.push(logJSON[i]);
        }

        

        fs.writeFileSync(logPath, JSON.stringify(cuttedJSON));

    }
    
}

exports.filedb = filedb;