const { response } = require("express");
var ModbusRTU = require("modbus-serial");
const { off } = require("process");
var client = new ModbusRTU();

client.connectTCP("192.168.5.243", { port: 502 });
client.setID(40);

let registerId = 1;
let registerSize = 16;



// setInterval(function() {    
//     var b = new Float64Array([15]).buffer;
//     client.writeRegister(8, b).then((response) => { console.log(response); });

//     client.readInputRegisters(41044, 16).then((response) => { let buffer = response.buffer; console.log(buffer.readFloatBE(2)); });
    
// }, 1000);

setInterval(function() {

    // client.readHoldingRegisters(Number(registerId), Number(registerSize)).then((response) => {
    //     console.log(response);
    //     let buffer = response.buffer;

    //     if (registerSize == 16) {
    //         console.log(buffer.readFloatBE(2));
    //     }
    //     if (registerSize == 8) {
    //         console.log(buffer.readInt16BE(0));
    //     }
    // });

    // return false;

    // client.readDiscreteInputs(Number(registerId), Number(registerSize)).then((response) => {
        
    //     let buffer = response.buffer;

    //     let result = buffer.readUIntBE(0, 1);

    //     console.log(result);
    // });

    // return false;
    
    client.readInputRegisters(registerId, registerSize).then((response) => {
        let buffer = response.buffer;
        let integer = 0;
        let offset = 0;
        let length = 1;

        console.log(response);

        if (registerSize == 16) {
            console.log(buffer.readFloatBE(2));
        }
        if (registerSize == 8) {
            console.log(buffer.readInt16BE(0));
        }

        
        // console.log('1 - ', buffer.readBigInt64BE(offset));
        // console.log('2 - ', buffer.readBigInt64LE(offset));
        // console.log('3 - ', buffer.readBigUInt64BE(offset));
        // console.log('4 - ', buffer.readBigUInt64LE(offset));
        // console.log('5 - ', buffer.readDoubleBE(offset));
        // console.log('6 - ', buffer.readDoubleLE(offset));
        // console.log('7 - ', buffer.readFloatBE(offset));
        // console.log('8 - ', buffer.readFloatLE(offset));
        // console.log('9 - ', buffer.readInt8(offset));
        // console.log('10 - ', buffer.readInt16BE(offset));
        // console.log('11 - ', buffer.readInt16LE(offset));
        // console.log('12 - ', buffer.readInt32BE(offset));
        // console.log('13 - ', buffer.readInt32LE(offset, length));
        // console.log('14 - ', buffer.readIntBE(offset, length));
        // console.log('15 - ', buffer.readIntLE(offset, length));
        // console.log('16 - ', buffer.readUInt8(offset, length));
        // console.log('17 - ', buffer.readUInt16BE(offset, length));
        // console.log('18 - ', buffer.readUInt32BE(offset, length));
        // console.log('19 - ', buffer.readUInt32LE(offset, length));
        //console.log('20 - ', buffer.readUIntBE(offset, length)); // <---
        // console.log('21 - ', buffer.readUIntLE(offset, length));
        
    });
}, 1000);



