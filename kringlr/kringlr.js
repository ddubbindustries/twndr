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
var getAjax = function(){ 
  $.ajax({
    url: 'http://twndr.com:5000',
    data: {count: 100, geocode: '37.22,-80.42,15mi', lang: 'en'},
    dataType: 'jsonp',
    success: function(data){
      $.each(data.statuses,function(k,v){
        console.log(v.text);
        lex.build(v.text);
      });
    }
  });
};

$(document).ready(function(){
 
 var composition = {
      sets: 3, 
      lines: 4, 
      minWords: 7, 
      maxWords: 10,
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

  $input.bind('input propertychange', function(e){
    lex.build($(this).val(), function(lex){
      console.log('meta', lex.meta);
      console.log(lex.meta.top.map(function(v){return v.word+' '+v.count;}));
      $refresh.click();
    });
  });

  $.get('christmas-songs.txt', function(data) {
    $input.text(data).trigger('input');
  });
    
});   

