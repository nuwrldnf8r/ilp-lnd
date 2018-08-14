var IlpPacket = require('ilp-packet')
var PluginServer = require('../index');
var config = require('./conf.js');

var secret = 'helloworld12';
var port = 5000;

var plugin_server = new PluginServer(
{
  	minimumChannelAmount: '10000',
  	port: port,
  	_host: config.server,
  	debugHostIldcpInfo: {
    	clientAddress: 'test.example',
  	},
  	//_setupLnChannel: false
});


plugin_server.registerDataHandler(((data)=>{
	console.log(data);
	return null;
}));

async function go() {
	try{	
		console.log('connecting to server');
		await plugin_server.connect().then((res)=>{}).catch((e)=>console.log(e));
		
	}
	catch(e){
		throw e;
	}
}
//hello
go();