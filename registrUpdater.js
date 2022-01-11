
const fs = require('fs');
const path = require('path');
const filedb = require('./filedb').filedb;
const ModbusRTU = require("modbus-serial");
const modbus = require('./modbus').modbus;


class RegiserUpdater {

    visibleRegisters = [];
    invisibleRegisters = [];

    observeCrashSignals = {};

    lastUpdatedTime = new Date().getTime();
    currentTimeInterval = 0;

    maxRegisterReadingInterval = 50;

    timeoutErrorsCount = 0;
    groupSize = 50;
    maxGroupSize = 200;
    pause = 1;

    flowCount = 0;
    flowErrors = 0;
    
    registerUpdateTimeout = 1000;

    connectionStatesTimer;
    flowStopperTimer;

    stopAllFlow_signal = false;

    timeoutRegisters = {};

    constructor() {

    }

    async reloadFileData() {
        preloadedFileData['allSections'] = await filedb.getAllSections();
    }

    async getAllRegistersAddresses() {
        let allSections;
        if (preloadedFileData['allSections'] == undefined) {
            preloadedFileData['allSections'] = await filedb.getAllSections();
        } 

        allSections = preloadedFileData['allSections'];                
        
        let resultSections = {};

        for (let i in allSections) {

            let section = allSections[i];
            let client_id = section.client_id;

            if (!resultSections[client_id]) resultSections[client_id] = {};

            for (let m in section.sections) {
                let sectionFile = section.sections[m];

                if (sectionFile === 'setters') continue;

                let sectionName = String(sectionFile).replace('.json', '');
                
                let filePath = path.join(__dirname, 'data', client_id, sectionFile);                

                if (!fs.existsSync(filePath)) continue;
                
                let registers = JSON.parse(fs.readFileSync(filePath));
                

                //if (!(allSections[client_id])[sectionName]) (allSections[client_id])[sectionName] = {};

                (resultSections[client_id])[String(sectionName)] = registers;

            }
            
        }

        let allAddresses = [];
        globalRegistersReadNames = {};

        for (let client_id in resultSections) {
            //console.log('- CLIENT_ID='+client_id);
            let sections = resultSections[client_id]
            for (let sectionName in sections) {
                //console.log('--- SECTION '+sectionName);
                let registers = sections[sectionName];
                for (let registerId in registers) {
                    let ipAddr = registers[registerId].ip;
                    let ipPort = registers[registerId].port;
                    let registerSize = registers[registerId].size;
                    let registerTechAddress = registers[registerId].number; // номер регистра

                    // global register write address
                    let GRWA = `${ipAddr}:${ipPort}:${registerTechAddress}:${registerSize}`;

                    // global register read address
                    let GRRA = `${client_id}:${sectionName}:${registerId}`;
                    

                    globalRegistersReadNames[GRRA] = GRWA;

                    //console.log('Values '+globalRegistersReadNames[GRRA]);
                    
                    allAddresses.push(GRWA);
                } 
            }
        } 

        return allAddresses;
    }

    reset() {
        console.log("RESET ALL");
        globalRegistersValues = {};
        globalRegistersReadNames = {};
        IPConnections = {};        
    }

    addRegisterTimeoutError(gra) {
        if (this.timeoutRegisters[gra] == undefined) this.timeoutRegisters[gra] = 1;
        else this.timeoutRegisters[gra]++;
    }

    clearRegisterTimeoutError(gra) {
        this.timeoutRegisters[gra] = 0;
    }


