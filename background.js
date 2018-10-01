console.log("background is running");
receiveMail = 0;
wait = 30000;
var urlRequest = 'https://www.yahoo.co.jp/'; //情報源のURL

function getPageResouser() {
	//情報の取得
	$.ajax({
		url: urlRequest,
		type: "GET",
		crossDomain: true,
		cache: false,
		success: function (res) {
			var contents = res.toString();
			// ajaxが取得したHTMLなど
			// data = $(contents).find('.Personalbox__noticeText').text();
			var data = $(contents).text();
			// console.log("data=" + data);
			var pattern = /新着([0-9]+)件/;
			console.log("data取り出し=" + data.match(pattern));
			if (data.match(pattern) !== null) { //メールがある場合
				receiveMail = data.match(pattern)[1];
				console.log("if = " + receiveMail);
				chrome.browserAction.setBadgeText({
					text: String(receiveMail)
				});
			} else { //メールがない場合
				console.log("新着メールなし");
				chrome.browserAction.setBadgeText({
					text: ""
				});
			}
		}
	});
}
getPageResouser();

//一定周期で動作
setInterval(function () {
	console.log("Inerval");
	getPageResouser();
}, wait);

function Sleep(T) {
	var d1 = new Date().getTime();
	var d2 = new Date().getTime();
	while (d2 < d1 + 1000 * T) { //T秒待つ
		d2 = new Date().getTime();
	}
	return;
}


//アイコンをクリックした場合YahooMailを開く
chrome.browserAction.onClicked.addListener(
	function () {
		var action_url = "https://jp.mg5.mail.yahoo.co.jp/neo/launch";
		chrome.tabs.create({
			url: action_url
		});
		console.log("action");
		Sleep(10); //待ち時間
		console.log("待ち時間完了");
		getPageResouser();
	});