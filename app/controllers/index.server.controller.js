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
const within = function(current, goal, range){
  if(current > (goal + range)) return false;
  if(current < (goal - range)) return false;
}

const walkingSpeed = 7.00;
const degreesPerRadian = 0.0174533;

const timeHeadingVector = function timeHeadingVector(heading, elapsedTime) {
  const headingInRadians = heading * degreesPerRadian;
  const distanceScaler = walkingSpeed * elapsedTime / 1000;
  console.log('heading in radians',  headingInRadians);
  const vector = [
    Math.sin(headingInRadians) * distanceScaler,
    -1 * Math.cos(headingInRadians) * distanceScaler,
  ];
  console.log('vector');
  console.log(vector);
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
          const lastEntry = deviceEntries[1];
          return db.collection('positions').find({ uuid: uuid })
          .sort({ date: -1 }).limit(1).toArray().then(positions => {
            // if the beacon switched
            const half = {};
            // if (lastEntry.beacons[0].major != thisDeviceEntry.beacons[0].major) {
            //   console.log('beacon swithced');
            //   const oldPos = findBeacon(map, lastEntry.beacons[0]);
            //   const newPos = findBeacon(map, thisDeviceEntry.beacons[1]);
            //   console.log('old');
            //   console.log(oldPos);
            //   console.log('new');
            //   console.log(newPos);
            //   half.x = oldPos.x + (newPos.x - oldPos.x) / 2;
            //   half.y = oldPos.y + (newPos.y - oldPos.y) / 2;
            // }
            console.log('position query');
            const lastPos = positions[0];
            const movementVector = timeHeadingVector(heading, currentTime - lastEntry.date);
            console.log('lastpos');
            console.log(lastPos.position);
            const xCandidate = lastPos.position.x + movementVector[0];
            const yCandidate = lastPos.position.y + movementVector[1];
            
            // if it is within the respectable range of our beacons
            // if we didn't transition beacons, or if we did but are still in range
            if (!half.x || (within(xCandidate, half.x, 30) && within(yCandidate, half.y, 30))) {
              return resolve({
                x: xCandidate,
                y: yCandidate,
              });
            }
            return resolve({
              x: half.x,
              y: half.y,
            });
          }).catch((err) => {
            console.log(err);
          });
        }
        console.log('shitty promise');
        console.log(beacon);
        return resolve({
          x: beacon.x,
          y: beacon.y,
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




