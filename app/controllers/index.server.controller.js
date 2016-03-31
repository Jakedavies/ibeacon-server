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

const walkingSpeed = 13.8582;
const degreesPerRadian = 0.0174533;

const timeHeadingVector = function timeHeadingVector(heading, elapsedTime) {
  const headingInRadians = heading / degreesPerRadian;
  const distanceScaler = walkingSpeed * elapsedTime / 1000;
  console.log(headingInRadians);
  const vector = [
    Math.cos(headingInRadians) * distanceScaler,
    Math.sin(headingInRadians) * distanceScaler,
  ];
  return vector;
};
const findBeacon = function findBeacon(map, beacon) {
   return map.beacons.filter(thisBeacon => thisBeacon.major == beacon.major)[0];
};
exports.render = (req, res) => {
  const heading = req.body.heading;
  const beacons = req.body.beacons;
  const uuid = req.body.uuid;
  const currentTime = Date.now();
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
      const map = result[0][0];
      const deviceEntries = result[1];
      console.log('device entries');
      console.log(deviceEntries);
      const thisDeviceEntry = deviceEntries[0];
      console.log('device beacons');
      console.log(thisDeviceEntry.beacons);
      console.log('map beacons');
      console.log(map.beacons);
      const beaconInRange = thisDeviceEntry.beacons[0];
      const beacon = findBeacon(map, beaconInRange);
      console.log('selected beacon');
      console.log(beacon);
      const elapsedTime = (currentTime - thisDeviceEntry.date) / 1000;
      const vector = timeHeadingVector(thisDeviceEntry.heading, elapsedTime);
      const positionPromise = new Promise((resolve, reject) => {
        if (deviceEntries.length > 1) {
          console.log('size is > 1');
          // we just switched beacons
          const lastEntry = deviceEntries[1];
          if (lastEntry.beacons[0].major != thisDeviceEntry.beacons[0].major) {
            console.log('beacon swithced');
            const oldPos = findBeacon(map, lastEntry.beacons[0]);
            const newPos = findBeacon(map, thisDeviceEntry.beacons[1]);
            console.log('old');
            console.log(oldPos);
            console.log('new');
            console.log(newPos);
            return resolve({
              x: oldPos.x + (newPos.x - oldPos.x) / 2,
              y: oldPos.y + (newPos.y - oldPos.y) / 2,
            });
          }
          // use formula heading *  timeSinceLastReading;
          return db.collection('positions').find({ uuid: uuid })
          .sort({ date: -1 }).limit(1).toArray().then(positions => {
            console.log('position query');
            const lastPos = positions[0];
            const movementVector = timeHeadingVector(heading, currentTime - lastEntry.date);
            return resolve({
              x: lastPos.position.x + movementVector[0],
              y: lastPos.position.x + movementVector[1],
            });
          }).catch((err) => {
            console.log(err);
          });
        }
        console.log('shitty promise');
        return resolve({
          x: beaconInRange.x,
          y: beaconInRange.y,
        });
      });
      return positionPromise.then((position) => {
        console.log('promise resolved');
        db.collection('positions')
        .insert({ uuid: uuid, date: currentTime, position: position })
        .then(() => {
          return res.json({
            data: {
              position: position,
            },
          });
        });
      });
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




