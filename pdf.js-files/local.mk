# Windows browsers don't understand msys-style paths
QUICK_BROWSERS = resources/browser_manifests/quick_manifest.json
QUICK_PDF_TESTS = quick_tests.json

master:
	cd test && \
	python test.py --reftest \
	--masterMode \
	--browserManifestFile=$(PDF_BROWSERS)

quick:
	cd test && \
	python test.py --reftest \
	--browserManifestFile=$(QUICK_BROWSERS) \
	--manifestFile=$(QUICK_PDF_TESTS)

tm:
	cd test && \
	python test.py --reftest \
	--browserManifestFile=$(QUICK_BROWSERS) \
	--manifestFile=tm.json

.PHONY:: master quick
