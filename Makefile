mocha_option := --recursive -t 5000 -s 100
test:
ifeq ($(TRAVIS),1)
	@NODE_ENV=test ./node_modules/.bin/mocha --require blanket -R mocha-lcov-reporter $(mocha_option) | ./node_modules/coveralls/bin/coveralls.js
	@NODE_ENV=test ./node_modules/.bin/mocha -R spec $(mocha_option)
else
	@NODE_ENV=test ./node_modules/.bin/mocha -R spec $(mocha_option)
endif

.PHONY: test