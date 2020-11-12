require('dotenv').config()
const { Autohook } = require('twitter-autohook');
const Twit = require('twit');
const OAuth = require('oauth-1.0a')
const crypto = require('crypto');
const request = require('request');
const fs = require('fs');

var index = 0
const maxtwit = 280
var endtwit = maxtwit
var owner_id = 0
var owner_name = ""
let max_twit_index = 0
var first_twit_id = 0

const T = new Twit({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
})

async function tweetIt(event) {
  index = 0
  endtwit = maxtwit
  owner_id = 0
  owner_name = ""
  max_twit_index = 0

  if (!event.direct_message_events) {
    return;
  }

  const message = event.direct_message_events.shift();
  const sender_id = message.message_create.sender_id
  const msg_content = message.message_create.message_data.text

  owner_id = message.message_create.target.recipient_id
  owner_name = event.users[owner_id].screen_name

  max_twit_index = Math.ceil(msg_content.length/maxtwit)

  media_tmp = message.message_create.message_data.attachment

  if(sender_id!=owner_id){

    if (typeof message === 'undefined' || typeof message.message_create === 'undefined') {
      return;
    }
   
    if (message.message_create.sender_id === message.message_create.target.recipient_id) {
      return;
    }

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
            if(msg_content.length>maxtwit){
              postTwit(result_twit, null, sender_id, data.media_id_string)
              const senderScreenName = event.users[message.message_create.sender_id].screen_name;
              console.log("@"+senderScreenName+" has submitted.")
            }else{
              T.post('statuses/update', { status: result_twit, media_ids: data.media_id_string }, function(err, data2, response) {
                if(err){
                  console.log(err)
                }else{
                  const senderScreenName = event.users[message.message_create.sender_id].screen_name;
                  console.log("@"+senderScreenName+" has submitted.")

                  sendDM(sender_id, data2.id_str)

                  fs.unlink(filePath, (err) => {
                    if (err) return console.log("error: ",err);
                  })
                }
              })
            }
          })
        })
      }else{
        if(msg_content.length>maxtwit){
          postTwit(msg_content, null, sender_id, null)
          const senderScreenName = event.users[message.message_create.sender_id].screen_name;
          console.log("@"+senderScreenName+" has submitted.")
        }else{
          T.post('statuses/update', { status: msg_content }, function(err, data, response) {
            if(err){
              console.log(err)
            }else{
              const senderScreenName = event.users[message.message_create.sender_id].screen_name;
              console.log("@"+senderScreenName+" has submitted.")
  
              sendDM(sender_id, data.id_str)
            }
          })
        }
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

function sendDM(sender_id, id_str){
  const rply_msg = {
    event: {
      type: 'message_create',
      message_create: {
        target: {
          recipient_id: sender_id,
        },
        message_data: {
          text: `nuhun lurrrddd, cek twitna nya https://twitter.com/${owner_name}/status/`+id_str,
        }
      }
    }
  }

  T.post('direct_messages/events/new', rply_msg, function(err, data3, response3) {
    if (err) return console.log("error: ",err)
  })
}

function postTwit(msg, rply, sender_id, media_id_str){
  if(index < max_twit_index){
    var obj_msg = {}

    if(index==0){
      endtwit -= 1 
      const indks = (index*(maxtwit-2))
      var twit_slice = msg.substring(endtwit, indks)
      twit_slice += '-'

      obj_msg = {
        status: twit_slice,
        media_ids: media_id_str
      }
    }else{
      endtwit += (maxtwit-2)
      const indks = ((index*(maxtwit-2))+1) 
      var twit_slice = msg.substring(endtwit, indks)
      if(index==(max_twit_index-1)){
        twit_slice = '-' + twit_slice
        sendDM(sender_id, first_twit_id)
      }else{
        twit_slice = '-' + twit_slice + '-'
      }

      obj_msg = {
        status: twit_slice, 
        in_reply_to_status_id: rply
      }
    }

    T.post('statuses/update', obj_msg, function(err, data, response) {
      if(err){
        console.log(err)
      }else{
        if(index==0){
          first_twit_id = data.id_str
        }
        index++;
        postTwit(msg, data.id_str, sender_id, media_id_str)
      }
    })
  }
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