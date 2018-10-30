/*
 *  Copyright 2018 Expedia, Inc.
 *
 *       Licensed under the Apache License, Version 2.0 (the "License");
 *       you may not use this file except in compliance with the License.
 *      You may obtain a copy of the License at
 *
 *           http://www.apache.org/licenses/LICENSE-2.0
 *
 *       Unless required by applicable law or agreed to in writing, software
 *       distributed under the License is distributed on an "AS IS" BASIS,
 *       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *       See the License for the specific language governing permissions and
 *       limitations under the License.
 */


"use strict";

/// first do `npm install haystack-client` and replace '../dist/index' with 'haystack-client'
const initTracer = require('../dist/index').initTracer;
const SpanContext = require('../dist/index').SpanContext;

const opentracing = require('opentracing');
const MyLogger = require('./logger');

/// setup a logger. if you skip providing logger to config, the library will not spit any errors, warning or info
/// you can provide the logger object already configured in your service, provided it has 4 methods defined:
// debug(msg), info(msg), error(msg), warn(msg)
const logger = new MyLogger.default();


/// setup the config object required for initializing Tracer
/// Use `file` dispatcher for local development else use haystack_agent for environments like prod
/// commonTags are the tags that are injected in every span emitted by your service.
const config = {
    serviceName: 'dummy-service',
    commonTags: {
        'dummy-service-version': '0.1.0'
    },
    dispatcher: {
        type: 'file',
        filePath: 'logs/spans' //make sure the 'logs' directory exists

        // or

        // type: 'haystack_agent'

        // or
        // type: 'http_collector'
    },
    logger: logger
};

/// initialize the tracer only once at the time of your service startup
const tracer = initTracer(config);

/// now create a span, for e.g. at the time of incoming REST call.
/// Make sure to add SPAN_KIND tag. Possible values are 'server' or 'client'.
/// Important: if you are receiving TraceId, SpanId, ParentSpanId in the http headers or message payload of your incoming REST call,
/// then create a SpanContext with those IDs and initialize the tracer with a childOf the received SpanContext

const serverSpan = tracer
    .startSpan('dummy-operation', {
        childOf: new SpanContext(
            '1848fadd-fa16-4b3e-8ad1-6d73339bbee7',
            '7a7cc5bf-796e-4527-9b42-13ae5766c6fd',
            'e96de653-ad6e-4ad5-b437-e81fd9d2d61d')
    })
    .setTag(opentracing.Tags.SPAN_KIND, 'server')
    .setTag(opentracing.Tags.HTTP_METHOD, 'GET');

/// Or if you are the root service

// const serverSpan = tracer
//     .startSpan('dummy-operation')
//     .setTag(opentracing.Tags.SPAN_KIND, 'server')
//     .setTag(opentracing.Tags.HTTP_METHOD, 'GET');




/// now say service is calling downstream service, then you start another span - a client span
/// since this span is a child of the main serverSpan, so pass it along as `childOf` attribute.
/// library will setup the traceId, spanId and parentSpanId by itself.
const clientChildSpan = tracer.startSpan('downstream-service-call', {
    childOf: serverSpan,
    tags: {
        'span.kind': 'client' // Note `span.kind` is now `client`
    }
});


/// add more tags or logs to your spans
clientChildSpan.setTag(opentracing.Tags.ERROR, true);
clientChildSpan.setTag(opentracing.Tags.HTTP_STATUS_CODE, 503);
clientChildSpan.addTags({'child-custom-tag-1': 1, 'child-custom-tag-2': 'someval'});
clientChildSpan.log({
  eventCode: 1001
});

serverSpan.setTag(opentracing.Tags.ERROR, true);
serverSpan.setTag('my-custom-tag', 10.5);

/// finish the downstream call span. This will publish the span to either file or haystack-agent
clientChildSpan.finish();

/// finish the server span when your service is ready to send the response back to upstream
serverSpan.finish();

/// close the tracer at the time of service shutdown
setTimeout(() => {
    tracer.close();
}, 3000);
