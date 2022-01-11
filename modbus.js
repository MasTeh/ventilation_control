var ModbusRTU = require("modbus-serial");
var client = new ModbusRTU();

const objCount = (obj) => {
    let count = 0;
    for (let i in obj) count++;

    return count;
}
            
class Modbus {

    constructor() {

    };

    registerTimeout = 2000;


    async getConnectionTCP(ipAddr, ipPort) {
        let connectTimeout = 2000;
        return new Promise((resolve, reject) => {
            let IP_and_port = `${ipAddr}:${ipPort}`;

            if (IPConnections[IP_and_port] != undefined) {
                if (IPConnections[IP_and_port].isOpen) {
                    resolve(IPConnections[IP_and_port]);
                    return false;
                }
            }

            console.log(`connect to .. ${ipAddr} : ${ipPort}`);

            this.connectTCPPromise(ipAddr, ipPort, connectTimeout).then((connection) => {
                resolve(connection);
            });

        });

                
    }


    async prepareConnections(IPList) {
        
        for (let i in IPList) {
            let server = IPList[i];
            await this.getConnectionTCP(server.ip, server.port);
        }
    }

    connectTCPPromise(ipAddr, ipPort, connectTimeout) {
        return new Promise((resolve) => {
            let connection = new ModbusRTU();
            connection.connectTCP(ipAddr, { port: ipPort, timeout: connectTimeout }, () => {
                if (connection.isOpen) {                    
                    console.log('created connection: '+`${ipAddr}:${ipPort}`);
                } else {
                    resolve(null);
                }
                console.log(`register timeout = ${this.registerTimeout}`);
                connection.setTimeout(this.registerTimeout);
                connection.setID(3);

                IPConnections[`${ipAddr}:${ipPort}`] = connection;

                connectionStates[`${ipAddr}:${ipPort}`] = true;

                resolve(connection);
            })
        })
    }

    checkConnections(connectionStates) {
        return new Promise(async(resolve) => {
            let connectTimeout = 2000;
            for (let adr in connectionStates) {
                let state = connectionStates[adr];
                if (state == false) {
                    let splited = adr.split(':');
                    let ipAddr = splited[0];
                    let ipPort = splited[1];
                    console.log(`reconnecting ${ipAddr}:${ipPort}...`);
    
                    await this.connectTCPPromise(ipAddr, ipPort, connectTimeout);
                    resolve();
                    
                }
            }
            resolve();
        })
        
    }

    read(ipAddr, ipPort, registerId, registerSize, otherconnection = null) {


        return new Promise(async(resolve, reject) => {

            
            let connection;

            if (otherconnection != null) {
                connection = otherconnection;
            } else {
                connection = await this.getConnectionTCP(ipAddr, ipPort);
            }

            if (connection == null) {
                resolve({result: 'error', error: 'not_connection'});
                return false;
            }

            let request_ip_registerId = `${ipAddr}:${registerId}`;


            if (registerSize == 8 || registerSize == 16) {
        
                connection.readInputRegisters(Number(registerId), Number(registerSize)).then((response) => {


                    let buffer = response.buffer;
                    if (registerSize == 16) {
                        let result = buffer.readFloatBE(2);
                        resolve({result: 'ok', value: result});
                    }
                    if (registerSize == 8) {
                        let result = buffer.readInt16BE(0);
                        resolve({result: 'ok', value: result});                        
                    }
                }).catch((err) => {
                    
                    resolve({result: 'error', error: err.message});
                    
                });

            } 

            if (registerSize == 1) {
        
                connection.readDiscreteInputs(Number(registerId), Number(registerSize)).then((response) => {

                    let buffer = response.buffer;
                    let result = buffer.readUIntBE(0, 1);
                    resolve({result: 'ok', value: result});
                    
                    
                }).catch((err) => {

                    resolve({result: 'error', error: err.message});
                    
                });

            }
            
        });
    }


    singleFlowPromise(ipAddr, ipPort, registerId, registerSize) {
        return new Promise((resolve) => {
            this.read(ipAddr, ipPort, registerId, registerSize)
                .then((result) => {
                    resolve(result);
                });
        });
    }


    
}


module.exports.modbus = new Modbus();