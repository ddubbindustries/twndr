var getScore = function(string, markup){
  var score = 0, words = string.split(' '), scoredWords = [], out = '';
  $.each(words, function(k,v){
    if (lex.isInArr(lex.meta.top, 'word', v) && scoredWords.indexOf(v) == -1) {
      scoredWords.push(v);
      score++;// += lex.list[v].count;
      //v += '<sup>'+lex.list[v].count+'</sup>';
      out += '<span class="hilight">'+v+'</span> ';
    } else {
      out += v + ' ';
    }
  });
  //score = (score / lex.cfg.topCount).toFixed(2);
  return markup ? out + '<br/>' + score : score;
};
var getBestScore = function(lines, wordsPerLine, scoreMin){
  var temp = {txt: '', score:0}, best = {txt:'', score:0};
  for(k=0; k<lex.cfg.bestScoreMaxTries; k++) {
    temp.txt = generateLines(lines, wordsPerLine);
    temp.score = getScore(temp.txt);
    if (temp.score > best.score) {
      best.score = temp.score; best.txt = temp.txt;
    }
  }
  return getScore(best.txt, true)+' / '+k+' tries / '+ best.txt.length+' chars';
};

$(document).ready(function(){
 
 var cfg = {
      sets: 5, 
      lines: 1, 
      minWords: 2, 
      maxWords: 20,
      maxChars: 115,
      minScore: 2,
      lineEnd: '',
      stats: true,
      optimize: true,
      topCount: 15
    },
    $input = $('#input'),
    $output = $('#output');
  
  $refresh = $('<button/>').html('Refresh').click(function(){
    var cfg = util.getConfigs(); 
    $output.html(lex.output.format(cfg));
  });

  util.buildConfigs(cfg, function(){ 
    $refresh.click();
  });
  
  $refresh.appendTo('#configs');

  // data: {count: 100, geocode: '37.22,-80.42,15mi', lang: 'en'},
  lex.init();

var rep = 0, repMax = 10;
var go = {
  getApi: function(time) {
    if (rep++ == repMax) return go.finalize();
    $.ajax({
      url: 'http://p.ddubb.net/db/', 
      data: {table: 'tweets', time: time+',', limit: 3000},
      dataType: 'jsonp',
      cache: true,
      success: function(data){
        var input = '', nextTime = 0, dupes = 0;
        $.each(data.results, function(k,v){
          var chunk = JSON.parse(v.data);
          if (lex.chunks[chunk.id_str]) return console.log('duplicates');
        
          chunk = util.simplifyTweetObj(chunk);

          input += (chunk.created_at + ': ' + chunk.text+"\n\n");
          lex.chunks[chunk.id_str] = chunk;
          lex.addChunk(chunk.text);
          nextTime = v.time;
        });
        $input.append(input+"====================\n\n\n");
        util.local.store('chunks', lex.chunks);
        
        lex.sortTop(cfg.topCount);
        console.log(rep, 'of', repMax, 'meta', lex.meta);
        dump(lex.meta.top.map(function(v){return v.word+' '+v.count;}));
        $refresh.click();
        go.getApi(nextTime);
      }
    });
  },
  getStored: function(){
    var retweets = 0, replies = 0, input = '';
    var chunks = util.local.get('chunks');
    $.each(chunks, function(k, chunk){
      if (chunk.retweet_count > 0) return retweets++;
      if (chunk.in_reply_to_user_id_str) return replies++;
      lex.chunks[chunk.id_str] = chunk;
      lex.addChunk(chunk.text);
      input += (chunk.created_at + ': ' + chunk.text+"\n\n");
    });
    $input.append(input);
    lex.sortTop(cfg.topCount);
    console.log('retweets', retweets, 'replies', replies);
    console.log('meta', lex.meta);
    dump(lex.meta.top.map(function(v){return v.word+' '+v.count;}));
    $refresh.click();
  },
  finalize: function(){
    console.log('max reps');
  }
};
//go.getApi();
go.getStored();

});   


