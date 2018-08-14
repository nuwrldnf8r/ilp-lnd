const BtpPlugin = require('ilp-plugin-btp');
const BtpPacket = require('btp-packet');
const crypto = require('crypto');
const {  util, ChannelWatcher } = require('ilp-plugin-xrp-paychan-shared');
const { InvalidFieldsError, NotAcceptedError } = require('./src/errors');
const LndLib = require('./src/lndlib');

const GET_INVOICE = 'get_invoice';
const PAYMENT_PREIMAGE = 'payment_preimage';

class Plugin extends BtpPlugin {
	
	constructor (opts) {
		super(opts);
		if(!opts._host){
			throw new InvalidFieldsError('missing opts._host');
		}	
		this._host = opts._host;
		this._setupLnChannel = opts._setupLnChannel || true;
		this._channelLocalFunding = opts._channelLocalFunding || 100000;
		this._protocolCallFunctions = {};
		this._protocolCallFunctions['lightning_info'] = this._processLightningInfo.bind(this);
		this._protocolCallFunctions['channel_info'] = this._processChannelInfo.bind(this);
		this._protocolCallFunctions[GET_INVOICE] = this._getInvoice.bind(this);

		console.log('setting up lightning');
		this._lightning = new LndLib.lightning(opts._lndCertPath,opts._lndHost,opts._lndProtoPath,opts._lndMacaroonPath);
		this._invoices = new Map();
	}

	async _connect () {
		await this._lightning.initialize();
		console.log('client connected');

		//connect to lightning
		//getInfo
		//set this._lightningAddress from this.host and identity_pubkey
		
		let host = this._host;
		let pubkey = '_client'; //get from info from getinfo call
		var packet = await this._lightningInfoHandshake (host, pubkey);
		console.log(packet);
		this._handleData(null,{requestId: packet.requestId, data: packet.data});
		
		return null;
	}
	
	async _lightningInfoHandshake (){
		let requestId = await util._requestId();
		let lightningInfo = await this._lightning.getInfo();
		this._lightningAddress = `${lightningInfo.identity_pubkey}@${this._host}`;
		this._lightningPubKey = lightningInfo.identity_pubkey;
		
		let infoResponse = await this._call(null, {
			type: BtpPacket.TYPE_MESSAGE,
			requestId: requestId,
			data: { 
				protocolData: [{
					protocolName: 'info',
					contentType: BtpPacket.MIME_APPLICATION_JSON,
					data: Buffer.from(JSON.stringify({
						type: 'get_lightning_info',
						address: this._lightningAddress
					}))
				}] 
			}
		});

		return {requestId: requestId, data: infoResponse};
	}
	
	/**********************Channels**********************/

	async _getChannelId (pub_key) {
		console.log('pub_key: ' + pub_key);
		let channel = await this._getChannel(pub_key);
		if(!channel) return null;
		return channel.chan_id;
	}

	async _getChannel (pub_key) {
		console.log('---------------------------');
		let channels = await this._lightning.listChannels();
		console.log('pub key: ' + pub_key);
		console.log(channels);
		let filter = channels.channels.filter(c=>(c.remote_pubkey===pub_key && c.local_balance>0));
		if(filter.length===0){
			return null;
		}
		else{
			return filter[0];
		}
	}

	async _getExistingChannel () {
		console.log('checking for existing channels');
		if(this._channelId){
			try{
				let info = await this._lightning.getChanInfo({chan_id: this._channelId});
				console.log(info);
				return info;
			}
			catch(e){
				this._channelId = null;
				return await this._getExistingChannel();
			}
		}
		else{
			try{
				
				let channel = await this._getChannel(this._serverLightningPubKey);
				
				if(channel && channel.local_balance>0){
					return channel;
				}
				else{
					return null;
				}
			}
			catch(e){
				return false;
			}
		}
	}

	async _setupChannel () {
		
		if(!this._setupLnChannel) return null;
		if(this._settingUpChannel) return null;
		this._settingUpChannel = true;
		console.log(`setting up channel with ${this._serverLightningAddress} - client`);
		let existingChannel = await this._getExistingChannel();
		if(existingChannel){
			console.log('channel already exists');
			this._channelId = existingChannel.chan_id;
			let requestId = await util._requestId();
			await this._call(null, {
				type: BtpPacket.TYPE_MESSAGE,
				requestId: requestId,
				data: this._jsonPacket('info',{type: 'channel_info', channelId: this._channelId})
			});
			return null;
		}
		try{
			let walletBalance = await this._lightning.walletBalance();
			console.log(walletBalance);
			let confirmed = parseInt(walletBalance.confirmed_balance);
			if(confirmed<this._channelLocalFunding){
				throw new Error('Insufficient wallet balance to open channel');
				//TODO: need to think through how to handle this
			}
			let channel = await this._lightning.openChannel(
				{
					node_pubkey: this._serverLightningAddress,
					local_funding_amount: this._channelLocalFunding
				},
				async (err, status) => {
					try{
						if(status && status.chan_pending){
							console.log(status);
						}
						else if (status && status.chan_open){
							console.log(status);
						}
						else if(err){
							throw err;
						}
					}
					catch(e){
						console.log(e);
						//throw e;
					}
				}
			);

			console.log('channel open');
			console.log(channel);
		
			this._channelId = await this._getChannelId (this._serverLightningPubKey);

			let requestId = await util._requestId();
			await this._call(null, {
				type: BtpPacket.TYPE_MESSAGE,
				requestId: requestId,
				data: this._jsonPacket('info',{type: 'channel_info', channelId: this._channelId})
			});
			console.log(`Channel created. chan_id: ${this._channelId}`);
			this._settingUpChannel = false;
			
			return null;
			
		}
		catch(e){
			console.log(e);
			return null;
			//throw e;
		}


	}


