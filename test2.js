const { response } = require("express");
var ModbusRTU = require("modbus-serial");
var client = new ModbusRTU();

client.connectTCP("192.168.5.243", { port: 502 }, () => {

    console.log('connected');

    client.setID(3);


    let writeRegisterId = 1;
    let registerId = 1;
    let registerSize = 4;

    let buf1 = Buffer.alloc(4);
    

    buf1.writeFloatBE(24, 0);
    

    console.log('write data', buf1);
    client.writeRegisters(writeRegisterId, buf1).then((response) => {
        console.log(response);
    }).catch((err) => { console.log(err) });

    
    console.log('read data');
    setInterval(function() {    
        
        client.readInputRegisters(registerId, registerSize).then((response) => {
            
            let buffer = response.buffer; 
            console.log('\nREAD =>'); 
            //console.log(response);
            console.log(buffer.readFloatBE(0));
        });
        
    }, 1000);


});


