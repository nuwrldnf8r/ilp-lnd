### To set up:

* Clone this repo
* `./environment` has all the dependancies to set up lnd etc. using docker. I essentially copied most of it from the lighning repo for now - so this could be a little more streamlined. Will add cloning the git etc. into the dockerfile a little later this week. To this I added an image called lnd_node which gets everything set up to run either asym-server or asym-client.
* To get going navigate to `./environment/docker` and run `node setup.js`
* This should setup everything you need (hopefully - works for me). I'm assuming you have docker installed and running on a mac.

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
* creating channels require 3 confirmations. Running `mine.js` - in the `./environment/docker` directory will generate 1 block every 10 secs. Or you can just run it manually - `docker-compose run btcctl generate 3`





