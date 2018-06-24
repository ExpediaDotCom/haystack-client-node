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

import * as grpc from 'grpc';
const messages  = require('../proto_idl_codegen/span_pb');
const services  = require('../proto_idl_codegen/agent/spanAgent_grpc_pb');
import {Dispatcher} from './dispatcher';
import Span from '../span';
import NullLogger from '../logger';
import Utils from '../utils';

export default class RemoteDispatcher implements Dispatcher {
    _client: any;
    _logger: any;

    constructor(agentHost: string, agentPort: number, logger = new NullLogger()) {
        logger.info(`Initializing the remote dispatcher, connecting at ${agentHost}:${agentPort}`);
        this._client = new services.SpanAgentClient(`${agentHost}:${agentPort}`, grpc.credentials.createInsecure());
        this._logger = logger;
    }

    name(): string {
        return 'RemoteDispatcher';
    }

    dispatch(span: Span): void {
        const proto = this._convertToProtoSpan(span);
        this._client.dispatch(proto, (err, response) => {
            if (this._logger) {
                if (err) {
                    this._logger.error(`Fail to dispatch span to haystack-agent ${err.toString()}`);
                } else {
                    this._logger.debug(`grpc response code from haystack-agent - ${response.getCode()}`);
                }
            }
        });
    }

    private _convertToProtoSpan(span: Span): any {
        const protoSpan = new messages.Span();
        protoSpan.setServicename(span.serviceName());
        protoSpan.setOperationname(span.operationName());
        protoSpan.setTraceid(span.context().traceId());
        protoSpan.setSpanid(span.context().spanId());
        protoSpan.setParentspanid(span.context().parentSpanId());
        protoSpan.setStarttime(span.startTime());
        protoSpan.setDuration(span.duration());

        const protoSpanTags = [];
        span.tags().forEach(tag => {
            protoSpanTags.push(this._createProtoTag(tag));
        });

        protoSpan.setTagsList(protoSpanTags);

        const protoSpanLogs = [];
        span.logs().forEach(log => {
            const protoLog = new messages.Log();
            const protoLogTags = [];
            log.tags.forEach(tag => {
                protoLogTags.push(this._createProtoTag(tag));
            });
            protoLog.setTimestamp(log.timestamp);
            protoLog.setFieldsList(protoLogTags);
            protoSpanLogs.push(protoLog);
        });

        protoSpan.setLogsList(protoSpanLogs);
        return protoSpan;
    }

    private _createProtoTag(tag: any): any {
        const protoTag = new messages.Tag();
        protoTag.setKey(tag.key);

        const tagValue = tag.value;
        if (typeof tagValue === 'number') {
            if (Utils.isFloatType(tagValue)) {
                protoTag.setVdouble(tagValue);
                protoTag.setType(messages.Tag.TagType.DOUBLE);
            } else {
                protoTag.setVlong(tagValue);
                protoTag.setType(messages.Tag.TagType.LONG);
            }
        } else if (typeof tagValue === 'boolean') {
            protoTag.setVbool(tagValue);
            protoTag.setType(messages.Tag.TagType.BOOL);
        } else {
            protoTag.setVstr(tagValue);
            protoTag.setType(messages.Tag.TagType.STRING);
        }

        return protoTag;
    }

    close(callback: () => void): void {
        grpc.closeClient(this._client);
        if (callback) {
            callback();
        }
    }
}
