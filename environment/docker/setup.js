const { spawn } = require('child_process');
const fs = require('fs');

//docker-compose run -d --name server lnd_node
//docker-compose run -d --name client lnd_node
//docker exec -i -t server bash

function setupImage(name){
    console.log('setting up ' + name);
    return new Promise((resolve,reject)=>{
		let docker = spawn('docker-compose', ['run','-d','--name',name,'lnd_node']);
		docker.stdout.on('data',(data)=>{
			console.log(data.toString())
        });
        docker.on('error',e=>{
            console.log(err);
            reject(err);
        })
		docker.on('close',(code)=>{
			resolve();
		});
	});
}

function createAddress(name){
    return new Promise((resolve,reject)=>{
        
        let b = Buffer.alloc(0);
        
        let docker = spawn('docker', ['exec',name,'lncli','newaddress','np2wkh']);
        docker.stdout.on('data',(data)=>{
            b = Buffer.concat([b,data]);
        });
        docker.on('error',e=>console.log(err));
        docker.on('exit',()=>{
            try{
                var json = JSON.parse(b.toString());
                resolve(json.address);
            }
            catch(e){
                setTimeout(()=>{
                    createAddress(name).then((address)=>resolve(address));
                },1000);
            }
            
        });
       		
	});
}

function setUpBTCD(address){
    return new Promise((resolve,reject)=>{
        var env = Object.create( process.env );
        env.MINING_ADDRESS = address;
        //docker-compose up -d btcd
        let docker = spawn( 'docker-compose', ['up','-d','btcd'], { env: env } );
        docker.on('close',(code)=>{
            resolve();
        });
    });
}

function mine(blocks){
    return new Promise((resolve,reject)=>{
        
        let docker = spawn( 'docker-compose', ['run','btcctl','generate',blocks.toString()]);
        docker.stdout.on('data',(data)=>{
			console.log(data.toString())
		});
        docker.on('close',(code)=>{
            resolve();
        });
    });
}

function checkBalance(name){
    return new Promise((resolve,reject)=>{
        let docker = spawn('docker', ['exec',name,'lncli','walletbalance']);
        docker.stdout.on('data',(data)=>{
			console.log(data.toString())
		});
        docker.on('close',(code)=>{
            resolve();
        });
    });
}

function getIPAddress(name){
    return new Promise((resolve,reject)=>{
        let b = Buffer.alloc(0);
        //docker inspect bob | grep IPAddress
        let docker = spawn('docker', ['inspect',name]);
        docker.stdout.on('data',(data)=>{
			b = Buffer.concat([b,data]);
		});
        docker.on('close',(code)=>{
            try{
                let json = JSON.parse(b.toString());
                let IP = json[0].NetworkSettings.Networks.docker_default.IPAddress;
                resolve(IP);
            }
            catch(e){
                reject(e);
            }
            
        });
    });
}

function sendCoinsFromServer(toAddress){
    console.log('sending coins to ' + toAddress);
    return new Promise((resolve,reject)=>{
        let docker = spawn('docker', ['exec','server','lncli','sendcoins','--addr=' + toAddress,'--amt=100000000']);
        docker.stdout.on('data',(data)=>{
			console.log(data.toString())
        });
        docker.on('error',e=>console.log(err));
        docker.on('close',(code)=>{
            resolve();
        });
    });
}

function createTmpConfig(data){
    let fileData = `module.exports = ${JSON.stringify(data,null,2)}`;
    return new Promise((resolve,reject)=>{
        fs.writeFile('testconf.js',fileData,(err,ret)=>{
            console.log(err);
            resolve();
        });
    });
}

function rmTmpConfig(){
    return new Promise((resolve,reject)=>{
        fs.unlink('testconf.js',(err,ret)=>{
            resolve();
        });
    });
}


function _copyConfig(container,cs){
    
    return new Promise((resolve,reject)=>{
        let filename = './testconf.js';
        let _filename = `ilp_plugins/ilp-plugin-lnd-asym-${cs}/test/conf.js`;
        let docker = spawn('docker',['cp', `${filename}`, `${container}:${_filename}`]);
        docker.on('close',(code)=>{
			resolve();
		});
    });
}

async function copyConfig(container){
    console.log('copying test config to ' + container);
    await _copyConfig(container,'server');
    await _copyConfig(container,'client');
    return;
}

async function go(){
    try{
        await setupImage('server');
        await setupImage('client1');
        await setupImage('client2');
        let address = await createAddress('server');
        console.log('Got address. Now mining');
        await setUpBTCD(address);
        await mine(400);
        let ips = {};
        ips['server'] = await getIPAddress('server');
        ips['client1'] = await getIPAddress('client1');
        ips['client2'] = await getIPAddress('client2');
        let client1Address = await createAddress('client1');
        let client2Address = await createAddress('client2');
        sendCoinsFromServer(client1Address);
        sendCoinsFromServer(client2Address);
        await mine(3);
        await createTmpConfig(ips);
        copyConfig('server');
        copyConfig('client1');
        copyConfig('client2');

    }
    catch(e){
        console.log(e)
    }
    console.log('done');
}

go();
