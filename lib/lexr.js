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

var lex = {
  list: {},
  englishCommon: "a able about above across after all almost along already also always am an and any anybody anyone anything anyway anyways anywhere apart are aren't around as ask asking at away be because been before behind being below best better between both but by c'mon came can can't cant clearly come comes could couldn't did didn't do does doesn't doing don't done each either else etc even ever every everybody everyone everything everywhere exactly except far few first followed following follows for from get gets getting given gives go goes going gone got gotten had hadn't happens hardly has hasn't have haven't having he he's her here here's hers herself him himself his how however i i'd i'll i'm i've if in instead into is isn't it it'd it'll it's its itself just keep keeps kept let's many may maybe me might more much my neither no not nothing now of oh ok okay old on once one ones only onto or other others our ours ourselves out over own probably quite really right said same saw say saying says see seeing seem seemed seeming seems seen she should shouldn't since so some somebody somehow someone something sometime sometimes somewhere soon still such sure take taken tell than that that's thats the their theirs them themselves then there there's theres these they they'd they'll they're they've this those though through thru to together too took toward towards tried tries truly try trying twice under unfortunately until up us use used uses using usually very vs was wasn't way we we'd we'll we're we've well went were weren't what what's when where where's whether which while who who's whoever whole whom whose will with within without won't would wouldn't yes yet you you'd you'll you're you've your yours yourself yourselves",
  twitterCommon: "rt tonight today new tomorrow make again work thing last love good time next gonna real off never night like know people day think back why name need want life things",
  isInString: function(needle, haystack) {
    return (' '+haystack+' ').indexOf(' '+needle+' ') > -1;
  },
  isCommon: function(input) {
    return lex.isInString(input.toLowerCase(),
      lex.englishCommon
      + lex.twitterCommon
    );
  },
  tokenize: function(text){
    return text
      .toLowerCase()
      .replace(/http\S*/g,'')
      .replace(/&[a-z]+;/g, function(i){ return {'&lt;':'<', '&gt;':'>', '&amp;':'&'}[i]; })
      .replace(/[\,\.\…\/\\\—\+\"\(\)\:\!\¯\=]/g, '')
      .replace(/[\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]/g, '$& ') //emoji
      .split(/\s/)
      .filter(function(v){ return !/^[0-9\&@\-]$/.test(v) && v.length; });
  },
  tally: function(list, hash, id, metadata){
    if (list[hash]) {
      list[hash].count++;
      list[hash].ids.push(id);
    } else {
      list[hash] = {
        count: 1,
        ids: [id],
        metadata: metadata ? metadata : null
      };
    }
    return list;
  },
  addChunk: function(text, chunkId){
    var words = lex.tokenize(text);
    $.each(words, function(k, word){
      if (word) lex.tally(lex.list, word, chunkId);
      if (words[k+1]) {
        if (!lex.list[word].next) lex.list[word].next = {};
        lex.tally(lex.list[word].next, words[k+1], chunkId);
      }
    });
  },
  objToArr: function(obj){
    var arr = [], tempObj = {};
    for (var key in obj) {
      if (!obj.hasOwnProperty(key)) { continue; }
      tempObj = obj[key];
      tempObj.word = key;
      arr.push(tempObj);
    }
    return arr;
  },
  arrToObj: function(arr, keyName){
    var obj = {};
    $.each(arr, function(k,v){
      obj[v[keyName]] = v;
    });
    return obj;
  },
  sortArr: function(arr, keyName) {
    return arr.sort(function(a,b){return b[keyName] - a[keyName];});
  },
  getTop: function(filter){
    var arr = lex.objToArr(lex.list).filter(filter);
    return lex.sortArr(arr, 'count');
  },
  getString: function(list, len){
    var out = '', i = 0;
    while (out.length < len && list[i]) {
      out += list[i++].word + ' ';
    }
    return out;
  }
};

if (typeof exports !== 'undefined') exports.lex = lex;
