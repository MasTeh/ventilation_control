const { response } = require("express");
var ModbusRTU = require("modbus-serial");
var client = new ModbusRTU();

client.connectTCP("192.168.100.101", { port: 502 }, () => {

    client.setID(3);

    //console.clear();

    let writeRegisterId = 10;
    let registerId = 14397;
    let registerSize = 1;

    let buf1 = Buffer.alloc(8);
    buf1.writeUInt8(1, 0);

    client.writeCoil(writeRegisterId, false).then(() => {
        client.writeCoil(writeRegisterId, true);
    });
    
    //client.writeCoil(writeRegisterId, true);

    //client.writeRegisters(writeRegisterId, buf1).then((response) => {console.log(response)}).catch((err) => { console.log(err) });

    setInterval(function() {                

        client.readDiscreteInputs(registerId, 1).then((response) => {
            let buffer = response.buffer; 
            let value = buffer.readUIntBE(0, 1);
            //console.log(response);
            console.log(value);

            if (value == 1) { 
                client.writeCoil(writeRegisterId, false).then(() => {
                    client.writeCoil(writeRegisterId, true);
                });
            }

        }).catch((err) => {
            console.log(err.message);
        });
        
    }, 1000);


});


