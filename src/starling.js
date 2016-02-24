var _ = require('../lib/underscore.js');

var Name = function () {
  var adjectives = [
    'red',
    'green',
    'blue',
    'yellow',
    'gold',
    'silver',
    'black',
    'white',
    'sapphire',
    'emerald',
    'ruby',
    'brave',
    'reckless',
    'ghost'
  ];
  var nouns = [
    'dragon',
    'falcon',
    'dove',
    'lion',
    'tiger',
    'bear',
    'wolf',
    'blade',
    'storm',
    'fish',
    'turtle',
    'axe',
    'castle',
    'katana'
  ];
  return _.sample(adjectives) + ' ' + _.sample(nouns) + ' ' + Math.floor(Math.random() * 100);
};

var Starling = function () {
  this.name = Name();
  this.charge = Math.floor(Math.random() * 100);
};

module.exports = Starling;