    async startRegisterUpdaters() {

        try {

            if (this.timeoutErrorsCount > 0) {
                console.log(`TIMEOUT ERRORS COUNT = ${this.timeoutErrorsCount}`);
            }

            this.timeoutErrorsCount = 0;

            if (this.groupSize < 3) this.groupSize = 3;
            if (this.groupSize > this.maxGroupSize) this.groupSize = this.maxGroupSize;

            console.log(`group size = ${this.groupSize}`);

            // this.pause = 1;
            // this.groupSize = 50;
            
            var registerAddresses = await this.getAllRegistersAddresses();

            
            
            let ipList = [];
            let ipIndex ={};

            for (let i in registerAddresses) {
                let item = registerAddresses[i];            
                let splited = String(item).split(':');
                let ipAddr = splited[0];
                let port = splited[1];
                ipIndex[ipAddr+':'+port] = 1;
            }

            for (let ipAndPort in ipIndex) {
                let splited = ipAndPort.split(':');
                ipList.push({ip: splited[0], port: splited[1]});
            
            }

            await modbus.prepareConnections(ipList); 

            console.log(connectionStates);

            await modbus.checkConnections(connectionStates);            

            let promises = [];
            let promises_groups = [];
            let countPromises = 0;
            
            for (let i in registerAddresses) {
                
                let item = registerAddresses[i];            
                let splited = String(item).split(':');
                
                let ipAddr = splited[0];
                let port = splited[1];
                let registerNumber = splited[2];
                let registerSize = splited[3];

                let gra = `${ipAddr}:${port}:${registerNumber}:${registerSize}`;

                // if (!modbus.serverOnline(ipAddr, port)) {
                //     console.log('connection lost... reconnection after 5 seconds');
                //     await this.wait(5);
                //     this.startRegisterUpdaters();
                //     return false;
                // }
                
                
                let promiseTask = () => {
                    return new Promise((resolve, reject) => {
                        
                        if (connectionStates[`${ipAddr}:${port}`] == false) {
                            
                            if (this.timeoutRegisters[gra] > 5) {
                                globalRegistersValues[gra] = {result: 'error', error: 'not_connection'};
                            }

                            resolve();
                            return false;
                        }

                        modbus.read(ipAddr, port, registerNumber, registerSize).then((value) => {
                        
                            globalRegistersValues[gra] = value;                            
            
                            if (value.result == 'ok') {
                                this.clearRegisterTimeoutError(gra);
                                //console.log(`${registerNumber}(${registerSize}) = ${value.value} -- ok`);
                            }
                            else if (value.result == 'error') {
                                
                                
                                if (value.error == "Timed out") {
                                    this.timeoutErrorsCount++;
                                    this.addRegisterTimeoutError(gra);
                                    //connectionStates[`${ipAddr}:${port}`] = false;
                                    
                                } else {
                                    console.log(`${registerNumber}(${registerSize}) (!!!) ${value.error}`);
                                }
                            }
                            
                            resolve();
                            
                        });
                    });
                }

                promises.push(promiseTask);

                if (countPromises > this.groupSize) {
                    promises_groups.push(promises);
                    promises = [];
                    countPromises = 0;
                }
                
                countPromises++;
                
            }

            //console.log(promises_groups);  return false;

            let promisesRound = (promises) => {
                return new Promise(async(resolve) => {

                    Promise.allSettled(promises.map(t => t())).then(async() => {
                        //await this.wait(1);
                        resolve();
                    });
                });
            }
            
            for (let i in promises_groups) {
                console.log(`${i} group...`);
                let promisesGroup = promises_groups[i];
                await promisesRound(promisesGroup);
            }
            

            console.log('all done, wait for loop... '+ this.pause +' seconds');
            
            this.balance(); // балансировка
	    await this.wait(this.pause);

        } catch(err) {
            console.log("ERROR with register loop!");
            console.log(err);
        } finally {
            await this.wait(this.pause);
            this.startRegisterUpdaters();
        }
 
    }

    // запись сигнала об аварии/отсутствия в массив
    getCrashSignal(registerId, value) {
        if (logRegisters[registerId] != undefined) {
            
            logValues[registerId] = Math.round(value);

            // if (value == 1) {
            //     console.log('ЖОПА!!! ' +logRegisters[registerId].message);
            // } else {
            //     console.log(`Регистр ${registerId} нет проблем, значение = ${value}`);
            // }
        }
    }

