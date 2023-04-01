import { orderBy } from "lodash";
import moment from "moment";
const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

const _fromCode = 'BID';
const _fromName = 'BIDADI';
const _toCode = 'KGI';
const _toName = 'KENGERI';
const journeyDate = moment().format('DD MMM ddd');


let cache = {};
let nextCacheExp;

export default async function handler(req, res) {

  const query = req.query;

  const curentTime = new Date();

  if (nextCacheExp && moment().diff(nextCacheExp, 'second') >= 0) {
    cache = {}
  }

  const getResult = (data) => {
    return data.filter(e => {
      if (e.departure && e.arriving) {
        const val = moment(curentTime).diff(new Date(e.arriving), 'minutes');
        if (val >= -(query.mins || 30) && val <= 0) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }).map((e) => {
      let f = new Date(e.arriving);
      let t = new Date(e.departure);
      if (f > t) {
        let c = t;
        t = f;
        f = c;
      }
      return {
        name: e.name,
        message: 'Train coming from ' + e.from + ' to ' + e.to + ' between ' + moment(f).format('hh:mm a') + ' / ' + moment(t).format('hh:mm a'),
        from: e.from,
        to: e.to,
        fromTime: f,
        toTime: t
      }
    })
  }

  let fromKengeri;
  let fromBidadi;

  if (cache[_fromCode + _toCode]) {
    fromKengeri = cache[_fromCode + _toCode].data;
  } else {
    fromKengeri = await getTrains(_fromCode, _fromName, _toCode, _toName);
    cache[_fromCode + _toCode] = { data: fromKengeri };
    nextCacheExp = moment().add(5, 'minute');
  }

  if (cache[_toCode + _fromCode]) {
    fromBidadi = cache[_toCode + _fromCode].data;
  } else {
    fromBidadi = await getTrains(_toCode, _toName, _fromCode, _fromName);
    cache[_toCode + _fromCode] = { data: fromBidadi };
    nextCacheExp = moment().add(5, 'minute');
  }

  const result1 = getResult(fromKengeri);
  const result2 = getResult(fromBidadi);

  const r = result1.concat(result2);

  res.json({ results: orderBy(r, ['fromTime'], ['asc']) });

}

async function getTrains(fromCode, fromName, toCode, toName) {
  const executablePath = await chromium.executablePath;
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage();
  await page.goto(`https://www.railyatri.in/booking/trains-between-stations?from_code=${fromCode}&from_name=${fromName}+&journey_date=${journeyDate}&src=tbs&to_code=${toCode}&to_name=${toName}+&utm_source=tt_landing_dweb_header_tbs`);


  const trains = await page.$$eval('.Result_Info_Box', (els, fromName, toName, moment) => {

    const formatTime = (timeStr) => {
      if (timeStr) {
        let f = timeStr.replace(/[^0-9\:]/gi, '').split(':');
        let dt = new Date();
        dt.setHours(f[0]);
        dt.setMinutes(f[1]);
        return dt.toString();
      } else {
        return timeStr;
      }
    };

    return els.map((e) => {
      let name = e.querySelector('.TrainName');
      let dep = e.querySelector('.Departure-time-text-1');
      let arriving = e.querySelector('.Arrival-time-text-1');
      return {
        name: name ? name.innerText : '',
        departure: dep ? formatTime(dep.innerText) : '',
        arriving: arriving ? formatTime(arriving.innerText) : '',
        from: fromName,
        to: toName
      }
    })
  }, fromName, toName, moment);

  await browser.close();

  return trains;
}
