DEFAULT_BROWSERS := resources/browser_manifests/browser_manifest.json
DEFAULT_TESTS := test_manifest.json

test: browser-test

# make browser-test
#
# This target runs in-browser tests using two primary arguments: a
# test manifest file, and a browser manifest file. Both are simple
# JSON formats, and examples can be found in the test/ directory. The
# target will inspect the environment for the PDF_TESTS and
# PDF_BROWSERS variables, and use those if found. Otherwise, the
# defaults at the top of this file are used.
ifeq ($(PDF_TESTS),)
PDF_TESTS := $(DEFAULT_TESTS)
endif
ifeq ($(PDF_BROWSERS),)
PDF_BROWSERS := $(DEFAULT_BROWSERS)
endif

browser-test:
	@if [ ! -f "test/$(PDF_BROWSERS)" ]; then \
	echo "Browser manifest file $(PDF_BROWSERS) does not exist."; \
	echo "Try copying one of the examples" \
              "in test/resources/browser_manifests/"; \
	exit 1; \
	fi;

	cd test; \
	python test.py \
	--browserManifestFile=$(PDF_BROWSERS) \
	--manifestFile=$(PDF_TESTS)

master:
	cd test && \
	python test.py --reftest \
	--masterMode \
	--browserManifestFile=$(PDF_BROWSERS)