    async startLogListen() {
        logRegisters = await filedb.loadAllLogConfigs();
        console.log(logRegisters);

        this.logListen = setInterval(() => {
            for (let registerId in logRegisters) {

                // сигнал аварии
                if (logValues[registerId] == 1) {
                    
                    // добавляем в наблюдение если наблюдения ещё нет
                    if (this.observeCrashSignals[registerId] == undefined) {
                        this.observeCrashSignals[registerId] = {timestamp: (new Date()).getTime()}
                    }

                    // если уже наблюдается сверяем время аварии
                    if (this.observeCrashSignals[registerId] != undefined) {
                        let signal_timestamp = this.observeCrashSignals[registerId].timestamp;
                        let now_timestamp = (new Date()).getTime();

                        // если прошло 30 сек с времени фиксации
                        if ((now_timestamp - signal_timestamp) > 30 * 1000 ) {
                            let client_id = logRegisters[registerId].client_id;
                            let message = logRegisters[registerId].message;
                            
                            // авария НЕ была устранена в течении этого времени
                            filedb.writeLog(client_id, 'summary.json', registerId, message, true); 
                            
                            // прекращение наблюдения
                            delete(this.observeCrashSignals[registerId]);
                        }
                    }
                } 

                // сигнал отсутствия аварии
                if (logValues[registerId] == 0) {
                    
                    // если эта авария уже наблюдается проверяем поменялось ли
                    if (this.observeCrashSignals[registerId] != undefined) {
                        let signal_timestamp = this.observeCrashSignals[registerId].timestamp;
                        let now_timestamp = (new Date()).getTime();

                        // если прошло 30 сек с времени фиксации
                        if ((now_timestamp - signal_timestamp) > 30 * 1000 ) {
                            let client_id = logRegisters[registerId].client_id;
                            let message = logRegisters[registerId].message;
                            
                            // авария была устранена в течении этого времени
                            filedb.writeLog(client_id, 'summary.json', registerId, message, false); 
                            
                            // прекращение наблюдения
                            delete(this.observeCrashSignals[registerId]);
                        }
                    }
                
                }
            }
        }, 10000);
    }

    async startRegisterUpdatersSingleMode() {

        try {

            if (this.flowErrors > 20) {
                this.maxRegisterReadingInterval += 20;                
            } 
            
            if (this.flowErrors == 0){
                this.maxRegisterReadingInterval -=20;
            }

            if (this.maxRegisterReadingInterval < 30) this.maxRegisterReadingInterval = 30;
            if (this.maxRegisterReadingInterval > 150) this.maxRegisterReadingInterval = 150;

            console.log(`Register reading interval = ${this.maxRegisterReadingInterval}`);

            
            this.lastUpdatedTime = Number(new Date().getTime());

            systemReloadFlag.state = false;

            this.flowErrors = 0;
            
            var registerAddresses = await this.getAllRegistersAddresses();

            this.registerStack = registerAddresses;
            
            let ipList = [];
            let ipIndex ={};

            for (let i in registerAddresses) {
                let item = registerAddresses[i];            
                let splited = String(item).split(':');
                let ipAddr = splited[0];
                let port = splited[1];
                ipIndex[ipAddr+':'+port] = 1;
            }

            for (let ipAndPort in ipIndex) {
                let splited = ipAndPort.split(':');
                ipList.push({ip: splited[0], port: splited[1]});                
            }

            for (let i in ipList) {
                let item = ipList[i];
                connectionStates[`${item.ip}:${item.port}`] = true;
            }

            let offset = 0;
            
            let offsetStep = this.maxRegisterReadingInterval; // <--- offset interval !!!
            
            for (let i in registerAddresses) {
                
                let item = registerAddresses[i];            
                let splited = String(item).split(':');
                
                let ipAddr = splited[0];
                let port = splited[1];
                let registerNumber = splited[2];
                let registerSize = splited[3];
                        
                setTimeout(() => {
                    this.flowCount++;

                    this.singleRead(ipAddr, port, registerNumber, registerSize);

                }, offset * offsetStep);

                offset++;
                
            }
            

            this.connectionStatesTimer = setInterval(async() => {                
                await modbus.checkConnections(connectionStates);
            }, 5000);

            
            setTimeout(() => {
                systemReloadFlag.state = false;
                console.log('SYSTEM RESTARTED');

                setTimeout(() => {
                    this.startRegisterUpdatersSingleMode();
                }, 1000);
                

            }, offset * offsetStep);


        } catch(err) {
            console.log(err);
        } 
 
    }

