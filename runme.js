/*
Оскільки https://taxer.ua/ так і не зробили людський імпорт операцій я накостиляв цей скрипт.
Якщо ви отримуєте виплати від ваших клієнтів свіфтом на ФОП рахунок Монобанку то він для вас.
Він бере виписку в моно від дати останньої операції в бухгалтеріїї таксера та додає ці транзакції як валютний дохід чи як обмін валют.

Код треба вставити в консоль сторінки taxer.ua підмінивши:
* userId - таксерівський ідентифікатор
* monoToken - ваш токен доступу до виписки, можна отримати тут https://api.monobank.ua/
* account - ідентифікатор долларової картки фоп, можна отримати тут https://api.monobank.ua/docs/#tag/Kliyentski-personalni-dani/paths/~1personal~1client-info/get
* треба заповнити айдішки та імена рахунків таксеру

(пул реквест для автоматичного отримання усього крім моно токену вітається)
 */

const userId = ;
const monoToken = ''
const account = '';

const usdAccountTitle = '';
const usdAccountId = ;
const uahAccountTitle = '';
const uahAccountId = ;

function sendIncome(timestamp, total, comment = null) {
    const url = 'https://taxer.ua/api/finances/operation/create?lang=uk';
    const data = {
        operations: [
            {
                userId: userId,
                operation: {
                    id: null,
                    type: 'FlowIncome',
                    comment: comment,
                    contents: [],
                    timestamp: timestamp,
                    payedSum: null,
                    financeType: 'custom',
                    account: {
                        currency: 'USD',
                        id: usdAccountId,
                        title: usdAccountTitle,
                        isDefault: false
                    },
                    total: total
                }
            }
        ]
    };

    fetch(url, {
        method: 'POST',
        // headers: headers,
        body: JSON.stringify(data),
        compress: true
    })
        .then(response => response.json())
        .then(data => {
            console.log(data); // Handle the response data
        })
        .catch(error => {
            console.error('Error:', error, data);
        });

}

function sendExchange(timestamp, from, currencyRate, comment = null) {
    const url = 'https://taxer.ua/api/finances/operation/create?lang=uk';
    const data = {
        operations: [
            {
                userId: userId,
                operation: {
                    id: null,
                    type: 'CurrencyExchange',
                    comment: comment,
                    contents: [],
                    timestamp: timestamp,
                    financeType: 'custom',
                    outgoTotal: from,
                    outgoAccount: {
                        currency: 'USD',
                        id: usdAccountId,
                        title: usdAccountTitle,
                        isDefault: false
                    },
                    incomeAccount: {
                        currency: 'UAH',
                        id: uahAccountId,
                        title: uahAccountTitle,
                        isDefault: false
                    },
                    incomeCurrency: currencyRate
                }
            }
        ]
    };

    fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        compress: true
    })
        .then(response => response.json())
        .then(data => {
            console.log(data); // Handle the response data
        })
        .catch(error => {
            console.error('Error:', error, data);
        });
}
function getOperations() {
    const url = 'https://taxer.ua/api/finances/operation/load?lang=uk&params=';

    const data = {
        filters: {},
        sorting: {date: 'DESC'},
        pageNumber: 1,
        recordsOnPage: 100,
        userId: userId
    };

    return fetch(url + encodeURI(JSON.stringify(data)), {
        method: 'GET',
        compress: true
    })
        .then(response => response.json())
        .catch(error => {
            console.error('Error:', error);
        });
}

let urlTemplate = "https://api.monobank.ua/personal/statement/{account}/{from}/{to}";


async function fetchData(url) {
    const response = await fetch(url, {headers:{'X-Token':monoToken}});
    const data = await response.json();
    return data;
}

function addMonths(date, months) {
    date.setMonth(date.getMonth() + months);
    return date;
}

function toUnixTime(date) {
    return Math.floor(date.getTime() / 1000);
}

async function getTransactions(startTime) {
    let responses = [];
    let startDate = new Date(startTime);
    let endDate = addMonths(new Date(startTime), 1);

    while (new Date() > startDate) {
        let from = toUnixTime(startDate);
        let to = toUnixTime(endDate);

        let url = urlTemplate.replace('{account}', account).replace('{from}', from).replace('{to}', to);

        console.log(`Fetching data from ${url}`);
        let data = await fetchData(url);

        responses.push(data);

        await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds delay

        startDate = addMonths(startDate, 1);
        endDate = addMonths(endDate, 1);
    }

    return responses.flat()
}

rsp = await getOperations()
lastTransaction = rsp.operations[0].contents[0].timestamp

let transactions = await getTransactions(lastTransaction * 1000 + 1000);
transactions.sort((a,b) => a.time - b.time);
for (const item of transactions) {
    const index = transactions.indexOf(item);
    console.log(item, index);
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds delay
    if(item.amount > 0) {
        sendIncome(item.time, item.amount/100, item.description)
    } else {
        sendExchange(item.time, -item.amount/100, item.operationAmount/item.amount, item.description)
    }
}
console.log("imported " + transactions.length + " transactions")
