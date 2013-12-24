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
 
 var composition = {
      sets: 12, 
      lines: 1, 
      minWords: 17, 
      maxWords: 20,
      lineEnd: '<br>',
      stats: false
    },
    $input = $('#input'),
    $output = $('#output');
  
  $refresh = $('<button/>').html('Refresh').click(function(){
    var composition = util.getConfigs(); 
    $output.html(lex.output.format(composition));
  });

  util.buildConfigs(composition, function(){ 
    $refresh.click();
  });
  
  $refresh.appendTo('#configs');

  // data: {count: 100, geocode: '37.22,-80.42,15mi', lang: 'en'},
  lex.init();
  
  $.ajax({
    url: 'http://p.ddubb.net/db/', 
    data: {table: 'tweets', limit: 500},
    dataType: 'jsonp',
    success: function(data){
      $.each(data.results, function(k,v){
        var chunk = JSON.parse(v.data);
        $input.append(chunk.created_at + ': ' + chunk.text+"\n\n");
        lex.addChunk(chunk.text);
      });
      lex.sortTop();
      console.log('meta', Object.keys(lex.list).length, lex.meta);
      dump(lex.meta.top.map(function(v){return v.word+' '+v.count;}));
      $refresh.click();
    }
  });
    
});   


