const { spawn } = require('child_process');
const fs = require('fs');
const watch = require('recursive-watch');
let toWatch = './plugins';


function parseData(data){
	var ar = data.toString().split('\n');
	ar = ar.map(ln=>{
		return ln.split(' ').filter((s)=>s!='');
	});
	ar = ar.filter(ln=>{
		return (ln[1]==='lndnode');
	});
	return ar.map(ln=>ln[ln.length-1]);
}

function getContainers(){
	let b = Buffer.alloc(0);
	return new Promise((resolve,reject)=>{
		let docker = spawn('docker', ['container','ls']);
		docker.stdout.on('data',(data)=>{
			b = Buffer.concat([b,data]);
		});
		docker.stderr.on('data', (data) => {
			console.log('Error: ' + data.toString('utf8'));
		});
		docker.on('close',(code)=>{
			resolve(parseData(b));
		});
	});
}

function copyLocal(filename){
	let f = filename.replace('plugins/','environment/docker/plugins_built/');
	fs.createReadStream(filename).pipe(fs.createWriteStream(f));
}

function copy(container, filename){
	
	return new Promise((resolve,reject)=>{

		let _filename = filename.replace(toWatch,'ilp_plugins/');
		console.log(`docker cp ${filename} ${container}:${_filename}`);
		let docker = spawn('docker', ['cp', `${filename}`, `${container}:${_filename}`]);
		docker.stdout.on('data',(data)=>{
			console.log(data.toString())
		});
		docker.on('close',(code)=>{
			resolve();
		});
		
	});
}

async function update(filename){
	copyLocal(filename);
	let containers = await getContainers();
	await Promise.all(containers.map(container=>copy(container,filename)));
	console.log('done');
}

watch(toWatch,function(f){
	update(f);
})
