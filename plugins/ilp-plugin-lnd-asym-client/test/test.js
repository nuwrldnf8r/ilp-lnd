var IlpPacket = require('ilp-packet');
var PluginClient = require('../index');
var config = require('./conf.js');
const debug = require('debug')('test');

var secret = 'helloworld1';
var port = 5000;

var plugin_client = new PluginClient(
{
	server: `btp+ws://:${secret}@${config.server}:${port}`,
	_host: config.client 
});

plugin_client.registerDataHandler(((data)=>{
	debug(data);
	return null;
}));

async function go() {
	try{	
		debug('connecting');
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
