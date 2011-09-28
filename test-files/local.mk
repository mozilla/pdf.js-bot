# make master
#
# Generates a snapshot reference set
master:
	cd test && \
	python test.py \
	--masterMode \
	--noPrompts \
	--browserManifestFile=$(PDF_BROWSERS)
