process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var express = require( './config/express' );

var app = express();

app.listen( 3030, '127.0.0.1' );

console.log( 'temp app running at http://localhost:3030/' );
