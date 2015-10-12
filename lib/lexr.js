var Lex = function(init){
  this.name = init;
  this.list = {},
  this.englishCommon = "a able about above across after all almost along already also always am an and any anybody anyone anything anyway anyways anywhere apart are aren't around as ask asking at away be because been before behind being below best better between both but by c'mon came can can't cant clearly come comes could couldn't did didn't do does doesn't doing don't done each either else etc even ever every everybody everyone everything everywhere exactly except far few first followed following follows for from get gets getting given gives go goes going gone got gotten had hadn't happens hardly has hasn't have haven't having he he's her here here's hers herself him himself his how however i i'd i'll i'm i've if in instead into is isn't it it'd it'll it's its itself just keep keeps kept let's many may maybe me might more much my neither no not nothing now of oh ok okay old on once one ones only onto or other others our ours ourselves out over own probably quite really right said same saw say saying says see seeing seem seemed seeming seems seen she should shouldn't since so some somebody somehow someone something sometime sometimes somewhere soon still such sure take taken tell than that that's thats the their theirs them themselves then there there's theres these they they'd they'll they're they've this those though through thru to together too took toward towards tried tries truly try trying twice under unfortunately until up us use used uses using usually very vs was wasn't way we we'd we'll we're we've well went were weren't what what's when where where's whether which while who who's whoever whole whom whose will with within without won't would wouldn't yes yet you you'd you'll you're you've your yours yourself yourselves";
  this.twitterCommon = "rt tonight today new tomorrow make again work thing last love good time next gonna real off never night like know people day think back why name need want life things";
};

Lex.prototype.isInString = function(needle, haystack){
  return (' '+haystack+' ').indexOf(' '+needle+' ') > -1;
};

Lex.prototype.isCommon = function(input) {
  return this.isInString(input.toLowerCase(),
    this.englishCommon
    + this.twitterCommon
  );
};

Lex.prototype.tokenize = function(text){
  return text
    .toLowerCase()
    .replace(/http\S*/g,'')
    .replace(/&[a-z]+;/g, function(i){ return {'&lt;':'<', '&gt;':'>', '&amp;':'&'}[i]; })
    .replace(/[\,\.\…\/\\\—\+\"\(\)\:\!\¯\=]/g, '')
    .replace(/[\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]/g, '$& ') //emoji
    .split(/\s/)
    .filter(function(v){ return !/^[0-9\&@\-]$/.test(v) && v.length; });
};

Lex.prototype.tally = function(list, key, id, metadata){
  if (list[key]) {
    list[key].count++;
    list[key].ids.push(id);
  } else {
    list[key] = {
      count: 1,
      ids: [id],
      metadata: metadata ? metadata : null
    };
  }
  return list[key];
};

Lex.prototype.addChunk = function(text, chunkId){
  var lex = this,
      words = lex.tokenize(text);
  $.each(words, function(k, word){
    if (word) lex.tally(lex.list, word, chunkId);
    if (words[k+1]) {
      if (!lex.list[word].next) lex.list[word].next = {};
      lex.tally(lex.list[word].next, words[k+1], chunkId);
    }
  });
};

Lex.prototype.objToArr = function(obj){
  var arr = [], tempObj = {};
  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) { continue; }
    tempObj = obj[key];
    tempObj.word = key;
    arr.push(tempObj);
  }
  return arr;
};

Lex.prototype.arrToObj = function(arr, keyName){
  var obj = {};
  $.each(arr, function(k,v){
    obj[v[keyName]] = v;
  });
  return obj;
};

Lex.prototype.sortArr = function(arr, keyName){
  // sort is a method of array you know...
  return arr.sort(function(a,b){return b[keyName] - a[keyName];});
};

Lex.prototype.getTop = function(filter){
  var lex = this,
      arr = lex.objToArr(lex.list).filter(filter);
  return lex.sortArr(arr, 'count');
};

Lex.prototype.getTopSeries = function(list, len){
  var out = '', i = 0;
  while (out.length < len && list[i]) {
    out += list[i++].word + ' ';
  }
  return out;
};

if (typeof module !== 'undefined') module.exports = Lex();
