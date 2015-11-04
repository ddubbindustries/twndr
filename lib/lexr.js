Array.prototype.disArray = function(key){
  var i = this.indexOf(key);
  return i > -1 ? this.splice(i, 1) : this;
};


var Lex = function(){
  this.list = {};
  this.tokens = 0;
  this.unique = 0;
  this.filtered = this.list;
  this.topArr = [];
};

Lex.prototype.tokenize = function(text){
  return text
    .toLowerCase()
    .replace(/http\S*/g,'')
    .replace(/&[a-z]+;/g, function(i){ return {'&lt;':'<', '&gt;':'>', '&amp;':'&'}[i]; })
    .replace(/[\,\.\…\\/\\—\+\"\(\)\:\!\¯\=\•\|]/g, '')
    .replace(util.emojiRgx, '$& ')
    .split(/\s/)
    .filter(function(v){ return v.length && !/^[0-9\&@\-]/.test(v) && !/\w@\w/.test(v); });
};

Lex.prototype.tally = function(key, chunkId, authorId, opts){
  var opts = opts || {};

  if (!this.list[key]) {
    this.list[key] = {
      count: 0,
      ids: [],
      authors: [],
      forms: [key]
    };
  }

  if (opts.authorUnique && this.list[key].authors.indexOf(authorId) > -1) return false;

  this.list[key].count++;
  this.tokens++;
  if (chunkId) this.list[key].ids.push(chunkId);
  if (authorId) this.list[key].authors.push(authorId);
  if (opts.meta) this.list[key].meta = opts.meta;

  this.unique = Object.keys(this.list).length;

  return this.list[key];
};

Lex.prototype.setProbs = function(totalVocab){
  var list = this.list,
      totalTag = this.tokens;
  $.each(list, function(k,v){
    list[k].prob = Math.log10((list[k].count + 1) / (totalTag + totalVocab));
  });
  return this;
};

Lex.prototype.untally = function(key, chunkId, authorId){
  if (this.list[key]) {
    this.list[key].count--;
    this.tokens--;
    this.list[key].ids.disArray(chunkId);
    this.list[key].authors.disArray(authorId);
  }
  if (this.list[key].count === 0) delete this.list[key];
  return this.list[key];
};

Lex.prototype.addChunk = function(text, chunkId, authorId, opts){
  var opts = opts || {},
      lex = this,
      tokens = typeof(text) == 'string' ? lex.tokenize(text) : text;

  $.each(tokens, function(k, token){
    lex.tally(token, chunkId, authorId, opts);

    if (opts.storeNext && tokens[k+1]) {
      if (!lex.list[token].next) lex.list[token].next = new Lex();
      lex.list[token].next.tally(tokens[k+1], chunkId, authorId);
    }
  });
  return tokens;
};

Lex.prototype.unChunk = function(text, chunkId, authorId){
  var lex = this,
      tokens = typeof(text) == 'string' ? lex.tokenize(text) : text;

  $.each(tokens, function(k, token){
    lex.untally(token, chunkId, authorId);
  });
  return tokens;
};

Lex.prototype.objToArr = function(obj){
  var arr = [], tempObj = {};
  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    tempObj = obj[key];
    tempObj.word = key;
    arr.push(tempObj);
  }
  return arr;
};

Lex.prototype.sortArrByKey = function(arr, key){
  return arr.sort(function(a,b){return b[key] - a[key];});
};

Lex.prototype.addRank = function(obj, key){
  // for ranking classifier probabilities
  var out = {},
      arr = this.objToArr(obj)
  arr = this.sortArrByKey(arr, key);
  $.each(arr, function(k,v){
    v.rank = k+1;
    out[v.word] = v;
  });
  return out;
};

Lex.prototype.mergeTokens = function(key1, key2, minLength){
  var list = this.list;
  if (key1.length <= minLength || key2.length <= minLength || !list[key1] || !list[key2]) return false;

  list[key1].count += list[key2].count;
  list[key1].ids = list[key1].ids.concat(list[key2].ids);
  list[key1].authors = list[key1].authors.concat(list[key2].authors);
  list[key1].forms = list[key1].forms.concat(list[key2].forms);
  delete list[key2];
  return this;
};

Lex.prototype.mergeForms = function(fnArr) {
  var lex = this;
  $.each(lex.list, function(word, v) {
    $.each(fnArr, function(i, fn) {
      lex.mergeTokens(fn(word), word, 3);
    });
  });
  return this;
};

Lex.prototype.featherList = function(list2) {
  var list1 = this.list;
  $.each(list2, function(k,v){
    k.split(' ').forEach(function(word){
      if (list1[word]) list1[word].count -= list2[k].count;
    });
  });
  list1 = $.extend(list1, list2);
  return this;
};

Lex.prototype.findInArray = function(arr, key, val) {
  var foundItem = null;
  $.each(arr, function(k,v){
    if (v[key] == val) foundItem = v;
  });
  return foundItem;
};

Lex.prototype.concat = function(pctThreshold){
  var lex = this;
  $.each(lex.topArr, function(k,v){
    if (!v.next) return true;
    v.next.setTop();
    var topNext = v.next.topArr[0],
        pctNext = (topNext.count / v.count);
    v.wordNextTop = topNext.word;
    v.wordNextPct = pctNext;
    if (pctNext > pctThreshold) {
      v.forms[0] += ' '+topNext.word;
      v.word += ' '+topNext.word;
      var subtractor = lex.findInArray(lex.topArr, 'word', topNext.word);
      if (subtractor) subtractor.count -= topNext.count;
    }
  });
  return this;
};

Lex.prototype.setTopPercents = function(){
  var total = this.tokens,
      topArr = this.topArr;
  $.each(topArr, function(k,v){
    topArr[k].percent = (v.count / total);
  });
};

Lex.prototype.filter = function(filter){
  var list = this.list,
      out = $.extend(true, {}, list);
  $.each(out, function(k,v){
    if (!filter(k,v)) delete out[k];
  });
  this.filtered = out;
  return this;
};

Lex.prototype.permaFilter = function(filter){
  if (filter) this.filter(filter);
  this.list = this.filtered;
  return this;
};

Lex.prototype.setTop = function(sortKey){
  var sortKey = sortKey || 'count',
      arr = this.objToArr(this.list),
      topArr = this.sortArrByKey(arr, sortKey);
  this.topArr = topArr;
  this.setTopPercents();
  return this.topArr;
};

Lex.prototype.getTopSeries = function(list, len){
  var out = '', i = 0;
  while (out.length < len && list[i]) {
    out += list[i++].word + ' ';
  }
  return out;
};

if (typeof module !== 'undefined') module.exports = Lex();
