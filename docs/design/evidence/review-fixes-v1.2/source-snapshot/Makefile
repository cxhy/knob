.PHONY: compile test compile-host test-host test-framework test-verdict test-all
compile:
	bash scripts/compile.sh

# Reuses an existing build. Run `make compile` explicitly first.
test:
	bash scripts/test.sh

compile-host:
	bash scripts/compile.sh host-isolated

test-host:
	bash scripts/test-host.sh

test-framework:
	bash scripts/test-framework.sh

test-verdict:
	bash scripts/test-verdict.sh

test-all: test-verdict test test-framework test-host
