// Use the IRC module to connect to the server, monitor and send messages.
var irc = require('irc');

// Use the request module to get information from various web services.
var request = require('request');

// Use the cheerio module to parse the dom of websites we scan.
var cheerio = require('cheerio');

// Include the rules data.
var rules = require('./data/rules');

// Require our config file. This needs to be created manually from the config-template.js file.
var config = require('./config');

// Set up the class to hold our helper functions.
function cyclingbot() {
    this.tests = {
        handleBaseHelp: /^\!bothelp$/,
        handleHelp: /^\!bothelp ([a-zA-Z]+)$/,
        handleTitle: /^\!title (.+)$/,
        handleNp: /^\!np (.+)$/,
        handleRule: /^\!rule ([0-9]{1,2})$/,
        handleTrivia: /^\!trivia ([0-9]+)$/,
        handleWeather: /^\!weather (.+)$/
    };
}

// Return the result of the regex matched on the message.
cyclingbot.prototype.regexMatch = function (regex, message) {
    // TODO: Do some validation of the user input to avoid potential misuse of APIs.
    return message.match(regex);
}

// Handle base help requests.
cyclingbot.prototype.handleBaseHelp = function (content, channel) {
    client.say(channel, "This bot will accept the following commands: !title, !np, !rule, !trivia, !weather. To get info on a specific command use this: '!bothelp <command>' eg '!bothelp title'.");
}

// Handle help requests.
cyclingbot.prototype.handleHelp = function (content, channel) {
    if (content) {
        switch (content) {
			case 'title':
			client.say(channel, "!title <url of page you want the title of>");
				break
				
			case 'np':
				client.say(channel, "!np <username of your lasfm account>");
				break
				
			case 'rule':
				client.say(channel, "!rule <velominati rule number>");
				break
				
			case 'trivia':
				client.say(channel, "!trivia <number you want trivia of>");
				break
			
			case 'weather':
				client.say(channel, "!weather <location>");
				break
		}
    }
}

// Handle title requests.
cyclingbot.prototype.handleTitle = function (content, channel) {
    if (content) {
        request({url: content}, function(error, response, body) {
			if (!error && response.statusCode === 200) {
				$ = cheerio.load(body);
                var siteTitle = $('title').text();
                
                if (siteTitle) {
                    client.say(channel, siteTitle.trim());
                } else {
                    client.say(channel, "Couldn't find a title on this site.");
                }
			} else {
				client.say(channel, "Couldn't find this site.");
			}
		});
    }
}

// Handle np requests.
cyclingbot.prototype.handleNp = function (content, channel) {
    if (content) {
        // TODO: need a reasonable config place to put this.
        var lastfmUrl = 'http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&format=json&api_key=' + config.lastFmApiKey + '&limit=1&user=' + content;
		request({url: lastfmUrl}, function(error, response, body) {
			if (!error && response.statusCode === 200) {
				var bodyParsed = JSON.parse(body);
				if (typeof(bodyParsed.error) === 'undefined') {
					var tracks = bodyParsed.recenttracks.track;
                    
                    // If the user is currently playing something this will come back as an array, and we want to only fetch the first item.
					if (tracks instanceof Array) {
						var track = tracks[0];
					} else {
						var track = tracks;
					}
					var songName = track.name;
					var artist = track.artist['#text'];
                    
                    // If the user is currently playing they will have content in the @attr field.
					if (typeof(track['@attr'])  !== 'undefined' && typeof(track['@attr'].nowplaying) !== 'undefined') {
						client.say(channel, 'Now playing: ' + songName + ' - ' + artist);
					} else {
						client.say(channel, 'Previously played: ' + songName + ' - ' + artist);
					}
				} else {
					client.say(channel, "No now playing content for that username.");
				}
			} else {
				client.say(channel, "No now playing content for that username.");
			}
		});
    }
}

// Handle rule requests.
cyclingbot.prototype.handleRule = function (content, channel) {
    if (content) {
        // TODO: Turn the rules into a webservice and call that instead
        var ruleNumber = parseInt(content);
		if (ruleNumber < 96 && ruleNumber > 0) {
            if (typeof (rules) !== 'undefined') {
                // TODO: Check these data points before returning blindly.
				client.say(channel, rules[ruleNumber][0]);
				client.say(channel, rules[ruleNumber][1]);
			} else {
				client.say(channel, 'Sorry, something when wrong when i tried to look up that rule number.');
			}
		} else {
			client.say(channel, 'Please choose a number between 1 and 95');
		}
    }
}

