# make master
#
# Generates a snapshot reference set
bot_master:
	cd test && \
	python -u test.py \
	--masterMode \
	--noPrompts \
	--browserManifestFile=$(PDF_BROWSERS)

# Generates a snapshot reference set
bot_test:
	cd test; \
	python -u test.py \
	--browserManifestFile=$(PDF_BROWSERS) \
	--manifestFile=$(PDF_TESTS)
