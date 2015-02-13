var http 	= require('http-get');
var async 	= require('async');
var url 	= require('url');
var fs 		= require('fs');
var Buffer 	= require('buffer').Buffer;


function downloadVideo(articleUrl, callback){
	fetchVideoPlaylistUrl(articleUrl, doneFetchingArticle);

	function doneFetchingArticle(err, playlistUrl){
		downloadPlaylist(playlistUrl, doneDownloading);
	};

	function doneDownloading(err){
		callback(err);
	};
}

function fetchVideoPlaylistUrl(videoUrl, callback){

	var video = url.parse(videoUrl);

	var options = {
		url: video.protocol + '//' + video.hostname + video.path,
		headers: {
			'User-Agent': 'AppleCoreMedia/1.0.0.9B206 (iPad; U; CPU OS 5_1_1 like Mac OS X; nl_nl)'
		}
	}

	http.get(options, function (err, result) {
		if(!err && result){
			//search for "playlist.m3u8"
			var needle = "playlist.m3u8";

			var endPos = result.buffer.indexOf( needle ) + needle.length + 1;
			startPos = (result.buffer.substring(0,endPos-1)).lastIndexOf('"');
			var playlistUrl =  JSON.parse( result.buffer.substring(startPos, endPos) );

			fetchRealPlaylistUrl(playlistUrl);
		}else{
			callback(err);
		}
	});


	function fetchRealPlaylistUrl(playlistUrl){
		var folderUrl = playlistUrl.substr( 0, playlistUrl.lastIndexOf('/') + 1 );

		http.get({url: playlistUrl}, function (err, result) {
			var result = result.buffer.split('\n');

			for(var i=0; i<result.length; i++){
				var line = result[i];

				if(line.trim() != '' && line.substr(0,1) != '#'){
					callback(null, playlistUrl);
					break;
				}
			}

			callback("no real playlist url found");

		});
	};
}


function downloadPlaylist(playlistUrl, callback){
	var downloadedFiles = [];

	var folderUrl = playlistUrl.substr( 0, playlistUrl.lastIndexOf('/') + 1 );

	http.get({url: playlistUrl}, function (err, result) {
		if(!err && result){
			var playlist = result.buffer.split('\n');
			
			async.forEachSeries(playlist, downloadPart, doneDownloading);

			function downloadPart(playlistItem, imDone){
				if(playlistItem.trim() != '' && playlistItem.substr(0,1) != '#'){
					console.log("Downloading: " + folderUrl + playlistItem);

					//download file:
					var destination =  __dirname + "/" + url.parse(playlistItem).pathname;
					downloadFile(folderUrl + playlistItem, destination, function(downloadErr){
						downloadedFiles.push(destination);
						imDone(downloadErr);
					});

				}else{
					imDone();
				}
			};

			function doneDownloading(err){
				if(!err){
					var destination = playlistUrl.substr( 0, playlistUrl.lastIndexOf('/'));
					destination =  __dirname + "/" + destination.substr( destination.lastIndexOf('/') + 1 );
					mergeFiles(downloadedFiles, destination, doneMerging);
				}else{
					callback(err);
				}
			};

			function doneMerging(err){
				if(!err){
					deleteFiles(downloadedFiles, doneDeleting);
				}else{
					callback(err);
				}
			};

			function doneDeleting(err){
				callback(err);
			};
		}
		else{
			console.log("Error getting playlist");
		}
	});	
}


function downloadFile(url, destination, callback){
	http.get({url: url}, destination, function (err, result) {
		if(!err){
			console.log("Saved " + destination);
			callback();
		}
		else{
			console.log(err);
			callback(err);
		}
	});
}

function mergeFiles(files, destination, callback){
	//open destination file:
	var destFd = fs.openSync(destination, 'a');

	files.forEach(function(file){
		//open source file:
		var fd = fs.openSync(file, 'r');
		var buffer = new Buffer(1024);
		var length;
		while( length = fs.readSync(fd, buffer, 0, buffer.length, null) ){
			//write bytes to destination file;
			fs.writeSync( destFd, buffer, 0, length, null );
		}
		fs.closeSync(fd);
	});

	//close destination file:
	fs.closeSync(destFd);

	callback();
}

function deleteFiles(files, callback){
	files.forEach(function(file){
		fs.unlinkSync(file);
	});

	callback();
}


downloadVideo("http://www.focus-wtv.tv/video/haventriatlon-zeebrugge#.T84ShH3BSio.facebook", function(err){
	if(!err)
		console.log('Done!')
	else
		console.log('ERROR: ' + err);
});












