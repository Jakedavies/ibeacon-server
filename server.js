process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var express = require( './config/express' );

var app = express();
const port = process.env.PORT ? process.env.PORT : 3030;
app.listen( port, '127.0.0.1' );

console.log( 'temp app running at http://localhost:'+process.env.PORT+'/' );
