'use strict';
const redis = require('redis');
const MongoClient = require('mongodb').MongoClient;
const defaultData = {
  position: {
    x: 0,
    y: 0,
  },
};
/**
 *
 * @returns {Promise}
 */
const getConnection = function getConnection(){
  const url = process.env.MONGOLAB_URI || 'mongodb://localhost:27017/db';
  return MongoClient.connect(url);
};

const walkingSpeed = 1.38582;
const degreesPerRadian = 0.0174533;

const timeHeadingVector = function timeHeadingVector(heading, elapsedTime) {
  const headingInRadians = heading / degreesPerRadian;
  const distanceScaler = walkingSpeed * elapsedTime;
  console.log(headingInRadians);
  const vector = [
    Math.cos(headingInRadians) * distanceScaler,
    Math.sin(headingInRadians) * distanceScaler,
  ];
  return vector;
};

exports.render = (req, res) => {
  const heading = req.body.heading;
  const beacons = req.body.beacons;
  const uuid = req.body.uuid;
  getConnection()
  .then(db => {
    db.collection('device_sessions').insert({ uuid: req.body.uuid, date: Date.now(), beacons: beacons, heading: heading })
    .then(() => {
      return Promise.all([
        db.collection('maps').find({ name: 'map1' }).toArray(),
        db.collection('device_sessions').find({ uuid: uuid }).sort({ date: -1 }).toArray(),
      ]);
    })
    .then(result => {
      console.log(result);
      const map = result[0][0];
      const deviceEntries = result[1];
      const thisDeviceEntry = deviceEntries[0];
      const beaconInRange = thisDeviceEntry.beacons[0];
      const beacon = map.beacons.filter(thisBeacon => thisBeacon.major === beaconInRange.major)[0];
      const elapsedTime = (Date.now() - thisDeviceEntry.date) / 1000;
      const vector = timeHeadingVector(thisDeviceEntry.heading, elapsedTime);
      if (deviceEntries.length > 1) {
        let lastDevice = deviceEntries[0];
        const vectorsInOrderOfImportance = [vector];
        for (let i = 1; i < deviceEntries.length; i++) {
          // if we are now at another beacon we need to factor
          //  the vector from beacon a to beacon b
          // at the highest we can
          if (lastDevice.beacons[0].major !== deviceEntries[i].beacons.major) {
            const trueBeaconVector = {
              x: deviceEntries[i].beacons[0].x - lastDevice.beacons[0].x,
              y: deviceEntries[i].beacons[0].y - lastDevice.beacons[0].y,
            };
            const headingTimeDelta = timeHeadingVector(lastDevice.header, deviceEntries[i].date - lastDevice.date);
            // fuse these two vectors to determine something ?
            vector.push(headingTimeDelta);
          }
          // update last device
          lastDevice = deviceEntries[i];
        }
        // from the series of previous vectors, determine our current position?
        return res.json({ data: defaultData, err: 'Not yet implemented' });
      } else if (deviceEntries.length === 1) {
        return res.json({
          data: {
            position: {
              x: beacon.x + vector[0],
              y: beacon.y + vector[1],
            },
          },
        });
      }
      return res.json({ err: 'No beacons found in range' });
    })
    .catch((err) => {
      console.log(err.stack);
      return res.json({ err: err });
    });
  }).catch(err => {
    console.log(err);
    return res.json({ err: err });
  });
};




