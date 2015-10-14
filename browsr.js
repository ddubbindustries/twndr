var print = {
  facets: function(arr, itemTemplate) {
    var $printOut = $('<div/>');

    $.each(arr, function(i,v){
      var idselectors = '#'+v.ids.join(', #');

      $(itemTemplate(v)).addClass('facet').click(function(){
        console.log('facet', v);
        $('.text .hilight').contents().unwrap();
        if ($(this).is('.hilight')) {
          $('.tweet').show();
          $('.hilight').removeClass('hilight');

          if (cfg.viz) $.each(markers, function(id,marker){ marker.setVisible(true); });

        } else {
          $('.hilight').removeClass('hilight');
          $(this).addClass('hilight');
          var $text = $('.tweet').hide().filter(idselectors).show().find('.text'),
              $img = $text.find('[alt="'+v.word+'"]');

          if ($img.length) {
            $img.wrap('<span class="hilight"></span>');
          } else {
            $text.html(function(i,html){
              var wordArr = v.forms ? v.forms : [v.word];
                  rgx = wordArr.map(function(a){return '\\b'+a+'\\b';}).join('|');
              return html.replace(new RegExp(rgx, 'ig'), '<span class="hilight">$&</span>');
            });
          }

          if (cfg.viz) $.each(markers, function(id,marker){ marker.setVisible(v.ids.indexOf(id) > -1); });

        }
      }).appendTo($printOut);
    });

    return $printOut.contents();
  },
  facetColumn: function(name, content) {
    return $('<div id="'+name+'" class="col"/>').append(
      $('<div class="note"/>').click(function(){
        console.log('freq', name, freq[name]);
      }).html(name),
      $('<ol class="freq scroll"/>').html(content)
    );
  },
  fixHeader: function(){
    var widths = [];
    $('.tweet:eq(0) span').each(function(k,v){ widths.push($(v).width()); });
    $.each(widths, function(k,v){ $('#tweetHead span').eq(k).width(v) });
  }
};

var initCfg = {
    search: 'Blacksburg, VA 5mi 48hr',
    viz: false
  },
  cfg = $.extend(initCfg, util.local.get('cfg')),
  freq = {};

var initBrowser = function(){
  var $out = $('#out'),
      $stats = $('#stats'),
      $search = $('#search').val(cfg.search);

  $('#input').submit(function(e){
    e.preventDefault();
    cfg.search = $search.val();
    util.local.store('cfg', cfg);

    $out.empty();
    ga('send', 'event', 'user', 'submit', 'search', $search.val());

    var Twndr = new Go({
      search: cfg.search,
      afterGeo: function(geocode) {
        if (cfg.viz) { initMap(geocode); } else { $('#map-canvas').hide(); }
      },
      processTweet: function(tweet) {

        if (cfg.viz && tweet.geo) setTimeout(addMarker, tweet._delay || 0, tweet);

        var hoursRelative = util.getHoursAgo(tweet.created_at),
            userlink = 'http://twitter.com/'+tweet.user.screen_name,
            permalink = userlink+'/status/'+tweet.id_str,
            media = tweet.entities.media;
            media = media ? '<img class="media" src="'+media[0].media_url+'">' : '',
            columns = {
              time:   hoursRelative.toFixed(1)+'h', //util.relativeTime(tweet.created_at, 3),
              tpd:    (tweet.user.statuses_count / util.getHoursAgo(tweet.user.created_at) * 24).toFixed(1),
              flw:    tweet.user.followers_count,
              fav:    tweet.favorite_count,
              RT:     tweet.retweet_count,
              src:    util.getFaviconFromAnchor(tweet.source),
              user:   '<a target="_blank" href="'+userlink+'" title="'+tweet.user.screen_name+': '+
                        tweet.user.description+'"><img src="'+tweet.user.profile_image_url+'"></a>',
              text:   twemoji.parse(util.hyperlinks(tweet.text)) // + media,
            };

        if (!$('#tweetHead').text()) {
          var header = {};
          $.each(columns, function(k,v){ header[k] = k; });
          $('#tweetHead').html(util.buildRow(header));
        } else {
          $out.append('<div id="'+tweet.id_str+'" class="tweet row">'+util.buildRow(columns)+'</div>');
        }
      },
      afterBatch: function(go){
        console.time('print');

        $stats.html((go.percentDone*100).toFixed()+'% of history ');
        $.each(go.tweetsProc, function(k,v){ $stats.append(k+': '+Object.keys(v).length+' '); });

        var total = '';
        $('#twend').html(print.facets(go.twendArr, function(v){
          total += v.word + ' ';
          return total.length <= go.cfg.twendLength ? '<span>'+twemoji.parse(v.word)+'</span>' : false;
        }));

        $('#facets').empty().append(
          print.facetColumn('words', print.facets(go.freq.words.topArr, function(v){
            return '<li>'+twemoji.parse(v.word)+' '+v.count+'</li>';
          })),

          print.facetColumn('hashes', print.facets(go.freq.hashes.topArr, function(v){
            return '<li>'+v.word+' '+v.count+'</li>';
          })),

          print.facetColumn('combos', print.facets(go.freq.combos.topArr, function(v){
            var title = v.forms ? v.forms.join(', ') : '';
            return '<li title="'+title+'">'+twemoji.parse(v.word)+
              ' '+v.count+(v.forms ? '*' : '')+'</li>';
          })),

          print.facetColumn('emoji', print.facets(go.freq.emoji.topArr, function(v){
            return '<li>'+twemoji.parse(v.word)+' '+v.count+'</li>';
          })),

          print.facetColumn('users', print.facets(go.freq.users.topArr, function(v){
            return '<li><img title="'+v.word+'" src="'+
              go.freq.users.list[v.word].meta.profile_image_url+'"> '+v.count+'</li>';
          })),

          print.facetColumn('src', print.facets(go.freq.sources.topArr, function(v){
            return '<li>'+util.getFaviconFromAnchor(v.word)+' '+v.count+'</li>';
          }))
        );

        if (!cfg.viz) $('img').addClass('grayscale');

        console.timeEnd('print');
      },
      afterAll: function(go) {

        print.fixHeader();

        $('.tweet').click(function(){
          console.log('this tweet', go.tweetsProc.ok[$(this).attr('id')]);
        }).mouseenter(function(){
          if (cfg.viz) markers[$(this).attr('id')].setAnimation(google.maps.Animation.BOUNCE);
        }).mouseout(function(){
          if (cfg.viz) markers[$(this).attr('id')].setAnimation(null);
        });

        freq = go.freq; // for general inspection purposes

        console.log('all done! tweetsProc:', go.twend, go.tweetsProc);
      }
    });
  }).submit();

  $('#cache').click(function(){
    localStorage.clear();
  });
};

$(document).ready(initBrowser);
