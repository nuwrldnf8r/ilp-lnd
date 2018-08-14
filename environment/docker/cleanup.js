const { spawn } = require('child_process');


function parseData(data){
	var ar = data.toString().split('\n');
	ar = ar.map(ln=>{
		return ln.split(' ').filter((s)=>s!='');
	});
	ar = ar.filter(ln=>{
		return (ln[1]==='btcd' || ln[1]==='lndnode' || ln[1]=='<none>');
	});
	return ar.map(ln=>ln[0]);
}

function parseImageData(data){
	var ar = data.toString().split('\n');
	ar = ar.map(ln=>{
		return ln.split(' ').filter((s)=>s!='');
	});
	ar = ar.filter(ln=>{
		return (ln[1]=='<none>');
	});
	return ar.map(ln=>ln[2]);
}

function getIds(){
	let b = Buffer.alloc(0);
	return new Promise((resolve,reject)=>{
		let docker = spawn('docker', ['container','ls']);
		docker.stdout.on('data',(data)=>{
			b = Buffer.concat([b,data]);
		});
		docker.on('close',(code)=>{
			resolve(parseData(b));
		});
	});
}

function getImgIds(){
	let b = Buffer.alloc(0);
	return new Promise((resolve,reject)=>{
		let docker = spawn('docker', ['image','ls']);
		docker.stdout.on('data',(data)=>{
			b = Buffer.concat([b,data]);
		});
		docker.on('close',(code)=>{
			resolve(parseImageData(b));
		});
	});
}

function stop(id){
	return new Promise((resolve,reject)=>{
		console.log('stopping ' + id);
		let docker = spawn('docker',['container','stop',id]);
		docker.stdout.on('data',(data)=>{
			console.log(data.toString());
		});
		docker.on('close',(code)=>{
			resolve(id);
		});
	});
}

function rm(id){
	return new Promise((resolve,reject)=>{
		console.log('removing ' + id);
		let docker = spawn('docker',['container','rm',id]);
		docker.stdout.on('data',(data)=>{
			console.log(data.toString());
		});
		docker.on('close',(code)=>{
			resolve(id);
		});
	});
}

async function stopAndRm(id){
	await stop(id);
	await rm(id);
	return; 
}

async function stopAndRmAll(ids){
	var ar = ids.map(id=>{
		return stopAndRm(id);
	});
	return await Promise.all(ar);
}

function rmImage(img){
	return new Promise((resolve,reject)=>{
		console.log('removing ' + img);
		let docker = spawn('docker',['image','rm',img]);
		docker.stdout.on('data',(data)=>{
			console.log(data.toString());
		});
		docker.stderr.on('data',(data)=>{
			resolve();
		});
		docker.on('close',(code)=>{
			resolve(img);
		});
	});
}

function cleanupUnnamedImages(){
	return new Promise((resolve,reject)=>{
		getImgIds().then((data)=>{
			var ar = data.map(id=>{
				if(id){
					rmImage(id);
				}
			});
			Promise.all().then(()=>resolve()).catch(e=>console.log(e));
		});
	})
}

async function doCleanup(){
	let ids = await getIds();
	await stopAndRmAll(ids);
	if(process.argv.indexOf('-all')>-1){
		console.log('removing images');
		//await cleanupUnnamedImages();
		await rmImage('lndnode');
		await rmImage('btcd');
	}
	console.log('done');
	return;
}

doCleanup().then(console.log('...'));

