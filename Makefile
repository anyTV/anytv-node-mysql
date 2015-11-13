mocha_option := --recursive -t 5000 -s 100
test:
ifeq ($(TRAVIS),1)
	@NODE_ENV=test ./node_modules/.bin/istanbul cover ./node_modules/mocha/bin/_mocha --report lcovonly -- $(mocha_option) && cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js
else
	@NODE_ENV=test ./node_modules/.bin/mocha -R spec $(mocha_option)
endif

.PHONY: test