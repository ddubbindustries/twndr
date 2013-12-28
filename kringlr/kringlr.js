$(document).ready(function(){
 
 var composition = {
      sets: 3, 
      lines: 4, 
      minWords: 7, 
      maxWords: 10,
      maxTries: 10,
      lineEnd: '<br>',
      optimize: false,
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
      $refresh.click();
    });
  });

  $.get('christmas-songs.txt', function(data) {
    $input.text(data).trigger('input');
  });
    
});   


