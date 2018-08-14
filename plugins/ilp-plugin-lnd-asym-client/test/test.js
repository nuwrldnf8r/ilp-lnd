var IlpPacket = require('ilp-packet');
var PluginClient = require('../index');
var config = require('./conf.js');

var secret = 'helloworld1';
var port = 5000;

var plugin_client = new PluginClient(
{
	server: `btp+ws://:${secret}@${config.server}:${port}`,
	_host: config.client 
});

plugin_client.registerDataHandler(((data)=>{
	console.log(data);
	return null;
}));

async function go() {
	try{	
		console.log('connecting');
		await plugin_client.connect().then((res)=>{}).catch((e)=>console.log(e));
		
		setTimeout(async ()=>{
			plugin_client.sendMoney(5000);
		},3000);
		
	}
	catch(e){
		throw e;
	}
}

go();
