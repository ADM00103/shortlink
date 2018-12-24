require('dotenv').config({path: __dirname + '/.env'});
const request = require('request-promise');

const main_loop = async (key, server, ts) => {
  try {
    process.env.DEBUG ?  console.log('get updates') : null;
    let body = await request({method: 'GET', url: `${server}?ts=${ts}&wait=25&key=${key}&act=a_check`, json: true, proxy: process.env.PROXY});
    if(body.updates != null) {
      body.updates.forEach(update => update.type == 'message_new' ? get_message(update) : null);
      return main_loop(key, server, body.ts);
    } else {
      console.log(`error get updates`, body)
      if(body.failed == 1){
        return main_loop(key, server, body.ts);
      } else {
        return get_long_pool();
      }
    }
  } catch (error) {
    console.error('main loop error', error);
    return get_long_pool();
  }
}

const get_long_pool = () => {
  console.log('get long pool')
  request({
    method: 'GET',
    url: 'https://api.vk.com/method/groups.getLongPollServer?v=5.80',
    qs: {
      access_token: process.env.ACCESS_TOKEN,
      group_id: process.env.GROUP_ID
    },
    proxy: process.env.PROXY,
    json: true
  }).then(body => {
    console.log(body)
    if(body.error) {
      console.log(body.error)
    } else {
      return main_loop(body.response.key, body.response.server, body.response.ts)
    }
  }).catch((error) => {
    console.log(error);
    setTimeout(() => {
      get_long_pool();
    }, 1000)
  });
}

get_long_pool();

async function get_message(update) {
    if (update.object.text.match(/(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?/si) != null) {
        let response = await request({
            method: 'POST',
            url: 'http://101.zzz.com.ua/process.php',
            form: {
                longlink: update.object.text
            },
            json: true
        })
        let url = response.data.match(/value="(.+?)"/)[1]
        await request({
            method: 'POST',
            url: 'https://api.vk.com/method/messages.send',
            form: {
                access_token: process.env.ACCESS_TOKEN,
                group_id: process.env.GROUP_ID,
                v: process.env.API_V,
                user_id: update.object.from_id,
                message: url
            },
            json: true,
            proxy: process.env.PROXY,
        })
    }
}