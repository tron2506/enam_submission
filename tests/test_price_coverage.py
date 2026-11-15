import asyncio
import json
import httpx
from backend import core, sources


def test_new_listing_quote_survives_missing_history(tmp_path, monkeypatch):
    monkeypatch.setattr(core, 'DATA', tmp_path)
    async def fetch(url):
        return json.dumps({'chart':{'result':[{'meta':{'exchangeName':'NSI','instrumentType':'EQUITY'},'timestamp':[1700000000],'indicators':{'quote':[{'close':[1400.5],'volume':[4258007]}]}}]}})
    monkeypatch.setattr(sources,'fetch',fetch)
    quote=asyncio.run(sources.prices('JPL'))
    assert quote['close']==1400.5
    assert quote['change'] is None and quote['volume_ratio'] is None
    assert len(quote['bars'])==1


def test_nse_uses_bse_and_alternate_host(tmp_path, monkeypatch):
    monkeypatch.setattr(core,'DATA',tmp_path)
    urls=[]
    async def fetch(url):
        urls.append(url)
        if 'query1' in url:
            raise httpx.ConnectError('temporary failure')
        return json.dumps({'chart':{'result':[{'meta':{'exchangeName':'BSE','instrumentType':'EQUITY'},'timestamp':[1700000000,1700086400],'indicators':{'quote':[{'close':[1900,1990],'volume':[100,120]}]}}]}})
    monkeypatch.setattr(sources,'fetch',fetch)
    quote=asyncio.run(sources.prices('NSE'))
    assert len(urls)==2 and all('NSE.BO' in u for u in urls)
    assert quote['exchange']=='BSE' and quote['close']==1990
    assert 'NSE.BO' in quote['source']
