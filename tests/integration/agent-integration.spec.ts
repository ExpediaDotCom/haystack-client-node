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
import SpanContext from '../../src/span_context';
import * as kafka from 'kafka-node';
import { expect } from 'chai';
import Utils from '../../src/utils';
import Span from '../../src/span';

class ConsoleLogger {
    log(msg) { console.log(msg); }
    debug(msg: string): void { this.log(msg); }
    info(msg: string): void { this.log(msg); }
    warn(msg: string): void { this.log(msg); }
    error(msg: string): void { this.log(msg); }
}

describe('Haystack Integration Tests', () => {
    describe('Tracer Test', () => {
        return it("should generate spans and push to haystack-agent", function(done) {
                this.timeout(6000);
                const TraceId = '1848fadd-fa16-4b3e-8ad1-6d73339bbee7'
                const tracer = Tracer.initTracer({
                    serviceName: 'my-service',
                    commonTags: {
                        'my-service-version': '0.1.0'
                    },
                    dispatcher: {
                        type: 'haystack_agent',
                        agentHost: 'haystack_agent'
                    },
                    logger: new ConsoleLogger()
                });

                const serverSpan = tracer.startSpan('my-operation', {
                    childOf: new SpanContext(
                        TraceId,
                        '7a7cc5bf-796e-4527-9b42-13ae5766c6fd',
                        'e96de653-ad6e-4ad5-b437-e81fd9d2d61d')
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
                const serverProtoSpanBytes = Utils.convertToProtoSpan(serverSpan as Span).serializeBinary();
                const clientProtoSpanBytes = Utils.convertToProtoSpan(clientChildSpan as Span).serializeBinary();
                    
                const options = {
                    groupId: 'integration-test',
                    kafkaHost: 'kafkasvc:9092',
                    fromOffset: 'earliest' as ("earliest" | "latest" | "none")
                };
                const consumer = new kafka.ConsumerGroup(options, 'proto-spans');
                consumer.on('message', (kafkaMessage) => {
                    expect(kafkaMessage.key).eq(TraceId);

                    const spanBuffer = kafkaMessage.value as Buffer;
                    if (spanBuffer.includes('7a7cc5bf-796e-4527-9b42-13ae5766c6fd')) {
                        expect(spanBuffer.length).eq(serverProtoSpanBytes.length);
                        serverSpanReceived = serverSpanReceived + 1;
                    } else {
                        expect(spanBuffer.length).eq(clientProtoSpanBytes.length);
                        clientSpanReceived = clientSpanReceived + 1;
                    }                    
                });

                setTimeout(() => {
                    expect(serverSpanReceived).eq(1);
                    expect(clientSpanReceived).eq(1);
                    done();
                }, 5000);
            });
    });
});