v0.0.56
-----

* Fixed a bug where mysql key can be changed since it's using a reference on the mysql object

v0.0.55
-----

* Added support for squel to build query for promise
* Updated squel dependency
* Use squel.cls.isSquelBuilder
* Moved global dependencies to devDependencies
* Added docs and build command in npm scripts

v0.0.54
-----

* Fixed a bug with using transactions in pooled connections not re-using the connection
