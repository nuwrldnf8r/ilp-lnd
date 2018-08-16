Interledger plugin for lightning. Work in progress..

### To set up:
(inspired by https://github.com/lightningnetwork/lnd/tree/master/docker)
* Clone this repo
* `./environment` has all the dependancies to set up lnd etc. using docker. 
* To get going navigate to `./environment` and run `node setup.js`

### Running the plugins in the containers
Open 2-3 terminal windows and run one of the following in each terminal:

`docker exec -i -t server bash`  
`docker exec -i -t client1 bash`  
`docker exec -i -t client2 bash`  

(the names are important - unless you want to change the params in the config file of /test)

In each of these navigate to either `./ilp_plugins/ilp-plugin-lnd-asym-server` or `./ilp_plugins/ilp-plugin-lnd-asym-client`. (`..-server` in the server container etc..);

Then 
`DEBUG=server node ./test/test`
or `DEBUG=client node ./test/test`

### Plugin code
The plugin code is in `./plugins`

* If you run `update.js` in the main dir it watches for any updates and copies the change to all of the docker containers so you can test as you go. 
* creating channels require 3 confirmations. Running `environment/mine.js` will generate 1 block every 10 secs. Or you can just run it manually - `docker-compose run btcctl generate 3`

### TODO:

* `sendMoney` & `_handleMoney` aren't implemented correctly - was following the current lnd plugin.
* some rethinking around setting up channels - at the moment the server plugin waits for the client. This isn't necesarry - was a workaround while trying to get to grips with `_handleData`





