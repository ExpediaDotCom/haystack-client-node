[![Build Status](https://travis-ci.org/ExpediaDotCom/haystack-client-node.svg?branch=master)](https://travis-ci.org/ExpediaDotCom/haystack-client-node)
[![License](https://img.shields.io/badge/license-Apache%20License%202.0-blue.svg)](https://github.com/ExpediaDotCom/haystack/blob/master/LICENSE)

# Haystack bindings for Nodejs OpenTracing API. 

This is Haystack's client library for Nodejs that implements [OpenTracing API 1.0](https://github.com/opentracing/opentracing-javascript/).


## How to use the library?

Check our detailed [example](src/examples/) on how to initialize tracer, start a span and send it to one of the dispatchers.


## How to build this library?

`make build`

This library has been written in typescript, so we first compile them into js files under dist/ folder

## How to run the example code
```bash
make build
mkdir -p logs && node dist/examples/index.js
```

