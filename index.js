require('dotenv').config()
const { Autohook } = require('twitter-autohook');
const Twit = require('twit');
const OAuth = require('oauth-1.0a')
const crypto = require('crypto');
const request = require('request');
const fs = require('fs');

const T = new Twit({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
})

async function tweetIt(event) {
  if (!event.direct_message_events) {
    return;
  }

  const message = event.direct_message_events.shift();
  media_tmp = message.message_create.message_data.attachment

  if(message.message_create.sender_id!=313927356){

    if (typeof message === 'undefined' || typeof message.message_create === 'undefined') {
      return;
    }
   
    if (message.message_create.sender_id === message.message_create.target.recipient_id) {
      return;
    }

    const msg_content = message.message_create.message_data.text

    const re = RegExp('(ngukngak)\!', 'g')
    const res = re.test(msg_content.toLowerCase())
    
    if(res){

      if (typeof media_tmp !== 'undefined' && media_tmp.media.type === "photo") {
        const url = media_tmp.media.media_url;
        const filename = url.split("/")
        const filePath = `tmp/${filename[filename.length -1]}`

        const expression = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi;
        const twtt = msg_content
        result_twit = twtt.replace(expression, '');

        downloadMedia(url, filePath, function(){

          T.postMediaChunked({ file_path: filePath }, function (err, data, response) {
            T.post('statuses/update', { status: result_twit, media_ids: data.media_id_string }, function(err, data2, response) {
              if(err){
                console.log(err)
              }else{
  
                const senderScreenName = event.users[message.message_create.sender_id].screen_name;
                console.log("@"+senderScreenName+" has submitted.")
  
                fs.unlink(filePath, (err) => {
                  if (err) return console.log("error: ",err);
                })
  
              }
            })
          })

        })


      }else{

        T.post('statuses/update', { status: msg_content }, function(err, data, response) {
          if(err){
            console.log(err)
          }else{
            const senderScreenName = event.users[message.message_create.sender_id].screen_name;
            console.log("@"+senderScreenName+" has submitted.")
          }
        })

      }
    }

  }
}

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

function downloadMedia(url, filePath, _callback){
  const oauth = OAuth({
    consumer: {
      key: process.env.TWITTER_CONSUMER_KEY,
      secret: process.env.TWITTER_CONSUMER_SECRET,
    },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto
        .createHmac('sha1', key)
        .update(base_string)
        .digest('base64')
    },
  })
  
  const request_data = {
    url: url,
    method: 'GET',
    data: {},
  }
  
  // Note: The token is optional for some requests
  const token = {
    key: process.env.TWITTER_ACCESS_TOKEN,
    secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  }
  
  request(
    {
      url: request_data.url,
      method: request_data.method,
      form: request_data.data,
      encoding: 'binary',
      headers: oauth.toHeader(oauth.authorize(request_data, token)),
    },
    function(err, res, body) {
      if (err) return console.log("error: ",err);
  
      fs.writeFile(filePath, body, 'binary',function (err) {
        if (err) return console.log(err);
        _callback();
      });
    }
  )

}

(async start => {
  try {
    const webhook = new Autohook();
    await webhook.removeWebhooks();
    await webhook.start();

    console.log("app running...")
    webhook.on('event', async event => {
      if (event.direct_message_events) {
        await tweetIt(event);
      }
    });

    await webhook.subscribe({oauth_token: process.env.TWITTER_ACCESS_TOKEN, oauth_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET});  
  } catch (e) {
    console.error(e);
    if (e.name === 'RateLimitError') {
      await sleep(e.resetAt - new Date().getTime());
      process.exit(1);
    }
  }
})();