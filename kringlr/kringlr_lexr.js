var oldLex = {
  init: function(){
    this.meta = {chunkCount: 0, rawCount: 0, uniqueCount: 0};
    this.topHistory = this.topHistory || {};
    this.chunks = {};
    this.list = {};
  },
  chunkenize: function(corpus) {
    return corpus.split(/\n+\s*\n+\s*\n+/g);
  },
  build: function(corpus, callback){
    lex.init();
    lex.chunks = lex.chunkenize(corpus);
    $.each(lex.chunks, function(k,v){ lex.addChunk(v); });
    lex.afterChunks();
    callback(lex);
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
    popular: function(opt){
      var out = '', i = 0;
      while (out.length < opt.maxChars && lex.meta.topArr[i]) {
        out += lex.meta.topArr[i++].word + ' ';
      }
      return out;
    },
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
    getScore: function(arr){
      var score = 0, scoredWords = [];
      $.each(arr, function(k,v){
        if (lex.meta.top[v.word] && scoredWords.indexOf(v.word.toLowerCase()) == -1) {
          scoredWords.push(v.word.toLowerCase());
          score += v.count;
        }
      });
      return score;
    },
    line: function(opt){
      var minCount = opt.minWords || 7,
          maxCount = opt.maxWords || 20,
          maxChars = opt.maxChars || 140,
          maxTries = opt.maxTries || 100,
          maxTime = opt.maxTime || 2000,
          startWord = null,//opt.optimize ? lex.meta.top[startPos].word : null,
          thisWordArr = [],
          thisWordString = '',
          thisCharLength = 0,
          thisScore = 0,
          bestWordArr = [],
          bestCharLength = 0,
          bestScore = 0,
          time = new Date();
      for (tries=1; tries <= maxTries; tries++) {
        thisWordArr = lex.output.series(minCount, startWord);
        thisWordString = thisWordArr.map(function(v){ return v.word; }).join(' ');
        thisCharLength = thisWordString.length;
        thisScore = opt.optimize ? lex.output.getScore(thisWordArr) : 0;
        if (
          thisWordArr.length >= minCount &&
          thisWordArr.length <= maxCount &&
          thisCharLength <= maxChars &&
          thisScore > bestScore
        ) {
          bestWordArr = thisWordArr;
          bestCharLength = thisCharLength;
          bestScore = thisScore;
        };
        if (new Date() - time > maxTime) break;
      }
      //bestWordArr[0] = util.capitalize(bestWordArr[0]);

      return {
        arr: bestWordArr,
        text: bestWordArr.map(function(v){ return v.word; }).join(' ') + opt.lineEnd,
        html: bestWordArr.map(function(v){
            var count = lex.list[v.word].count,
                markup = lex.meta.top[v.word] ? 'hilight' : '';
            return '<span class="'+markup+'" title="'+count+'">'+v.word+'</span>';
          }).join(' '),
        stats: {
          chars: bestCharLength,
          tries: tries,
          time: new Date() - time,
          score: bestScore
        }
      };
    },
    format: function(opt) {
      $.extend(lex.cfg, opt);
      var out = '', lastWord = '';
      for (s=0; s<opt.sets; s++) {
        if (cfg.sets > 1) out += '<p>';
        for (l=0; l<opt.lines; l++){
          var line = lex.output.line(opt);
          out += cfg.stats ?
            line.html + ' <span class="stats">'+JSON.stringify(line.stats).replace(/"/g,'') + '</span>' :
            line.text;
        }
        if (cfg.sets > 1) out += '</p>';
      }
      return out;
    }
  }
};
