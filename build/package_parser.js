/*client.on('message', function(message) {
  var obj = JSON.parse(message);
  sys.puts(sys.inspect(obj));
});

process.argv
*/
var fs = require('fs');
/*process.argv.forEach(function (val, index, array) {
  if(index > 1 ){
	
	console.log(index + ': ' + val);
  }
});
*/
var packagename = process.argv[2];
var param = process.argv[3];
//var targetfile = process.argv[4];
//var obj = JSON.parse(message);
//console.log(packagename + "  " + param);

var s = fs.ReadStream(packagename);
var packageJSON = {};
s.on('data', function(d) {
    packageJSON = JSON.parse(d);
	console.log(packageJSON[param]);
});
/*
var s = fs.ReadStream(targetfile);
s.on('data', function(d) {
    packageJSON.forEach(function (val, index, array) {
		
		console.log(index + ': ' + val);
	
	});
});
*/