	/********************Process Data**********************/

	async _processChannelInfo (requestId,data) {
		console.log('client - called process channel info');
		if(!this._settingUpChannel){
			this._setupChannel();
		}
		return null;
	}

	async _processLightningInfo (requestId,data) {
		console.log('client - called process lightning info');
		if(data.address){
			this._serverLightningAddress = data.address;
			this._serverLightningPubKey = data.address.split('@')[0];
		}
		//if not connected to any peers - connect to this peer
		let ret = await this._lightning.listPeers();
		console.log(ret.peers);
		if(ret.peers.length===0){
			console.log('no peers exist - connecting to peer');
			await this._lightning.connect({addr: this._serverLightningAddress});
			console.log('connected to peer');
		}
		if(!this._settingUpChannel){
			this._setupChannel();
		}
		//console.log('now waiting on channel info...');

		return null;

	}

	async _getInvoice (requestId, data) {
		console.log('get invoice');
		
		let amount = data;
		let invoice = await this._lightning.addInvoice({amt: amount});
		this._invoices.set(invoice.r_hash, amount);
		return [{
			protocolName: GET_INVOICE,
			contentType: BtpPacket.MIME_APPLICATION_JSON,
			data: Buffer.from(JSON.stringify({
				paymentRequest: invoice.payment_request
			}))
		}];

	}

	/******************************************************************/

	async _handleData (from, { requestId, data}) {
		const { ilp, protocolMap } = this.protocolDataToIlpAndCustom(data);
		
		if(protocolMap.info && protocolMap.info.type && this._protocolCallFunctions[protocolMap.info.type]){
			return await this._protocolCallFunctions[protocolMap.info.type](requestId,protocolMap.info);
		}
		else if(protocolMap[GET_INVOICE]){
			return await this._protocolCallFunctions[GET_INVOICE](requestId,protocolMap[GET_INVOICE]);
		}
		else{
			if (!this._dataHandler) throw new Error('no request handler registered');
			if(ilp){
				if(ilp){
					let response = await this._dataHandler(ilp);
					return this.ilpAndCustomToProtocolData({ ilp: response });
				}
				else{
					return null;
				}
			}
		}
	}


	async sendMoney (amount) {
		if(amount<=0) return;
		let channelBalance = await this._lightning.channelBalance();
		if(amount>channelBalance.balance) return;

		let paymentRequest = null;
		try{
			let response = await this._call(null, {
				type: BtpPacket.TYPE_MESSAGE,
				requestId: await util._requestId(),
				data: { 
					protocolData: [{
						protocolName: GET_INVOICE,
						contentType: BtpPacket.MIME_APPLICATION_JSON,
						data: Buffer.from(JSON.stringify(amount))
					}] 
				}
			});
			let data = response.protocolData.filter(p => p.protocolName === GET_INVOICE)[0].data.toString();
			paymentRequest = JSON.parse(data).paymentRequest;
		}
		catch(e){
			throw e;
		}
		console.log(paymentRequest);
		
		try{
			let paymentPreimage = await this._payLightningInvoice(paymentRequest, amount);
			
			await this._call(null, {
				type: BtpPacket.TYPE_TRANSFER,
				requestId:  await util._requestId(),
				data: {
					amount,
					protocolData: [{
						protocolName: PAYMENT_PREIMAGE,
						contentType: BtpPacket.MIME_APPLICATION_JSON,
						data: Buffer.from(JSON.stringify({ paymentPreimage }))
					}]
				}
			});
		}
		catch(e){
			return;
		}
		
	}
	
	async _handleMoney (from, { requestId, data }) {
		let amount = data.amount;
		let _data = data.protocolData.filter(p => p.protocolName === PAYMENT_PREIMAGE)
		let paymentPreimage = JSON.parse(_data[0].data.toString()).paymentPreimage;
		let condition = crypto.createHash('sha256').update(paymentPreimage).digest().toString('hex');
		let invoiceAmount = this.invoices.get(condition);
    	if (!invoiceAmount) {
      		throw new Error('no invoice found. condition=' + condition)
		}
		if (invoiceAmount !== amount) {
			throw new Error(`settlement amount does not match invoice amount.
			  invoice=${invoiceAmount} amount=${amount}`)
		}
		this.invoices.delete(condition)

    	if (this._moneyHandler) {
      		await this._moneyHandler(amount);
    	}

    	return [];
	}

	async _payLightningInvoice (paymentRequest, amountToPay){
		try{
			let decodedReq = await this._lightning.decodePayReq({pay_req: paymentRequest});
			console.log(decodedReq);
			
			const amountDiff = decodedReq.num_satoshis - amountToPay;
			if (amountDiff > amountDiff * 0.5) {
				throw new Error(`amounts in payment request and in transfer are significantly different. transfer amount: ${amountToPay}, payment request amount: ${decodedReq.num_satoshis}`);
			}
			let result = null;
			try{
				result = await this._lightning.sendPayment({pay_req: paymentRequest});
			}
			catch(e){
				throw e;
			}
			if (result.payment_route && result.payment_preimage) {
				const preimage = result.payment_preimage.toString('hex')
				return preimage
			} else {
				return {error: result};
			}
			
			
		}
		catch(e){
			throw e;
		}
	}

	_jsonPacket (protocolName,data) {
		return { 
			protocolData: [{
				protocolName: protocolName,
				contentType: BtpPacket.MIME_APPLICATION_JSON,
				data: Buffer.from(JSON.stringify(data))
			}] 
		};
	}
}


module.exports = Plugin;