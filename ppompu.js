var _ = require('underscore'),
    config = require('config'),
    request = require('request'),
    cheerio = require('cheerio'),
    Iconv = require('iconv').Iconv,
    iconv = new Iconv('EUC-KR', 'UTF8'),
    Parse = require('node-parse-api').Parse,
    db = new Parse({
        app_id: config.get('Parse.appId'),
        api_key: config.get('Parse.apiKey')
    });
var url = 'http://www.ppomppu.co.kr/zboard/zboard.php?id=coupon';
var $;

request({
    uri: url,
    encoding: 'binary'
}, function(err, response, body) {
    if (err) {
        console.error(err);
    } else {
        body = new Buffer(body, 'binary');
        body = iconv.convert(body).toString();

        //console.log(body);
        $ = cheerio.load(body),
            couponList = $('#revolution_main_table tr.list0, #revolution_main_table tr.list1');
        var cpnList = extractCouponList(couponList);
        var max = _.max(cpnList, function(el){ return el.no; }).no;
        var min = _.min(cpnList, function(el){ return el.no; }).no;
        console.log('selected no: ' + min + ' ~ ' + max);

        getDbData(min, max, function(err, data) {
            var listNo = _.pluck(data.results, 'no');

            _.each(cpnList, function(element, index, list) {
                if (listNo.indexOf(element.no) > -1) {
                    //console.log('exists in db: ' + element.no);
                    var dataOnDb = _.filter(data.results, function(el) { return el.no == element.no; })[0];
                    console.log('view cnt changed: ' + dataOnDb.viewCnt + ' -> ' + element.viewCnt);
                } else {
                    // DB에 없는 데이터 -> insert
                    //console.log('not exists in db: ' + element.no);
                    db.insert('ppomppu', element, function(err, response) {
                        if (err) console.error(err);
                        console.log(response);
                    });
                }
            });
        });
    }
});

function extractCouponList(elements) {
    return _.map(elements, function(element) {
        var cpn = {
            boardId: 'coupon',
            no: parseInt($(element).find('td:nth-child(1)').text().trim()),
            category: $(element).find('td:nth-child(2) nobr').text().trim(),
            title: $(element).find('td:nth-child(4) td:nth-child(2) a font').text().trim(),
            commentCnt: parseInt($(element).find('td:nth-child(4) td:nth-child(2) span span').text().trim()) || 0,
            time: $(element).find('td:nth-child(5)').attr('title'),
            recommendCnt: parseInt(($(element).find('td:nth-child(6)').text().indexOf('-') > -1) ? $(element).find('td:nth-child(6)').text().trim().split('-', 2)[0].trim() : 0),
            dislikeCnt: parseInt(($(element).find('td:nth-child(6)').text().indexOf('-') > -1) ? $(element).find('td:nth-child(6)').text().trim().split('-', 2)[1].trim() : 0),
            viewCnt: parseInt($(element).find('td:nth-child(7)').text().trim())
        };
        return cpn;
    });
}

function getDbData(min, max, fn) {
    db.find('ppomppu', { where: { boardId: 'coupon', no: { $gte: min, $lte: max }}}, function(err, response) {
        if (err)
            fn(err);
        else
            console.log(JSON.stringify(response));
        fn(null, response);
    });
}