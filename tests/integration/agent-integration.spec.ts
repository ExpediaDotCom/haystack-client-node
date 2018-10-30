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

import Tracer from '../../src/tracer';
import * as opentracing from 'opentracing';
import * as kafka from 'kafka-node';
import { expect } from 'chai';
import { Logger } from '../../src/logger'
const messages  = require('../../src/proto_idl_codegen/span_pb');

class ConsoleLogger implements Logger {
    log(msg) { console.log(msg); }
    debug(msg: string): void { this.log(msg); }
    info(msg: string): void { this.log(msg); }
    warn(msg: string): void { this.log(msg); }
    error(msg: string): void { this.log(msg); }
}

const TraceId = '1848fadd-fa16-4b3e-8ad1-6d73339bbee7';
const SpanId = '7a7cc5bf-796e-4527-9b42-13ae5766c6fd';
const ParentSpanId = 'e96de653-ad6e-4ad5-b437-e81fd9d2d61d';

const options = {
    groupId: 'integration-test',
    kafkaHost: 'kafkasvc:9092',
    fromOffset: 'earliest' as ("earliest" | "latest" | "none"),
    encoding: 'buffer',
    keyEncoding: 'utf8'
};

const consumer = new kafka.ConsumerGroup(options, 'proto-spans');

const executeTest = (consumer: kafka.ConsumerGroup, tracer: opentracing.Tracer, done) => {
    const carrier = {'Trace-ID': TraceId , 'Span-ID': SpanId, 'Parent-ID': ParentSpanId, 'Baggage-myKey': 'myVal'};
                const serverSpan = tracer.startSpan('my-operation', {
                    childOf: tracer.extract(opentracing.FORMAT_TEXT_MAP, carrier)
                })
                .setTag(opentracing.Tags.SPAN_KIND, 'server')
                .setTag(opentracing.Tags.HTTP_METHOD, 'GET');

                const clientChildSpan = tracer.startSpan('my-downstream-service-call', {
                    childOf: serverSpan,
                    tags: {
                        'span.kind': 'client'
                    }
                })
                .setTag(opentracing.Tags.ERROR, true)
                .setTag(opentracing.Tags.HTTP_STATUS_CODE, 503)
                .log({  eventCode: 1001 });
                
                clientChildSpan.finish();
                serverSpan.finish();

                var serverSpanReceived = 0;
                var clientSpanReceived = 0;

                consumer.on('message', (kafkaMessage) => {
                    expect(kafkaMessage.key).eq(TraceId);

                    const spanBuffer = kafkaMessage.value as Buffer;
                    const protoSpan = messages.Span.deserializeBinary(spanBuffer);
                    
                    var isServerSpan = false;
                    protoSpan.getTagsList().forEach((tag) => {
                        if (tag.getKey() === 'span.kind' && tag.getVstr() === 'server') {
                            isServerSpan = true;
                        }
                    });
                    if (isServerSpan) {
                        serverSpanReceived = serverSpanReceived + 1;
                        expect(protoSpan.getTraceid()).eq(TraceId);
                        expect(protoSpan.getSpanid()).eq(SpanId);
                        expect(protoSpan.getParentspanid()).eq(ParentSpanId);
                    } else {
                        clientSpanReceived = clientSpanReceived + 1;
                        expect(protoSpan.getTraceid()).eq(TraceId);
                        expect(protoSpan.getSpanid() === SpanId).eq(false);
                        expect(protoSpan.getParentspanid()).eq(SpanId);
                    }
                });

                setTimeout(() => {
                    expect(serverSpanReceived).eq(1);
                    expect(clientSpanReceived).eq(1);
                    done();
                }, 5000);
            }

describe('Haystack Integration Tests', () => {
    describe('Tracer Test with haystack agent', () => {
        return it("should generate spans and push to haystack-agent", function(done) {
                this.timeout(6000);
            
                const tracer = Tracer.initTracer({
                    serviceName: 'my-service',
                    commonTags: {
                        'my-service-version': '0.1.0'
                    },
                    dispatcher: {
                        type: 'haystack_agent',
                        agentHost: 'haystack_agent'
                    },
                    logger: new ConsoleLogger(),
                });
                executeTest(consumer, tracer, done);
            
            });
    });

    describe('Tracer Test with haystack collector', () => {
        return it("should generate spans and push to haystack-collector", function(done) {
            this.timeout(6000);
            const tracer = Tracer.initTracer({
                serviceName: 'my-service',
                commonTags: {
                    'my-service-version': '0.1.0'
                },
                dispatcher: {
                    type: 'http_collector',
                    collectorUrl: 'http://haystack_collector:8080/span'
                },
                logger: new ConsoleLogger(),
            });
            executeTest(consumer, tracer, done);
        });
    });
});