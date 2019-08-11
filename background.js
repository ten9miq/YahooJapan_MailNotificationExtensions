const wait = 30000;
const eappid_page_url = 'https://www.yahoo.co.jp/'; // eappid と ログイン状態のチェック先
const new_mail_count_url = 'https://web-yunz.yahoo.co.jp/Yunz/V1/getNotifications?eappid='; // メールの件数の取得先
const open_ymail_page_url = 'https://jp.mg5.mail.yahoo.co.jp/neo/launch'; // メールの表示ページ

view_new_mail_count();

//一定周期で動作
setInterval(function() {
	console.log('Inerval');
	view_new_mail_count();
}, wait);

function view_new_mail_count() {
	(async () => {
		let mail_count = await get_mail_count();
		console.log('mail_count', mail_count);

		if (mail_count == 0) {
			mail_count = '';
		}

		chrome.browserAction.setBadgeText({
			text: String(mail_count),
		});
	})();
}

async function set_eappid() {
	try {
		const connecter = new api_connecter(eappid_page_url);
		await connecter.get_method();
		const text = await connecter.get_text();
		var pattern = /eappid\\u0022:\\u0022(.+?)\\u0022,\\u0022/;
		const page_eappid = text.match(pattern);
		console.log('取得したeappid', page_eappid);
		if (page_eappid !== null) {
			chrome.storage.local.set({ eappid: page_eappid[1] }, () => {});
			return page_eappid[1];
		}
	} catch (error) {
		console.log(error);
	}
}

async function get_eappid() {
	const eappid = await browser.storage.local.get(['eappid']);
	if (eappid.eappid == null) {
		// eappidがない時
		return await set_eappid();
	} else {
		return eappid.eappid;
	}
}

async function is_login() {
	const connecter = new api_connecter(eappid_page_url);
	await connecter.get_method();
	const html = await connecter.get_dom();
	const no_login_dom = html.querySelector('.Personalbox__logout');
	// このDOM要素がある時ログインしていない
	if (no_login_dom == null) {
		// 要素がないということはログイン済みである
		return true;
	} else {
		return false;
	}
}

async function get_mail_count() {
	try {
		if (!(await is_login())) {
			// ログインしていない
			return 'login';
		}
		const eappid = await get_eappid();
		const connecter = new api_connecter(new_mail_count_url + eappid);
		try {
			await connecter.get_method();
			const json = await connecter.get_json();
			const mail_count = json.Result.NewMailCount;
			return mail_count;
		} catch (error) {
			await set_eappid();
			return await get_mail_count();
		}
	} catch (error) {
		console.log(error);
		return 0;
	}
}

//アイコンをクリックした場合YahooMailを開く
chrome.browserAction.onClicked.addListener(function() {
	chrome.tabs.create({
		url: open_ymail_page_url,
	});
	setInterval(function() {
		view_new_mail_count();
	}, 10000);
});
