FROM golang:1.10-alpine as builder

MAINTAINER Olaoluwa Osuntokun <lightning.engineering>

# Copy in the local repository to build from.
# COPY . /go/src/github.com/lightningnetwork/lnd

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

COPY "plugins_built" ./ilp_plugins/

# Expose lnd ports (server, rpc).
EXPOSE 9735 10009 5000 5001 7768

# Copy the binaries and entrypoint from the builder image.
COPY --from=builder /go/bin/lncli /bin/
COPY --from=builder /go/bin/lnd /bin/

# Add bash and python.
RUN apk add --no-cache \
    bash \
    python \
    make \
    g++
# Copy the entrypoint script.
COPY "lnd_node/start.sh" .
RUN chmod +x start.sh
