// eslint-disable-next-line @typescript-eslint/no-unused-vars
function sendPayment() {
    const source = document.getElementById('grant-sources').value;
    const dest = document.getElementById('grant-creditor').value;
    const value = document.getElementById('grant-amount').value;
    const message = document.getElementById('grant-message').value;


    makePOSTRequest('transaction/', JSON.stringify({
        debtor: source,
        creditor: dest,
        value: value,
        message: message
    })).then(reply => {
        alert(':)');
        console.log(reply);
    }).catch(e => {
        alert(':(');
        console.error(e);
    });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function sendGrant() {
    const source = document.getElementById('grant-sources').value;
    const dest = document.getElementById('grant-creditor').value;
    const value = document.getElementById('grant-amount').value;
    const message = document.getElementById('grant-message').value;

    makePOSTRequest(`currency/${source}/grant/`, JSON.stringify({
        message: message,
        creditor: dest,
        amount: value
    })).then(reply => {
        alert(':)');
        console.log(reply);
    }).catch(e => {
        alert(':(');
        console.error(e);
    });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function makeCurrency() {
    const payload = {
        symbol        : document.getElementById('symbol').value,
        grouping      : Number(document.getElementById('grouping').value),
        decimals      : Number(document.getElementById('decimals').value),
        long_name     : document.getElementById('long_name').value,
        short_name    : document.getElementById('short_name').value,
        volume        : Number(document.getElementById('volume').value)
    };

    makePOSTRequest('currency/', JSON.stringify(payload))
        .then(reply => {
            alert(':)');
            console.log(reply);
        }).catch(e => {
            alert(':(');
            console.error(e);
        });
}

async function makePOSTRequest(path, body) {
    if (typeof body == 'object') body = JSON.stringify(body);
    const request = new Request(`/api/${path}`, {
        method: 'POST',
        body: body,
        headers: {'Content-Type': 'application/json'}
    });
    const reply = await fetch(request);
    return reply;
}

async function makeGETRequest(path) {
    const request = new Request(`/api/${path}`, {
        method: 'GET'
    });
    const reply = await fetch(request);
    return reply;
}

function makeAccountActionColumn(address) {
    const root = document.createElement('td');

    function addActionButton(label, callback) {
        const btn = document.createElement('button');
        btn.innerText = label;
        btn.onclick = callback;
        root.appendChild(btn);    
    }

    addActionButton('Show Details', () => {

    });

    addActionButton('Make Transfer Source', () => {
        const sourcelist = document.getElementById('sources');
        sourcelist.value = address;
    });

    addActionButton('Make Transfer Destination', () => {
        const sourcelist = document.getElementById('creditor');
        sourcelist.value = address;
    });

    addActionButton('Make Grant Destination', () => {
        const sourcelist = document.getElementById('grant-creditor');
        sourcelist.value = address;
    });

    return root;
}

function makeCurrencyActionColumn(address) {
    const root = document.createElement('td');

    const showDetailsButton = document.createElement('button');
    showDetailsButton.innerText = 'Show Details';
    showDetailsButton.onclick = () => {
        window.open(`/currencyinfo.html?target=${address}`, 'walletmaker', 'popup=yes,width=500,height=500');
    };
    root.appendChild(showDetailsButton);

    const selectAsSourceButton = document.createElement('button');
    selectAsSourceButton.innerText = 'Make Wallet';
    selectAsSourceButton.onclick = () => {
        window.open(`/walletmaker.html?currency=${address}`, '_blank');
    };
    root.appendChild(selectAsSourceButton);

    return root;
}

function loadAccount() {
    const table = document.getElementById('wallets');
    const sourcelist = document.getElementById('sources');

    makeGETRequest('wallet/list/').then(async (body) => {
        const list = await body.json();

        for (var count=0; count<list.length; count++) {
            const wallet = list[count];
            const row = document.createElement('tr');
            const addr = document.createElement('td');
            const label = document.createElement('td');
            const balcol = document.createElement('td');
            const actcol = makeAccountActionColumn(wallet['id']);

            const label_text = wallet['nickname'] || 'Unnamed Wallet';

            const source_option = document.createElement('option');
            source_option.value = wallet['id'];
            source_option.innerText = label_text;
            sourcelist.appendChild(source_option);

            addr.innerText = wallet['id'];
            label.innerText = label_text;
            balcol.innerText = wallet['balance'];

            row.appendChild(addr);
            row.appendChild(label);
            row.appendChild(balcol);
            row.appendChild(actcol);

            row.setAttribute('wallet-address', wallet['id']);

            table.appendChild(row);
        }

    });   
}

function loadCurrency() {
    const table = document.getElementById('currencies');
    const gslist = document.getElementById('grant-sources');

    makeGETRequest('account/@me/currencies/').then(async (body) => {
        const reply_data = await body.json();
        const list = reply_data.data;

        for (var count=0; count<list.length; count++) {
            const currency = list[count];

            console.table(currency);

            const row = document.createElement('tr');
            const address_col = document.createElement('td');
            const name_col = document.createElement('td');
            const short_name_col = document.createElement('td');
            const utilisation_col = document.createElement('td');
            const actcol = makeCurrencyActionColumn(currency['id']);

            address_col.innerText = currency['id'];
            name_col.innerText = currency['longName'];
            short_name_col.innerText = currency['shortName'];

            const source_option = document.createElement('option');
            source_option.value = currency['id'];
            source_option.innerText = currency['longName'];
            gslist.appendChild(source_option);

            const liq = Number(currency['liquidity']);
            const vol = Number(currency['volume']);
            const per = Math.floor((liq/vol) * 100);

            utilisation_col.innerText = `${liq}/${vol} (${per}%)`;

            row.appendChild(address_col);
            row.appendChild(name_col);
            row.appendChild(short_name_col);
            row.appendChild(utilisation_col);
            row.appendChild(actcol);

            table.appendChild(row);
        }
    });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function makeApplicationActionColumn(address) {
    const root = document.createElement('td');

    const showDetailsButton = document.createElement('button');
    showDetailsButton.innerText = 'Show Details';
    root.appendChild(showDetailsButton);

    return root;
}

function loadApplications() {
    const table = document.getElementById('apps');

    makeGETRequest('account/@me/applications/').then(async (body) => {
        const list = await body.json();

        for (var count=0; count<list.length; count++) {
            const application = list[count];

            console.table(application);

            const row = document.createElement('tr');
            const name_col = document.createElement('td');
            const description_col = document.createElement('td');
            const actcol = makeApplicationActionColumn(application['id']);

            name_col.innerText = application['displayName'];
            description_col.innerText = application['description'];

            row.appendChild(name_col);
            row.appendChild(description_col);
            row.appendChild(actcol);

            table.appendChild(row);
        }
    });
}

function load() {
    loadAccount();
    loadCurrency();
    loadApplications();
}

makeGETRequest('account/is-logged-in').then((r) => {
    if (r.status != 200) window.location = '/id.html';
    load();
}).catch((e) => {
    console.error(e);
});