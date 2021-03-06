MIN_NODE_VER=6
NODE_VER=$(shell node -v | cut -d . -f 1 | cut -d v -f 2)

ifeq ($(shell expr $(NODE_VER) \>= $(MIN_NODE_VER)), 1)
    MIN_NODE_VER_FOUND=true
else
    MIN_NODE_VER_FOUND=false
endif

.PHONY: check-node-version
check-node-version:
	@$(MIN_NODE_VER_FOUND) || echo Build requires minimum Node $(MIN_NODE_VER).x

.PHONY: build
build: check-node-version npm_install idl_codegen tslint compile test

.PHONY: prepare_publish
prepare_publish:
	node scripts/version.js
	cp package.json dist/
	cp README.md dist/

.PHONY: test
test:
	./node_modules/mocha/bin/mocha -r ./node_modules/ts-node/register tests/unit/**/*.ts

.PHONY: integration_tests
integration_tests:
	docker-compose -f integration-tests/docker-compose.yml -p sandbox up -d
	sleep 15
	docker run -it \
	    --rm \
		--network=sandbox_default \
		-v $(PWD):/ws \
		-w /ws \
		node:12.16.3-alpine \
		/bin/sh -c 'mkdir -p ws2 && apk --no-cache add python make g++ && cp -a src tests package.json  tsconfig.json ws2/ && cd ws2 && npm i && ./node_modules/mocha/bin/mocha -r ./node_modules/ts-node/register --exit tests/integration/**/*.ts'
	docker-compose -f integration-tests/docker-compose.yml -p sandbox stop

.PHONY: compile
compile:
	rm -rf ./dist/
	./node_modules/typescript/bin/tsc -p tsconfig.json
	cp -a src/proto_idl_codegen dist/
.PHONY: tslnt
tslint:
	$(shell ./node_modules/tslint/bin/tslint -t msbuild -c tslint.json 'src/**/*.ts')

.PHONY: idl_codegen
idl_codegen:
	rm -rf src/proto_idl_codegen
	mkdir src/proto_idl_codegen
	git submodule init -- ./haystack-idl
	git submodule update
	./node_modules/grpc-tools/bin/protoc -I haystack-idl/proto --plugin=protoc-gen-grpc=./node_modules/grpc-tools/bin/grpc_node_plugin --js_out=import_style=commonjs,binary:./src/proto_idl_codegen --grpc_out=generate_package_definition:./src/proto_idl_codegen haystack-idl/proto/span.proto
	./node_modules/grpc-tools/bin/protoc -I haystack-idl/proto --plugin=protoc-gen-grpc=./node_modules/grpc-tools/bin/grpc_node_plugin --js_out=import_style=commonjs,binary:./src/proto_idl_codegen --grpc_out=generate_package_definition:./src/proto_idl_codegen haystack-idl/proto/agent/spanAgent.proto

.PHONY: npm_install
npm_install:
	npm install

example: build
	mkdir -p logs
	rm -rf logs/spans
	node examples/index.js
	cat logs/spans
