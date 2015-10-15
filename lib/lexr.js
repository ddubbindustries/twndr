var Lex = function(){
  this.list = {};
  this.tokens = 0;
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

Lex.prototype.tally = function(key, id, metadata){
  if (this.list[key]) {
    this.list[key].count++;
    this.list[key].ids.push(id);
  } else {
    this.list[key] = {
      count: 1,
      ids: [id],
      forms: [key],
      meta: metadata ? metadata : null
    };
  }
  this.tokens++;
  return this.list[key];
};

Lex.prototype.addChunk = function(text, chunkId){
  var lex = this,
      tokens = lex.tokenize(text);
  $.each(tokens, function(k, token){
    if (token) lex.tally(token, chunkId);
    if (tokens[k+1]) {
      if (!lex.list[token].next) lex.list[token].next = new Lex();
      lex.list[token].next.tally(tokens[k+1], chunkId);
    }
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

Lex.prototype.sortArrByCount = function(arr){
  return arr.sort(function(a,b){return b.count - a.count;});
};

Lex.prototype.merge = function(key1, key2, minLength){
  var list = this.list;
  if (key1.length <= minLength || key2.length <= minLength || !list[key1] || !list[key2]) return false;

  list[key1].count += list[key2].count;
  list[key1].ids = list[key1].ids.concat(list[key2].ids);

  list[key1].forms = list[key1].forms.concat(list[key2].forms);
  delete list[key2];
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

Lex.prototype.setTop = function(){
  this.topArr = this.sortArrByCount(this.objToArr(this.filtered));
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
