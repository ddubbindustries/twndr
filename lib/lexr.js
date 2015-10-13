var Lex = function(){
  this.list = {};
};

Lex.prototype.tokenize = function(text){
  return text
    .toLowerCase()
    .replace(/http\S*/g,'')
    .replace(/&[a-z]+;/g, function(i){ return {'&lt;':'<', '&gt;':'>', '&amp;':'&'}[i]; })
    .replace(/[\,\.\…\/\\\—\+\"\(\)\:\!\¯\=\•]/g, '')
    .replace(/[\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]/g, '$& ') //emoji
    .split(/\s/)
    .filter(function(v){ return !/^[0-9\&@\-]$/.test(v) && v.length; });
};

Lex.prototype.tally = function(key, id, metadata){
  if (this.list[key]) {
    this.list[key].count++;
    this.list[key].ids.push(id);
  } else {
    this.list[key] = {
      count: 1,
      ids: [id],
      meta: metadata ? metadata : null
    };
  }
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

Lex.prototype.filterList = function(filter){
  var list = this.list,
      out = $.extend(true, {}, list);
  $.each(out, function(k,v){
    if (!filter(k,v)) delete out[k];
  });
  return out;
};

Lex.prototype.merge = function(key1, key2){
  var lex = this;
  if (!lex.list[key1] || !lex.list[key2]) return false; // not sure how this happens yet
  lex.list[key1].count += lex.list[key2].count;
  lex.list[key1].ids = lex.list[key1].ids.concat(lex.list[key2].ids);
  if (!lex.list[key1].forms) lex.list[key1].forms = [key2];
  if (lex.list[key2].forms) lex.list[key1].forms = lex.list[key1].forms.concat(lex.list[key2].forms);
  delete lex.list[key2];
};

Lex.prototype.setTop = function(filter){
  var filtered = filter ? this.filterList(filter) : this.list,
      arr = this.objToArr(filtered);
  this.topArr = this.sortArrByCount(arr);
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
