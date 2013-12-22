var lex = {
  cfg: {
    optimize: false,
    power: 2,
    topThreshold: 0.2,
    topCount: 15,
    bestScoreMaxTries: 50
  },
  init: function(){
    this.meta = {};
    this.list = {};
    this.output = {};
  },
  tokenize: function(corpus){
    var tokens = corpus        
      .replace(/(http|pic\.)\S*/g,'')
      .replace(/\n+/g,' BR ')
      .split(/[^A-Za-z0-9\'\\n\@\_\#]+/)
      .slice(1);
    return tokens;
  },
  build: function(corpus, callback){
    lex.init();
    var words = lex.tokenize(corpus);
    var time = new Date();
    $.each(words, function(k, word){
      lex.tally(word ,lex.list);
      if (words[k+1]) {
        if (!lex.list[word].next) lex.list[word].next = {};
        lex.tally(words[k+1], lex.list[word].next);
      }
    });
    // prevent double linebreak
    delete lex.list.BR.next.BR;
    lex.meta = {
      buildTime: (new Date() - time) + 'ms',
      rawCount: words.length,
      tallyCount: Object.keys(lex.list).length,
      lines: lex.list.BR.count,
      top: lex.sortArr(lex.objToArr(lex.list))
        .filter(function(v){
          return util.isRelevant(v.word);
        })
        .slice(0, lex.cfg.topCount)
    };
    callback(lex);
  },
  tally: function(item, list, value){
    var inc = value || 1;
    if (list[item]) {
      list[item].count += inc;
    } else {
      list[item] = {};
      list[item].count = inc;
    }
    return list;
  },
  isInArr: function(arr, key, val) {
    var found = false;
    $.each(arr, function(k,v){
      if (v[key] == val) found = v;
    });
    return found;
  },
  getPropArr: function(arr, key) {
    var out = [];
    $.each(arr, function(k,v){
      out.push(v[key]);
    });
    return out;
  },
  removeByProp: function(arr, key, val) {
    var out = [];
    $.each(arr, function(k,v){
      if (v[key] == val) out.push(v);
    });
    return out.length ? out : arr;
  },
  objToArr: function(obj){
    var arr = [], tempObj = {};
    $.each(obj, function(k,v){
      tempObj = v;
      tempObj.word = k;
      arr.push(tempObj);
    });
    return arr;
  },
  sortArr: function(arr) {
    return arr.sort(function(a,b){return b.count - a.count;});
  },
  redistributeArr: function(arr, power){
    var out = [];
    //if (1) return lex.sortArr(arr).slice(0,2);
    $.each(arr, function(k,v){
      //var topWord = lex.meta.top[v.word];
      //if (topWord) v.count = topWord.count;
      for(var i=0, ii=Math.round(Math.pow(v.count, power)); i < ii; i++){
        out.push(v);
      }
    });
    return out;
  },
  getRandom: function(arr){
    var i = Math.floor(Math.random()*arr.length);
    return arr[i];
  },
  getWeightedRandom: function(obj, exclude){
    var out = lex.objToArr(obj);
        if (out.length == 1) return out[0];
        out = out.filter(function(v){return v.word !== exclude;});
        out = lex.redistributeArr(out, lex.cfg.power);
        out = lex.getRandom(out);
    return out;
  }
};