    checkFlowErrors() {
        if (this.flowErrors > 50) { 
            this.registerUpdateTimeout += 1000;
            this.stopAllFlow_signal = true;
            this.flowErrors = 0;

            console.log(`Register Update timeout changed ${this.registerUpdateTimeout}`);
            
            clearInterval(this.connectionStatesTimer);
            clearInterval(this.flowStopperTimer);

            setTimeout(() => {
                if (this.flowErrors < 50) {
                    this.registerUpdateTimeout -= 1000;
                    if (this.registerUpdateTimeout < 1000) this.registerUpdateTimeout = 1000;
                }
            }, 120000);
        
        }
    }

    singleRead(ipAddr, ipPort, registerId, registerSize, debugMode = false, notWriteToGRA = false) {
        

        let gra = `${ipAddr}:${ipPort}:${registerId}:${registerSize}`;        

        return new Promise((resolve) => {            

            modbus.singleFlowPromise(ipAddr, ipPort, registerId, registerSize)
            .then((value) => {

                if (debugMode) {
                    console.log(value);
                }

                if (debugMode) {
                    console.log(`Register ID=${registerId} -> ${value.value}`);
                }
                
                        
                if (!notWriteToGRA) {

                    // !!! value - это JSON структура {result: ok, value: 5}
                    
                    globalRegistersValues[gra] = value;

                    if (value.result == 'ok') this.getCrashSignal(registerId, Math.round(value.value));

                }

                if (value.result == 'ok') {
                    connectionStates[`${ipAddr}:${ipPort}`] == true;
                    //console.log(`${registerId}(${registerSize}) = ${value.value} -- ok`);
                }
                else if (value.result == 'error') {                        

                    if (value.error == "Timed out") {
                        connectionStates[`${ipAddr}:${ipPort}`] == false;
                    } else {
                        this.flowErrors++;
                        console.log(`${registerId}(${registerSize}) (!!!) ${value.error}`);
                    }
                }

                resolve(value);
           
            });

        });
    }


    balance() {
        if (this.timeoutErrorsCount == 0) {
            this.groupSize += 10;  }
        else {
            this.groupSize -= 1;  }

        let countregisters = this.countRegisters();
        if (this.groupSize > countregisters) this.groupSize = countregisters;
        
    }

    countRegisters() {
        let count=0;
        for (let i in globalRegistersValues) count++;
        return count;
    }

    wait(seconds) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, seconds * 1000);
        })
    }

    waitMilliseconds(ms) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, ms);
        })
    }

    getRegisterValue(clientId, sectionName, registerId) {
        let GRRA = `${clientId}:${sectionName}:${registerId}`;
        let GRWA = globalRegistersReadNames[GRRA];
       
        let data = globalRegistersValues[GRWA];
        
        if (data != undefined) {
            return data;
        } else {
            return {result: 'error', error: 'not_found'};
        }
    }

    emulateError(vero) {
        let rand = Math.floor(Math.random() * 10);
        if (rand < vero) return huj;
        else return 0;
    }
}

module.exports.registersUpdater = new RegiserUpdater();