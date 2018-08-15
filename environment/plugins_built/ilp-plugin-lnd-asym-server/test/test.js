var IlpPacket = require('ilp-packet')
var PluginServer = require('../index');
var config = require('./conf.js');
const debug = require('debug')('test');

var secret = 'helloworld12';
var port = 5000;

var plugin_server = new PluginServer(
{
  	minimumChannelAmount: '10000',
  	port: port,
  	externalIP: config.server,
  	debugHostIldcpInfo: {
    	clientAddress: 'test.example',
  	},
  	//setupLnChannel: false
});


plugin_server.registerDataHandler(((data)=>{
	debug(data);
	return null;
}));

async function go() {
	try{	
		debug('connecting to server');
		await plugin_server.connect().then((res)=>{}).catch((e)=>debug(e));
		
	}
	catch(e){
		throw e;
	}
}
//hello
go();