'use strict';

const config = require('./config.json');
const aws = require('aws-sdk');
const rp = require('request-promise');
aws.config.update(config.aws);
const ses = new aws.SES({apiVersion: '2010-12-01'});

module.exports.hello = (event, context, callback) => {
    fetch_posts_from_reddit()
        .then(select_first_picture_from_posts)
        .then(replace_gifv_by_gif_for_gmail)
        .then(prepare_email_witch_picture_url)
        .then(send_mail_with_aws)
        .catch(console.error)
        .then(() => callback());
};

function fetch_posts_from_reddit() {
    const options = {
        uri: config.reddit.url,
        json: true
    };

    return rp(options);
}

function url_is_image(url) {
    return (/\.(gifv?|jpe?g|png)$/i).test(url)
}

function select_first_picture_from_posts(response) {
    const children = response.data.children.filter(child => url_is_image(child.data.url));
    const first = children[0];
    return first.data.url;
}

// Gmail does not support gifv. Imgur also serves gifs
function replace_gifv_by_gif_for_gmail(url) {
    return url.endsWith("gifv") ? url.slice(0, -1) : url;
}

function prepare_email_witch_picture_url(url) {
    const email = {
        Source: config.mail.from,
        Destination: {ToAddresses: config.mail.to},
        Message: {
            Subject: {Data: config.mail.subject},
            Body: {
                Html: {
                    Data: '<a href="' + url + '"><img style="min-height:400px; display: block; width: auto; height: auto;" src="' + url + '" /></a>',
                }
            }
        }
    };
    console.log(email);
    return email;
}

function send_mail_with_aws(email) {
    return ses.sendEmail(email).promise();
}