// Handle trivia requests.
cyclingbot.prototype.handleTrivia = function (content, channel) {
    if (content) {
        // TODO: Configure this somewhere like the other APIs we are using.
        var triviaUrl = "http://numbersapi.com/" + content;
		request({url: triviaUrl}, function (error, response, body) {
			if (!error && response.statusCode === 200) {
				client.say(channel, body);
			}
		});
    }
}

// Handle weather requests.
cyclingbot.prototype.handleWeather = function (content, channel) {
    if (content) {
        var weatherUrl = "http://api.worldweatheronline.com/free/v1/weather.ashx?key=" + config.weatherApiKey + "&format=json&q=" + content;
		request({url: weatherUrl}, function (error, response, body) {
			if (!error && response.statusCode === 200) {
				var weatherResp = JSON.parse(body);
				data = weatherResp.data;
				if (typeof(data.error) === 'undefined') {
					var cond = data.current_condition[0];
					var message = '';
					
					if (typeof(cond.cloudcover) !== 'undefined') {
						message = message + 'Cloud Cover: ' + cond.cloudcover + '%' + ' - ';
					}
					
					if (typeof(cond.humidity) !== 'undefined') {
						message = message + 'Humidity: ' + cond.humidity + '%' + ' - ';
					}
					
					if (typeof(cond.precipMM) !== 'undefined') {
						message = message + 'Precipitation: ' + cond.precipMM + 'mm' + ' - ';
					}
					
					if (typeof(cond.pressure) !== 'undefined') {
						message = message + 'Pressure: ' + cond.pressure + 'hPa' + ' - ';
					}
					
					if (typeof(cond.temp_C) !== 'undefined' || typeof(cond.temp_F) !== 'undefined') {
						message = message + 'Temperature: ';
						var c = false;
						if (typeof(cond.temp_C) !== 'undefined') {
							message = message + cond.temp_C + 'c';
							c  = true;
						}
						
						if (typeof(cond.temp_F) !== 'undefined') {
							if (c) {
								message = message + ' or ' + cond.temp_F + 'f';
							} else {
								message = message + cond.temp_F + 'f';
							}
						}
						message = message + ' - ';
					}
					
					if (typeof(cond.visibility) !== 'undefined') {
						message = message + 'Visibility: ' + cond.visibility + 'm' + ' - ';
					}
					
					if (typeof(cond.weatherDesc) !== 'undefined' && typeof(cond.weatherDesc[0].value) !== 'undefined') {
						message = message + 'Weather: ' + cond.weatherDesc[0].value + ' - ';
					}
					
					if (typeof(cond.windspeedKmph) !== 'undefined') {
						message = message + 'Wind Speed: ' + cond.windspeedKmph + 'km/h' + ' - ';
					}
					
					if (typeof(cond.winddir16Point) !== 'undefined') {
						message = message + 'Wind Direction: ' + cond.winddir16Point;
					}
					client.say(channel, message);
				} else {
					client.say(channel, data.error[0].msg);
				}
			}
		});
    }
}

var realCyclingbot = new cyclingbot();

// Create the IRC client, connect to the configured server and the configured channels.
var client = new irc.Client(config.server, config.name, {
    channels: config.channels,
    debug: true
});

// Listen for messages and parse them based on their content.
client.addListener('message', function (from, to, message) {
    for (var method in realCyclingbot.tests) {
        if (realCyclingbot.tests.hasOwnProperty(method)) {
            var regex = realCyclingbot.tests[method];
            var match = realCyclingbot.regexMatch(regex, message);
            
            if (typeof (match) !== 'undefined' && match) {
                // TODO: We need to add some checking of match[1] to everything but bothelp.
                // Maybe this could be achieved by adding an extra config value into our tests array.
                realCyclingbot[method](match[1], to);
            }
        }   
    }
    	    
    // log all messages that the bot receives to allow for viewing of the channel without having to join on another client.
    console.log(from + ' => ' + to + ': ' + message);
});

// Listen for errors and log them to the console for use by the administrator.
client.addListener('error', function (message) {
    console.error('ERROR: %s: %s', message.command, message.args.join(' '));
});
