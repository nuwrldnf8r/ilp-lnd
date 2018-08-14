var IlpPacket = require('ilp-packet')
var PluginServer = require('../index');

var secret = 'helloworld12';
var port = 5000;

var plugin_server = new PluginServer(
{
  	minimumChannelAmount: '10000',
  	port: port,
  	_host: '172.18.0.3',
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