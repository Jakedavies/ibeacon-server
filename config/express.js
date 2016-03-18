const express = require('express'),
  morgan = require('morgan'),
  bodyParser = require('body-parser');

module.exports = () => {
  const app = express();

  app.use(morgan('dev'));
  app.use(bodyParser.json());

  app.set('views', './app/views');
  app.set('view engine', 'ejs');

  require('../app/routes/index.server.routes.js')(app);

  app.use(express.static('./public'));

  return app;
};
