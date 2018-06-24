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
build: check-node-version npm_install idl_codegen
	rm -rf ./dist/
	tsc -p tsconfig.json
	cp package.json dist/

.PHONY: idl_codegen
idl_codegen:
	rm -rf src/proto_idl_codegen
	mkdir src/proto_idl_codegen
	git submodule init -- ./haystack-idl
	git submodule update
	./node_modules/grpc-tools/bin/protoc -I haystack-idl/proto --plugin=protoc-gen-grpc=./node_modules/grpc-tools/bin/grpc_node_plugin --js_out=import_style=commonjs,binary:./src/proto_idl_codegen --grpc_out=./src/proto_idl_codegen haystack-idl/proto/span.proto
	./node_modules/grpc-tools/bin/protoc -I haystack-idl/proto --plugin=protoc-gen-grpc=./node_modules/grpc-tools/bin/grpc_node_plugin --js_out=import_style=commonjs,binary:./src/proto_idl_codegen --grpc_out=./src/proto_idl_codegen haystack-idl/proto/agent/spanAgent.proto

.PHONY: npm_install
npm_install:
	npm install

example: build
	mkdir -p logs
	rm -rf logs/spans
	node dist/examples/index.js
	cat logs/spans