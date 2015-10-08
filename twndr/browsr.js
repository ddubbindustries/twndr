var initBrowser = function(){
  var cfg = util.local.get('cfg') || {};
  
  var $out = $('#out');
  
  $('#search').val(cfg.search);
  $('#input').submit(function(e){
    e.preventDefault();
    $('#twend, .col').empty();
    cfg.search = $('#search').val();
    util.local.store('cfg', cfg);
    var outBuffer = '';
    var Twndr = new Go({
      maxRetweet: 25,
      maxPerUser: 10,
      search: cfg.search,
      afterGeo: initMap,
      processTweet: function(tweet) {
        
        if (tweet.geo) setTimeout(addMarker, tweet._delay || 0, tweet);

        var hoursRelative = util.getHoursAgo(tweet.created_at),
            userlink = 'http://twitter.com/'+tweet.user.screen_name,
            permalink = userlink+'/status/'+tweet.id_str,
            media = tweet.entities.media;
            media = media ? '<img class="media" src="'+media[0].media_url+'">' : '',
            columns = {
              time:   hoursRelative.toFixed(1)+'h', //util.relativeTime(tweet.created_at, 3),
              tpd:    (tweet.user.statuses_count / util.getHoursAgo(tweet.user.created_at) * 24).toFixed(1),
              fllwrs: tweet.user.followers_count,
              faves:  tweet.favorite_count,
              RT:     tweet.retweet_count,
              image: '<a target="_blank" href="'+userlink+'" title="'+tweet.user.screen_name+': '+
                        tweet.user.description+'"><img src="'+tweet.user.profile_image_url+'"></a>',
              text:   twemoji.parse(util.hyperlinks(tweet.text)), // + media,
              //source: util.removeHTML(tweet.source)
            };

        if (!$out.text()) {
          var header = {};
          $.each(columns, function(k,v){
            header[k] = k;
          });
          $out.append('<div id="thead">'+util.buildRow(header)+'</div>');
          //outBuffer += '<div id="thead">'+util.buildRow(header)+'</div>';
        }

        $out.append('<div id="'+tweet.id_str+'" class="tweet">'+util.buildRow(columns)+'</div>');
        //outBuffer += '<div id="'+tweet.id_str+'" class="tweet">'+util.buildRow(columns)+'</div>';
 
      },
      afterBatch: function(go){

        //$('#out').html(outBuffer);
        var $stats = $('#stats').html(
          (go.percentDone*100).toFixed()+'% of history '
        );

        $.each(go.tweetStore, function(k,v){
          $stats.append(k+': '+Object.keys(v).length+' ');
        });
                
        var printWords = function(arr, template, charLength) {
          var $temp = $('<div/>'),
              total = '';

          $.each(arr, function(i,v){
            var ids = v.ids, 
                idselectors = '#'+v.ids.join(', #');

            total += v.word + ' ';
            if (total.length - 1 > charLength) return false;
                
            $(template(v)).addClass('filterWord').click(function(){
              $('.text .hilight').contents().unwrap();
              if ($(this).is('.hilight')) {
                $('.tweet').show();
                $('.hilight').removeClass('hilight');
                
                $.each(marker, function(id,mark){
                  mark.setVisible(true);
                });
              } else {
                $('.hilight').removeClass('hilight');
                $(this).addClass('hilight'); 
                $('.tweet').hide().filter(idselectors).show().find('.text').html(function(i,html){
                  var rgx = new RegExp('\\b'+v.word+'\\b', 'ig'); 
                  return html.replace(rgx, '<span class="hilight">$&</span>');
                });
                
                $.each(marker, function(id,mark){
                  mark.setVisible(ids.indexOf(id) > -1);
                });
              }
            }).appendTo($temp);
          });

          return $temp.contents();
        };

        $('#twend').html(printWords(go.topArr, function(v){
          return '<span title="'+v.count+'">'+twemoji.parse(v.word)+'</span>';
        }, cfg.twendLength));
        
        $('#meta').html(printWords(go.topArr, function(v){
          return '<li>'+twemoji.parse(v.word)+' '+v.count+'</li>';
        }));

      },
      afterAll: function(go) {
        $('.tweet').click(function(){
          var tweet = go.tweetStore.ok[$(this).attr('id')];
          console.log('data', tweet);
        }); 
        console.log('all done, total tweets:', Object.keys(go.tweetStore.ok).length, go.twend);
        console.log('tweetStore', go.tweetStore);
      }
    });
  }).submit();
  
  $('#cache').click(function(){
    localStorage.clear();
    $('#input').submit();
  });
};

$(document).ready(initBrowser);

