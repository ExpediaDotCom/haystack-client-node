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

import * as uuid from 'uuid';
import Span from './span';

const messages  = require('./proto_idl_codegen/span_pb');

export default class Utils {
    static randomUUID(): string {
        return uuid.v4();
    }

    static assign(origObject, key, value): any {
        const newObject = {};
        for (const k in origObject) {
            if (origObject.hasOwnProperty(k)) {
                newObject[k] = origObject[k];
            }
        }
        newObject[key] = value;
        return newObject;
    }

    static merge(origObject, mergeObj): any {
        const newObject = {};
        for (const k in origObject) {
            if (origObject.hasOwnProperty(k)) {
                newObject[k] = origObject[k];
            }
        }

        for (const k in mergeObj) {
            if (mergeObj.hasOwnProperty(k)) {
                newObject[k] = mergeObj[k];
            }
        }

        return newObject;
    }

    static now(): number {
        // return in micro seconds
        return Date.now() * 1000;
    }

    static isFloatType(value: number): boolean {
        return (value % 1 !== 0);
    }

    static convertToProtoSpan(span: Span): any {
        const protoSpan = new messages.Span();
        protoSpan.setServicename(span.serviceName());
        protoSpan.setOperationname(span.operationName());
        protoSpan.setTraceid(span.context().traceId);
        protoSpan.setSpanid(span.context().spanId);
        protoSpan.setParentspanid(span.context().parentSpanId);
        protoSpan.setStarttime(span.startTime());
        protoSpan.setDuration(span.duration());

        const protoSpanTags = [];

        const tags = span.tags();
        for (const k in tags) {
            if (tags.hasOwnProperty(k)) {
                protoSpanTags.push(this._createProtoTag(k, tags[k]));
            }
        }

        protoSpan.setTagsList(protoSpanTags);

        const protoSpanLogs = [];
        span.logs().forEach(log => {
            const protoLog = new messages.Log();
            const protoLogTags = [];
            const kvPairs = log.keyValuePairs;
            for (const k in kvPairs) {
                if (kvPairs.hasOwnProperty(k)) {
                    protoLogTags.push(this._createProtoTag(k, kvPairs[k]));
                }
            }
            protoLog.setTimestamp(log.timestamp);
            protoLog.setFieldsList(protoLogTags);
            protoSpanLogs.push(protoLog);
        });

        protoSpan.setLogsList(protoSpanLogs);
        return protoSpan;
    }

    private static _createProtoTag(key: string, value: any): any {
        const protoTag = new messages.Tag();
        protoTag.setKey(key);

        const tagValue = value;
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
        } else if (typeof tagValue === 'string') {
            protoTag.setVstr(tagValue);
            protoTag.setType(messages.Tag.TagType.STRING);
        } else {
            protoTag.setVbytes(tagValue);
            protoTag.setType(messages.Tag.TagType.BINARY);
        }

        return protoTag;
    }
}
