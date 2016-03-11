const redis = require('redis');
const pmongo = require('promised-mongo');


const db = pmongo('192.168.99.100/db', ['device_sessions']);
const walkingSpeed = 1.38582;
const degreesPerRadian = 0.0174533;

exports.render = (req, res) => {
  const heading = req.body.heading;
  const beacons = req.body.beacons;
  const uuid = req.body.uuid;
  db.device_sessions.insert({ uuid: req.body.uuid, date: Date.now(), beacons: beacons, heading: heading })
  .then(() => {
    return Promise.all([
      db.maps.find({ name: 'map1' }),
      db.device_sessions.find({ uuid: uuid }).sort({ date: -1 }),
    ]);
  })
  .then(result => {
    const map = result[0];
    const deviceEntries = result[1];
    if (deviceEntries.beacons.length > 1) {
      const thisDeviceEntry = deviceEntries[0];
      const beaconInRange = thisDeviceEntry.beacons[0];
      const beacon = map.beacons.filter(thisBeacon => thisBeacon.major === beaconInRange.major)[0];
      const elapsedTime = (Date.now() - beaconInRange.date) / 1000;
      const distanceScaler = walkingSpeed * elapsedTime;
      const headingInRadians = thisDeviceEntry.heading * degreesPerRadian;
      const vector = [
        Math.cos(headingInRadians) / distanceScaler,
        Math.sin(headingInRadians) / distanceScaler,
      ];
      res.json({ position: { x: beacon.x + vector[0], y: beacon.y + vector[1] } });
    } else if (deviceEntries.beacons.length === 1) {
      
    }
    return res.json({ err: 'No beacons found in range' });
  })
  .then((result) => {
    res.json({dick: 'test'});
  })
  .catch((err) => {
    res.json({err: err});
  });
};
