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


/// first do `npm install haystack-client`
const initTracer = require('../index').initTracer;
const opentracing = require('opentracing');
import MyLogger from "./logger";


/// setup a logger. if you skip providing logger to config, the library will not spit any errors, warning or info
/// you can provide the logger object already configured in your service, provided it has 4 methods defined:
// debug(msg), info(msg), error(msg), warn(msg)
const logger = new MyLogger();


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

        // type: 'haystack_agent',
        // agentHost: 'haystack-agent',
        // agentPort: '35000'
    },
    logger: logger
};

/// initialize the tracer only once at the time of your service startup
const tracer = initTracer(config);

/// now create a span, for e.g. at the time of incoming REST call.
/// Make sure to add SPAN_KIND tag. Possible values are 'server' or 'client'.
const serverSpan = tracer
    .startSpan('dummy-operation')
    .setTag(opentracing.Tags.SPAN_KIND, 'server')
    .setTag(opentracing.Tags.HTTP_METHOD, 'GET');



/// Important:
//  if you are receiving TraceId, SpanId, ParentSpanId in the http headers or message payload of your incoming REST call,
/// then update the IDs in the span context, else tracer will use the unique TraceId and SpanId.
/*
  serverSpan.context().setTraceId(<TRACE ID> );
  serverSpan.context().setSpanId(<SPAN ID>);
  serverSpan.context().setParentSpanId(<PARENT SPAN ID>);
*/


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
clientChildSpan.setTag(opentracing.Tags.ERROR, false);
serverSpan.setTag(opentracing.Tags.ERROR, false);


/// finish the downstream call span. This will publish the span to either file or haystack-agent
clientChildSpan.finish();

/// finish the server span when your service is ready to send the response back to upstream
serverSpan.finish();

/// close the tracer at the time of service shutdown
tracer.close();