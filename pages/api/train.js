import axios from "axios";
import { orderBy } from "lodash";
import moment from "moment";

const cheerio = require('cheerio');

const setTimeZone = (time) => {
  const dt = new Date(time).toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  return moment(dt)
}

const _fromCode = 'BID';
const _fromName = 'BIDADI';
const _toCode = 'KGI';
const _toName = 'KENGERI';
const journeyDate = setTimeZone(new Date()).format('DD MMM ddd');

let cache = {};
let nextCacheExp;

export default async function handler(req, res) {

  const query = req.query;

  if (nextCacheExp && setTimeZone(new Date()).diff(nextCacheExp, 'second') >= 0) {
    cache = {}
  }

  const getResult = (data) => {

    const curentTime = setTimeZone(new Date());

    return data.map((e) => {
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
    }).filter(e => {
      const diff = setTimeZone(e.fromTime).diff(curentTime, 'minutes')
      return diff >= 0 && diff < (query.mins || 30);
    })
  }

  let fromKengeri;
  let fromBidadi;

  if (cache[_fromCode + _toCode]) {
    fromKengeri = cache[_fromCode + _toCode].data;
  } else {
    fromKengeri = await getTrains(_fromCode, _fromName, _toCode, _toName);
    cache[_fromCode + _toCode] = { data: fromKengeri };
    nextCacheExp = setTimeZone(new Date()).add(5, 'minute');
  }

  if (cache[_toCode + _fromCode]) {
    fromBidadi = cache[_toCode + _fromCode].data;
  } else {
    fromBidadi = await getTrains(_toCode, _toName, _fromCode, _fromName);
    cache[_toCode + _fromCode] = { data: fromBidadi };
    nextCacheExp = setTimeZone(new Date()).add(5, 'minute');
  }

  const result1 = getResult(fromKengeri);
  const result2 = getResult(fromBidadi);

  const r = result1.concat(result2);

  res.json({ results: orderBy(r, ['fromTime'], ['asc']) });

}

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

async function getTrains(fromCode, fromName, toCode, toName) {

  const r = await axios.get(`https://www.railyatri.in/booking/trains-between-stations?from_code=${fromCode}&from_name=${fromName}+&journey_date=${journeyDate}&src=tbs&to_code=${toCode}&to_name=${toName}+&utm_source=tt_landing_dweb_header_tbs`);

  const $ = cheerio.load(r.data);

  const boxes = $('.Result_Info_Box');

  let trains = [];

  try {
    boxes.each((i, e) => {
      let name = $(e).find('.TrainName');
      let dep = $(e).find('.Departure-time-text-1');
      let arriving = $(e).find('.Arrival-time-text-1');
      trains.push({
        name: name ? name.text() : '',
        departure: dep ? formatTime(dep.text()) : '',
        arriving: arriving ? formatTime(arriving.text()) : '',
        from: fromName,
        to: toName
      });
    })
  } catch (error) {
    trains = [];
  }

  return trains;
}
