const fs = require('fs');
const fsPromise = require('fs').promises;
const path = require('path');
const ModbusRTU = require("modbus-serial");
const filedb = require('./filedb').filedb;

class Setters {
    constructor() {

    }

    rootDir = path.join(__dirname, 'data');

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
    }

    getAllSections() {
        return new Promise(async(resolve, reject) => {
            let clients = await filedb.getAllClients();
            
            let pathArr = [];
            for (let i in clients) {
                let filesDir = path.join(this.rootDir, clients[i], 'setters');

                if (!fs.existsSync(filesDir)) {
                    fs.mkdirSync(filesDir);
                }

                let files = fs.readdirSync(filesDir);
                
                pathArr.push({client_id: clients[i], sections: files});
            }            
            resolve(pathArr);
        });
    }

    prepareFilePath(client_id, section) {
        
        let filesDir = path.join(this.rootDir, String(client_id), 'setters');

        

        if (!fs.existsSync(filesDir)) {
            fs.mkdirSync(filesDir);
        }

        let sectionFilePath = path.join(filesDir, section)+ ".json";

        if (!fs.existsSync(sectionFilePath)) {
            fs.writeFileSync(sectionFilePath, "[]");
        }

        return sectionFilePath;
    }

    addSetter(client_id, section, setterJSON) {

        let sectionFilePath = String(this.prepareFilePath(client_id, section));

        let fileText = fs.readFileSync(sectionFilePath);
        let fileJSON = [];
        if (fileText != "") fileJSON = JSON.parse(fileText);
        fileJSON.push(setterJSON);
        fs.writeFileSync(sectionFilePath, JSON.stringify(fileJSON));

    }

    updateSetter(client_id, section, index, setterJSON) {

        let sectionFilePath = String(this.prepareFilePath(client_id, section));

        let fileText = fs.readFileSync(sectionFilePath);
        let fileJSON = [];
        if (fileText != "") fileJSON = JSON.parse(fileText);
        fileJSON[index] = setterJSON;
        fs.writeFileSync(sectionFilePath, JSON.stringify(fileJSON));

    }

    removeSetter(client_id, section, index) {
        let sectionFilePath = this.prepareFilePath(client_id, section);

        let fileText = fs.readFileSync(sectionFilePath);
        let fileJSON = [];
        if (fileText != "") fileJSON = JSON.parse(fileText);

        let setter = fileJSON[index].number;

        fileJSON.splice(index, 1);

        fs.writeFileSync(sectionFilePath, JSON.stringify(fileJSON));

        filedb.writeLog(client_id, 'actions.json', setter, `Удалёна уставка ${setter}`);
    }

    readSetters(client_id, section) {
        let sectionFilePath = this.prepareFilePath(client_id, section);

        let fileText = fs.readFileSync(sectionFilePath);
        let fileJSON = [];
        if (fileText != "") fileJSON = JSON.parse(fileText);

        for (let i in fileJSON) {
            fileJSON[i].setternum = i;
        }

        return fileJSON;
    }

    changeInt(ip, port, number, value, client_id) {        
        return new Promise((resolve, reject) => {

            console.log(`Change register, FORMAT INT, ${ip}:${port} NUMBER ${number} -> ${value}`);

            filedb.writeLog(client_id, 'actions.json', number, `Изменение уставки ${number} на значение ${value}`);

            let client = new ModbusRTU();
            client.connectTCP(ip, { port: port }, () => {

                client.setID(3);
                let writeRegisterId = number;
                let buf1 = Buffer.alloc(8);
                buf1.writeInt16BE(value, 0);
        
                client.writeRegisters(writeRegisterId, buf1).then((response) => {
                    console.log(response);
                    resolve('ok');
                }).catch((err) => { reject(err.message); });

            });
        });
    }

    changeFloat(ip, port, number, value, client_id) {
        
        return new Promise((resolve, reject) => {

            console.log(`Change register ${ip}:${port} number ${number} -> ${value}`);

            filedb.writeLog(client_id, 'actions.json', number, `Изменение уставки ${number} на значение ${value}`);

            let client = new ModbusRTU();
            client.connectTCP(ip, { port: port }, () => {
                client.setID(3);

                let writeRegisterId = number;
                let buf1 = Buffer.alloc(16);

                buf1.writeFloatBE(value, 2);

                client.writeRegisters(writeRegisterId, buf1).then((response) => {
                    console.log(response);
                    resolve('ok');
                }).catch((err) => { reject(err.message); });
            });
        });
    }

    pushImplulse(ip, port, writeRegisterId, readRegisterId, impulse = false, client_id) {
        return new Promise(async(resolve, reject) => {

            console.log(`Push impulse -> ${ip}:${port} register number ${writeRegisterId}`);

            filedb.writeLog(client_id, 'actions.json', writeRegisterId, `Импульс на регистр ${writeRegisterId}`);

            let client = new ModbusRTU();

            client.connectTCP(ip, { port: port }, () => {
                client.setID(3);

                let buf1 = Buffer.alloc(8);
                buf1.writeUInt8(1, 0);

                if (!impulse) {
                    // БЕЗ РЕЖИМА ИМПУЛЬСА!!!
                    client.writeCoil(writeRegisterId, false).then(() => {
                        client.writeCoil(writeRegisterId, true);
                        resolve('ok');
                    }).catch((err) => { reject(err.message); });

                } else {
                    // С РЕЖИМОМ ИМПУЛЬСА!!!
                    client.writeCoil(writeRegisterId, false).then((resp1) => {
                        console.log(`Request to register ${writeRegisterId} set to 0`);
                        console.log(resp1);
                        
                        console.log(`Request to register ${writeRegisterId} set to 1`);
                        client.writeCoil(writeRegisterId, true).then((resp2) => {
                            console.log(resp2);

                            setTimeout(() => {
                                console.log(`Request to register ${writeRegisterId} set to 0`);
                                client.writeCoil(writeRegisterId, false).then((resp3) => {                                    
                                    console.log(resp3);
                                    console.log('impulse completed.')
                                    resolve('done');
                                });
                            }, 5000);
                        }).catch((err) => { reject(err.message); });

                        // function checkImpulse() {
                        //     return new Promise(async(resolve, reject) => {
                        //         client.readDiscreteInputs(readRegisterId, 1).then((response) => {
                        //             let buffer = response.buffer; 
                        //             let value = buffer.readUIntBE(0, 1);
        
                        //             console.log('checking impulse received... now value = '+value);
                        
                        //             if (value == 1) { 
                        //                 setTimeout(() => {
                        //                     client.writeCoil(writeRegisterId, false).then(() => {
                        //                         client.writeCoil(writeRegisterId, true);
                        //                         console.log('impulse completed.')
                        //                         resolve('done');
                        //                     });
                        //                 }, 5000);
                                        
                        //             } else {
                        //                 resolve('wait');
                        //             }
                        
                        //         }).catch((err) => {
                        //             console.log(err.message);
                        //         });
                        //     });
                        // }
        
                        // async function impulseLoop(callback, reply_num = 0) {
                        //     if ((await checkImpulse()) == 'done') {
                        //         callback('ok');
                        //     } else {
                        //         if (reply_num < 20) {
                        //             setTimeout(() => {
                        //                 impulseLoop(callback, reply_num + 1);
                        //             }, 500);
                        //         } else {
                        //             callback('timeoutError');
                        //         }
                        //     }
                        // }
        
                        // impulseLoop((result) => {
                        //     resolve(result);
                        // });
                        
                    }).catch((err) => { reject(err.message); });
                }

                

            });

        });
    }
}

module.exports.setters = new Setters();