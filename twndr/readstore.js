$ = require('./twndr/streamr/node_modules/jquery');
LocalStorage = require('./twndr/streamr/node_modules/node-localstorage').LocalStorage;
localStorage = new LocalStorage('./localStore', 25*1024*1024);
util = require('./lib/util.js').util;

console.log(util.local.get('20150826195720577_lex'));
