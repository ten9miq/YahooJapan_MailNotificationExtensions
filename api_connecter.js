class api_connecter {
	constructor(url) {
		this.url = url;
	}

	get url() {
		return this._url;
	}
	set url(url) {
		this._url = url;
	}

	get connecter() {
		return this._connecter;
	}
	set connecter(connecter) {
		this._connecter = connecter;
	}

	async initial_connecter(method_name = 'GET', header = null, body = null) {
		this.connecter = await fetch(this.url, {
			method: method_name,
			header: header,
			body: body,
		});
	}

	async get_method() {
		await this.initial_connecter();
		// return this.connecter.text();
		return this.connecter;
	}

	async get_text() {
		return this.connecter.text();
	}
	async get_json() {
		return this.connecter.json();
	}
	async get_dom() {
		const text = await this.connecter.text();
		return new DOMParser().parseFromString(text, 'text/html');
	}
}
