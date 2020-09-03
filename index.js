require('dotenv').config()
const { Autohook } = require('twitter-autohook');
const util = require('util');
const request = require('request');
const Twit = require('twit');
const express = require("express")
const wakeDyno = require("woke-dyno");

// create an Express app
const app = express();

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

  if (typeof message === 'undefined' || typeof message.message_create === 'undefined') {
    return;
  }
 
  if (message.message_create.sender_id === message.message_create.target.recipient_id) {
    return;
  }

  const msg_content = message.message_create.message_data.text

  const re = RegExp('(nitip)\!', 'g')
  const res = re.test(msg_content.toLowerCase())
  
  if(res){
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

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

// start the server, then call wokeDyno(url).start()
app.listen(8081, () => {
  wakeDyno({
      url: process.env.DYNO_URL,  // url string
      interval: 1200000 // interval in milliseconds
  }).start(); 
});

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