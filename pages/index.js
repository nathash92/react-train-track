import moment from 'moment';
import { Nunito_Sans } from 'next/font/google';
import Head from 'next/head';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

const font = Nunito_Sans({ weight: ['400', '400', '700'], subsets: ['latin'] })

export default function Home() {

  const [loading, setLoading] = useState(false);

  const [trains, setTrains] = useState([]);

  const [mins, setMins] = useState(30);

  const callApi = useCallback(async (mins) => {
    setLoading(true);
    const r = await fetch('api/train?mins=' + mins);
    const d = await r.json();
    setTrains(d.results || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    callApi(mins);
  }, []);

  const onMinsChange = (e) => {
    const val = e.target.value;
    setMins(val);
    callApi(val);
  }

  const refresh = () => {
    callApi(mins);
  }

  return (
    <>
      <Head>
        <title>Where is Train</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <nav className="navbar navbar-dark bg-primary">
        <div className="container-fluid">
          <div className="navbar-header">
            <span className="navbar-brand">
              Where is Train? <span style={{fontSize:'12px'}}>BETA Version</span>
            </span>
          </div>
        </div>
      </nav>
      <main className={font.className}>
        <div className='container p-3'>
          <div className='text-primary mb-3'>
            This app fetches the train arrival between Kengeri and Bidadi stations
          </div>

          <div className="row mb-3">
            <label className="col-sm-2 col-form-label">
              Train in next
            </label>
            <div className="col-sm-10">
              <select className='form-select' onChange={onMinsChange} value={mins}>
                <option value={30}>30 mins</option>
                <option value={60}>1 hr</option>
                <option value={120}>2 hrs</option>
              </select>
            </div>
          </div>

          <div className='row'>
            <div className='col'>
              <div className='fw-semibold mb-2'>Trains List {!loading ? <>({ trains.length })</> : null} </div>
            </div>
            <div className='col-auto'>
              {
                !loading ? <button className='btn btn-link btn-sm' onClick={refresh}>
                  Refresh
                </button> : null
              }
            </div>
          </div>

          {
            loading ? <div className='text-center my-4'>
              <div>Loading...</div>
              <Image src="/load.gif" width={320} height={320} alt="" />
            </div> : null
          }

          {
            !loading && trains.length === 0 ? <div className='text-center'>
              No trains for the selected time
            </div> : null
          }

          {
            !loading && trains.map((e, k) => <div key={k} className='card mb-3'>
              <div className='card-header'>
                <div>
                  Between <span className='fw-semibold'>
                    {moment(e.fromTime).format('hh:mm a')}
                  </span> to <span className='fw-semibold'>
                    {moment(e.toTime).format('hh:mm a')}
                  </span>
                </div>
              </div>
              <div className='card-body'>
                <div className='fw-semibold fs-6 mb-1'>
                  Train Name
                </div>
                <div className='fs-6 mb-2'>
                  {e.name}
                </div>
                <div className='row'>
                  <div className='col'>
                    <div className='fw-semibold fs-6 mb-1'>
                      From
                    </div>
                    <div className='fs-6 text-danger'>
                      {e.from}
                    </div>
                  </div>
                  <div className='col'>
                    <div className='fw-semibold fs-6 mb-1'>
                      To
                    </div>
                    <div className='fs-6 text-primary'>
                      {e.to}
                    </div>
                  </div>
                </div>
              </div>
            </div>)
          }

        </div>
      </main>
    </>
  )
}