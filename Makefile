#
# Run all tests
#
test: 
	node test/cake-test.js

#
# Run benchmark
#
benchmark:
	node benchmark/cake-benchmark.js
	
#
# Build CakeJs.js
#
SRC = lib
HEADER = build/header.js

#VERSION = `cat package.json | grep version | grep -o '[0-9]\.[0-9]\.[0-9]\+'` #$(shell node build/package_parser.js package.json version)
VERSION =`cat package.json | grep version \
						| grep -o '[0-9]\.[0-9]\.[0-9]\+'`

#DESCRIPTION = $(shell node build/package_parser.js package.json description) #`cat package.json | grep description`
#URL = $(shell node build/package_parser.js package.json url)
#COPYRIGHT = $(shell node build/package_parser.js package.json copyright)
#LICENSE = $(shell node build/package_parser.js package.json license)
DIST = dist/cake-${VERSION}.js
DIST_MIN = dist/cake-${VERSION}.min.js

cake:
	
	@@mkdir -p dist
	@@touch ${DIST}
	@@cat ${HEADER} | sed s/@VERSION/${VERSION}/ > ${DIST}
#	@@cat ${DIST}	| sed s/@DESCRIPTION/${DESCRIPTION}/ > ${DIST}
#	@@cat ${DIST}	| sed s/@URL/$(URL)/ > ${DIST}
#	@@cat ${DIST}	| sed s/@LICENSE/$(LICENSE)/ > ${DIST}
#	@@cat ${DIST}	| sed s/@COPYRIGHT/$(COPYRIGHT)/ > ${DIST}

	@@echo "(function (window, undefined) {" >> ${DIST}
	@@cat ${SRC}/main.js\
	      ${SRC}/Utils/*.js\
	      ${SRC}/Cake/*.js \
		  ${SRC}/last.js >> ${DIST}
	@@echo "})(window);" >> ${DIST}
	
	@@echo ${DIST} built.

min: cake
	@@echo minifying...
	@@cat ${HEADER} | sed s/@VERSION/${VERSION}/ > ${DIST_MIN}
	@@java -jar build/compiler.jar\
		     --js ${DIST} >> ${DIST_MIN}

clean:
	git rm dist/*

dist: clean min
	git add dist/*
	git commit -a -m "(dist) build ${VERSION}"
	git archive master --prefix=cake/ -o cake-${VERSION}.tar.gz
	npm publish cake-${VERSION}.tar.gz

stable:
	npm tag cake ${VERSION} stable


.PHONY: test benchmark
