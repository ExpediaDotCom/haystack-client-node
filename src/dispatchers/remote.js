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
Object.defineProperty(exports, "__esModule", { value: true });
var grpc = require("grpc");
var messages = require("../static_codegen/span_pb");
var services = require("../static_codegen/agent/spanAgent_grpc_pb");
var RemoteDispatcher = (function () {
    function RemoteDispatcher(agentHost, agentPort) {
        this._client = new services.SpanAgentClient(agentHost + ":" + agentPort, grpc.credentials.createInsecure());
    }
    RemoteDispatcher.prototype.name = function () {
        return "RemoteDispatcher";
    };
    RemoteDispatcher.prototype.dispatch = function (span) {
        var protoSpanMessage = new messages.Span();
        protoSpanMessage.setServicename(span.serviceName);
        protoSpanMessage.setOperationname(span.operationName);
        this._client.dispatch(protoSpanMessage, function (err, response) {
            if (err) {
                console.log('Fail to dispatch span to haystack-agent', err.toString());
            }
            else {
                console.log('Response code from haystack-agent', response.getCode());
            }
        });
    };
    RemoteDispatcher.prototype.close = function (callback) {
        grpc.closeClient(this._client);
        if (callback) {
            callback();
        }
    };
    return RemoteDispatcher;
}());
exports.default = RemoteDispatcher;
