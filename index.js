var _ = require('lodash');
var mongoose = require('mongoose');
var debug = require('debug')('chalk:generator');
var Chalk = require('./Chalk');
var Step = require('step');
var Const = require('./data/const');

debug("Connecting to Database...");
mongoose.connect(Const.database.host);

var c_t_o = {};

var __orgId = 1;

Step(
  function() {
    debug("Removing Previous Data...");
    Chalk.Teacher.remove({}, this);
  },
  function(err) {
    if(err) throw err;
    Chalk.Organization.remove({}, this);
  },
  function(err) {
    if(err) throw err;
    debug("Collecting Student Data...");
    Chalk.Student.find({}, this);
  },
  function(err, students) {
    if(err) throw err;
    debug("Analysing Student Data...");
    var group_org = this.group();
    var group_stu = this.group();
    _(_.groupBy(students, "class"))
      .forEach((students, clsId) => {
        var organization = new Chalk.Organization({
          _id: __orgId,
          name: "Class " + clsId,
          teacher: 0,
          course: 20,
          students: _.map(students, "_id"),
          count: 0
        });
        organization.save(group_org());

        _(students).forEach((student) => {
          student.organization = __orgId;
          student.save(group_stu());
        });

        c_t_o[clsId] = __orgId;

        __orgId++;
      });
  },
  function(err, organizations, students) {
    if(err) throw err;
    var tcnt = 0;
    var ocnt = {};
    var group = this.group();
    var __organizations = {};
    _(Const.teachers).forEach((teachers, typeId) => {
      _(teachers).forEach((classes, tId) => {
        var teacher = new Chalk.Teacher({
          _id: tcnt,
          name: Const.type[typeId] + '-' + String.fromCharCode(tId + 65),
          courses: _.filter(Const.course[typeId], (n) => { return n != -1; })
        });
        _(Const.course[typeId]).forEach((courseId, ccnt) => {
          if(courseId != -1) {
            var name_prefix = Const.type[typeId] + (ccnt === 0 ? '-adv' : '-std');
            var stucnt = _.size(_.filter(students, (n) => {
              return _.includes(classes, n.class) && _.includes(n.courses, courseId);
            }));
            if(!(courseId in ocnt)) ocnt[courseId] = 0;
            var splitsum = Math.ceil(stucnt / Const.split);
            for(var i = 0; i < splitsum ; i++) {
              var organization = {
                _id: __orgId++,
                name: name_prefix + '-' + (++ocnt[courseId]),
                teacher: tcnt,
                course: courseId,
                count: ccnt === 0 ? 3 : 2,
                __stucnt: stucnt
              };
              if(!(courseId in __organizations)) __organizations[courseId] = [];
              __organizations[courseId].push(organization);
            }
          }
        });
        tcnt++;
      });
    });
    _(__organizations).forEach((orgs, courseId) => {
      var __toMerge = _.filter(orgs, (org) => { return org.__stucnt < 35; });
      while(_.size(__toMerge) > 1) {
        var __maxOrg = _.maxBy(__toMerge, '__stucnt');
        var __minOrg = _.minBy(__toMerge, '__stucnt');
        _.remove(__toMerge, (n) => { return n._id == __minOrg._id; });
        _.remove(orgs, (n) => { return n._id == __minOrg._id; });
        __maxOrg.__stucnt += __minOrg.__stucnt;
        if(__maxOrg.__stucnt >= 35) _.remove(__toMerge, (n) => { return n._id == __maxOrg._id; });
      }
    });
    require('./data/reindex')(__organizations);
    _(__organizations).forEach((orgs) => {
      _(orgs).forEach((n) => { debug(n); });
    });
  }, function(err) {
    if (err) throw err;
    debug("Complete");
    process.exit(0);
  }
);
