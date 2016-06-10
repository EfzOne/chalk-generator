var _ = require('lodash');
var mongoose = require('mongoose');
var debug = require('debug')('chalk:generator');
var Chalk = require('./Chalk');
var Step = require('step');
var data = require('./data/default');

var teachers = {}, tcnt = 0;

debug("Connecting to Database...");
mongoose.connect('mongodb://localhost/test');

Step(
  function() {
    debug("Removing Previous Data...");
    Chalk.Teacher.remove({}, this);
  },
  function(err) {
    if(err) return console.error(err);
    Chalk.Org.remove({}, this);
  },
  function(err) {
    if(err) return console.error(err);
    debug("Collecting & Writing Organization Data...");
    var group = this.group();
    var courseIdx = {};
    _(data.organizations).forEach((org) => {
      var type = data.types[org.typeId];
      _(type.courseId).forEach((courseId, idx) => {
        var __id, __teacherId;
        if(org.teacher in teachers) {
          __teacherId = teachers[org.teacher].id;
        } else {
          __teacherId = teachers[org.teacher] = ++tcnt;
        }
        if(courseId in courseIdx) __id = ++courseIdx[courseId];
        else __id = courseIdx[courseId] = 1;
        var organization = new Chalk.Org({
          name: type.pre + data.post[idx] + __id,
          courseId: courseId,
          class: org.class,
          teacherId: __teacherId
        });
        organization.save(group());
      });
    });
  },
  function(err, orgs) {
    if(err) return console.error(err);
    debug("Writing Teacher Data...");
    var group = this.group();
    _(teachers).forEach((teacherId, name) => {
      var teacher = new Chalk.Teacher({
        teacherId: teacherId,
        name: name
      });
      teacher.save(group());
    });
  },
  function(err, results) {
    if(err) return console.error(err);
    debug("Complete");
    process.exit(0);
  }
);
