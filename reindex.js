var _ = require('lodash');
var mongoose = require('mongoose');
var debug = require('debug')('chalk:generator');
var Chalk = require('./Chalk');
var Step = require('step');
var data = require('./data/default');
var jsonfile = require('jsonfile');

var teachers = {}, tcnt = 0;

debug("Connecting to Database...");
mongoose.connect('mongodb://localhost/test');

var organizations = require('./data/orgs-update.json');

Step(
  function() {
    debug("Removing Previous Data...");
    Chalk.Org.remove({}, this);
  },
  function(err) {
    if(err) return console.error(err);
    var group = this.group();
    debug("Collecting & Writing Organization Data...");
    _(organizations).forEach((org) => {
      var organization = new Chalk.Org(org);
      organization.save(group());
    });
  },
  function(err) {
    if(err) return console.error(err);
    debug("Complete");
    process.exit(0);
  }
);
