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
var file_1 = require("./dispatchers/file");
var remote_1 = require("./dispatchers/remote");
var composite_dispatchers_1 = require("./dispatchers/composite_dispatchers");
var tracer_1 = require("./tracer");
var opentracing = require("opentracing");
var Configuration = (function () {
    function Configuration() {
    }
    Configuration._getDispatcher = function (config) {
        var dispatchers = [];
        if (config.dispatchers) {
            config.dispatchers.forEach(function (dispatcher) {
                switch (dispatcher.type) {
                    case 'file':
                        dispatchers.push(new file_1.default(dispatcher.filePath));
                        break;
                    case 'haystack_agent':
                        dispatchers.push(new remote_1.default(dispatcher.agentHost, dispatcher.agentPort));
                        break;
                    default:
                        throw new Error("reporter of type " + dispatcher + " is not unknown");
                }
            });
        }
        return new composite_dispatchers_1.default(dispatchers);
    };
    Configuration.initTracer = function (config) {
        if (config.disable) {
            return new opentracing.Tracer();
        }
        if (!config.serviceName) {
            throw new Error("config.serviceName must be provided");
        }
        var dispatcher = Configuration._getDispatcher(config);
        if (config.logger) {
            config.logger.info("Initializing Haystack Tracer with " + dispatcher.name());
        }
        return new tracer_1.default(config.serviceName, dispatcher, config.commonTags, config.logger);
    };
    return Configuration;
}());
exports.default = Configuration;
