var map = {},
    markers = {},
    infoWindow = null;

var initMap = function(geocode, moveZone) {
  map = new google.maps.Map(document.getElementById("map-canvas"),{
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    streetViewControl: false,
    mapTypeControl: false
  });

  var delay = false,
    coords = geocode.split(',');
    zone = new google.maps.Circle({
      center: new google.maps.LatLng(coords[0], coords[1]),
      radius: parseInt(coords[2].replace('mi',''))*1600,
      strokeColor: "#0000FF",
      strokeOpacity: 0.5,
      fillColor: "#0000FF",
      fillOpacity: 0.05,
      strokeWeight: 2,
      editable: true,
      draggable: false
    });

  google.maps.event.addListener(zone, 'bounds_changed', function(){
    if (!moveZone) moveZone = function(zone){ console.log('zone moved', zone); };
    if (delay) window.clearTimeout(delay);
    delay = window.setTimeout(moveZone, 2000, zone);
  });

  zone.setMap(map);

  map.fitBounds(zone.getBounds());

};

var addMarker = function(data){
  var id = data.id_str,
    coords = data.geo.coordinates,
    icon = new google.maps.MarkerImage(
      data.user.profile_image_url,
      new google.maps.Size(20,20),
      new google.maps.Point(0,0),
      new google.maps.Point(0,20)
    );

  markers[id] = new google.maps.Marker({
    position: new google.maps.LatLng(coords[0], coords[1]),
    map: map,
    icon: icon,
    optimized: false,
    animation: google.maps.Animation.DROP,
    _id: id
  });

  google.maps.event.addListener(markers[id], 'click', function(){
    var $elm = $('#'+id);
    if (infoWindow && typeof infoWindow.close() == 'function') infoWindow.close();
    infoWindow = new google.maps.InfoWindow({
      maxWidth: 300,
      content: $elm.find('.text').clone().addClass('infoWindow')[0]
    });
    infoWindow.open(map, markers[id]);
  });
};

var getGoogleCoords = function(string, success) {
  var geocoder = new google.maps.Geocoder();
  geocoder.geocode( { 'address': string }, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
      success(results);
    } else {
      console.log('no geocode results:', status);
    }
  });
};
