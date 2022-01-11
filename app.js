const express = require('express');
const bodyParser = require('body-parser');

const cors = require('cors');
const fs = require('fs');
const path = require('path');
const modbus = require('./modbus').modbus;
const filedb = require('./filedb').filedb;
const { response } = require('express');

const md5 = require('md5');
const salt = 'denis';

const registersUpdater = require('./registrUpdater').registersUpdater;

const registerSetters = require('./setters').setters;
const { setters } = require('./setters');

const app = express(); 
 
const APP_PORT = 80;
const HOST = 'http://localhost/'; 


const CALL_LIMIT = 25; // макс число запросов

var globalRegistersValues = {};
var globalRegistersReadNames = {};
var IPConnections = {};
var connectionStates = {};
var preloadedFileData = {};
var logRegisters = {};
var logValues = {};
var systemReloadFlag = {state: false};

// ip : [(client_id, section, registerId)]
global.globalRegistersValues = globalRegistersValues;
global.globalRegistersReadNames = globalRegistersReadNames;
global.IPConnections = IPConnections;
global.connectionStates = connectionStates;
global.preloadedFileData = preloadedFileData;
global.systemReloadFlag = systemReloadFlag;
global.logRegisters = logRegisters;
global.logValues = logValues;


//for VPN server
/*
app.use('/', express.static(path.join(__dirname, 'pages/')));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var incomeCallCount = 0;

const getPage = (url) => {
    return fs.readFileSync('pages/' + url ).toString();
}

const server = app.listen(APP_PORT, function () {

    console.log('Listening on port '+APP_PORT);

});
*/

process.setMaxListeners(100);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.use('/', express.static(path.join(__dirname, 'pages/')));


var incomeCallCount = 0;

const getPage = (url) => {
    return fs.readFileSync('pages/' + url ).toString();
}

const server = app.listen(APP_PORT, function () {

    console.log('Listening on port '+APP_PORT);

});

app.get('/', function(req, response) {
    response.send(getPage('/pages/index.html'));
});

app.get('/pages/:pageName', function(req, response) {

    response.send(page);
});

app.get('/api/registers/read/list', async function(req, response) {    
    

    let registers = (req.query.registers).split(',');

    let result = {};
    for (let i in registers) {
        let registerId = registers[i];

        result[registerId] = registersUpdater.getRegisterValue(req.query.client_id, req.query.section_name, registerId);
                
    } 

    //console.log(result);

    response.json(result);

});

app.get('/api/registers/read', async function(req, response) {    

    let result = registersUpdater.getRegisterValue(req.query.client_id, req.query.section_name, req.query.register_id);    
    response.json(result);

});

app.get('/api/registers/getall', function(req, response) {
    
    let registers = filedb.getRegisters({
        user_id: req.query.user_id, 
        section: req.query.section
    });
    
    response.json({status: 'ok', items: registers});
});

app.get('/api/registers/set', function(req, response) {

    try {

    let values = req.query.values || null;   
        
    
    filedb.writeRegister({
        title: req.query.title || "",
        user_id: req.query.user_id, 
        ui_id: req.query.ui_id, 
        number: req.query.number, 
        size: req.query.size,
        section: req.query.section,
        ipAddr: req.query.ipaddr,
        switcherJSON: req.query.switcherJSON,
        ipPort: req.query.port,
        type: req.query.type,
        values: values,
    });

    registersUpdater.reloadFileData();

    let gra = `${req.query.ipaddr}:${req.query.port}:${req.query.number}:${req.query.size}`;

    globalRegistersValues[`${req.query.ipaddr}:${req.query.port}:${req.query.number}:${req.query.size}`] = '--';

    response.json({status: 'ok'});

    } catch(err) {
        response.json({status: 'error', error: err.message});
    }
});

app.get('/api/registers/remove', function(req, response) {

    try {

        filedb.removeRegister({
            section: req.query.section, 
            user_id: req.query.user_id, 
            ui_id: req.query.ui_id
        });
        
        response.json({status: 'ok'});

    } catch(err) {
        response.json({status: 'error', error: err});
    }

});

