// eslint-disable-next-line @typescript-eslint/no-unused-vars
function sendPayment() {
    const source = document.getElementById('sources').value;
    const dest = document.getElementById('creditor').value;
    const value = document.getElementById('amount').value;


    makePOSTRequest('transaction/begin/', JSON.stringify({
        debtor: source,
        creditor: dest,
        value: value
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

    const showTransactionsButton = document.createElement('button');
    showTransactionsButton.innerText = 'Show Transactions';
    root.appendChild(showTransactionsButton);

    const selectAsSourceButton = document.createElement('button');
    selectAsSourceButton.innerText = 'Make Source';
    selectAsSourceButton.onclick = () => {
        const sourcelist = document.getElementById('sources');
        sourcelist.value = address;
    };
    root.appendChild(selectAsSourceButton);

    return root;
}

function makeCurrencyActionColumn(address) {
    const root = document.createElement('td');

    const showTransactionsButton = document.createElement('button');
    showTransactionsButton.innerText = 'Show Details';
    root.appendChild(showTransactionsButton);

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

    makeGETRequest('currency/list/').then(async (body) => {
        const list = await body.json();

        for (var count=0; count<list.length; count++) {
            const currency = list[count];

            console.table(currency);

            const row = document.createElement('tr');
            const address_col = document.createElement('td');
            const name_col = document.createElement('td');
            const short_name_col = document.createElement('td');
            const owner_name_col = document.createElement('td');
            const utilisation_col = document.createElement('td');
            const actcol = makeCurrencyActionColumn(currency['id']);

            address_col.innerText = currency['id'];
            name_col.innerText = currency['longName'];
            short_name_col.innerText = currency['shortName'];
            owner_name_col.innerText = currency['Owner']['displayName'];

            const liq = Number(currency['liquidity']);
            const vol = Number(currency['volume']);
            const per = Math.floor((liq/vol) * 100);

            utilisation_col.innerText = `${liq}/${vol} (${per}%)`;

            row.appendChild(address_col);
            row.appendChild(name_col);
            row.appendChild(short_name_col);
            row.appendChild(owner_name_col);
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