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

		const patterns = [/eappid\u0022:\u0022(.+?)\u0022,\u0022/, /eappid\\u0022:\\u0022(.+?)\\u0022,\\u0022/];
		let page_eappid = null;
		for (const pattern of patterns) {
			page_eappid = text.match(pattern);
			if (page_eappid !== null) {
				break;
			}
		}
		console.log('取得したeappid', page_eappid);
		if (page_eappid !== null) {
			chrome.storage.local.set(
				{
					eappid: page_eappid[1],
				},
				() => {}
			);
			return page_eappid[1];
		}
	} catch (error) {
		console.log(error);
	}
	clear_eappid();
	return null;
}

async function get_eappid() {
	const eappid = await browser.storage.local.get(['eappid']);
	return eappid.eappid;
}

function clear_eappid() {
	chrome.storage.local.set(
		{
			eappid: null,
		},
		() => {}
	);
}

async function is_login() {
	const connecter = new api_connecter(eappid_page_url);
	await connecter.get_method();
	const html = await connecter.get_dom();

	// <div id="Login"> の中のリンクを調べる
	// ログイン状態では
	// - アカウント名: リンクなし
	// - 登録情報: https://accounts.yahoo.co.jp/profile?...
	// ログアウト状態では
	// - ログインリンク: https://login.yahoo.co.jp/config/login?...
	// - ID新規作成リンク: https://account.edit.yahoo.co.jp/registration?...
	// - 登録情報: https://login.yahoo.co.jp/config/login?...
	const a_in_login_box = html.querySelectorAll('#Login a');
	for (const a of a_in_login_box) {
		if (a.href.match(/^https:\/\/accounts.yahoo.co.jp\/profile\?/)) {
			return true;
		}
	}
	return false;
}

async function get_mail_count_core(eappid) {
	const connecter = new api_connecter(new_mail_count_url + eappid);
	await connecter.get_method();
	const json = await connecter.get_json();
	const mail_count = json.Result.NewMailCount;
	return mail_count;
}

// すでに取得済みの eappid でメール件数の取得を試みる。
// ダメなら get_mail_count2 へ。
async function get_mail_count() {
	try {
		const eappid = await get_eappid();
		if (eappid) {
			try {
				return await get_mail_count_core(eappid);
			} catch (error) {
				return await get_mail_count2();
			}
		} else {
			return await get_mail_count2();
		}
	} catch (error) {
		console.log(error);
		return '-';
	}
}

// ログイン判定、eaippidの取得をした後にメール件数の取得を試みる。
async function get_mail_count2() {
	try {
		if (!(await is_login())) {
			// ログインしていない
			clear_eappid();
			return 'login';
		}
		const eappid = await set_eappid();
		if (!eappid) {
			return '-';
		}
		return await get_mail_count_core(eappid);
	} catch (error) {
		console.log(error);
		return '-';
	}
}

//アイコンをクリックした場合YahooMailを開く
chrome.browserAction.onClicked.addListener(function() {
	chrome.tabs.create({
		url: open_ymail_page_url,
	});
	setTimeout(function() {
		view_new_mail_count();
	}, 10000);
});
