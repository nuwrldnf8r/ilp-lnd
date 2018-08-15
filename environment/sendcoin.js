const { spawn } = require('child_process');

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

function sendCoinsFromServer(toAddress){
    
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


function checkBalance(name){
    return new Promise((resolve,reject)=>{
        let docker = spawn('docker', ['exec',name,'lncli','walletbalance']);
        let b = Buffer.alloc(0);
        docker.stdout.on('data',(data)=>{
			b = Buffer.concat([b,data]);
		});
        docker.on('close',(code)=>{
            resolve(JSON.parse(b.toString()));
        });
    });
}

function mine(blocks){
    return new Promise((resolve,reject)=>{
        
        let docker = spawn( 'docker-compose', ['run','btcctl','generate',blocks.toString()]);
        docker.on('close',(code)=>{
            resolve();
        });
    });
}

async function go(){
    let client1Address = await createAddress('client1');
    let client2Address = await createAddress('client2');
    console.log('sending coins to ' + client1Address);
    await sendCoinsFromServer(client1Address);
    console.log('sending coins to ' + client2Address);
    await sendCoinsFromServer(client2Address);
    await mine(3);
    var bal1 = await checkBalance('client1');
    var bal2 = await checkBalance('client2');
    if(parseInt(bal1.confirmed_balance)===0){
        await go();
    }
    else{
        console.log('client1 balance:');
        console.log(bal1);
        console.log('client2 balance:');
        console.log(bal2);
    }
}

go().then(()=>console.log('done'));