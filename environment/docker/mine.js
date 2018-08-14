const { spawn } = require('child_process');

function mine(){
    return new Promise((resolve,reject)=>{
        
        let docker = spawn( 'docker-compose', ['run','btcctl','generate','1']);
        docker.stdout.on('data',(data)=>{
			console.log(data.toString())
		});
        docker.on('close',(code)=>{
            resolve();
        });
    });
}
setInterval(()=>{
   mine().then(()=>{});
},10000);