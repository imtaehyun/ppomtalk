/**
 * Created by nezz on 15. 6. 28..
 */

var _ = require('underscore'),
    Xray = require('x-ray'),
    x = Xray(),
    Parse = require('node-parse-api').Parse,
    db = new Parse({
        app_id: config.get('Parse.appId'),
        api_key: config.get('Parse.apiKey')
    });

x('http://clien.net/cs2/bbs/board.php?bo_table=coupon', '.board_main table tbody tr:not(:nth-child(1),.post_notice)', [{
    no: 'td:nth-child(1)',
    category: 'td.post_category',
    title: 'td.post_subject',
    time: 'td:nth-child(5) span@title',
    view: 'td:nth-child(6)'
}])(function(err, articles) {
    if (err) console.error(err);

    // data 정제
    articles = _.map(articles, function(value, key) {
        var article = value;
        article.no = parseInt(article.no);
        article.category = article.category.replace(/\[|\]/g, '');
        article.title = article.title.trim();
        article.view = parseInt(article.view);
        article.type = 'clien_coupon';
        return article;
    });

    var max = _.max(articles, function(el){ return el.no; }).no;
    var min = _.min(articles, function(el){ return el.no; }).no;
    console.log('selected no: ' + min + ' ~ ' + max);

    getDbData(min, max, function(err, data) {

        var listNo = _.pluck(data.results, 'no');

        _.each(articles, function(element, index, list) {
            if (listNo.indexOf(element.no) > -1) {
                //console.log('exists in db: ' + element.no);
                var dataOnDb = _.filter(data.results, function(el) { return el.no == element.no; })[0];
                console.log('view cnt changed: ' + dataOnDb.view + ' -> ' + element.view);
            } else {
                // DB에 없는 데이터 -> insert
                //console.log('not exists in db: ' + element.no);
                db.insert('Content', element, function(err, response) {
                    if (err) console.error(err);
                    console.log(response);
                });
            }
        });
    });

});


function getDbData(min, max, fn) {
    db.find('Content', { where: { type: 'clien_coupon', no: { $gte: min, $lte: max }}}, function(err, response) {
        if (err)
            fn(err);
        else
            console.log(JSON.stringify(response));
            fn(null, response);
    });
}