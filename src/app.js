var intro = require('./intro.js');
var creds = require('./credentials.js');

var app = {locations:[], selectedLocationID:null, map:null};

  app.templates = {};

  app.templates.locations = function (locations) {
    return _.reduceRight(locations, function(m,n){
      var d = "";
      d += "<div class='well' data-toggle='modal' data-target='#exampleModal' data-coords='"+n.latlng.toString()+"'  data-title='"+n.title+"'  data-notes='"+n.notes+"' data-id='"+n.id+"'>"
      d += "<h3>"+n.title+"</h3>";
      d += "<div class='small' >"+n.latlng.toString()+"</div>";
      d += "<p>"+n.notes+"</p>";
      d += "</div>";
    return m + d;
    }, "<h2>Locations</h2>");
  };

  app.listeners = function () {

    $('#exampleModal').on('show.bs.modal', function (event) {
      app.selectedLocationID = $(event.relatedTarget).data('id');

      for (var i=0;i<app.locations.length;i++){
        if (app.locations[i].id===app.selectedLocationID){
          var latlng = app.locations[i].latlng;

          $(this).find('.modal-title').text(app.locations[i].latlng);
          $(this).find('#modal-title').val(app.locations[i].title);
          $(this).find('#modal-notes').val(app.locations[i].notes);
          app.map.panTo(latlng);
        }
      }

    })

    $("#save-location-data").on("click",function(){
      for (var i=0;i<app.locations.length;i++){
        if (app.locations[i].id===app.selectedLocationID){
          app.locations[i].title = $("#exampleModal").find('#modal-title').val();
          app.locations[i].notes = $("#exampleModal").find('#modal-notes').val();
          app.displayLocationsList(app.locations);
          break;
        }
      }
    });
  };

  app.displayLocationsList = function(locations){
    $("#locations-list").html(app.templates.locations(locations));
  };

  app.displayMap = function(mapDOMElementID){
    var map = L.map('starling-map',{
      zoomControl: false,
      attributionControl: false
    }).setView([37.755817, -122.389932], 11);

    L.tileLayer(creds.mapboxURL, {
        maxZoom: 18,
        id: creds.id,
        accessToken: creds.accessToken
      }).addTo(map);

    /*
       map.on("click",function(e){
       var id = eid();
       var circle = L.circle(e.latlng, 100, {
       weight:2,
       color: '#f00',
       fillOpacity: 0
       }).addTo(map);

       circle.on("click",function(e){
       map.removeLayer(circle);
       for (var i=0;i<app.locations.length;i++){
       if (app.locations[i].mapObject===circle){
       app.locations.splice(i,1);
       break;
       }
       }
       app.displayLocationsList(app.locations);
       });

       app.locations.push({id:id, latlng:e.latlng, radius: 100, mapObject: circle, title:"Title", notes:"notes"});
       app.displayLocationsList(app.locations);

       });
       */

    app.map = map;

  };

  app.init = function(){
    app.displayMap('starling-atlas');
    intro();
    app.listeners();
  };

$(document).ready(function(){app.init();});

module.exports = app;
