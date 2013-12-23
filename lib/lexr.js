var lex = {
  cfg: {
    power: 1,
    topCount: 40
  },
  init: function(){
    this.meta = {chunkCount: 0, rawCount: 0, tallyCount: 0, totalTime: 0};
    this.list = {};
  },
  chunkenize: function(corpus) {
    return corpus.split(/\n+\s*\n+\s*\n+/g);
  },
  tokenize: function(text){
    var tokens = text        
      .replace(/(http|pic\.)\S*/g,'')
      .replace(/\n+/g,' BR ')
      .split(/[^A-Za-z0-9\'\\n\@\_\#]+/)
      .slice(1);
    return tokens;
  },
  addChunk: function(text){
    var time = new Date(),
        words = lex.tokenize(text);
    $.each(words, function(k, word){
      lex.tally(word ,lex.list);
      if (words[k+1]) {
        if (!lex.list[word].next) lex.list[word].next = {};
        lex.tally(words[k+1], lex.list[word].next);
      }
    });
    // prevent double linebreak
    delete lex.list.BR.next.BR;
    //lex.sortTop();
    lex.meta.chunkCount++;
    lex.meta.rawCount += words.length;
    lex.meta.tallyCount = Object.keys(lex.list).length;
    lex.meta.totalTime += (new Date() - time);
  },
  sortTop: function(){
    lex.meta.top = lex.sortArr(
      lex.objToArr(lex.list)
        .filter(function(v){ return util.isRelevant(v.word); })
    ).slice(0, lex.cfg.topCount);
  }, 
  build: function(corpus, callback){
    lex.init();
    lex.chunks = lex.chunkenize(corpus);
    $.each(lex.chunks, function(k,v){ lex.addChunk(v); });
    lex.sortTop();
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
    out = out.filter(function(v){ return v.word !== exclude; });
    out = lex.redistributeArr(out, lex.cfg.power);
    out = lex.getRandom(out);
    return out;
  },
  output: {
    series: function(minCount) {
      var out = [],
          maxCount = 100,
          item = lex.getWeightedRandom(lex.list, 'BR');
      for (count=0; count < maxCount; count++) {
        if (item.word == 'BR') break;
        out.push(item);
        var nextList = item.next ? item.next : lex.list,
            exclude = count > minCount ? item.word : 'BR',
            nextItem = lex.getWeightedRandom(nextList, exclude);
        item = lex.list[nextItem.word];
      }
      return out;
    },
    line: function(opt){
      var minCount = opt.minWords || 7,
          maxCount = opt.maxWords || 10,
          wordArr = [],
          out = '',
          maxTries = 100;
      for (tries=1; tries <= maxTries; tries++) {
        wordArr = lex.output.series(minCount);
        if (wordArr.length >= minCount && wordArr.length <= maxCount) break;
      }
      out = wordArr.map(function(v){ return v.word; }).join(' ');
      if (opt.stats) 
        out += ' ' + '<span class="stats">'+JSON.stringify({words: wordArr.length, tries: tries}).replace(/"/g,'') + '</span>';
      return util.capitalize(out);
    },
    format: function(opt) {
      var out = '', lastWord = '';
      for (s=0; s<opt.sets; s++) {
        out += '<p>';
        for (l=0; l<opt.lines; l++){
          out += lex.output.line(opt);
          out += opt.lineEnd;
        }
        out += '</p>';
      }
      return out;
    }
  }
};
