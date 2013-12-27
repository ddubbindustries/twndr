  // data: {count: 100, geocode: '37.22,-80.42,15mi', lang: 'en'},
 
var cfg = util.local.get('cfg') || {
    sets: 5, 
    lines: 1, 
    minWords: 2, 
    maxWords: 20,
    maxChars: 115,
    maxTries: 100,
    maxTime: 2000,
    lineEnd: '',
    stats: true,
    optimize: true,
    topCount: 15
  },
  $input,
  $output,
  rep = 0, 
  repMax = 10;

var go = {
  init: function(){ 
    lex.init();
  
    $input = $('#input');
    $output = $('#output');
    
    $refresh = $('<button/>').html('Refresh').click(function(){
      var cfg = util.getConfigs();
      lex.sortTop(cfg.topCount);
      console.log('meta', lex.meta);
      dump(lex.meta.top.map(function(v){return v.word+' '+v.count;}));
      $output.html(lex.output.format(cfg));
    });

    util.buildConfigs(cfg, function(){
      util.local.store('cfg', util.getConfigs()); 
      $refresh.click();
    });
    
    $refresh.appendTo('#configs');
  },
  getApi: function(startTime) {
    if (rep++ == repMax) return go.finalize();
    $.ajax({
      url: 'http://p.ddubb.net/db/', 
      data: {table: 'tweets', time: startTime+',', limit: 3000},
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
    $refresh.click();
  },
  finalize: function(){
    console.log('max reps');
  }
};
$(document).ready(function(){
  go.init();
  if (util.local.get('chunks')) {
    go.getStored();
  } else {
    go.getApi();
  }
});   