app.get('/api/gra/read', async(req, response) => {
    try {
        let gra = req.query.gra;

        if (globalRegistersValues[gra] !== undefined) {
            response.json({status: 'ok', value: globalRegistersValues[gra]});
        } else {

            let graSplit = gra.split(':');
            
            if (connectionStates[`${graSplit[0]}:${graSplit[1]}`] == true) {

                let GRAvalue = await registersUpdater.singleRead(graSplit[0], graSplit[1], graSplit[2], graSplit[3], false, true);
                response.json({status: 'ok', value: GRAvalue});

            } else {
                response.json({status: 'notfound'});
            }            
            
            
        }

    } catch(err) {
        response.json({status: 'error', error: err});
    }
});

app.get('/api/setters/add', (req, response) => {
    try {

        setters.addSetter(req.query.client_id, req.query.section, JSON.parse(req.query.setter));
        
        response.json({status: 'ok'});

    } catch(err) {
        response.json({status: 'error', error: err});
    }
});

app.get('/api/setters/update', (req, response) => {
    try {

        setters.updateSetter(req.query.client_id, req.query.section, req.query.index, JSON.parse(req.query.setter));
        
        response.json({status: 'ok'});

    } catch(err) {
        response.json({status: 'error', error: err});
    }
});

app.get('/api/setters/remove', (req, response) => {
    try {

        setters.removeSetter(req.query.client_id, req.query.section, req.query.index);
        
        response.json({status: 'ok'});

    } catch(err) {
        response.json({status: 'error', error: err});
    }
});

app.get('/api/setters/getlist', (req, response) => {
    try {
                
        response.json({status: 'ok', items: setters.readSetters(req.query.client_id, req.query.section)});


    } catch(err) {
        response.json({status: 'error', error: err});
    }
});

app.get('/api/setters/change', async(req, response) => {
    try {
                console.log(req.query.client_id);
        let setterData = JSON.parse(req.query.setter);
        
        if (setterData.type == 'int' || setterData.type == 'switcher') {
            await setters.changeInt(setterData.ipaddr, setterData.port, setterData.number, req.query.value, req.query.client_id);
        }

        if (setterData.type == 'float') {
            await setters.changeFloat(setterData.ipaddr, setterData.port, setterData.number, req.query.value, req.query.client_id);
        }
        
        response.json({status: 'ok'});

    } catch(err) {
        response.json({status: 'error', error: err});
    }
});

app.get('/api/setters/pushimpulse', async(req, response) => {
    try {
                
        let setterData = JSON.parse(req.query.setter);

        let is_impulse = false;

        if (setterData.impulse == 'true') is_impulse = true;
        
        let graSplited = (setterData.gra).split(':');
        let readRegisterId = graSplited[2]; // read register number from gra, sample 192.168.100.101:502:55:16
        await setters.pushImplulse(setterData.ipaddr, setterData.port, setterData.number, readRegisterId, is_impulse, req.query.client_id);
        
        
        response.json({status: 'ok'});

    } catch(err) {
        response.json({status: 'error', error: err});
    }
});

app.get('/api/checkreload', async(req, response) => {
    if (systemReloadFlag.state) response.json({state: 'reload'});
    else response.json({state: 'not'});

});

app.get('/api/checkpassword', async(req, response) => {
    let usersFile = JSON.parse(fs.readFileSync('users.json'));
    let login = req.query.login;

    console.log(usersFile);
    
    let user = usersFile[login];
    if (!user) {
        response.json({result: 'notfound'});
        return false;
    }

    let password = req.query.password;

    if (req.query.autologin == 0) password = md5(password + salt);
    

    if (user.hash === password) {
        response.json({result: 'ok', user_id: user.user_id, perms: user.perms, hash: user.hash});
    } else {
        response.json({result: 'denied'});
    }

});

app.get('/api/log', async(req, response) => {
    let filePath = path.join(__dirname, 'log', req.query.client_id, 'summary.json');

    if (req.query.logtype == 'actions') {
        filePath = path.join(__dirname, 'log', req.query.client_id, 'actions.json');
    }
    
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]');
    }

    let jsonData = (JSON.parse(fs.readFileSync(filePath))).reverse();

    jsonData.sort((a, b) => {
        let timestamp1 = a.timestamp || 0;
        let timestamp2 = b.timestamp || 0;
        return b-a;
    })

    response.json({result: 'ok', data: jsonData});
});


// старая версия
//registersUpdater.startRegisterUpdaters();

// новая версия
registersUpdater.startRegisterUpdatersSingleMode();
registersUpdater.startLogListen();


// async function testConfig() {
//     console.log(await filedb.loadAllLogConfigs());
// } 

// testConfig();

