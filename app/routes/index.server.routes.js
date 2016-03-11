const index = require('../controllers/index.server.controller');

module.exports = (app) => {
  app.post('/', index.render);
};
