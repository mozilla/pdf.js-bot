# make master
#
# Generates a snapshot reference set
master:
	cd test && \
	python -u test.py \
	--masterMode \
	--noPrompts \
	--browserManifestFile=$(PDF_BROWSERS)
