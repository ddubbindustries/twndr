
$ = require('./streamr/node_modules/jquery');
util = require('../lib/util.js').util;
lex = require('../lib/lexr.js').lex;
LocalStorage = require('./streamr/node_modules/node-localstorage').LocalStorage;
localStorage = new LocalStorage('../localStore', 25*1024*1024);

var fileName = 'chunks',
    chunks = util.local.get(fileName),
    chunkCount = Object.keys(chunks).length,
    i = 1;

lex.init();
lex.pushon = function(arr, item) {
  if (arr && arr.length) {
    arr.push(item);
  } else {
    arr = [item];
  }
  return arr;
};
lex.sortObj = function(obj, minCount){
    var arr = lex.objToArr(obj).filter(function(v){return v.count > minCount;}),
        sortedArr = lex.sortArr(arr);
    return lex.arrToObj(sortedArr);
};

$.each(chunks, function(k,v){
  console.log(i, v.created_at, v.text, '-- '+v.place.full_name);
  lex.addChunk(v.text);
  if (i++ == chunkCount) {
    lex.afterChunks();
    var topObj = lex.meta.top,
        topTrim = {};

    $.each(topObj, function(k,v){

      var fuzzyKey = k.toLowerCase().replace(/#/,'');

      if (topTrim[fuzzyKey]) {
        topTrim[fuzzyKey].count += v.count;
        topTrim[fuzzyKey].altWord = lex.pushon(topTrim[fuzzyKey].altWord, v.word);
        $.extend(topTrim[fuzzyKey].next, v.next);
        //console.log('modified', topTrim[fuzzyKey]);//.word, topTrim[fuzzyKey].altWord);
      } else {
        topTrim[fuzzyKey] = v;
      }
    });

    var trimArr = [];
    $.each(lex.sortObj(topTrim, 1), function(k, v){
      trimArr.push(v.word + ' ' +v.count);
    });

    console.log('topArr', lex.meta.topArr.join(', '), "\n\n\n\n\n");
    console.log('topTrim', trimArr.join(', '), topTrim);
  }
});



