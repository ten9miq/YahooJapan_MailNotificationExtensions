const wait = 0.5;
const eappid_page_url = 'https://www.yahoo.co.jp/'; // eappid と ログイン状態のチェック先
const new_mail_count_url = 'https://web-yunz.yahoo.co.jp/Yunz/V1/getNotifications?eappid='; // メールの件数の取得先
const open_ymail_page_url = 'https://mail.yahoo.co.jp/'; // メールの表示ページ

view_new_mail_count();

//一定周期で動作
chrome.runtime.onInstalled.addListener(() => {
	chrome.alarms.create('checkMail', { periodInMinutes: wait });
});

chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === 'checkMail') {
		view_new_mail_count();
	}
});

function view_new_mail_count() {
	(async () => {
		let mail_count = await mail_count_fetch_process();
		console.log('mail_count', mail_count);

		if (mail_count == 0) {
			mail_count = '';
		}

		chrome.action.setBadgeText({
			text: String(mail_count),
		});
	})();
}

async function set_eappid() {
	try {
		const response = await fetch(eappid_page_url);
		const text = await response.text();

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
		clear_eappid();
		return null;
	}
}

function get_eappid() {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(['eappid'], function (result) {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve(result.eappid);
			}
		});
	});
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
	// <div id="Login"> の中のリンクを調べる
	// ログイン状態では
	// - アカウント名: リンクなし
	// - 登録情報: https://accounts.yahoo.co.jp/profile?...
	// ログアウト状態では
	// - ログインリンク: https://login.yahoo.co.jp/config/login?...
	// - ID新規作成リンク: https://account.edit.yahoo.co.jp/registration?...
	// - 登録情報: https://login.yahoo.co.jp/config/login?...
	const response = await fetch(eappid_page_url);
	const htmlText = await response.text();

	// ログイン状態を示すリンクが存在するかチェック
	const isLoggedIn = /https:\/\/accounts\.yahoo\.co\.jp\/profile\?/.test(htmlText);
	return isLoggedIn;
}

async function get_mail_count(eappid) {
	const response = await fetch(new_mail_count_url + eappid);
	const json = await response.json();
	const mail_count = json.Result.NewMailCount;
	return mail_count;
}

// すでに取得済みの eappid でメール件数の取得を試みる。
// ダメなら get_mail_count2 へ。
async function mail_count_fetch_process() {
	try {
		const eappid = await get_eappid();
		if (eappid) {
			try {
				return await get_mail_count(eappid);
			} catch (error) {
				return await eaapid_reacquisition_after_get_mail_count();
			}
		} else {
			return await eaapid_reacquisition_after_get_mail_count();
		}
	} catch (error) {
		console.log(error);
		return '-';
	}
}

// ログイン判定、eaippidの取得をした後にメール件数の取得を試みる。
async function eaapid_reacquisition_after_get_mail_count() {
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
		return await get_mail_count(eappid);
	} catch (error) {
		console.log(error);
		return '-';
	}
}

//アイコンをクリックした場合YahooMailを開く
chrome.action.onClicked.addListener(function () {
	chrome.tabs.create({
		url: open_ymail_page_url,
	});
	setTimeout(function () {
		view_new_mail_count();
	}, 10000);
});
