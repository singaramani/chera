const Upstox = require("upstox");
const puppeteer = require("puppeteer");
const http = require("http");

const PORT = process.env.PORT || 5000;

const APP_KEY = process.env.UAPPKEY;
const APP_SEC = process.env.UAPPSEC;
const RDR_URL = process.env.URDRURI;
const UNAME = process.env.UNAME;
const UPASS = process.env.UPASS;
const U2FA = process.env.U2FA;
const FIN_URL = process.env.FINURL;
const CODE_EP = process.env.CODEEP;

try{
	http.createServer(function (request, response) {
		console.log(request.url);
		processReq(request, response);
	}).listen(PORT);
	console.log('Server port:' + PORT);
}catch(e){
	console.log('Server error:' + e.message);
}

async function processReq(request, response) {
	try {
		var urlpath = request.url.split("?").shift();
		if (urlpath == '/'+CODE_EP) {
			var atcode = await fetchCodePuppet();
			response.writeHead(200, {'Content-Type': 'application/json'});
			response.end(JSON.stringify({token: atcode, time: new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"})+" IST"}));
		} else if (urlpath == '/rdrurl') {
			var upstox = new Upstox(APP_KEY);
			upstox.setApiVersion(upstox.Constants.VERSIONS.Version_1_5_6);
			var code = request.url.split("=")[1];
			var params = {
				"apiSecret": APP_SEC,
				"code": code,
				"redirect_uri": RDR_URL
			};
			console.log(JSON.stringify(params));
			upstox.getAccessToken(params)
			.then(function (res) {
				accessToken = res.access_token;
				response.writeHead(302, {'Location': FIN_URL + "?token=" + accessToken});
            			response.end();
				console.log("Reveived token - redirecting..");
			}).catch(function (err) {
				response.writeHead(302, {'Location': FIN_URL + "?token=0"});
            			response.end();
				console.log("err::" + err + "::" + JSON.stringify(err));
			});
		} else if (urlpath == '/fincode') {
			var token = request.url.split("=")[1];
			response.writeHead(200, {'Content-Type': 'text/plain'});
			response.end(token);
			console.log("done.");
		} else if (urlpath == '/favicon.ico') {
			response.writeHead(204, {});
			response.end();
		} else {
			response.writeHead(200, {'Content-Type': 'text/plain'});
			response.end(JSON.stringify({code: 0}));
		}
	} catch (e) {
		console.log("processReq error:" + e);
	}
}

async function fetchCodePuppet() {
	try {
		//const browser=await puppeteer.launch({headless:false});
		const browser = await puppeteer.launch({args: ['--no-sandbox']});
		const page = await browser.newPage();
		await page.goto("https://staging-api.upstox.com/index/dialog/authorize?apiKey=" + APP_KEY + "&redirect_uri=" + RDR_URL + "&response_type=code");
		await page.waitForSelector(".bottom-box");
		await page.type('#name', process.env.UNAME);
		await page.type('#password', process.env.UPASS);
		await page.type('#password2fa', process.env.U2FA);
		//await page.screenshot({path: 'login.png'});
		await page.click("body > form > fieldset > div.bottom-box > div > button");
		await page.waitForSelector('#allow');
		//await page.screenshot({path: '2fa.png'});
		await page.click('#allow');
		await page.waitForNavigation();
		const rdrurl = await page.url();
		await console.log(rdrurl);
		var atCode = rdrurl.split("=")[1];
		await browser.close();
		return atCode;
	} catch (e) {
		console.log("fetchCodePuppet error:" + e);
		return "0";
	}
}
