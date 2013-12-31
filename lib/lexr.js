var lex = {
  cfg: {
    power: 1
  },
  init: function(){
    this.meta = {chunkCount: 0, rawCount: 0, tallyCount: 0, totalTime: 0};
    this.chunks = {};
    this.list = {};
  },
  chunkenize: function(corpus) {
    return corpus.split(/\n+\s*\n+\s*\n+/g);
  },
  tokenize: function(text){
    var tokens = text        
      .replace(/&[a-z]+;/g, function(i){ return {'&lt;':'<', '&gt;':'>', '&amp;':'&'}[i]; })
      .replace(/(http|pic\.)\S*/g,'')
      .replace(/\n+|$/g,' BR ')
      .split(/[^A-Za-z0-9\'#@_\-><&]+/)
      .filter(function(v){ return /^[^0-9&@\-]/.test(v); });
    return tokens;
  },
  addChunk: function(text){
    var time = new Date(),
        words = lex.tokenize(text);
    $.each(words, function(k, word){
      if (word) lex.tally(word, lex.list);
      if (words[k+1]) {
        if (!lex.list[word].next) lex.list[word].next = {};
        lex.tally(words[k+1], lex.list[word].next);
      }
    });
    // prevent double linebreak
    if (lex.list.BR && lex.list.BR.next) delete lex.list.BR.next.BR;
    lex.meta.chunkCount++;
    lex.meta.rawCount += words.length;
    lex.meta.totalTime += (new Date() - time);
  },
  afterChunks: function(count){
    lex.meta.tallyCount = Object.keys(lex.list).length;
    var topList = lex.objToArr(lex.list)
          .filter(function(v){ return util.isRelevant(v.word); });
    topList = lex.sortArr(topList).slice(0, count);
    lex.meta.top = lex.arrToObj(topList);
  }, 
  build: function(corpus, callback){
    lex.init();
    lex.chunks = lex.chunkenize(corpus);
    $.each(lex.chunks, function(k,v){ lex.addChunk(v); });
    lex.afterChunks();
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
  indexOfProp: function(arr, key, val) {
    var index = -1;
    $.each(arr, function(k,v){
      if (v[key] == val) index = k;
    });
    return index;
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
  arrToObj: function(arr){
    var obj = {};
    $.each(arr, function(k,v){
      obj[v.word] = v;
    });
    return obj;
  },
  sortArr: function(arr) {
    return arr.sort(function(a,b){return b.count - a.count;});
  },
  redistributeArr: function(arr, power){
    var out = [];
    $.each(arr, function(k,v){
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
  getWeightedRandom: function(obj, excludeArr){
    var out = lex.objToArr(obj);
    
    var filteredByExcluded = out.filter(function(v){ return excludeArr.indexOf(v.word) == -1; });
    if (filteredByExcluded.length) out = filteredByExcluded;

    if (lex.cfg.optimize) {
      var onlyTopWords = out.filter(function(v){ return lex.meta.top[v.word]; });
      if (onlyTopWords.length) out = onlyTopWords;
    }

    if (out.length === 1) return out[0];
    
    out = lex.redistributeArr(out, lex.cfg.power);
    out = lex.getRandom(out);
    return out;
  },
  output: {
    series: function(minCount, startWord) {
      var out = [],
          maxCount = 100,
          item = lex.list[startWord] || lex.getWeightedRandom(lex.list, ['BR']);
      for (count=0; count < maxCount; count++) {
        if (item.word == 'BR') break;
        out.push(item);
        var nextList = item.next ? item.next : lex.list,
            outWordArr = out.map(function(v){return v.word}),
            exclude = count > minCount ? outWordArr : ['BR'],
            nextItem = lex.getWeightedRandom(nextList, exclude);
        item = lex.list[nextItem.word];
      }
      return out;
    },
    getScore: function(arr, markup){
      var score = 0, thisScore = 0, scoredWords = [], out = '';
      $.each(arr, function(k,v){
        if (lex.meta.top[v.word] && scoredWords.indexOf(v.word) == -1) {
          scoredWords.push(v.word);
          score += v.count;
        }
      });
      return score;
    },
    line: function(opt){
      var minCount = opt.minWords || 7,
          maxCount = opt.maxWords || 10,
          maxChars = opt.maxChars || 115,
          minScore = opt.minScore || 2,
          maxTries = opt.maxTries || 100,
          maxTime = opt.maxTime || 2000,
          startWord = null,//opt.optimize ? lex.meta.top[startPos].word : null,
          thisWordArr = [],
          thisCharLength = 0,
          thisScore = 0, 
          bestWordArr = [],
          bestCharLength = 0,
          bestScore = 0,
          out = '',
          time = new Date();
      for (tries=1; tries <= maxTries; tries++) {
        thisWordArr = lex.output.series(minCount, startWord);
        thisCharLength = thisWordArr.map(function(v){ return v.word; }).join(' ').length;
        thisScore = lex.cfg.optimize ? lex.output.getScore(thisWordArr) : 0;
        if (
          thisWordArr.length >= minCount && 
          thisWordArr.length <= maxCount &&
          thisCharLength <= maxChars &&
          thisScore >= bestScore
        ) {
          bestWordArr = thisWordArr;
          bestCharLength = thisCharLength;
          bestScore = thisScore;
        };
        if (new Date() - time > maxTime) break;
      }
      out = bestWordArr.map(function(v){
        var count = lex.list[v.word].count,
            markup = lex.meta.top[v.word] ? 'hilight' : '';
        return opt.optimize ? '<span class="'+markup+'" title="'+count+'">'+v.word+'</span>' : v.word;
      }).join(' ');
      if (opt.stats) 
        out += ' ' + '<span class="stats">'+JSON.stringify({
          chars: bestCharLength, 
          tries: tries,
          time: new Date() - time,
          score: bestScore
        }).replace(/"/g,'') + '</span>';
      return util.capitalize(out);
    },
    format: function(opt) {
      $.extend(lex.cfg, opt);
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
