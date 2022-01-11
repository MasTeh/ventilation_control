const { response } = require("express");
var ModbusRTU = require("modbus-serial");
var client = new ModbusRTU();

client.connectTCP("192.168.100.101", { port: 502 }, () => {

    client.setID(3);

    //console.clear();

    let writeRegisterId = 23;
    let registerId = 41023;
    let registerSize = 8;

    let buf1 = Buffer.alloc(8);
    

    buf1.writeInt16BE(15, 0);
    

    console.log(buf1);

    client.writeRegisters(writeRegisterId, buf1).then((response) => {
        console.log(response);
    }).catch((err) => { console.log(err) });

    
    setInterval(function() {    
        
        client.readInputRegisters(registerId, registerSize).then((response) => {
            
            let buffer = response.buffer; 
            console.log('\nREAD =>'); 
            //console.log(response);
            console.log(buffer.readInt16BE(0));
        });
        
    }, 1000);


});


