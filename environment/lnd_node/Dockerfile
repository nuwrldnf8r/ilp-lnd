FROM golang:1.10-alpine as builder

MAINTAINER Gavin Marshall

# Force Go to use the cgo based DNS resolver. This is required to ensure DNS
# queries required to connect to linked containers succeed.
ENV GODEBUG netdns=cgo

# Install dependencies and install/build lnd.
RUN apk add --no-cache \
    git \
    make 
RUN git clone https://github.com/lightningnetwork/lnd.git  /go/src/github.com/lightningnetwork/lnd
RUN  cd /go/src/github.com/lightningnetwork/lnd \
&&  make \
&&  make install


# Start a new, final image to reduce size.
FROM node:alpine as final

RUN apk add --no-cache \
    bash \
    python \
    make \
    g++

#COPY "plugins_built" ./ilp_plugins/
COPY ./plugins ./ilp_plugins
RUN cd ./ilp_plugins/ilp-plugin-lnd-asym-client && npm install
RUN cd ./ilp_plugins/ilp-plugin-lnd-asym-server && npm install

# Expose lnd ports (server, rpc).
EXPOSE 9735 10009 5000 5001 7768

# Copy the binaries and entrypoint from the builder image.
COPY --from=builder /go/bin/lncli /bin/
COPY --from=builder /go/bin/lnd /bin/

# Add bash and python.

# Copy the entrypoint script.
COPY "environment/lnd_node/start.sh" .
RUN chmod +x start.sh
